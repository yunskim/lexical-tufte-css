import {ParagraphNode} from 'lexical';
import {QuoteNode} from '@lexical/rich-text';
import {TufteParagraphNode,TufteQuoteNode} from './TufteBlockNodes.js';
import {TufteHeadingNode} from './TufteHeadingNode.js';
import {ListNode,ListItemNode} from '@lexical/list';
import {LinkNode} from '@lexical/link';
import {TableNode,TableRowNode,TableCellNode} from '@lexical/table';
import {TufteCodeHighlightNode} from './CodeHighlightNode.js';
import {HorizontalRuleNode} from '@lexical/extension/HorizontalRuleExtension';
import {SectionNode,FigureNode,CaptionNode,TableLayoutNode} from './LayoutNodes.js';
import {SidenoteNode} from './SidenoteNode.js';
import {MarginnoteNode} from './MarginnoteNode.js';
import {InlineImageNode} from './InlineImageNode.js';
import {TufteSpanNode} from './TufteSpanNode.js';
import {DefinitionListNode,DefinitionTermNode,DefinitionDescriptionNode} from './DefinitionListNodes.js';
import {EpigraphNode,AttributionNode,CiteNode} from './QuotationNodes.js';
import {SectionFooterNode} from './SectionFooterNode.js';
import {FullwidthNode} from './FullwidthNode.js';
import {TufteCodeNode} from './CodeBlockNode.js';
import {ImageQuiltNode} from './ImageQuiltNode.js';
import {EmbedNode} from './EmbedNode.js';
/** Full document-schema registry. Registration does not imply renderer/UI support. */
export const TUFTE_NODE_CLASSES=Object.freeze([
 SectionNode,SidenoteNode,MarginnoteNode,InlineImageNode,TufteSpanNode,FigureNode,CaptionNode,TableLayoutNode,
 TufteHeadingNode,QuoteNode,TufteParagraphNode,TufteQuoteNode,ListNode,ListItemNode,LinkNode,TableNode,TableRowNode,TableCellNode,
 HorizontalRuleNode,DefinitionListNode,DefinitionTermNode,DefinitionDescriptionNode,
 EpigraphNode,AttributionNode,CiteNode,SectionFooterNode,FullwidthNode,TufteCodeNode,ImageQuiltNode,EmbedNode,TufteCodeHighlightNode,
]);
// Subclass replacements keep 'paragraph' and 'quote' as the wire types.
// withKlass retains built-in Lexical transforms and standard create factories.
export const TUFTE_NODES=Object.freeze([
 ...TUFTE_NODE_CLASSES,
 {replace:ParagraphNode,with:()=>new TufteParagraphNode(),withKlass:TufteParagraphNode},
 {replace:QuoteNode,with:()=>new TufteQuoteNode(),withKlass:TufteQuoteNode},
]);
export const TUFTE_NODE_TYPES=Object.freeze([...new Set(['root','paragraph','text','linebreak','tab',...TUFTE_NODE_CLASSES.map(Node=>Node.getType())])].sort());
export const TESTED_LEXICAL_VERSION='0.52.0' as const;
