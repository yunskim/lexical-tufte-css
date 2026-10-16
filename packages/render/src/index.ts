import {validateDocument,type JsonNode,type Diagnostic,type ElementFields} from '@lexical-tufte/document';
import {validateRenderProfile} from './profile.js';
import {element,serializeHTML} from './tree.js';
export {element,serializeHTML,type RenderElement,type RenderChild} from './tree.js';
export {parseDocument,validateDocument,isSafeURL,type TufteDocument,type JsonNode,type Diagnostic,type AssetRef} from '@lexical-tufte/document';
export {RENDER_PROFILE} from './profile.js';
export type RenderResult={ok:true;html:string;diagnostics:Diagnostic[]}|{ok:false;html:null;diagnostics:Diagnostic[]};
export {escapeHTML} from './tree.js';
export function renderArticle(input:unknown,options:{idPrefix?:string}={}):RenderResult{
 const result=validateDocument(input);if(!result.ok)return {ok:false,html:null,diagnostics:result.diagnostics};
 const capabilities=validateRenderProfile(result.document);if(capabilities.length)return {ok:false,html:null,diagnostics:capabilities};
 const doc=result.document,prefix=options.idPrefix??doc.id;
 if(typeof prefix!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(prefix))return {ok:false,html:null,diagnostics:[{code:'INVALID_ID_PREFIX',path:'options.idPrefix',message:'Invalid article namespace'}]};
 const esc=(value:string)=>serializeHTML(value);
 const attrs=(n:ElementFields)=>`${n.direction?` dir="${esc(String(n.direction))}"`:''}${n.format&&typeof n.format==='string'?` class="tufte-align-${n.format}"`:''}`;
 function render(n:JsonNode):string{
  const inner=()=>'children'in n?n.children.map(render).join(''):'';
  switch(n.type){
   case 'root':return inner();
   case 'tufte-section':return `<section${attrs(n)}>${inner()}</section>`;
   case 'paragraph':return `<p${attrs(n)}>${inner()}</p>`;
   case 'text':{
    let html=`<span class="tufte-pre-wrap">${esc(String(n.text))}</span>`;
    for(const [flag,tag] of [[16,'code'],[1,'strong'],[2,'em'],[4,'s'],[8,'u'],[32,'sub'],[64,'sup'],[128,'mark']] as const)if((Number(n.format)&flag)!==0)html=`<${tag}>${html}</${tag}>`;
    return html;
   }
   case 'linebreak':return '<br>';
   case 'link':{
    const rel=new Set(String(n.rel??'').split(/\s+/).filter(Boolean));if(n.target==='_blank'){rel.add('noopener');rel.add('noreferrer');}
    return `<a href="${esc(String(n.url))}"${n.target?` target="${n.target}"`:''}${n.title?` title="${esc(String(n.title))}"`:''}${rel.size?` rel="${esc([...rel].join(' '))}"`:''}${attrs(n)}>${inner()}</a>`;
   }
   case 'tufte-inline-image':return `<img src="${esc(String(n.src))}" alt="${esc(String(n.alt))}">`;
   case 'tufte-note':{
    const id=`tufte-${prefix.length}-${prefix}-${n.noteId}`,kind=String(n.kind);
    return `<span data-tufte-note="${esc(String(n.noteId))}"><label for="${id}" class="margin-toggle${kind==='sidenote'?' sidenote-number':''}">${kind==='marginnote'?'⊕':''}</label><input id="${id}" type="checkbox" class="margin-toggle"><span class="${kind}"${attrs(n)}>${inner()}</span></span>`;
   }
   case 'tufte-figure':return `<figure${n.width==='fullwidth'?' class="fullwidth"':''}${attrs(n)}>${inner()}</figure>`;
   case 'tufte-caption':return `<figcaption${attrs(n)}>${inner()}</figcaption>`;
   case 'tufte-table-layout':{
    const table=render(n.children![0]!);
    return n.layout==='scroll'?`<div class="table-wrapper"${attrs(n)}>${table}</div>`:n.layout==='fullwidth'?table.replace('<table','<table class="fullwidth"'):table;
   }
   case 'table':return `<table${attrs(n)}><tbody>${inner()}</tbody></table>`;
   case 'tablerow':return `<tr${attrs(n)}>${inner()}</tr>`;
   case 'tablecell':{const header=Number(n.headerState),tag=header?'th':'td';return `<${tag}${header===1?' scope="col"':header===2?' scope="row"':''}${attrs(n)}>${inner()}</${tag}>`;}
   default:throw Error('Validated node has no renderer');
  }
 }
 const root=doc.lexicalState.root;
 const rootClass=`tufte-article${root.format?` tufte-align-${root.format}`:""}`;
 const article=element('article',{
  id:`${prefix}-article`,lang:doc.locale,class:rootClass,
  ...(root.direction?{dir:String(root.direction)}:{}),
 },[element('h1',{},[doc.title]),...(doc.subtitle!==undefined?[element('p',{class:'subtitle'},[doc.subtitle])]:[])]);
 // Existing node renderer remains a legacy HTML-string adapter until all
 // node cases have been migrated to the typed tree.
 const opening=serializeHTML(article).replace('</article>','');
 const html=opening+render(doc.lexicalState.root)+'</article>';
 return {ok:true,html,diagnostics:[]};
}
