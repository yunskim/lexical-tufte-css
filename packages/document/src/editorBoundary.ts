import type {Diagnostic,TufteDocument,ValidationResult} from './types.js';
import {validateDocument} from './validate.js';

/**
 * Explicit document/editor boundary. No silent Lexical field stripping:
 * unsupported nodes or fields are diagnostics, not lossy conversions.
 * This function does not claim Lexical runtime compatibility.
 */
export function documentToEditorJSON(input:unknown):{ok:true;state:TufteDocument['lexicalState'];diagnostics:Diagnostic[]}|{ok:false;diagnostics:Diagnostic[]}{
 const checked=validateDocument(input);
 if(!checked.ok)return {ok:false,diagnostics:checked.diagnostics};
 return {ok:true,state:structuredClone(checked.document.lexicalState),diagnostics:[]};
}
export function editorJSONToDocument(base:unknown,state:unknown):ValidationResult{
 const checked=validateDocument(base);
 if(!checked.ok)return checked;
 if(typeof state!=='object'||state===null||Array.isArray(state))return {ok:false,diagnostics:[{code:'INVALID_EDITOR_STATE',path:'$.lexicalState',message:'Expected editor state object'}]};
 const candidate={...checked.document,lexicalState:state};
 const result=validateDocument(candidate);
 if(!result.ok)return result;
 // The editor owns its mutable state; the exported document must not alias it.
 return {ok:true,document:structuredClone(result.document),diagnostics:result.diagnostics};
}
