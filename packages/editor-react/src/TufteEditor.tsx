import {createContext,useContext,useEffect,useId,useRef} from 'react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {canonicalizeDocument,type TufteDocument} from '@lexical-tufte/document';
import type {AssetProvider} from '@lexical-tufte/editor-ports';
import {exportEditorToDocument,loadDocumentIntoEditor} from '@lexical-tufte/lexical';
import {TufteComposer} from './TufteComposer.js';
import {TufteEditingSurface} from './TufteEditingSurface.js';
import {HostAssetPicker} from './HostAssetPicker.js';
import {HostAssetRefresh} from './HostAssetRefresh.js';

/**
 * The Lexical JSON inside value is the only editable document representation.
 * The host owns persistence, document metadata, upload and publication.
 *
 * onChange reports a validated detached snapshot; it is not a save acknowledgement.
 * The host should feed the snapshot back through value to keep the input controlled.
 */
export interface TufteEditorProps {
 value:TufteDocument;
 onChange?:(value:TufteDocument)=>void;
 onError?:(error:Error)=>void;
 assetAdapter?:AssetProvider;
 assetNamespace?:string;
 readonly?:boolean;
 className?:string;
 ariaLabel?:string;
}

export interface TufteAssetContextValue {
 assetAdapter?:AssetProvider;
 assetNamespace?:string;
}
const AssetContext=createContext<TufteAssetContextValue>({});

/** Provider only: an external DAM is not queried without a host integration. */
export function useTufteAssetContext():TufteAssetContextValue {
 return useContext(AssetContext);
}

function diagnosticError(stage:string,diagnostics:readonly {code:string;path:string;message:string}[]):Error {
 return new Error(stage+': '+diagnostics.map(d=>d.code+' ('+d.path+'): '+d.message).join('; '));
}

interface DocumentBindingProps {
 value:TufteDocument;
 onChange?:TufteEditorProps['onChange'];
 onError?:TufteEditorProps['onError'];
 readonly:boolean;
}

/** Owns only document synchronization and editor lifecycle, never application storage. */
function DocumentBinding({value,onChange,onError,readonly}:DocumentBindingProps){
 const [editor]=useLexicalComposerContext();
 const propsRef=useRef({value,onChange,onError});
 propsRef.current={value,onChange,onError};
 const incomingRef=useRef<string|null>(null);
 const emittedRef=useRef<string|null>(null);
 const errorRef=useRef<string|null>(null);
 const initializedRef=useRef(false);

 const report=(error:Error)=>{
  if(errorRef.current!==error.message){
   errorRef.current=error.message;
   if(propsRef.current.onError)propsRef.current.onError(error);
   else console.error(error);
  }
 };

 // Register once. Listener callbacks always see the latest host props and never
 // claim that a selection-only update changed document contents.
 useEffect(()=>editor.registerUpdateListener(({dirtyElements,dirtyLeaves})=>{
  if(!initializedRef.current||dirtyElements.size===0&&dirtyLeaves.size===0)return;
  const result=exportEditorToDocument(editor,propsRef.current.value);
  if(!result.ok){
   report(diagnosticError('Editor export rejected',result.diagnostics));
   return;
  }
  const serialized=canonicalizeDocument(result.value);
  if(!serialized.ok){
   report(diagnosticError('Editor document validation failed',serialized.diagnostics));
   return;
  }
  const key=serialized.value;
  if(key===emittedRef.current)return; // imported document or prior local change
  emittedRef.current=key;
  errorRef.current=null;
  propsRef.current.onChange?.(result.value);
 }),[editor]);

 // Run after HistoryPlugin mounts. External replacements use the existing strict
 // parser/roundtrip validator and clear undo history; rejected values keep state.
 useEffect(()=>{
  const checked=canonicalizeDocument(value);
  if(!checked.ok){
   report(diagnosticError('Invalid editor value',checked.diagnostics));
   return;
  }
  const key=checked.value;
  if(key===incomingRef.current)return;
  incomingRef.current=key;
  if(key===emittedRef.current)return; // parent acknowledged an edit, not a replacement
  // Metadata-only updates must not erase the user's undo stack.
  const live=exportEditorToDocument(editor,value);
  if(live.ok){
   const liveKey=canonicalizeDocument(live.value);
   if(liveKey.ok&&liveKey.value===key){
    emittedRef.current=key;
    initializedRef.current=true;
    return;
   }
  }
  // Set before import because Lexical publishes state updates asynchronously.
  // Import failures are fail-closed: a subsequent valid external value may recover.
  const previous=emittedRef.current;
  emittedRef.current=key;
  const result=loadDocumentIntoEditor(editor,value);
  if(!result.ok){
   emittedRef.current=previous;
   report(diagnosticError('Editor import rejected',result.diagnostics));
   return;
  }
  initializedRef.current=true;
  errorRef.current=null;
 },[editor,value]);

 useEffect(()=>{editor.setEditable(!readonly);},[editor,readonly]);
 return null;
}

const defaultTheme={
 text:{
  bold:'text-bold',italic:'text-italic',code:'text-code',
  underline:'text-underline',strikethrough:'text-strike',
  underlineStrikethrough:'text-underline-strike',highlight:'text-highlight'
 }
};

/**
 * Reusable controlled editor. The optional assetAdapter is provided through
 * context and used by the built-in note-image picker. Upload/authentication
 * stay with the host; the editor never creates an HTTP client.
 */
export function TufteEditor({
 value,onChange,onError,assetAdapter,assetNamespace,
 readonly=false,className='editor',ariaLabel='Tufte 문서 편집'
}:TufteEditorProps){
 const instanceId=useId();
 const namespace='tufte-editor-'+instanceId;
 const handleError=(error:Error)=>{
  if(onError)onError(error);
  else console.error(error);
 };
 const assets:TufteAssetContextValue={assetAdapter,assetNamespace};
 return <AssetContext.Provider value={assets}>
  <TufteComposer initialConfig={{namespace,onError:handleError,editable:!readonly,theme:defaultTheme}}>
   {assetAdapter&&assetNamespace?.trim()&&<HostAssetRefresh adapter={assetAdapter} namespace={assetNamespace}/>}
   {!readonly&&assetAdapter&&assetNamespace?.trim()&&<HostAssetPicker adapter={assetAdapter} namespace={assetNamespace}/>}
   <TufteEditingSurface className={className} ariaLabel={ariaLabel} readonly={readonly}/>
   <DocumentBinding value={value} onChange={onChange} onError={onError} readonly={readonly}/>
  </TufteComposer>
 </AssetContext.Provider>;
}
