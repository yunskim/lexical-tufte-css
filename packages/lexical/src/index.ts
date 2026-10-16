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
export {replaceEditorDocumentState,loadDocumentIntoEditor,loadMigratedDocumentIntoEditor,exportEditorToDocument,exportEditorToDocumentV2} from './documentBridge.js';
export {DefinitionListNode,DefinitionTermNode,DefinitionDescriptionNode,$createDefinitionListNode,$createDefinitionTermNode,$createDefinitionDescriptionNode} from './DefinitionListNodes.js';
export {EpigraphNode,AttributionNode,CiteNode,$createEpigraphNode,$createAttributionNode,$createCiteNode} from './QuotationNodes.js';
export {SectionFooterNode,$createSectionFooterNode} from './SectionFooterNode.js';
export {FullwidthNode,$createFullwidthNode} from './FullwidthNode.js';
export {TufteCodeNode,$createTufteCodeNode,type CodeWidth,type SerializedTufteCode} from './CodeBlockNode.js';
export {ImageQuiltNode,$createImageQuiltNode,type SerializedImageQuilt} from './ImageQuiltNode.js';
export {EmbedNode,$createEmbedNode,type EmbedProvider,type EmbedWrapper,type SerializedEmbed} from './EmbedNode.js';
export {TUFTE_NODES,TUFTE_NODE_CLASSES,TUFTE_NODE_TYPES,TESTED_LEXICAL_VERSION} from './nodes.js';
export {TufteCodeHighlightNode,$createTufteCodeHighlightNode,type SerializedTufteCodeHighlight} from './CodeHighlightNode.js';

export {$inspectEditorStructure,inspectEditorStructure,focusStructureIssue,type StructureIssue} from './structureRecovery.js';

export {registerSectionCommands,WRAP_TUFTE_ROOT_COMMAND,INSERT_TUFTE_SECTION_COMMAND,SPLIT_TUFTE_SECTION_COMMAND,MERGE_TUFTE_SECTION_COMMAND,SET_TUFTE_BLOCK_COMMAND,type TufteBlockType} from './sectionCommands.js';

export {registerInlineCommands,SET_TUFTE_SPAN_KIND_COMMAND} from './inlineCommands.js';
