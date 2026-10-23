import type {Reference,ReferenceKind,ReferenceProvider,ReferenceQuery,SearchPage} from './index.js';

/** Host-neutral controller for a reference picker. UI frameworks provide rendering. */
export class ReferenceSelection {
 private generation=0;
 private pending:AbortController|null=null;
 constructor(private readonly provider:ReferenceProvider){}

 async search(query:ReferenceQuery):Promise<SearchPage<Reference>|null>{
  const generation=++this.generation;
  this.pending?.abort();
  const controller=new AbortController();
  this.pending=controller;
  try{
   const page=await this.provider.search(query,controller.signal);
   if(generation!==this.generation||controller.signal.aborted)return null;
   return page;
  }catch(error){
   if(controller.signal.aborted||generation!==this.generation)return null;
   throw error;
  }finally{
   if(this.pending===controller)this.pending=null;
  }
 }

 /** Resolve a selected item again: never trust stale search metadata as authority. */
 async choose(item:Reference):Promise<{namespace:string;kind:Exclude<ReferenceKind,'external'>;id:string}|null>{
  if(item.kind==='external')return null;
  const reference={namespace:item.namespace,kind:item.kind,id:item.id};
  const resolved=await this.provider.resolve(reference);
  if(!resolved||resolved.namespace!==reference.namespace||resolved.kind!==reference.kind||resolved.id!==reference.id)return null;
  return reference;
 }

 cancel():void{this.generation++;this.pending?.abort();this.pending=null;}
}
