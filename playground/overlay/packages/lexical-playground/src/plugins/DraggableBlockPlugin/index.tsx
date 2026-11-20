/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import './index.css';

import {NODE_SCHEMA} from '@lexical-tufte/document';
import {
  $createEpigraphNode,
  $createSectionNode,
  $createTufteCodeNode,
  $createTufteHeadingNode,
  canonicalBlockType,
} from '@lexical-tufte/lexical';
import {$createHorizontalRuleNode} from '@lexical/extension';
import {$createListItemNode, $createListNode} from '@lexical/list';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {DraggableBlockPlugin_EXPERIMENTAL} from '@lexical/react/LexicalDraggableBlockPlugin';
import {$createQuoteNode} from '@lexical/rich-text';
import {
  $addUpdateTag,
  $createParagraphNode,
  $createTextNode,
  $getNearestNodeFromDOMNode,
  $getNodeByKey,
  $getRoot,
  $isElementNode,
  $isParagraphNode,
  $isTextNode,
  getComposedEventTarget,
  HISTORY_PUSH_TAG,
  type LexicalNode,
  type NodeKey,
  registerEventListener,
} from 'lexical';
import {
  type JSX,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as ReactDOM from 'react-dom';

import useModal from '../../hooks/useModal';
import {$createDocumentHeadingNode} from '../../nodes/DocumentHeadingNode';
import {
  ComponentPickerMenuItem,
  ComponentPickerOption,
  getBaseOptions,
  getDynamicOptions,
} from '../ComponentPickerPlugin';

const DRAGGABLE_BLOCK_MENU_CLASSNAME = 'draggable-block-menu';

type PickerState = {
  insertBefore: boolean;
  scope: {type: string; parentKey: NodeKey} | null;
  targetNodeKey: NodeKey;
};

const scopedBlocks: {
  type: string;
  title: string;
  icon: string;
  create: () => LexicalNode;
}[] = [
  {
    type: 'document-heading',
    title: 'Title',
    icon: 'h1',
    create: () => $createDocumentHeadingNode('title'),
  },
  {
    type: 'document-heading',
    title: 'Subtitle',
    icon: 'paragraph',
    create: () => $createDocumentHeadingNode('subtitle'),
  },
  {
    type: 'paragraph',
    title: 'Paragraph',
    icon: 'paragraph',
    create: $createParagraphNode,
  },
  {
    type: 'heading',
    title: 'Heading 2',
    icon: 'h2',
    create: () => $createTufteHeadingNode('h2'),
  },
  {
    type: 'heading',
    title: 'Heading 3',
    icon: 'h3',
    create: () => $createTufteHeadingNode('h3'),
  },
  {
    type: 'quote',
    title: 'Quote',
    icon: 'quote',
    create: () => $createQuoteNode().append($createParagraphNode()),
  },
  {
    type: 'list',
    title: 'Bulleted List',
    icon: 'bullet-list',
    create: () => $createListNode('bullet').append($createListItemNode()),
  },
  {
    type: 'list',
    title: 'Numbered List',
    icon: 'numbered-list',
    create: () => $createListNode('number').append($createListItemNode()),
  },
  {
    type: 'list',
    title: 'Check List',
    icon: 'check-list',
    create: () => $createListNode('check').append($createListItemNode()),
  },
  {
    type: 'listitem',
    title: 'List item',
    icon: 'bullet-list',
    create: () => $createListItemNode(),
  },
  {
    type: 'tufte-code',
    title: 'Code',
    icon: 'code',
    create: () => $createTufteCodeNode(),
  },
  {
    type: 'horizontalrule',
    title: 'Divider',
    icon: 'horizontal-rule',
    create: $createHorizontalRuleNode,
  },
  {
    type: 'tufte-epigraph',
    title: 'Epigraph',
    icon: 'quote',
    create: () =>
      $createEpigraphNode().append(
        $createQuoteNode().append($createParagraphNode()),
      ),
  },
  {
    type: 'tufte-section',
    title: 'Section',
    icon: 'paragraph',
    create: () => $createSectionNode().append($createParagraphNode()),
  },
];

function $getScope(node: LexicalNode): PickerState['scope'] {
  const parent = node.getParent();
  if (!parent) return null;
  const parentType = canonicalBlockType(parent.getType());
  const nodeType = canonicalBlockType(node.getType());
  const eligible =
    ['tufte-section', 'tufte-fullwidth'].includes(parentType) ||
    (parentType === 'root' &&
      ['tufte-section', 'document-heading'].includes(nodeType)) ||
    (parentType === 'tufte-epigraph' && nodeType === 'quote') ||
    (['quote', 'tablecell', 'tufte-definition'].includes(parentType) &&
      nodeType === 'paragraph') ||
    (parentType === 'list' && nodeType === 'listitem');
  return eligible ? {type: parentType, parentKey: parent.getKey()} : null;
}

function isOnMenu(element: HTMLElement): boolean {
  return !!element.closest(`.${DRAGGABLE_BLOCK_MENU_CLASSNAME}`);
}

export default function DraggableBlockPlugin({
  anchorElem = document.body,
}: {
  anchorElem?: HTMLElement;
}): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [modal, showModal] = useModal();
  const menuRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const targetLineRef = useRef<HTMLDivElement>(null);
  const [draggableElement, setDraggableElement] = useState<HTMLElement | null>(
    null,
  );
  const [pickerState, setPickerState] = useState<PickerState | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [queryString, setQueryString] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [pickerPosition, setPickerPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);

  const options = useMemo(() => {
    const scope = pickerState?.scope;
    const baseOptions = scope
      ? scopedBlocks
          .filter(
            block =>
              NODE_SCHEMA[scope.type]?.children?.includes(block.type) ||
              (scope.type === 'root' && block.type === 'document-heading'),
          )
          .map(
            block =>
              new ComponentPickerOption(block.title, {
                icon: <i className={'icon ' + block.icon} />,
                onSelect: () =>
                  editor.update(() => {
                    const target = $getNodeByKey(pickerState.targetNodeKey);
                    if (
                      !target?.isAttached() ||
                      target.getParent()?.getKey() !== scope.parentKey ||
                      !editor.isEditable()
                    )
                      return;
                    const inserted = block.create();
                    $addUpdateTag(HISTORY_PUSH_TAG);
                    if (pickerState.insertBefore) target.insertBefore(inserted);
                    else target.insertAfter(inserted);
                    if ($isElementNode(inserted)) inserted.selectStart();
                    else inserted.selectNext();
                  }),
              }),
          )
      : getBaseOptions(editor, showModal);
    const query = queryString.toLowerCase();
    return [
      ...(scope ? [] : getDynamicOptions(editor, queryString)),
      ...baseOptions.filter(
        option =>
          option.title.toLowerCase().includes(query) ||
          option.keywords.some(keyword =>
            keyword.toLowerCase().includes(query),
          ),
      ),
    ];
  }, [editor, pickerState, queryString, showModal]);

  const getNestedBlock = useCallback(
    (target: HTMLElement, event: MouseEvent) =>
      editor.read('latest', () => {
        function blockAtY(keys: NodeKey[]): HTMLElement | null {
          for (const key of keys) {
            const element = editor.getElementByKey(key);
            if (!element) continue;
            const {top, bottom} = element.getBoundingClientRect();
            if (event.clientY >= top && event.clientY < bottom) return element;
          }
          return null;
        }
        for (
          let node = $getNearestNodeFromDOMNode(target);
          node;
          node = node.getParent()
        ) {
          if (!$getScope(node)) continue;
          if ($isElementNode(node) && node.getType() === 'tufte-section') {
            return (
              blockAtY(node.getChildrenKeys()) ??
              editor.getElementByKey(node.getKey())
            );
          }
          return editor.getElementByKey(node.getKey());
        }
        if (editor.getRootElement()?.contains(target)) {
          const sectionDOM = blockAtY($getRoot().getChildrenKeys());
          const section = sectionDOM && $getNearestNodeFromDOMNode(sectionDOM);
          if (
            $isElementNode(section) &&
            section.getType() === 'tufte-section'
          ) {
            return blockAtY(section.getChildrenKeys()) ?? sectionDOM;
          }
        }
        return null;
      }),
    [editor],
  );

  useEffect(() => {
    if (isPickerOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isPickerOpen]);

  useEffect(() => {
    if (!isPickerOpen || !options.length) {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHighlightedIndex(current =>
      Math.min(current, Math.max(options.length - 1, 0)),
    );
  }, [isPickerOpen, options.length]);

  useEffect(() => {
    if (!isPickerOpen) {
      return;
    }
    const handleClickOutside = (event: MouseEvent) => {
      const target = getComposedEventTarget(event) as Node | null;
      if (
        (pickerRef.current && pickerRef.current.contains(target)) ||
        (menuRef.current && menuRef.current.contains(target))
      ) {
        return;
      }
      setIsPickerOpen(false);
      setPickerState(null);
    };
    return registerEventListener(
      anchorElem.ownerDocument,
      'mousedown',
      handleClickOutside,
    );
  }, [isPickerOpen, anchorElem]);

  const selectOption = useCallback(
    (option: ComponentPickerOption) => {
      if (!pickerState) {
        setIsPickerOpen(false);
        return;
      }
      setIsPickerOpen(false);
      if (pickerState.scope) {
        option.onSelect(queryString);
        return;
      }
      editor.update(() => {
        const node = $getNodeByKey(pickerState.targetNodeKey);
        if (!node) {
          return;
        }
        const placeholder = $createParagraphNode();
        const textNode = $createTextNode('');
        placeholder.append(textNode);
        if (pickerState.insertBefore) {
          node.insertBefore(placeholder);
        } else {
          node.insertAfter(placeholder);
        }
        textNode.select();
        option.onSelect(queryString);
        const latestPlaceholder = placeholder.getLatest();
        if ($isParagraphNode(latestPlaceholder)) {
          const onlyChild = latestPlaceholder.getFirstChild();
          if (
            $isTextNode(onlyChild) &&
            onlyChild.getTextContent().length === 0 &&
            latestPlaceholder.getChildrenSize() === 1
          ) {
            latestPlaceholder.remove();
          }
        }
      });
    },
    [editor, pickerState, queryString],
  );

  useEffect(() => {
    if (!isPickerOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isPickerOpen || !options.length) {
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setHighlightedIndex(index =>
          index + 1 >= options.length ? 0 : index + 1,
        );
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setHighlightedIndex(index =>
          index - 1 < 0 ? options.length - 1 : index - 1,
        );
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const option = options[highlightedIndex];
        if (option) {
          selectOption(option);
        }
      } else if (event.key === 'Escape') {
        event.preventDefault();
        setIsPickerOpen(false);
        setPickerState(null);
      }
    };
    return registerEventListener(window, 'keydown', handleKeyDown);
  }, [highlightedIndex, isPickerOpen, options, selectOption]);

  function openComponentPicker(e: React.MouseEvent) {
    if (!draggableElement || !editor) {
      return;
    }

    const target = editor.read(() => {
      const resolvedNode = $getNearestNodeFromDOMNode(draggableElement);
      return (
        resolvedNode && {
          targetNodeKey: resolvedNode.getKey(),
          scope: $getScope(resolvedNode),
        }
      );
    });

    if (!target) {
      return;
    }

    const insertBefore = e.altKey || e.ctrlKey;
    const rect = menuRef.current?.getBoundingClientRect();
    setPickerPosition(
      rect
        ? {
            left: rect.left + rect.width + window.scrollX + 8,
            top: rect.top + window.scrollY,
          }
        : null,
    );
    setPickerState({insertBefore, ...target});
    setQueryString('');
    setHighlightedIndex(0);
    setIsPickerOpen(true);
  }

  return (
    <>
      {modal}
      {isPickerOpen && pickerPosition
        ? ReactDOM.createPortal(
            <div
              className="typeahead-popover component-picker-menu draggable-block-component-picker"
              ref={pickerRef}
              style={{
                left: pickerPosition.left,
                position: 'absolute',
                top: pickerPosition.top,
                zIndex: 10,
              }}>
              <input
                className="component-picker-search"
                placeholder="Filter blocks..."
                value={queryString}
                ref={searchInputRef}
                onChange={event => setQueryString(event.target.value)}
              />
              <ul>
                {options.map((option, i: number) => (
                  <ComponentPickerMenuItem
                    index={i}
                    isSelected={highlightedIndex === i}
                    onClick={() => {
                      setHighlightedIndex(i);
                      selectOption(option);
                    }}
                    onMouseEnter={() => setHighlightedIndex(i)}
                    key={option.key}
                    option={option}
                  />
                ))}
              </ul>
            </div>,
            anchorElem.ownerDocument.body,
          )
        : null}
      <DraggableBlockPlugin_EXPERIMENTAL
        anchorElem={anchorElem}
        menuRef={menuRef}
        targetLineRef={targetLineRef}
        menuComponent={
          <div ref={menuRef} className="icon draggable-block-menu">
            <button
              title="Click to add below"
              aria-label="Insert below"
              className="icon icon-plus"
              onClick={openComponentPicker}
            />
            <div className="icon" />
          </div>
        }
        targetLineComponent={
          <div ref={targetLineRef} className="draggable-block-target-line" />
        }
        isOnMenu={isOnMenu}
        onElementChanged={setDraggableElement}
        getNestedBlock={getNestedBlock}
      />
    </>
  );
}
