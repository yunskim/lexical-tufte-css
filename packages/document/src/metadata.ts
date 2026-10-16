import type {Diagnostic,PostMetadata,PostRecord,Result} from './types.js';
import {isRecord} from './schema.js';
import {validateDocument} from './validate.js';
/** Strict calendar timestamp with explicit offset; Date.parse alone normalizes invalid dates. */
export function isTimestamp(value:unknown):value is string{
 if(typeof value!=='string')return false;
 const m=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|([+-])(\d{2}):(\d{2}))$/.exec(value);
 if(!m)return false;
 const [year,month,day,hour,minute,second]=m.slice(1,7).map(Number);
 const leap=year%4===0&&(year%100!==0||year%400===0);
 const days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
 const offsetHour=Number(m[9]??0),offsetMinute=Number(m[10]??0);
 return year>=1&&month>=1&&month<=12&&day>=1&&day<=days[month-1]&&hour<=23&&minute<=59&&second<=59&&offsetHour<=14&&offsetMinute<=59&&(offsetHour!==14||offsetMinute===0)&&Number.isFinite(Date.parse(value));
}
export function validateMetadata(input:unknown):Result<PostMetadata>{
 const diagnostics:Diagnostic[]=[];const add=(code:string,key:string,message:string)=>diagnostics.push({code,path:`$.${key}`,message});
 if(!isRecord(input)||!Object.values(Object.getOwnPropertyDescriptors(input)).every(d=>'value'in d))return {ok:false,diagnostics:[{code:'INVALID_METADATA',path:'$',message:'Expected plain metadata object'}]};
 for(const key of Object.keys(input))if(!['slug','summary','tags','authors','status','createdAt','updatedAt','publishedAt','revision'].includes(key))add('UNKNOWN_FIELD',key,'Unrecognized metadata field');
 if(typeof input.slug!=='string'||input.slug.length>160||input.slug!==input.slug.normalize('NFC')||! /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u.test(input.slug))add('INVALID_SLUG','slug','Expected NFC letters/numbers separated by hyphens');
 if(typeof input.summary!=='string'||input.summary.length>2000)add('INVALID_SUMMARY','summary','Expected summary up to 2000 characters');
 for(const [key,maxCount,maxLength,minCount]of [['tags',50,64,0],['authors',20,200,1]] as const){
  const items=input[key];
  if(!Array.isArray(items)||items.length<minCount||items.length>maxCount||items.some(v=>typeof v!=='string'||v.trim()!==v||v.length===0||v.length>maxLength||v!==v.normalize('NFC'))||new Set(items).size!==items.length)add('INVALID_METADATA_LIST',key,'Invalid, duplicate or unnormalized entries');
 }
 if(!['draft','published','archived'].includes(String(input.status))||typeof input.status!=='string')add('INVALID_STATUS','status','Unsupported status');
 if(!Number.isSafeInteger(input.revision)||Number(input.revision)<1)add('INVALID_REVISION','revision','Expected positive safe integer');
 for(const key of ['createdAt','updatedAt'])if(!isTimestamp(input[key]))add('INVALID_TIMESTAMP',key,'Expected valid timestamp with timezone');
 if(input.publishedAt!==undefined&&!isTimestamp(input.publishedAt))add('INVALID_TIMESTAMP','publishedAt','Expected valid timestamp with timezone');
 if(input.status==='published'&&input.publishedAt===undefined)add('MISSING_PUBLISHED_AT','publishedAt','Published metadata needs timestamp');
 if(input.status==='draft'&&input.publishedAt!==undefined)add('INVALID_PUBLISHED_AT','publishedAt','Draft has no publication timestamp');
 if(isTimestamp(input.createdAt)&&isTimestamp(input.updatedAt)&&Date.parse(input.updatedAt)<Date.parse(input.createdAt))add('INVALID_DATE_ORDER','updatedAt','Updated timestamp precedes creation');
 if(isTimestamp(input.publishedAt)&&isTimestamp(input.createdAt)&&isTimestamp(input.updatedAt)&&(Date.parse(input.publishedAt)<Date.parse(input.createdAt)||Date.parse(input.publishedAt)>Date.parse(input.updatedAt)))add('INVALID_DATE_ORDER','publishedAt','Publication must fall between creation and update');
 return diagnostics.length?{ok:false,diagnostics}:{ok:true,value:input as PostMetadata,diagnostics};
}
export function validatePostRecord(input:unknown):Result<PostRecord>{
 if(!isRecord(input)||!Object.values(Object.getOwnPropertyDescriptors(input)).every(d=>'value'in d))return {ok:false,diagnostics:[{code:'INVALID_POST',path:'$',message:'Expected plain post object'}]};
 const diagnostics:Diagnostic[]=Object.keys(input).filter(k=>!['document','metadata'].includes(k)).map(k=>({code:'UNKNOWN_FIELD',path:`$.${k}`,message:'Unrecognized post field'}));
 const d=validateDocument(input.document),m=validateMetadata(input.metadata);
 if(!d.ok)diagnostics.push(...d.diagnostics.map(x=>({...x,path:'$.document'+x.path.slice(1)})));
 if(!m.ok)diagnostics.push(...m.diagnostics.map(x=>({...x,path:'$.metadata'+x.path.slice(1)})));
 return d.ok&&m.ok&&diagnostics.length===0?{ok:true,value:{document:d.document,metadata:m.value},diagnostics}:{ok:false,diagnostics};
}
