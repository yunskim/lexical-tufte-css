import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createHeadlessEditor,TUFTE_NODES,TufteHeadingNode,$createTufteHeadingNode,$createSectionNode,registerSectionCommands,SET_TUFTE_BLOCK_COMMAND,loadDocumentIntoEditor,exportEditorToDocument} from '../dist/index.js';
import {$getRoot,$createTextNode,$createParagraphNode} from 'lexical';

const base=(type,children)=>({type,version:1,children,direction:null,format:'',indent:0});
const text=value=>({type:'text',version:1,text:value,format:0,detail:0,mode:'normal',style:''});
const makeDocument=()=>({
 schemaVersion:1,id:'heading-id-roundtrip',locale:'en-US',title:'Tufte CSS',assets:[],
 lexicalState:{root:{...base('root',[
  base('tufte-section',[{...base('heading',[text('Getting Started')]),tag:'h2',id:'getting-started'}])
 ])}}
});
test('heading IDs survive Lexical import, export, and reload',()=>{
 const editor=createHeadlessEditor({namespace:'heading-id-test',nodes:[...TUFTE_NODES],onError:error=>{throw error;}});
 const original=makeDocument();
 const loaded=loadDocumentIntoEditor(editor,original);
 assert.equal(loaded.ok,true,JSON.stringify(loaded.diagnostics));
 const exported=exportEditorToDocument(editor,original);
 assert.equal(exported.ok,true,JSON.stringify(exported.diagnostics));
 assert.equal(exported.value.lexicalState.root.children[0].children[0].id,'getting-started');
 const second=createHeadlessEditor({namespace:'heading-id-reload',nodes:[...TUFTE_NODES],onError:error=>{throw error;}});
 const reloaded=loadDocumentIntoEditor(second,exported.value);
 assert.equal(reloaded.ok,true,JSON.stringify(reloaded.diagnostics));
 assert.equal(second.getEditorState().toJSON().root.children[0].children[0].id,'getting-started');
});
test('heading ID is preserved through ordinary editor updates',()=>{
 const editor=createHeadlessEditor({namespace:'heading-id-edit',nodes:[...TUFTE_NODES],onError:error=>{throw error;}});
 editor.update(()=>{
  const heading=$createTufteHeadingNode('h2').setId('fundamentals');
  heading.append($createTextNode('Fundamentals'));
  assert.equal(heading.getId(),'fundamentals');
  // A heading is normally hosted by a section; this verifies its local JSON contract.
  assert.equal(heading.exportJSON().id,'fundamentals');
 },{discrete:true});
});
test('block commands create the registered heading class and preserve heading IDs',()=>{
 const editor=createHeadlessEditor({namespace:'heading-command',nodes:[...TUFTE_NODES],onError:error=>{throw error;}});
 const unregister=registerSectionCommands(editor);
 try{
  editor.update(()=>{
   const paragraph=$createParagraphNode().append($createTextNode('Command heading'));
   const section=$createSectionNode().append(paragraph);
   $getRoot().append(section);paragraph.selectStart();
  },{discrete:true});
  for(const tag of ['h2','h3']){
   editor.update(()=>{
    assert.equal(editor.dispatchCommand(SET_TUFTE_BLOCK_COMMAND,tag),true);
    const heading=$getRoot().getFirstChild().getFirstChild();
    assert.ok(heading instanceof TufteHeadingNode);
    assert.equal(heading.getTag(),tag);
    assert.equal(heading.getTextContent(),'Command heading');
    if(tag==='h2')heading.setId('command-heading');
    else assert.equal(heading.getId(),'command-heading');
   },{discrete:true});
  }
 }finally{unregister();}
});
