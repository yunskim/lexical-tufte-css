import type {Reference,ReferenceProvider} from './index.js';
import {ReferenceSelection} from './referenceSelection.js';

export type ReferencePickerOptions={
 container:HTMLElement;
 provider:ReferenceProvider;
 /** Called only after the selected reference has been re-resolved. */
 onSelect:(reference:{namespace:string;kind:'document'|'note'|'task'|'asset';id:string})=>void;
 onError?:(error:unknown)=>void;
};

/** Minimal host-neutral DOM picker. Host owns the container and styling. */
export function mountReferencePicker({container,provider,onSelect,onError}:ReferencePickerOptions):()=>void{
 const controller=new ReferenceSelection(provider);
 let disposed=false;
 let pageCursor:string|null=null;
 let query='';
 const root=document.createElement('div');
 root.className='tufte-reference-picker';
 const search=document.createElement('input');
 search.type='search';
 search.placeholder='Search documents, notes, tasks, assets';
 search.setAttribute('aria-label','Search internal references');
 const status=document.createElement('p');
 status.setAttribute('role','status');
 const list=document.createElement('ul');
 const more=document.createElement('button');
 more.type='button';more.textContent='More';more.hidden=true;
 root.append(search,status,list,more);
 container.append(root);

 const render=(items:Reference[],append:boolean)=>{
  if(!append)list.replaceChildren();
  for(const item of items){
   if(item.kind==='external')continue;
   const li=document.createElement('li');
   const button=document.createElement('button');
   button.type='button';button.textContent=item.title;
   button.setAttribute('aria-label',item.title+' ('+item.kind+')');
   button.addEventListener('click',async()=>{
    button.disabled=true;
    try{
     const reference=await controller.choose(item);
     if(disposed)return;
     if(reference)onSelect(reference);
     else status.textContent='Reference is no longer available';
    }catch(error){if(!disposed){status.textContent='Unable to resolve reference';onError?.(error);}}
    finally{if(!disposed)button.disabled=false;}
   });
   li.append(button);
   if(item.description){const description=document.createElement('small');description.textContent=item.description;li.append(description);}
   list.append(li);
  }
 };
 const searchPage=async(append=false)=>{
  const text=query.trim();
  if(!text){controller.cancel();list.replaceChildren();status.textContent='';more.hidden=true;return;}
  const cursor=append?pageCursor:undefined;
  status.textContent='Searching…';
  more.disabled=true;
  try{
   const page=await controller.search({text,kinds:['document','note','task','asset'],limit:20,...(cursor?{cursor}:{})});
   if(!page||disposed)return;
   render(page.items,append);
   pageCursor=page.nextCursor;
   more.hidden=!pageCursor;
   status.textContent=list.children.length?'':'No matching references';
  }catch(error){
   if(!disposed){status.textContent='Search failed';onError?.(error);}
  }finally{if(!disposed)more.disabled=false;}
 };
 search.addEventListener('input',()=>{
  query=search.value;
  pageCursor=null;
  void searchPage();
 });
 more.addEventListener('click',()=>{if(pageCursor)void searchPage(true);});
 return ()=>{disposed=true;controller.cancel();root.remove();};
}
