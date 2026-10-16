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
export {TufteSpanNode,$createTufteSpanNode,type TufteSpanKind,type SerializedTufteSpan} from './TufteSpanNode.js';
export {loadDocumentIntoEditor,loadMigratedDocumentIntoEditor,exportEditorToDocument,exportEditorToDocumentV2} from './documentBridge.js';
export {DefinitionListNode,DefinitionTermNode,DefinitionDescriptionNode,$createDefinitionListNode,$createDefinitionTermNode,$createDefinitionDescriptionNode} from './DefinitionListNodes.js';
export {EpigraphNode,AttributionNode,CiteNode,$createEpigraphNode,$createAttributionNode,$createCiteNode} from './QuotationNodes.js';
