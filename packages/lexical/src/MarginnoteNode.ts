import {$applyNodeReplacement,type NodeKey} from 'lexical';
import {NoteNode} from './NoteNode.js';

/** Unnumbered margin annotation with its own Lexical node identity. */
export class MarginnoteNode extends NoteNode {
 static getType():string{return 'tufte-marginnote';}
 static clone(node:MarginnoteNode):MarginnoteNode{return new MarginnoteNode(node.__noteId,node.__key);}
 constructor(noteId:string,key?:NodeKey){super(noteId,'marginnote',key);}
 exportJSON(){return {...super.exportJSON(),type:'tufte-marginnote' as const};}
 static importJSON(value:ReturnType<MarginnoteNode['exportJSON']>):MarginnoteNode{
  if(value.version!==1||value.type!=='tufte-marginnote')throw Error('Invalid marginnote');
  return $createMarginnoteNode(value.noteId).updateFromJSON(value);
 }
}
export function $createMarginnoteNode(id:string):MarginnoteNode{
 return $applyNodeReplacement(new MarginnoteNode(id));
}
