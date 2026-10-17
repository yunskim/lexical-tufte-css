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

export {registerInlineCommands,SET_TUFTE_SPAN_KIND_COMMAND,WRAP_TUFTE_SPAN_COMMAND,UNWRAP_TUFTE_SPAN_COMMAND} from './inlineCommands.js';

export {registerDefinitionCommands,INSERT_TUFTE_DEFINITION_LIST_COMMAND,APPEND_TUFTE_DEFINITION_PAIR_COMMAND,REMOVE_TUFTE_DEFINITION_PAIR_COMMAND,MOVE_TUFTE_DEFINITION_PAIR_COMMAND,REMOVE_TUFTE_DEFINITION_LIST_COMMAND} from './definitionCommands.js';

export {registerListKeyboardCommands,registerListCommands,INSERT_TUFTE_LIST_COMMAND,APPEND_TUFTE_LIST_ITEM_COMMAND,SET_TUFTE_LIST_KIND_COMMAND,CHANGE_TUFTE_LIST_INDENT_COMMAND,UNWRAP_TUFTE_LIST_COMMAND,type TufteListKind} from './listCommands.js';

export {registerQuotationCommands,INSERT_TUFTE_QUOTATION_COMMAND,INSERT_TUFTE_HORIZONTAL_RULE_COMMAND,APPEND_TUFTE_SECTION_CITE_COMMAND,APPEND_TUFTE_ATTRIBUTION_COMMAND,type TufteQuotationKind} from './quotationCommands.js';

export {registerFigureCommands,INSERT_TUFTE_FIGURE_COMMAND,SET_TUFTE_FIGURE_WIDTH_COMMAND,INSERT_TUFTE_FIGURE_MARGINNOTE_COMMAND,REMOVE_TUFTE_FIGURE_MARGINNOTE_COMMAND,UPDATE_TUFTE_FIGURE_MARGINNOTE_COMMAND,type UpdateFigureMarginNote,type InsertTufteFigure,type InsertFigureMarginNote} from './figureCommands.js';

export {registerCodeCommands,INSERT_TUFTE_CODE_COMMAND,type InsertTufteCode} from './codeCommands.js';
