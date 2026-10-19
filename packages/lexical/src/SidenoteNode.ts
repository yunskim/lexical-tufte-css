import {$applyNodeReplacement,type NodeKey} from 'lexical';
import {NoteNode} from './NoteNode.js';

/** Numbered note: distinct Lexical node type, not a kind flag. */
export class SidenoteNode extends NoteNode {
 static getType():string{return 'tufte-sidenote';}
 static clone(node:SidenoteNode):SidenoteNode{return new SidenoteNode(node.__noteId,node.__key);}
 constructor(noteId:string,key?:NodeKey){super(noteId,'sidenote',key);}
 exportJSON(){const json=super.exportJSON();return {...json,type:'tufte-sidenote' as const};}
 static importJSON(value:ReturnType<SidenoteNode['exportJSON']>):SidenoteNode{
  if(value.version!==1||value.type!=='tufte-sidenote')throw Error('Invalid sidenote');
  return $createSidenoteNode(value.noteId).updateFromJSON(value);
 }
}
export function $createSidenoteNode(id:string):SidenoteNode{
 return $applyNodeReplacement(new SidenoteNode(id));
}
