import type {EditorState,LexicalEditor,SerializedEditorState} from 'lexical';

/** Convert only node positions, never arbitrary user/host metadata objects. */
export function canonicalBlockType(type:string):string{
 return type==='tufte-paragraph'?'paragraph':type==='tufte-quote'?'quote':type==='tufte-heading'?'heading':type;
}
function mapState<T extends {root:unknown}>(state:T,toRuntime:boolean):T{
 const copy=structuredClone(state);
 function visit(node:Record<string,unknown>):void{
  if(toRuntime){
   if(node.type==='paragraph'&&node.tufteClass!==undefined)node.type='tufte-paragraph';
   if(node.type==='quote'&&node.cite!==undefined)node.type='tufte-quote';
   if(node.type==='heading'&&node.id!==undefined)node.type='tufte-heading';
  }else{
   if(node.type==='tufte-paragraph')node.type='paragraph';
   if(node.type==='tufte-quote')node.type='quote';
   if(node.type==='tufte-heading')node.type='heading';
  }
  if(Array.isArray(node.children))for(const child of node.children)visit(child);
 }
 visit(copy.root as unknown as Record<string,unknown>);
 return copy;
}
/** Canonical document JSON: existing paragraph/quote types, detached snapshot. */
export function exportCanonicalEditorState(state:EditorState):SerializedEditorState{
 // Persisted JSON has no own undefined properties; match disk/recovery exactly.
 return JSON.parse(JSON.stringify(mapState(state.toJSON(),false))) as SerializedEditorState;
}
/** Caller must validate stored input before parsing, as with parseEditorState. */
export function parseCanonicalEditorState(editor:LexicalEditor,state:unknown):EditorState{
 if(!state||typeof state!=='object'||Array.isArray(state)||!('root' in state)||
  !state.root||typeof state.root!=='object'||Array.isArray(state.root))
  throw Error('Expected canonical editor state root');
 return editor.parseEditorState(JSON.stringify(mapState(state,true)));
}
