/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  FloatingOverlay,
  FloatingPortal,
  offset,
  shift,
  useDismiss,
  useFloating,
  useInteractions,
  useListNavigation,
  useRole,
  useTypeahead,
} from '@floating-ui/react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  $getNearestNodeFromDOMNode,
  $getNodeByKey,
  $getRoot,
  getComposedEventTarget,
  type LexicalNode,
  type NodeKey,
  registerEventListener,
} from 'lexical';
import {
  forwardRef,
  type JSX,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from 'react';

class MenuOption {
  key: string;
  ref?: RefObject<HTMLElement | null>;

  constructor(key: string) {
    this.key = key;
    this.ref = {current: null};
    this.setRefElement = this.setRefElement.bind(this);
  }

  setRefElement(element: HTMLElement | null) {
    this.ref = {current: element};
  }
}

/**
 * A selectable item in a {@link NodeContextMenuPlugin}. It pairs a `title` (and
 * optional `icon`/`disabled` state) with a `$onSelect` callback that runs in an
 * editor update when chosen, and an optional `$showOn` predicate that decides,
 * per node, whether the item is shown for the right-clicked node.
 */
class NodeContextMenuOption extends MenuOption {
  type: string;
  title: string;
  icon: JSX.Element | null;
  disabled: boolean;
  $onSelect: (node: LexicalNode) => void;
  $showOn?: (node: LexicalNode) => boolean;

  constructor(
    title: string,
    options: {
      disabled?: boolean;
      icon?: JSX.Element;
      $onSelect: (node: LexicalNode) => void;
      $showOn?: (node: LexicalNode) => boolean;
    },
  ) {
    super(title);
    this.type = 'item';
    this.title = title;
    this.disabled = options.disabled ?? false;
    this.icon = options.icon ?? null;
    this.$onSelect = options.$onSelect;
    if (options.$showOn) {
      this.$showOn = options.$showOn;
    }
  }
}

/**
 * A non-interactive divider between groups of {@link NodeContextMenuOption}s in
 * a {@link NodeContextMenuPlugin}. Like menu options, it accepts an optional
 * `$showOn` predicate to control when it is displayed.
 */
class NodeContextMenuSeparator extends MenuOption {
  type: string;
  $showOn?: (node: LexicalNode) => boolean;

  constructor(options?: {$showOn?: (node: LexicalNode) => boolean}) {
    super('_separator');
    this.type = 'separator';
    if (options && options.$showOn) {
      this.$showOn = options.$showOn;
    }
  }
}

// The forwardRef calls are annotated by hand: React's forwardRef is not a
// Lexical factory, so the build does not annotate it, and an unannotated
// module-scope call pins the module into every bundle that imports it.
const ContextMenuItem = /* @__PURE__ */ forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    label?: string;
    disabled?: boolean;
    icon?: JSX.Element | null;
  }
>(({className, label, disabled, icon, ...props}, ref) => {
  return (
    <button
      {...props}
      className={className}
      ref={ref}
      role="menuitem"
      disabled={disabled}>
      {icon}
      {label}
    </button>
  );
});

/** A submenu containing actions for one editor scope. */
class NodeContextMenuGroup {
  constructor(
    readonly title: string,
    readonly items: ContextMenuType[],
  ) {}
}

type ContextMenuType =
  | NodeContextMenuOption
  | NodeContextMenuSeparator
  | NodeContextMenuGroup;

function getVisibleItems(
  items: ContextMenuType[],
  node: LexicalNode,
): ContextMenuType[] {
  const visible: ContextMenuType[] = [];
  for (const item of items) {
    if (item instanceof NodeContextMenuGroup) {
      const children = getVisibleItems(item.items, node);
      if (children.length > 0) {
        visible.push(new NodeContextMenuGroup(item.title, children));
      }
    } else if (!item.$showOn || item.$showOn(node)) {
      if (
        !(item instanceof NodeContextMenuSeparator) ||
        (visible.length > 0 &&
          !(visible.at(-1) instanceof NodeContextMenuSeparator))
      ) {
        visible.push(item);
      }
    }
  }
  if (visible.at(-1) instanceof NodeContextMenuSeparator) {
    visible.pop();
  }
  return visible;
}

interface Props {
  label?: string;
  nested?: boolean;
  itemClassName?: string;
  separatorClassName?: string;
  items: ContextMenuType[];
}

/**
 * Renders a custom context menu (replacing the browser's) when the user
 * right-clicks inside the editor. Pass the `items` to display as
 * {@link NodeContextMenuOption}s and {@link NodeContextMenuSeparator}s; each
 * item's optional `$showOn` predicate is evaluated against the node nearest the
 * click so the menu can adapt to its target. Supports keyboard navigation and
 * type-ahead.
 *
 * @returns A portal containing the floating context menu while it is open.
 */
const NodeContextMenuPlugin = /* @__PURE__ */ forwardRef<
  HTMLButtonElement,
  Props & React.HTMLProps<HTMLButtonElement>
