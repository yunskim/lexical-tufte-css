import {NODE_SCHEMA} from '@lexical-tufte/document';
import {
  $getContainingNote,
  APPEND_TUFTE_ATTRIBUTION_COMMAND,
  APPEND_TUFTE_EPIGRAPH_ITEM_COMMAND,
  canonicalBlockType,
  FigureNode,
  INSERT_TUFTE_NOTE_COMMAND,
  INSERT_TUFTE_SECTION_COMMAND,
  MERGE_TUFTE_NOTE_COMMAND,
  MERGE_TUFTE_SECTION_COMMAND,
  MOVE_TUFTE_EPIGRAPH_ITEM_COMMAND,
  MOVE_TUFTE_NOTE_COMMAND,
  REMOVE_TUFTE_QUOTATION_COMMAND,
  SET_TUFTE_BLOCK_COMMAND,
  SET_TUFTE_FIGURE_WIDTH_COMMAND,
  SPLIT_TUFTE_NOTE_COMMAND,
  SPLIT_TUFTE_SECTION_COMMAND,
  WRAP_TUFTE_ROOT_COMMAND,
} from '@lexical-tufte/lexical';
import {
  NodeContextMenuGroup,
  NodeContextMenuOption,
  NodeContextMenuSeparator,
} from '@lexical/react/LexicalNodeContextMenuPlugin';
import {
  $createNodeSelection,
  $createRangeSelection,
  $getNearestNodeFromDOMNode,
  $getNodeByKey,
  $getRoot,
  $isElementNode,
  $isTextNode,
  $setSelection,
  getComposedEventTarget,
  type LexicalCommand,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
  type RangeSelection,
} from 'lexical';

type ResolveTarget = (node: LexicalNode) => LexicalNode | null;

function $type(node: LexicalNode): string {
  return canonicalBlockType(node.getType());
}

function $ancestor(node: LexicalNode, ...types: string[]): LexicalNode | null {
  for (
    let current: LexicalNode | null = node;
    current;
    current = current.getParent()
  ) {
    if (types.includes($type(current))) return current;
  }
  return null;
}

const $figure: ResolveTarget = node => $ancestor(node, 'tufte-figure');
const $quote: ResolveTarget = node => $ancestor(node, 'quote');
const $section: ResolveTarget = node => $ancestor(node, 'tufte-section');
const $paragraph: ResolveTarget = node => $ancestor(node, 'paragraph');
const $heading: ResolveTarget = node => $ancestor(node, 'heading');
const $clicked: ResolveTarget = node => node;

const $attribution: ResolveTarget = node => {
  const quote = $quote(node);
  return $isElementNode(quote)
    ? (quote
        .getChildren()
        .find(child => $type(child) === 'tufte-attribution') ?? null)
    : null;
};

function $sectionBlock(node: LexicalNode): LexicalNode | null {
  const section = $section(node);
  for (
    let block: LexicalNode | null = node;
    block && !block.is(section);
    block = block.getParent()
  ) {
    if (block.getParent()?.is(section)) return block;
  }
  return null;
}

function $allows(parent: LexicalNode, childType: string): boolean {
  return Boolean(NODE_SCHEMA[$type(parent)]?.children?.includes(childType));
}

