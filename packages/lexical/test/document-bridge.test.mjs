import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHeadlessEditor} from '@lexical/headless';
import {$getRoot,$createParagraphNode,$createTextNode} from 'lexical';
import {SectionNode,NoteNode,InlineImageNode,TufteSpanNode,FigureNode,CaptionNode,$createFigureNode,$createCaptionNode,$createInlineImageNode,$createSectionNode,$createNoteNode,$createTufteSpanNode,loadDocumentIntoEditor,exportEditorToDocument} from '../dist/index.js';
import {LinkNode} from '@lexical/link';
const fixture=()=>JSON.parse(readFileSync(new URL('../../../fixtures/tufte/server-document.json',import.meta.url),'utf8'));
const editor=()=>createHeadlessEditor({namespace:'document-bridge-test',nodes:[SectionNode,NoteNode,InlineImageNode,TufteSpanNode,FigureNode,CaptionNode,LinkNode],onError(e){throw e;}});
test('R02 strict Lexical bridge fails closed when a registered node is missing',()=>{
 const e=editor(),d=fixture();
 const result=loadDocumentIntoEditor(e,d);
 assert.equal(result.ok,false);
 assert.ok(result.diagnostics.some(x=>x.code==='LEXICAL_IMPORT_FAILED'));
});
test('R02 strict Lexical bridge rejects invalid document before touching editor',()=>{
 const e=editor(),d=fixture();d.schemaVersion=999;
 const result=loadDocumentIntoEditor(e,d);
 assert.equal(result.ok,false);
 assert.ok(result.diagnostics.some(x=>x.code==='UNSUPPORTED_VERSION'));
});
test('R03 editor export never silently drops missing required document sections',()=>{
 const e=editor(),d=fixture();
 const result=exportEditorToDocument(e,d);
 assert.equal(result.ok,false);
 assert.ok(result.diagnostics.length>0);
});

test('R02 valid document -> real Lexical -> validated document roundtrip',()=>{
 const source=editor();
 source.update(()=>{
  $getRoot().append($createSectionNode().append(
   $createParagraphNode().append(
    $createTextNode('본문 '),
    $createTufteSpanNode('sans').append($createTextNode('Sans')),
    $createNoteNode('roundtrip-note').append($createTextNode('여백주석'))
   )
  ));
 },{discrete:true});
 const base=fixture();
 const document={...base,lexicalState:source.getEditorState().toJSON()};
 const destination=editor();
 const imported=loadDocumentIntoEditor(destination,document);
 assert.equal(imported.ok,true,JSON.stringify(imported.diagnostics));
 const exported=exportEditorToDocument(destination,document);
 assert.equal(exported.ok,true,JSON.stringify(exported.diagnostics));
 assert.deepEqual(exported.value.lexicalState,document.lexicalState);
 assert.deepEqual(exported.value.assets,document.assets);
});

test('R02 figure and caption survive real Lexical document roundtrip',()=>{
 const source=editor();
 source.update(()=>{
  $getRoot().append($createSectionNode().append(
   $createFigureNode('fullwidth').append(
    $createInlineImageNode('/figures/chart.svg','차트 설명','chart-1',640,360),
    $createCaptionNode().append($createTextNode('그림 1. 설명'))
   )
  ));
 },{discrete:true});
 const base=fixture(),document={...base,lexicalState:source.getEditorState().toJSON()};
 const destination=editor(),loaded=loadDocumentIntoEditor(destination,document);
 assert.equal(loaded.ok,true,JSON.stringify(loaded.diagnostics));
 const exported=exportEditorToDocument(destination,document);
 assert.equal(exported.ok,true,JSON.stringify(exported.diagnostics));
 assert.deepEqual(exported.value.lexicalState,document.lexicalState);
 const figure=exported.value.lexicalState.root.children[0].children[0];
 assert.equal(figure.width,'fullwidth');
 assert.equal(figure.children[0].assetId,'chart-1');
 assert.equal(figure.children[0].width,640);
 assert.equal(figure.children[1].type,'tufte-caption');
});

test('R03 lossy Lexical import is rejected without mutating editor',()=>{
 const base=fixture();
 let mutations=0;
 const fake={
  parseEditorState(){return {toJSON(){return {root:{type:'root',version:1,children:[]}};}};},
  setEditorState(){mutations++;}
 };
 const result=loadDocumentIntoEditor(fake,base);
 assert.equal(result.ok,false);
 assert.equal(result.diagnostics[0].code,'LEXICAL_IMPORT_LOSSY');
 assert.equal(mutations,0);
});
test('R03 field ordering alone is not considered import loss',()=>{
 const base=fixture();
 let mutations=0;
 const fake={
  parseEditorState(){
   const state=JSON.parse(JSON.stringify(base.lexicalState));
   const reverse=(v)=>Array.isArray(v)?v.map(reverse):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).reverse().map(([k,x])=>[k,reverse(x)])):v;
   return {toJSON(){return reverse(state);}};
  },
  setEditorState(){mutations++;}
 };
 const result=loadDocumentIntoEditor(fake,base);
 assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 assert.equal(mutations,1);
});
