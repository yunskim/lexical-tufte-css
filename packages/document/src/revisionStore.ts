import type {Result} from './types.js';
import {validatePostRecordV2,type PostRecordV2} from './metadata.js';
import {preparePostRevisionV2} from './revision.js';

export type PostRevisionStoreV2={
 /** Must compare revision and replace atomically, including across processes. */
 compareAndSwap(next:PostRecordV2,expectedRevision:number):Promise<Result<PostRecordV2>>;
};

/**
 * Reference adapter for tests and a single JS process only. Not durable and
 * not safe across processes: production adapters require transactional CAS.
 */
export class InMemoryPostRevisionStoreV2 implements PostRevisionStoreV2{
 private current:PostRecordV2;
 constructor(initial:unknown){
  const checked=validatePostRecordV2(initial);
  if(!checked.ok)throw new Error('Invalid initial v2 post: '+JSON.stringify(checked.diagnostics));
  this.current=checked.value;
 }
 read():PostRecordV2{return structuredClone(this.current);}
 async compareAndSwap(next:PostRecordV2,expectedRevision:number):Promise<Result<PostRecordV2>>{
  // No await between reading current and installing next: synchronous critical section.
  const prepared=preparePostRevisionV2(this.current,next,expectedRevision);
  if(!prepared.ok)return prepared;
  this.current=structuredClone(prepared.value.record);
  return {ok:true,value:this.read(),diagnostics:[]};
 }
}