export function createTufteContextOptions(editor: LexicalEditor) {
  let clickedKey: NodeKey | null = null;
  let clickedRange: RangeSelection | null = null;

  function capture(event: MouseEvent) {
    clickedKey = null;
    clickedRange = null;
    const target = getComposedEventTarget(event);
    if (
      !editor.isEditable() ||
      editor.isComposing() ||
      !(target instanceof Node)
    )
      return;

    editor.read(() => {
      const node = $getNearestNodeFromDOMNode(target);
      if (!node) return;
      clickedKey = node.getKey();
      const doc = target.ownerDocument;
      const root = target.getRootNode();
      const caret = doc?.caretPositionFromPoint?.(
        event.clientX,
        event.clientY,
        root instanceof ShadowRoot ? {shadowRoots: [root]} : undefined,
      );
      const fallback = caret
        ? null
        : doc?.caretRangeFromPoint?.(event.clientX, event.clientY);
      const anchor = caret?.offsetNode ?? fallback?.startContainer;
      const offset = caret?.offset ?? fallback?.startOffset;
      if (
        doc &&
        anchor &&
        offset !== undefined &&
        $getNearestNodeFromDOMNode(anchor)?.is(node)
      ) {
        const collapsed = doc.createRange();
        collapsed.setStart(anchor, offset);
        collapsed.collapse(true);
        clickedRange = $createRangeSelection();
        clickedRange.applyDOMRange(collapsed);
      }
    });
  }

  function register() {
    return editor.registerRootListener(root => {
      if (!root) return;
      root.addEventListener('contextmenu', capture, true);
      return () => {
        clickedKey = null;
        clickedRange = null;
        root.removeEventListener('contextmenu', capture, true);
      };
    });
  }

  function command<T>(
    title: string,
    action: LexicalCommand<T>,
    payload: T,
    $target: ResolveTarget,
    $canRun: (scope: LexicalNode, clicked: LexicalNode) => boolean = () => true,
    selectionMode: 'range' | 'node' = 'range',
  ) {
    function $available(node: LexicalNode) {
      const scope = $target(node);
      return scope &&
        editor.isEditable() &&
        !editor.isComposing() &&
        $canRun(scope, node)
        ? scope
        : null;
    }
    return new NodeContextMenuOption(title, {
      $showOn: node => Boolean($available(node)),
      $onSelect: node => {
        const scope = $available(node);
        if (!scope || clickedKey !== node.getKey()) return;
        if (selectionMode === 'node') {
          const selection = $createNodeSelection();
          selection.add(scope.getKey());
          $setSelection(selection);
        } else if (scope.is(node) && clickedRange) {
          const anchor = $getNodeByKey(clickedRange.anchor.key);
          if (!anchor?.is(node)) return;
          const max = $isElementNode(anchor)
            ? anchor.getChildrenSize()
            : anchor.getTextContentSize();
          if (clickedRange.anchor.offset > max) return;
          $setSelection(clickedRange.clone());
        } else if ($isElementNode(scope)) {
          scope.select(0, 0);
        } else {
          scope.selectEnd();
        }
        editor.dispatchCommand(action, payload);
      },
    });
  }

  function noteGroup(title: string, kind: string) {
    const $note: ResolveTarget = node => {
      const note = $getContainingNote(node);
      return note?.getType() === kind ? note : null;
    };
    return new NodeContextMenuGroup(title, [
      command(
        '노트 나누기',
        SPLIT_TUFTE_NOTE_COMMAND,
        undefined,
        node => ($note(node) ? node : null),
        clicked => {
          const note = $note(clicked);
          const offset = clickedRange?.anchor.offset;
          return (
            $isElementNode(note) &&
            $isTextNode(clicked) &&
            offset !== undefined &&
            !(offset === 0 && clicked.is(note.getFirstDescendant())) &&
            !(
              offset === clicked.getTextContentSize() &&
              clicked.is(note.getLastDescendant())
            )
          );
        },
      ),
      command(
        '다음 노트와 합치기',
        MERGE_TUFTE_NOTE_COMMAND,
        undefined,
        $note,
        note => note.getNextSibling()?.getType() === kind,
      ),
      command(
        '노트 앞으로 이동',
        MOVE_TUFTE_NOTE_COMMAND,
        'previous',
        $note,
        note => note.getPreviousSibling() !== null,
      ),
      command(
        '노트 뒤로 이동',
        MOVE_TUFTE_NOTE_COMMAND,
        'next',
        $note,
        note => note.getNextSibling() !== null,
      ),
    ]);
  }

  function insertNotes() {
    return (['sidenote', 'marginnote'] as const).map(kind =>
      command(
        kind === 'sidenote' ? '사이드노트 삽입' : '마진노트 삽입',
        INSERT_TUFTE_NOTE_COMMAND,
        kind,
        node => {
          const parent = $ancestor(node, 'paragraph', 'listitem');
          if (
            !parent ||
            $getContainingNote(node) ||
            !$allows(parent, 'tufte-' + kind)
          )
            return null;
          return node.is(parent) || node.getParent()?.is(parent) ? node : null;
        },
      ),
    );
  }

  function changeBlock($block: ResolveTarget, type: 'paragraph' | 'h2' | 'h3') {
    const nodeType = type === 'paragraph' ? 'paragraph' : 'heading';
    return command(
      type === 'paragraph'
        ? '문단으로 바꾸기'
        : type.toUpperCase() + ' 제목으로 바꾸기',
      SET_TUFTE_BLOCK_COMMAND,
      type,
      $block,
      (block, clicked) => {
        const parent = block.getParent();
        return (
          !$getContainingNote(clicked) &&
          parent !== null &&
          $allows(parent, nodeType) &&
          $isElementNode(block) &&
          block.getChildren().every(child => $allowsType(child, nodeType)) &&
          (type === 'paragraph' ||
            !('getTag' in block) ||
            typeof block.getTag !== 'function' ||
            block.getTag() !== type)
        );
      },
    );
  }

  function $allowsType(child: LexicalNode, parentType: string): boolean {
    return Boolean(NODE_SCHEMA[parentType]?.children?.includes($type(child)));
  }

  const $epigraphItem: ResolveTarget = node => {
    const quote = $quote(node);
    return quote?.getParent()?.getType() === 'tufte-epigraph' ? quote : null;
  };
  return {
    register,
    items: [
      new NodeContextMenuSeparator(),
      ...insertNotes(),
      noteGroup('사이드노트', 'tufte-sidenote'),
      noteGroup('마진노트', 'tufte-marginnote'),
      new NodeContextMenuGroup('문단', [
        changeBlock($paragraph, 'h2'),
        changeBlock($paragraph, 'h3'),
      ]),
      new NodeContextMenuGroup('제목', [
        changeBlock($heading, 'paragraph'),
        changeBlock($heading, 'h2'),
        changeBlock($heading, 'h3'),
      ]),
      new NodeContextMenuGroup('그림', [
        command(
          '그림을 본문 폭으로',
          SET_TUFTE_FIGURE_WIDTH_COMMAND,
          'body',
          $figure,
          figure => figure instanceof FigureNode,
          'node',
        ),
        command(
          '그림을 전체 폭으로',
          SET_TUFTE_FIGURE_WIDTH_COMMAND,
          'fullwidth',
          $figure,
          figure => figure instanceof FigureNode,
          'node',
        ),
      ]),
      new NodeContextMenuGroup('인용문', [
        command(
          '인용 출처 추가',
          APPEND_TUFTE_ATTRIBUTION_COMMAND,
          undefined,
          $quote,
          quote => {
            const parent = quote.getParent();
            return (
              parent !== null &&
              $allows(parent, 'quote') &&
              !$attribution(quote)
            );
          },
        ),
        command(
          '인용 출처 삭제',
          REMOVE_TUFTE_QUOTATION_COMMAND,
          'attribution',
          $attribution,
        ),
      ]),
      new NodeContextMenuGroup('제사 (Epigraph)', [
        command(
          '다음 인용문 추가',
          APPEND_TUFTE_EPIGRAPH_ITEM_COMMAND,
          undefined,
          $epigraphItem,
        ),
        command(
          '인용문 위로 이동',
          MOVE_TUFTE_EPIGRAPH_ITEM_COMMAND,
          'up',
          $epigraphItem,
          quote => quote.getPreviousSibling()?.getType() === 'quote',
        ),
        command(
          '인용문 아래로 이동',
          MOVE_TUFTE_EPIGRAPH_ITEM_COMMAND,
          'down',
          $epigraphItem,
          quote => quote.getNextSibling()?.getType() === 'quote',
        ),
      ]),
      new NodeContextMenuGroup('섹션', [
        command(
          '다음 Tufte 섹션 추가',
          INSERT_TUFTE_SECTION_COMMAND,
          undefined,
          $section,
        ),
        command(
          '이 블록 앞에서 섹션 나누기',
          SPLIT_TUFTE_SECTION_COMMAND,
          undefined,
          $sectionBlock,
          $isElementNode,
        ),
        command(
          '다음 섹션과 합치기',
          MERGE_TUFTE_SECTION_COMMAND,
          undefined,
          $section,
          section => section.getNextSibling()?.getType() === 'tufte-section',
        ),
      ]),
      new NodeContextMenuGroup('문서', [
        command(
          '본문을 Tufte 섹션으로 묶기',
          WRAP_TUFTE_ROOT_COMMAND,
          undefined,
          $clicked,
          node =>
            !$getContainingNote(node) &&
            $getRoot()
              .getChildren()
              .every(child => $allowsType(child, 'tufte-section')),
        ),
      ]),
    ],
  };
}
