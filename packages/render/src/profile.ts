import type {Diagnostic,JsonNode,TufteDocument} from '@lexical-tufte/document';
export const RENDER_PROFILE='p1-v1' as const;
const supported=new Set(['root','tufte-section','paragraph','heading','horizontalrule','list','listitem','tufte-definition-list','tufte-term','tufte-definition','quote','tufte-epigraph','tufte-attribution','tufte-cite','tufte-section-footer','tufte-fullwidth','tufte-code','tufte-embed','tab','code-highlight','tufte-span','text','linebreak','link','tufte-note','tufte-inline-image','tufte-imagequilt','tufte-figure','tufte-caption','tufte-table-layout','table','tablerow','tablecell']);
/** Called only after shared structural validation succeeds. */
export function validateRenderProfile(doc:TufteDocument):Diagnostic[]{
 const diagnostics:Diagnostic[]=[];
 function visit(n:JsonNode,path:string){
  const add=(key:string,message:string)=>{if(diagnostics.length<100)diagnostics.push({code:'UNSUPPORTED_RENDER_PROPERTY',path:path+(key?'.'+key:''),message});};
  if(!supported.has(n.type)){if(diagnostics.length<100)diagnostics.push({code:'UNSUPPORTED_RENDER_NODE',path:path+'.type',message:`${n.type} has schema but no ${RENDER_PROFILE} renderer`});return;}
  if('children'in n){if(n.indent)add('indent','Indent output is deferred');for(const [i,child]of n.children.entries())visit(child,`${path}.children[${i}]`);}
  if(n.type==='tufte-code'&&n.language!==undefined&&n.language!==null)add('language','Code language metadata is not yet published');
  if(n.type==='code-highlight')add('highlightType','Code syntax highlighting is not yet published');
  if(n.type==='tufte-table-layout'&&n.layout!=='scroll'&&(n.format||n.direction))add('','Unwrapped layout attributes must be defaults');
  if(n.type==='tufte-inline-image')for(const key of ['assetId','width','height'] as const)if(n[key]!==undefined)add(key,'Managed/sized image output is deferred');
  if(n.type==='tufte-figure'&&(n.children.length>2||n.children.some(c=>c.type==='tufte-note')))add('children','Figure margin note renderer is deferred');
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
