import {AuthorizedRecoveryService} from './recoveryHost.js';
import {handleRecoveryRequest,type RecoveryHttpRequest} from './recoveryHttp.js';

export type RecoveryFetchSecurity={
 /** Authenticate request and verify origin/CSRF for mutations; never trust client-supplied identity. */
 authorizeRequest:(request:Request)=>boolean|Promise<boolean>;
};
const json=(status:number,body:unknown)=>new Response(JSON.stringify(body),{
 status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}
});
const error=(status:number,code:string)=>json(status,{ok:false,diagnostics:[{code,path:'$.recovery',message:code}]});
/** Fetch Request/Response adapter for a host route; no listener or user authentication is bundled. */
export async function handleRecoveryFetch(
 service:AuthorizedRecoveryService,request:Request,security:RecoveryFetchSecurity
):Promise<Response>{
 if(!security||typeof security.authorizeRequest!=='function')
  return error(403,'RECOVERY_REQUEST_DENIED');
 let allowed=false;
 try{allowed=await security.authorizeRequest(request);}catch{return error(403,'RECOVERY_REQUEST_DENIED');}
 if(!allowed)return error(403,'RECOVERY_REQUEST_DENIED');
 const url=new URL(request.url);
 const match=/^\/posts\/([^/]+)\/recoveries(?:\/([^/]+))?$/.exec(url.pathname);
 if(!match)return error(404,'RECOVERY_ROUTE_NOT_FOUND');
 let postId:string,sessionId:string|undefined;
 try{
  postId=decodeURIComponent(match[1]);
  sessionId=match[2]===undefined?undefined:decodeURIComponent(match[2]);
 }catch{return error(400,'INVALID_RECOVERY_INPUT');}
 if(!['GET','PUT','DELETE'].includes(request.method))return error(405,'RECOVERY_METHOD_NOT_ALLOWED');
 if(request.method!=='GET'&&sessionId===undefined)return error(405,'RECOVERY_METHOD_NOT_ALLOWED');
 let body:unknown;
 if(request.method!=='GET'){
  const length=request.headers.get('content-length');
  if(length!==null&&(!/^\d+$/.test(length)||Number(length)>2_100_000))return error(413,'RECOVERY_REQUEST_TOO_LARGE');
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return error(415,'RECOVERY_CONTENT_TYPE_UNSUPPORTED');
  try{
   const raw=await request.text();
   if(new TextEncoder().encode(raw).length>2_100_000)return error(413,'RECOVERY_REQUEST_TOO_LARGE');
   body=JSON.parse(raw);
  }catch{return error(400,'INVALID_RECOVERY_JSON');}
 }
 const operation:RecoveryHttpRequest={method:request.method as RecoveryHttpRequest['method'],postId,sessionId,body};
 const result=await handleRecoveryRequest(service,operation);
 return json(result.status,result.body);
}
