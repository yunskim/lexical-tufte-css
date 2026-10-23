export type Diagnostic={code:string;path:string;message:string};
export type Result<T>={ok:true;value:T;diagnostics:Diagnostic[]}|{ok:false;diagnostics:Diagnostic[]};
export type Alignment=''|'left'|'center'|'right'|'justify'|'start'|'end';
export type ElementFields={direction?:null|'ltr'|'rtl';format?:Alignment;indent?:number;textFormat?:number;textStyle?:string};
interface ElementBase<T extends string> extends ElementFields {type:T;version:1;children:JsonNode[]}
type Element<T extends string,P={}> = ElementBase<T>&P;
type Text<T extends string='text',P={}>={type:T;version:1;text:string;format:number;detail?:0|2;mode?:'normal';style?:''}&P;
export type ImageFields={src:string;alt:string;assetId?:string;width?:number;height?:number};
export type JsonNode=
 | Element<'root'|'tufte-section'|'tufte-caption'|'tufte-epigraph'|'tufte-attribution'|'tufte-cite'|'tufte-section-footer'|'tufte-definition-list'|'tufte-term'|'tufte-definition'|'tufte-fullwidth'>
 | Element<'paragraph',{tufteClass?:'sans'}>
 | Element<'quote',{cite?:string}>
 | Element<'heading',{tag:'h2'|'h3';id?:string}>
 | Element<'list',{listType:'bullet'|'number';tag:'ul'|'ol';start:number}>
 | Element<'listitem',{value:number;checked?:undefined}>
 | Element<'link',{url:string;rel?:string|null;target?:'_blank'|'_self'|null;title?:string|null}>
 | Element<'tufte-sidenote'|'tufte-marginnote',{noteId:string}>
 | Element<'tufte-span',{kind:'sans'|'newthought'|'numeral'|'danger'}>
 | Element<'tufte-figure',{width:'body'|'fullwidth'}>
 | Element<'tufte-table-layout',{layout:'body'|'fullwidth'|'scroll'}>
 | Element<'table',{colWidths?:number[];rowStriping?:boolean;frozenColumnCount?:number;frozenRowCount?:number}>
 | Element<'tablerow',{height?:number}>
 | Element<'tablecell',{headerState:0|1|2|3;colSpan?:number;rowSpan?:number;backgroundColor?:null;verticalAlign?:'top'|'middle'|'bottom';width?:number}>
 | Element<'tufte-code',{width:'body'|'fullwidth';language?:string|null}>
 | Text | Text<'tab'> | Text<'code-highlight',{highlightType:string|null}>
 | {type:'linebreak'|'horizontalrule';version:1}
 | ({type:'tufte-inline-image'|'tufte-imagequilt';version:1}&ImageFields)
 | {type:'tufte-embed';version:1;provider:'youtube'|'vimeo';src:string;title:string;wrapper:'figure'|'div';width:'body'|'fullwidth';aspectRatio:number};
export type AssetRef={id:string;src:string;mimeType:string;alt?:string;width?:number;height?:number;byteLength?:number;sha256?:string};
export type TufteDocument={schemaVersion:1;id:string;locale:string;title:string;titleId?:string;subtitle?:string;lexicalState:{root:Element<'root'>};assets:AssetRef[]};
export type PostMetadata={slug:string;summary:string;tags:string[];authors:string[];status:'draft'|'published'|'archived';createdAt:string;updatedAt:string;publishedAt?:string;revision:number};
export type PostRecord={document:TufteDocument;metadata:PostMetadata};
export type ValidationResult={ok:true;document:TufteDocument;diagnostics:Diagnostic[]}|{ok:false;diagnostics:Diagnostic[]};