>(({items, className, itemClassName, separatorClassName}, forwardedRef) => {
  const [editor] = useLexicalComposerContext();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const listItemsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const listContentRef = useRef<(string | null)[]>([]);

  const {refs, floatingStyles, context} = useFloating({
    middleware: [
      offset({alignmentAxis: 4, mainAxis: 5}),
      flip({
        fallbackPlacements: ['left-start'],
      }),
      shift({padding: 10}),
    ],
    onOpenChange: setIsOpen,
    open: isOpen,
    placement: 'right-start',
    strategy: 'fixed',
    whileElementsMounted: autoUpdate,
  });

  const role = useRole(context, {role: 'menu'});
  const dismiss = useDismiss(context);
  const listNavigation = useListNavigation(context, {
    activeIndex,
    listRef: listItemsRef,
    onNavigate: setActiveIndex,
  });
  const typeahead = useTypeahead(context, {
    activeIndex,
    enabled: isOpen,
    listRef: listContentRef,
    onMatch: setActiveIndex,
  });

  const {getFloatingProps, getItemProps} = useInteractions([
    role,
    dismiss,
    listNavigation,
    typeahead,
  ]);

  const [rootItems, setRootItems] = useState<ContextMenuType[]>([]);
  const [groups, setGroups] = useState<NodeContextMenuGroup[]>([]);
  const nodeKey = useRef<NodeKey | null>(null);
  const group = groups.at(-1);
  const renderItems = group?.items ?? rootItems;
  const backLabel = groups.at(-2)?.title ?? '편집 메뉴';
  listContentRef.current = [
    ...(group ? [backLabel] : []),
    ...renderItems.map(item =>
      item instanceof NodeContextMenuSeparator ? null : item.title,
    ),
  ];

  function changeLevel(next: NodeContextMenuGroup[]) {
    listItemsRef.current = [];
    refs.floating.current?.focus();
    setActiveIndex(null);
    setGroups(next);
  }

  useEffect(() => {
    function onContextMenu(e: MouseEvent) {
      const target = getComposedEventTarget(e);
      const {key, visibleItems} = editor.read(() => {
        const node =
          (target instanceof Node && $getNearestNodeFromDOMNode(target)) ||
          $getRoot();
        return {key: node.getKey(), visibleItems: getVisibleItems(items, node)};
      });
      if (visibleItems.length === 0) {
        return;
      }

      e.preventDefault();
      refs.setPositionReference({
        getBoundingClientRect() {
          return {
            bottom: e.clientY,
            height: 0,
            left: e.clientX,
            right: e.clientX,
            top: e.clientY,
            width: 0,
            x: e.clientX,
            y: e.clientY,
          };
        },
      });
      nodeKey.current = key;
      listItemsRef.current = [];
      setActiveIndex(null);
      setGroups([]);
      setRootItems(visibleItems);
      setIsOpen(true);
    }

    return editor.registerRootListener(rootElement => {
      if (rootElement !== null) {
        return registerEventListener(rootElement, 'contextmenu', onContextMenu);
      }
    });
  }, [items, refs, editor]);

  return (
    <FloatingPortal>
      {isOpen && (
        <FloatingOverlay lockScroll={true}>
          <FloatingFocusManager context={context} initialFocus={refs.floating}>
            <div
              className={className}
              ref={refs.setFloating}
              style={floatingStyles}
              {...getFloatingProps({
                'aria-label': group?.title ?? 'Context menu',
                onKeyDown(event) {
                  if (event.key === 'ArrowLeft' && group) {
                    event.preventDefault();
                    changeLevel(groups.slice(0, -1));
                  }
                },
              })}>
              {group && (
                <ContextMenuItem
                  label={'‹ ' + backLabel}
                  {...getItemProps({
                    className: itemClassName,
                    onClick: () => changeLevel(groups.slice(0, -1)),
                    ref: (element: HTMLButtonElement | null) => {
                      listItemsRef.current[0] = element;
                    },
                    tabIndex: activeIndex === 0 ? 0 : -1,
                  })}
                />
              )}
              {renderItems.map((item, index) => {
                if (item instanceof NodeContextMenuSeparator) {
                  return (
                    <hr
                      className={separatorClassName}
                      key={item.key + '-' + index}
                    />
                  );
                }

                const focusIndex = group ? index + 1 : index;
                const itemProps = {
                  className: itemClassName,
                  ref: (element: HTMLButtonElement | null) => {
                    listItemsRef.current[focusIndex] = element;
                  },
                  tabIndex: activeIndex === focusIndex ? 0 : -1,
                };
                if (item instanceof NodeContextMenuGroup) {
                  const open = () => changeLevel([...groups, item]);
                  return (
                    <ContextMenuItem
                      icon={
                        <span
                          aria-hidden="true"
                          style={{marginInlineStart: 'auto', order: 1}}>
                          ›
                        </span>
                      }
                      label={item.title}
                      {...getItemProps({
                        ...itemProps,
                        'aria-haspopup': 'menu',
                        onClick: open,
                        onKeyDown(event) {
                          if (event.key === 'ArrowRight') {
                            event.preventDefault();
                            open();
                          }
                        },
                      })}
                      key={item.title}
                    />
                  );
                }

                return (
                  <ContextMenuItem
                    disabled={item.disabled}
                    icon={item.icon}
                    label={item.title}
                    {...getItemProps({
                      ...itemProps,
                      onClick() {
                        const key = nodeKey.current;
                        setIsOpen(false);
                        if (key === null) {
                          return;
                        }
                        editor.update(() => {
                          const node = $getNodeByKey(key);
                          if (
                            node?.isAttached() &&
                            (!item.$showOn || item.$showOn(node))
                          ) {
                            item.$onSelect(node);
                          }
                        });
                      },
                    })}
                    key={item.key}
                  />
                );
              })}
            </div>
          </FloatingFocusManager>
        </FloatingOverlay>
      )}
    </FloatingPortal>
  );
});

export {
  NodeContextMenuGroup,
  NodeContextMenuOption,
  NodeContextMenuPlugin,
  NodeContextMenuSeparator,
};
