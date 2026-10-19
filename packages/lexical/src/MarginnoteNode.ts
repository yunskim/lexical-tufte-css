import {$applyNodeReplacement,type NodeKey} from 'lexical';
import {isIdentifier} from '@lexical-tufte/document';
import {NoteNode,type SerializedNoteNode} from './NoteNode.js';

export class MarginnoteNode extends NoteNode {
 static getType():string{return 'tufte-marginnote';}
 static clone(node:MarginnoteNode):MarginnoteNode{return new MarginnoteNode(node.__noteId,node.__key);}
 constructor(noteId:string,key?:NodeKey){super(noteId,key);}
 exportJSON():SerializedNoteNode{return {...super.exportJSON(),type:'tufte-marginnote'};}
 static importJSON(value:SerializedNoteNode):MarginnoteNode{
  if(value.version!==1||value.type!=='tufte-marginnote'||!isIdentifier(value.noteId))
   throw Error('Invalid marginnote');
  return $createMarginnoteNode(value.noteId).updateFromJSON(value);
 }
}
export function $createMarginnoteNode(id:string):MarginnoteNode{
 if(!isIdentifier(id))throw Error('Invalid note ID');
 return $applyNodeReplacement(new MarginnoteNode(id));
}
