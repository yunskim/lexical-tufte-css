import {createEditor,$getRoot,$createParagraphNode,$createTextNode} from 'lexical';
import {$generateNodesFromDOM,$generateHtmlFromNodes} from '@lexical/html';
import {TUFTE_NODES,$createSectionNode,exportCanonicalEditorState} from '../src/index.js';

/** Only inline fragments selected by the test; not a public document importer. */
export function roundtripInlineHTML(html){
 const host=document.createElement('div');host.contentEditable='true';document.body.append(host);
 const editor=createEditor({namespace:'inline-html-test',nodes:TUFTE_NODES,onError:error=>{throw error;}});
 editor.setRootElement(host);
 editor.update(()=>$getRoot().append($createSectionNode().append($createParagraphNode().append($createTextNode('Existing document')))),{discrete:true});
 const before=JSON.stringify(exportCanonicalEditorState(editor.getEditorState()));
 try{
  editor.update(()=>{
   const parsed=new DOMParser().parseFromString(html,'text/html');
   const nodes=$generateNodesFromDOM(editor,parsed);
   $getRoot().clear().append($createSectionNode().append($createParagraphNode().append(...nodes)));
  },{discrete:true});
  return {ok:true,document:{schemaVersion:1,id:'inline-html',locale:'ko-KR',title:'Inline HTML',assets:[],lexicalState:exportCanonicalEditorState(editor.getEditorState())},html:editor.read(()=>$generateHtmlFromNodes(editor))};
 }catch(error){return {ok:false,message:error.message,statePreserved:JSON.stringify(exportCanonicalEditorState(editor.getEditorState()))===before};}
 finally{editor.setRootElement(null);host.remove();}
}
