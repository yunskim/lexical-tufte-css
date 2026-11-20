import {
  $create,
  $getDocument,
  $getState,
  $setState,
  createState,
  ParagraphNode,
} from 'lexical';

export type DocumentHeadingKind = 'title' | 'subtitle';

const kindState = createState('kind', {
  parse: (value): DocumentHeadingKind =>
    value === 'subtitle' ? 'subtitle' : 'title',
});

const idState = createState('id', {
  parse: value => (typeof value === 'string' ? value : ''),
});

/** The title and subtitle are editable peers of the document's sections. */
export class DocumentHeadingNode extends ParagraphNode {
  $config() {
    return this.config('document-heading', {
      extends: ParagraphNode,
      stateConfigs: [
        {flat: true, stateConfig: kindState},
        {flat: true, stateConfig: idState},
      ],
    });
  }

  createDOM(): HTMLElement {
    const kind = $getState(this, kindState);
    const element = $getDocument().createElement(kind === 'title' ? 'h1' : 'p');
    element.className = 'tufte-document-' + kind;
    const id = $getState(this, idState);
    if (id) element.id = id;
    return element;
  }

  updateDOM(previous: this, element: HTMLElement): boolean {
    if (
      $getState(previous, kindState, 'direct') !== $getState(this, kindState)
    ) {
      return true;
    }
    const id = $getState(this, idState);
    if (id) element.id = id;
    else element.removeAttribute('id');
    return false;
  }
}

export function $createDocumentHeadingNode(
  kind: DocumentHeadingKind,
): DocumentHeadingNode {
  return $setState($create(DocumentHeadingNode), kindState, kind);
}
