import {$applyNodeReplacement,type NodeKey} from 'lexical';
import {isIdentifier} from '@lexical-tufte/document';
import {NoteNode,type SerializedNoteNode} from './NoteNode.js';

export class SidenoteNode extends NoteNode {
 static getType():string{return 'tufte-sidenote';}
 static clone(node:SidenoteNode):SidenoteNode{return new SidenoteNode(node.__noteId,node.__key);}
 constructor(noteId:string,key?:NodeKey){super(noteId,key);}
 exportJSON():SerializedNoteNode{return {...super.exportJSON(),type:'tufte-sidenote'};}
 static importJSON(value:SerializedNoteNode):SidenoteNode{
  if(value.version!==1||value.type!=='tufte-sidenote'||!isIdentifier(value.noteId))
   throw Error('Invalid sidenote');
  return $createSidenoteNode(value.noteId).updateFromJSON(value);
 }
}
export function $createSidenoteNode(id:string):SidenoteNode{
 if(!isIdentifier(id))throw Error('Invalid note ID');
 return $applyNodeReplacement(new SidenoteNode(id));
}
