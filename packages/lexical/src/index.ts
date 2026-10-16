/** Dependency smoke surface; Tufte nodes are implemented in P1/P2. */
export {createEditor} from "lexical";
export {createHeadlessEditor} from "@lexical/headless";
export {$createNoteNode, NoteNode, type NoteKind, type SerializedNoteNode} from './NoteNode.js';
export {$createInlineImageNode, InlineImageNode} from './InlineImageNode.js';
export {$getContainingNote,$splitNoteAtSelection,$mergeNoteWithNext,$moveNote,$insertNotePhrasing} from './noteOperations.js';
export {SectionNode,FigureNode,CaptionNode,TableLayoutNode,$createSectionNode,$createFigureNode,$createCaptionNode,$createTableLayoutNode,type FigureWidth,type TableLayout} from './LayoutNodes.js';
export {$collectNoteIds,$reidentifyPastedNotes} from './clipboardNotes.js';
export {$prepareNoteComposition,registerNoteCompositionGuard} from './noteComposition.js';
export {$insertNoteEdgeText,registerNoteEdgeTypingGuard} from './noteEdgeTyping.js';
