import {validateDocument,type JsonNode,type Diagnostic,type ElementFields} from '@lexical-tufte/document';
import {validateRenderProfile} from './profile.js';
import {element,serializeHTML,type RenderChild,type RenderElement} from './tree.js';
export {element,serializeHTML,type RenderElement,type RenderChild} from './tree.js';
export {parseDocument,validateDocument,isSafeURL,type TufteDocument,type JsonNode,type Diagnostic,type AssetRef} from '@lexical-tufte/document';
export {RENDER_PROFILE} from './profile.js';
export {escapeHTML} from './tree.js';
export type RenderResult={ok:true;html:string;diagnostics:Diagnostic[]}|{ok:false;html:null;diagnostics:Diagnostic[]};
export function renderArticle(input:unknown,options:{idPrefix?:string}={}):RenderResult{
 const result=validateDocument(input);if(!result.ok)return {ok:false,html:null,diagnostics:result.diagnostics};
 const capabilities=validateRenderProfile(result.document);if(capabilities.length)return {ok:false,html:null,diagnostics:capabilities};
 const doc=result.document,prefix=options.idPrefix??doc.id;
 if(typeof prefix!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(prefix))return {ok:false,html:null,diagnostics:[{code:'INVALID_ID_PREFIX',path:'options.idPrefix',message:'Invalid article namespace'}]};
 const attrs=(n:ElementFields):Record<string,string>=>({
  ...(n.direction?{dir:String(n.direction)}:{}),
  ...(n.format&&typeof n.format==='string'?{class:`tufte-align-${n.format}`}:{}),
 });
 const withClass=(n:ElementFields,cls:string):Record<string,string>=>{
  const base=attrs(n);return {...base,class:base.class?`${cls} ${base.class}`:cls};
 };
 function render(n:JsonNode):RenderChild[]{
  const inner=():RenderChild[]=>'children'in n?n.children.flatMap(render):[];
  switch(n.type){
   case 'root':return inner();
   case 'tufte-section':return [element('section',attrs(n),inner())];
   case 'paragraph':return [element('p',attrs(n),inner())];
   case 'text':{
    let child:RenderChild=element('span',{class:'tufte-pre-wrap'},[String(n.text)]);
    for(const [flag,tag] of [[16,'code'],[1,'strong'],[2,'em'],[4,'s'],[8,'u'],[32,'sub'],[64,'sup'],[128,'mark']] as const)
     if((Number(n.format)&flag)!==0)child=element(tag,{},[child]);
    return [child];
   }
   case 'linebreak':return [element('br',{},[],true)];
   case 'link':{
    const rel=new Set(String(n.rel??'').split(/\s+/).filter(Boolean));
    if(n.target==='_blank'){rel.add('noopener');rel.add('noreferrer');}
    return [element('a',{href:String(n.url),...(n.target?{target:String(n.target)}:{}),
     ...(n.title?{title:String(n.title)}:{}),...(rel.size?{rel:[...rel].join(' ')}:{}),...attrs(n)},inner())];
   }
   case 'tufte-inline-image':return [element('img',{src:String(n.src),alt:String(n.alt)},[],true)];
   case 'tufte-note':{
    const id=`tufte-${prefix.length}-${prefix}-${n.noteId}`,kind=String(n.kind);
    return [element('span',{'data-tufte-note':String(n.noteId)},[
     element('label',{for:id,class:`margin-toggle${kind==='sidenote'?' sidenote-number':''}`},kind==='marginnote'?['⊕']:[]),
     element('input',{id,type:'checkbox',class:'margin-toggle'},[],true),
     element('span',withClass(n,kind),inner()),
    ])];
   }
   case 'tufte-figure':return [element('figure',n.width==='fullwidth'?withClass(n,'fullwidth'):attrs(n),inner())];
   case 'tufte-caption':return [element('figcaption',attrs(n),inner())];
   case 'tufte-table-layout':{
    const table=render(n.children![0]!)[0] as RenderElement;
    if(n.layout==='scroll')return [element('div',withClass(n,'table-wrapper'),[table])];
    if(n.layout==='fullwidth')return [element('table',{...table.attrs,class:[table.attrs.class,'fullwidth'].filter(Boolean).join(' ')},table.children)];
    return [table];
   }
   case 'table':return [element('table',attrs(n),[element('tbody',{},inner())])];
   case 'tablerow':return [element('tr',attrs(n),inner())];
   case 'tablecell':{
    const header=Number(n.headerState),tag=header?'th':'td';
    return [element(tag,{...(header===1?{scope:'col'}:header===2?{scope:'row'}:{}),...attrs(n)},inner())];
   }
   default:throw Error('Validated node has no renderer');
  }
 }
 const root=doc.lexicalState.root;
 const rootClass=`tufte-article${root.format?` tufte-align-${root.format}`:''}`;
 const article=element('article',{
  id:`${prefix}-article`,lang:doc.locale,class:rootClass,
  ...(root.direction?{dir:String(root.direction)}:{}),
 },[element('h1',{},[doc.title]),
 ...(doc.subtitle!==undefined?[element('p',{class:'subtitle'},[doc.subtitle])]:[]),
 ...render(root)]);
 return {ok:true,html:serializeHTML(article),diagnostics:[]};
}
