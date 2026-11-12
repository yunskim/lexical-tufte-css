import {useEffect,useRef,useState} from 'react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
 $getSelection,$getNodeByKey,$isElementNode,$isRangeSelection,
 createCommand,COMMAND_PRIORITY_EDITOR,HISTORY_PUSH_TAG,
 type LexicalNode
} from 'lexical';
import {NoteNode,InlineImageNode,$getContainingNote} from '@lexical-tufte/lexical';
import {NoteImagePanel,type NoteImageChoice,type ImagePresentation} from './NoteImagePanel.js';

/** External host toolbars pass their button for focus restoration. */
export const OPEN_TUFTE_NOTE_IMAGE_EDITOR_COMMAND=
 createCommand<HTMLElement|null>('OPEN_TUFTE_NOTE_IMAGE_EDITOR');

export interface TufteNoteImageEditorPluginProps {
 readonly?:boolean;
 onNotice?:(message:string)=>void;
 onOpenChange?:(open:boolean)=>void;
}
type ChooserSnapshot={
 noteKey:string;
 noteId:string;
 images:NoteImageChoice[];
 fingerprints:Map<string,string>;
};

/** One chooser per composer; presentation changes only, no asset mutations. */
export function TufteNoteImageEditorPlugin({
 readonly=false,onNotice,onOpenChange
}:TufteNoteImageEditorPluginProps){
 const [editor]=useLexicalComposerContext();
 const [snapshot,setSnapshot]=useState<ChooserSnapshot|null>(null);
 const callbacks=useRef({readonly,onNotice,onOpenChange});
 callbacks.current={readonly,onNotice,onOpenChange};
 const snapshotRef=useRef<ChooserSnapshot|null>(null);
 const focusTarget=useRef<HTMLElement|null>(null);
 const report=(message:string)=>callbacks.current.onNotice?.(message);

 const close=()=>{
  snapshotRef.current=null;
  setSnapshot(null);
  callbacks.current.onOpenChange?.(false);
  const target=focusTarget.current;
  focusTarget.current=null;
  if(target?.isConnected)queueMicrotask(()=>{if(target.isConnected)target.focus();});
 };

 useEffect(()=>editor.registerCommand(OPEN_TUFTE_NOTE_IMAGE_EDITOR_COMMAND,target=>{
  if(callbacks.current.readonly||!editor.isEditable()){
   report('읽기 전용 문서는 변경할 수 없습니다.');return true;
  }
  if(editor.isComposing()){
   report('조합 입력 중에는 이미지 속성을 편집할 수 없습니다.');return true;
  }
  const selection=$getSelection();
  if(!$isRangeSelection(selection)){
   report('먼저 노트 안으로 이동해 이미지를 선택하세요.');return true;
  }
  const note=$getContainingNote(selection.anchor.getNode());
  if(!note||!note.is($getContainingNote(selection.focus.getNode()))){
   report('먼저 노트 안으로 이동해 이미지를 선택하세요.');return true;
  }
  const images:NoteImageChoice[]=[];
  const fingerprints=new Map<string,string>();
  const inspect=(node:LexicalNode):void=>{
   if(node instanceof InlineImageNode){
    const properties=node.getImageProperties();
    images.push({key:node.getKey(),...properties});
    fingerprints.set(node.getKey(),JSON.stringify(properties));
   }else if($isElementNode(node))node.getChildren().forEach(inspect);
  };
  note.getChildren().forEach(inspect);
  if(images.length===0){
   report('현재 노트에 이미지가 없습니다. 이미지를 삽입한 후 다시 선택하세요.');return true;
  }
  const selected={noteKey:note.getKey(),noteId:note.getNoteId(),images,fingerprints};
  snapshotRef.current=selected;
  if(typeof HTMLElement!=='undefined'&&target instanceof HTMLElement)focusTarget.current=target;
  setSnapshot(selected);
  callbacks.current.onOpenChange?.(true);
  return true;
 },COMMAND_PRIORITY_EDITOR),[editor]);

 useEffect(()=>{
  if(readonly&&snapshotRef.current)close();
 },[readonly]);

 // A host toolbar must not keep aria-expanded=true after editor unmount.
 useEffect(()=>()=>{if(snapshotRef.current)callbacks.current.onOpenChange?.(false);},[]);

 const save=(key:string,attributes:ImagePresentation):boolean=>{
  const chosen=snapshotRef.current;
  if(!chosen||callbacks.current.readonly||!editor.isEditable()){
   report('읽기 전용 문서는 변경할 수 없습니다.');return false;
  }
  const matches=()=>{
   const note=$getNodeByKey(chosen.noteKey),image=$getNodeByKey(key);
   return note instanceof NoteNode&&note.getNoteId()===chosen.noteId&&
    image instanceof InlineImageNode&&$getContainingNote(image)?.is(note)===true&&
    chosen.fingerprints.get(key)===JSON.stringify(image.getImageProperties());
  };
  let valid=false;
  editor.getEditorState().read(()=>{valid=matches();});
  if(!valid){
   report('선택한 노트 또는 이미지가 변경되었습니다. 다시 선택하세요.');return false;
  }
  let applied=false;
  editor.update(()=>{
   if(!matches())return;
   const image=$getNodeByKey(key);
   if(!(image instanceof InlineImageNode))return;
   image.setImagePresentation(attributes.alt,attributes.width,attributes.height);
   applied=true;
  },{tag:HISTORY_PUSH_TAG,discrete:true});
  if(!applied){
   report('선택한 노트 또는 이미지가 변경되었습니다. 다시 선택하세요.');return false;
  }
  report('선택한 노트 이미지의 대체 텍스트와 표시 크기를 수정했습니다.');
  return true;
 };

 return snapshot?<NoteImagePanel images={snapshot.images} onClose={close} onSave={save}/>:null;
}
