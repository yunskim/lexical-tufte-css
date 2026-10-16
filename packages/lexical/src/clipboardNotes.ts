import {$getRoot,$isElementNode,type LexicalNode} from 'lexical';
import {isIdentifier} from '@lexical-tufte/document';
import {NoteNode} from './NoteNode.js';

/** Collect IDs from the current document without changing its nodes. */
export function $collectNoteIds():Set<string>{
 const ids=new Set<string>();
 const visit=(node:LexicalNode):void=>{
  if(node instanceof NoteNode)ids.add(node.getNoteId());
  if($isElementNode(node))for(const child of node.getChildren())visit(child);
 };
 visit($getRoot());
 return ids;
}

/** Assign fresh IDs to pasted copies, including duplicates within the payload. */
export function $reidentifyPastedNotes(
 nodes:readonly LexicalNode[],
 cutIds:ReadonlySet<string>,
 createId:()=>string,
):Map<string,string[]>{
 const existing=$collectNoteIds();
 const changes=new Map<string,string[]>();
 const visit=(node:LexicalNode):void=>{
  if(node instanceof NoteNode){
   const oldId=node.getNoteId();
   if(!cutIds.has(oldId)||existing.has(oldId)){
    let fresh:string;
    let attempts=0;
    do{
     if(++attempts>100)throw new Error('Unable to allocate unique note ID');
     fresh=createId();
    }while(!isIdentifier(fresh)||existing.has(fresh));
    node.setNoteId(fresh);
    const updated=changes.get(oldId)??[];
    updated.push(fresh);changes.set(oldId,updated);
    existing.add(fresh);
   }else existing.add(oldId);
  }
  if($isElementNode(node))for(const child of node.getChildren())visit(child);
 };
 for(const node of nodes)visit(node);
 return changes;
}
