import {createEditor,$getRoot,$getNodeByKey,$createRangeSelection,$setSelection,$createTextNode,$createParagraphNode} from 'lexical';
import {$createListNode,$createListItemNode} from '@lexical/list';
import {registerRichText} from '@lexical/rich-text';
import {TUFTE_NODES,$createSectionNode,$createMarginnoteNode,registerListCommands,registerListKeyboardCommands,exportCanonicalEditorState,parseCanonicalEditorState} from '../src/index.js';
let active;
export function mountTabFixture({mode='valid',kind='bullet',depth=0}={}){
 active?.dispose();
 const shell=document.createElement('div');shell.id='tab-fixture';
 shell.innerHTML='<button id="tab-before">이전</button><div id="tab-editor" contenteditable="true" role="textbox" aria-label="Tab 경계"></div><button id="tab-after">다음</button>';
 document.body.append(shell);const host=shell.querySelector('#tab-editor');
 const editor=createEditor({namespace:'tab-boundary',nodes:TUFTE_NODES,onError(e){throw e;}});
 const stops=[registerRichText(editor),registerListCommands(editor),registerListKeyboardCommands(editor)];
 editor.setRootElement(host);let itemKey;
 host.focus();
 editor.update(()=>{
  const text=$createTextNode('Target');
  const note=$createMarginnoteNode('tab-note').append($createTextNode('Annotation'));
  const target=$createListItemNode().append(text,note),first=$createListItemNode().append($createTextNode('First'));
  let list=$createListNode(kind).append(first,target);
  for(let i=0;i<depth;i++)list=$createListNode(kind).append($createListItemNode().append($createTextNode('Level'+i)),$createListItemNode().append(list));
  if(mode==='mixed')list=$createListNode(kind).append($createListItemNode().append($createTextNode('Mixed parent'),list));
  const section=$createSectionNode();$getRoot().append(section);
  if(mode==='paragraph'){
   section.append($createParagraphNode().append(text));text.selectEnd();
  }else{
   section.append(list);
   if(mode==='container'){
    const wrapper=$createListItemNode().append($createListNode(kind).append($createListItemNode().append($createTextNode('Nested'))));
    list.append(wrapper);itemKey=wrapper.getKey();
    const selection=$createRangeSelection();selection.anchor.set(itemKey,0,'element');selection.focus.set(itemKey,0,'element');$setSelection(selection);
   }else if(mode==='first'){first.selectStart();itemKey=first.getKey();}
   else if(mode==='note'){note.getFirstChild().selectStart();itemKey=target.getKey();}
   else{text.select(mode==='range'?0:2,mode==='range'?3:2);itemKey=target.getKey();}
  }
 },{discrete:true});
 active={editor,itemKey,dispose(){stops.reverse().forEach(stop=>stop());editor.setRootElement(null);shell.remove();}};
 return readTabFixture();
}
export function readTabFixture(){
 const {editor,itemKey}=active;
 return {state:exportCanonicalEditorState(editor.getEditorState()),depth:editor.getEditorState().read(()=>$getNodeByKey(itemKey)?.getIndent()??null)};
}
export function reopenTabFixture(){
 const {editor}=active;
 const saved=JSON.parse(JSON.stringify(exportCanonicalEditorState(editor.getEditorState())));
 editor.setEditorState(parseCanonicalEditorState(editor,saved));
 return exportCanonicalEditorState(editor.getEditorState());
}
