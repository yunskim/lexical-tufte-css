import type {Diagnostic,JsonNode,TufteDocument} from '@lexical-tufte/document';
export const RENDER_PROFILE='p1-v1' as const;
const supported=new Set(['root','tufte-section','paragraph','heading','horizontalrule','list','listitem','tufte-definition-list','tufte-term','tufte-definition','quote','tufte-epigraph','tufte-attribution','tufte-cite','tufte-section-footer','tufte-fullwidth','tufte-code','tufte-embed','tab','code-highlight','tufte-span','text','linebreak','link','host-link','tufte-sidenote','tufte-marginnote','tufte-inline-image','tufte-imagequilt','tufte-figure','tufte-caption','tufte-table-layout','table','tablerow','tablecell']);
/** Called only after shared structural validation succeeds. */
export function validateRenderProfile(doc:TufteDocument):Diagnostic[]{
 const diagnostics:Diagnostic[]=[];
 function visit(n:JsonNode,path:string,listDepth=0){
  const add=(key:string,message:string)=>{if(diagnostics.length<100)diagnostics.push({code:'UNSUPPORTED_RENDER_PROPERTY',path:path+(key?'.'+key:''),message});};
  if(!supported.has(n.type)){if(diagnostics.length<100)diagnostics.push({code:'UNSUPPORTED_RENDER_NODE',path:path+'.type',message:`${n.type} has schema but no ${RENDER_PROFILE} renderer`});return;}
  // Root has no dedicated HTML wrapper; do not discard its presentation fields.
  if(n.type==='root')for(const key of ['direction','format'] as const)if(n[key])add(key,'Root presentation is not yet published');
  if('children'in n){
   // Lexical serializes structural list depth as listitem.indent. Nesting
   // already expresses that depth in HTML; other indentation stays unsupported.
   if(n.indent&&!(n.type==='listitem'&&n.indent===listDepth-1))add('indent','Indent output is deferred or inconsistent with list nesting');
   for(const [i,child]of n.children.entries())visit(child,`${path}.children[${i}]`,listDepth+(n.type==='list'?1:0));
  }
  // HTML does not represent unordered list numbering or per-item values.
  if(n.type==='list'){
   if(n.tag==='ul'&&n.start!==1)add('start','Unordered list start cannot be represented in HTML publication');
   for(const [i,item] of n.children.entries()){
    if(item.type==='listitem'&&n.tag==='ul'&&item.value!==1&&diagnostics.length<100){
     diagnostics.push({code:'UNSUPPORTED_RENDER_PROPERTY',path:`${path}.children[${i}].value`,message:'Unordered list item value cannot be represented in HTML publication'});
    }
   }
  }
  if(n.type==='tufte-code'&&n.language!==undefined&&n.language!==null)add('language','Code language metadata is not yet published');
  if(n.type==='code-highlight')add('highlightType','Code syntax highlighting is not yet published');
  if(n.type==='tufte-table-layout'&&n.layout!=='scroll'&&(n.format||n.direction))add('','Unwrapped layout attributes must be defaults');
  if(n.type==='tufte-inline-image')for(const key of ['assetId','width','height'] as const)if(n[key]!==undefined)add(key,'Managed/sized image output is deferred');
  if(n.type==='table'){
   if(n.rowStriping)add('rowStriping','Table striping is deferred');
   if(n.frozenColumnCount)add('frozenColumnCount','Frozen columns are deferred');
   if(n.frozenRowCount)add('frozenRowCount','Frozen rows are deferred');
   if(n.colWidths!==undefined)add('colWidths','Explicit table sizing is deferred');
  }
  if(n.type==='tablerow'&&n.height!==undefined)add('height','Explicit row sizing is deferred');
  if(n.type==='tablecell'){if(n.width!==undefined)add('width','Explicit cell sizing is deferred');if(n.verticalAlign!==undefined)add('verticalAlign','Cell alignment is deferred');}
 }
 visit(doc.lexicalState.root,'$.lexicalState.root');return diagnostics;
}
