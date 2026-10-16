import {
  $applyNodeReplacement, ElementNode, isHTMLElement,
  type EditorConfig, type LexicalEditor, type NodeKey,
  type SerializedElementNode, type DOMExportOutput,
} from 'lexical';

export type NoteKind = 'sidenote' | 'marginnote';
export type SerializedNoteNode = SerializedElementNode & {
  type: 'tufte-note'; version: 1; noteId: string; kind: NoteKind;
};

/** Inline prototype. Rich phrasing content shares the main editor's selection. */
export class NoteNode extends ElementNode {
  __noteId: string;
  __kind: NoteKind;
  static getType(): string { return 'tufte-note'; }
  static clone(node: NoteNode): NoteNode {
    return new NoteNode(node.__noteId, node.__kind, node.__key);
  }
  constructor(noteId = '', kind: NoteKind = 'sidenote', key?: NodeKey) {
    super(key); this.__noteId = noteId; this.__kind = kind;
  }
  getNoteId(): string { return this.getLatest().__noteId; }
  setNoteId(id: string): this { this.getWritable().__noteId = id; return this; }
  extractWithChild(): true { return true; }
  getKind(): NoteKind { return this.getLatest().__kind; }
  isInline(): true { return true; }
  canBeEmpty(): false { return false; }
  createDOM(_config: EditorConfig): HTMLElement {
    const span = document.createElement('span');
    span.className = 'tufte-note-editor';
    span.dataset.noteId = this.__noteId;
    span.dataset.kind = this.__kind;
    return span;
  }
  updateDOM(previous: NoteNode, dom: HTMLElement): false {
    if (previous.__noteId !== this.__noteId) dom.dataset.noteId = this.__noteId;
    if (previous.__kind !== this.__kind) dom.dataset.kind = this.__kind;
    return false;
  }
  exportJSON(): SerializedNoteNode {
    return {...super.exportJSON(), type: 'tufte-note', version: 1,
      noteId: this.getNoteId(), kind: this.getKind()};
  }
  static importJSON(value: SerializedNoteNode): NoteNode {
    if (value.version !== 1 || !/^[a-zA-Z0-9_-]+$/.test(value.noteId)
      || !['sidenote', 'marginnote'].includes(value.kind)) {
      throw new Error('Unsupported or invalid Tufte note');
    }
    return $createNoteNode(value.noteId, value.kind).updateFromJSON(value);
  }
  exportDOM(_editor: LexicalEditor): DOMExportOutput {
    const element = document.createElement('span');
    element.dataset.tufteNote = this.getNoteId();
    const id = `prototype-${this.getNoteId()}`;
    const kind = this.getKind();
    return {element, after: (generated) => {
      if (!isHTMLElement(generated)) return generated;
      const payload = document.createElement('span');
      payload.className = kind;
      while (generated.firstChild) payload.append(generated.firstChild);
      const label = document.createElement('label');
      label.htmlFor = id;
      label.className = kind === 'sidenote' ? 'margin-toggle sidenote-number' : 'margin-toggle';
      label.textContent = kind === 'marginnote' ? '⊕' : '';
      const input = document.createElement('input');
      input.id = id; input.type = 'checkbox'; input.className = 'margin-toggle';
      generated.append(label, input, payload);
      return generated;
    }};
  }
}
export function $createNoteNode(id: string, kind: NoteKind = 'sidenote'): NoteNode {
  return $applyNodeReplacement(new NoteNode(id, kind));
}
