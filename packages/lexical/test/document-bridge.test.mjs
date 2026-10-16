import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join,parse} from 'node:path';
import {createRequire} from 'node:module';
import {createHeadlessEditor} from '@lexical/headless';
import {$getRoot,$createParagraphNode,$createTextNode} from 'lexical';
import {SectionNode,NoteNode,InlineImageNode,TufteSpanNode,FigureNode,CaptionNode,TableLayoutNode,$createTableLayoutNode,$createFigureNode,$createCaptionNode,$createInlineImageNode,$createSectionNode,$createNoteNode,$createTufteSpanNode,loadDocumentIntoEditor,exportEditorToDocument} from '../dist/index.js';
import {LinkNode} from '@lexical/link';
import {NODE_SCHEMA,validateDocument} from '@lexical-tufte/document';
import {ListNode,ListItemNode,$createListNode,$createListItemNode} from '@lexical/list';
import {TableNode,TableRowNode,TableCellNode,$createTableNode,$createTableRowNode,$createTableCellNode} from '@lexical/table';
const fixture=()=>JSON.parse(readFileSync(new URL('../../../fixtures/tufte/server-document.json',import.meta.url),'utf8'));
const editor=()=>createHeadlessEditor({namespace:'document-bridge-test',nodes:[SectionNode,NoteNode,InlineImageNode,TufteSpanNode,FigureNode,CaptionNode,TableLayoutNode,TableNode,TableRowNode,TableCellNode,ListNode,ListItemNode,LinkNode],onError(e){throw e;}});
test('R02 strict Lexical bridge fails closed when a registered node is missing',()=>{
 const source=editor();
 source.update(()=>{
  $getRoot().append($createSectionNode().append(
   $createParagraphNode().append($createTufteSpanNode('sans').append($createTextNode('등록 필요')))
  ));
 },{discrete:true});
 const base=fixture(),document={...base,lexicalState:source.getEditorState().toJSON()};
 const withoutSpan=createHeadlessEditor({namespace:'bridge-missing-node',nodes:[SectionNode,NoteNode,InlineImageNode,LinkNode],onError(e){throw e;}});
 const result=loadDocumentIntoEditor(withoutSpan,document);
 assert.equal(result.ok,false);
 assert.ok(result.diagnostics.some(x=>['LEXICAL_IMPORT_FAILED','LEXICAL_IMPORT_LOSSY'].includes(x.code)));
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
 const base=fixture(),document={...base,assets:[...base.assets,{id:'chart-1',src:'/figures/chart.svg',mimeType:'image/svg+xml',width:640,height:360}],lexicalState:source.getEditorState().toJSON()};
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

test('R02 ordered list survives Lexical roundtrip',()=>{
 const source=editor();
 source.update(()=>{
  $getRoot().append($createSectionNode().append(
   $createListNode('number',7).append(
    $createListItemNode().append($createTextNode('일곱')),
    $createListItemNode().append($createTextNode('여덟'))
   )
  ));
 },{discrete:true});
 const base=fixture(),document={...base,lexicalState:source.getEditorState().toJSON()};
 const destination=editor(),loaded=loadDocumentIntoEditor(destination,document);
 assert.equal(loaded.ok,true,JSON.stringify(loaded.diagnostics));
 const exported=exportEditorToDocument(destination,document);
 assert.equal(exported.ok,true,JSON.stringify(exported.diagnostics));
 assert.deepEqual(exported.value.lexicalState,document.lexicalState);
 assert.equal(exported.value.lexicalState.root.children[0].children[0].start,7);
});

test('R02 scroll table preserves cell headers and layout in Lexical roundtrip',()=>{
 const source=editor();
 source.update(()=>{
  const table=$createTableNode();
  table.append(
   $createTableRowNode().append(
    $createTableCellNode(1).append($createParagraphNode().append($createTextNode('항목'))),
    $createTableCellNode(1).append($createParagraphNode().append($createTextNode('값')))
   ),
   $createTableRowNode().append(
    $createTableCellNode(0).append($createParagraphNode().append($createTextNode('A'))),
    $createTableCellNode(0).append($createParagraphNode().append($createTextNode('10')))
   )
  );
  $getRoot().append($createSectionNode().append($createTableLayoutNode('scroll').append(table)));
 },{discrete:true});
 const base=fixture(),document={...base,lexicalState:source.getEditorState().toJSON()};
 const destination=editor(),loaded=loadDocumentIntoEditor(destination,document);
 assert.equal(loaded.ok,true,JSON.stringify(loaded.diagnostics));
 const exported=exportEditorToDocument(destination,document);
 assert.equal(exported.ok,true,JSON.stringify(exported.diagnostics));
 assert.deepEqual(exported.value.lexicalState,document.lexicalState);
 const layout=exported.value.lexicalState.root.children[0].children[0];
 assert.equal(layout.layout,'scroll');
 assert.equal(layout.children[0].type,'table');
 assert.equal(layout.children[0].children[0].children[0].headerState,1);
});

test('R03 editor node registry and document schema coverage are explicit',()=>{
 const registered=[
  'root','tufte-section','paragraph','text','linebreak','link',
  'tufte-note','tufte-inline-image','tufte-span','tufte-figure',
  'tufte-caption','tufte-table-layout','table','tablerow','tablecell',
  'list','listitem'
 ];
 const unsupported=Object.keys(NODE_SCHEMA).filter(type=>!registered.includes(type));
 assert.ok(unsupported.includes('tufte-code'));
 assert.ok(unsupported.includes('tufte-embed'));
 assert.ok(unsupported.includes('tufte-epigraph'));
 assert.equal(new Set(registered).size,registered.length);
 for(const type of registered)assert.ok(Object.hasOwn(NODE_SCHEMA,type),type);
});
test('R03 document schema rejects a future table cell field without silent cleanup',()=>{
 const source=editor();
 source.update(()=>{
  $getRoot().append($createSectionNode().append(
   $createTableLayoutNode('body').append(
    $createTableNode().append(
     $createTableRowNode().append(
      $createTableCellNode(1).append($createParagraphNode().append($createTextNode('값')))
     )
    )
   )
  ));
 },{discrete:true});
 const base=fixture(),document={...base,lexicalState:source.getEditorState().toJSON()};
 const cell=document.lexicalState.root.children[0].children[0].children[0].children[0].children[0];
 cell.futureTableField='unrecognized';
 const result=validateDocument(document);
 assert.equal(result.ok,false);
 assert.ok(result.diagnostics.some(x=>x.code==='UNKNOWN_FIELD'&&x.path.endsWith('.futureTableField')));
});

test('R02 Lexical 0.52.0 generated golden snapshot (explicit update only)',t=>{
 const source=editor();
 source.update(()=>{
  $getRoot().append($createSectionNode().append(
   $createParagraphNode().append($createTextNode('Golden 본문')),
   $createListNode('number',3).append($createListItemNode().append($createTextNode('항목')))
  ));
 },{discrete:true});
 const state=source.getEditorState().toJSON();
 const snapshot=new URL('./golden/lexical-0.52.0-document.json',import.meta.url);
 const actual=JSON.stringify(state,null,2)+'\n';
 if(process.env.UPDATE_LEXICAL_GOLDEN==='1'){
  const require=createRequire(import.meta.url);
  let directory=dirname(require.resolve('lexical'));
  let manifest;
  while(true){
   const candidate=join(directory,'package.json');
   if(existsSync(candidate)){
    const data=JSON.parse(readFileSync(candidate,'utf8'));
    if(data.name==='lexical'){manifest=data;break;}
   }
   if(directory===parse(directory).root)break;
   directory=dirname(directory);
  }
  assert.ok(manifest,'Cannot locate the installed lexical package manifest');
  const installed=manifest.version;
  assert.equal(installed,'0.52.0','Refuse to record golden output from a different Lexical version');
  if(existsSync(snapshot)&&process.env.OVERWRITE_LEXICAL_GOLDEN!=='1'){
   assert.fail('Existing golden is protected; review changes and explicitly set OVERWRITE_LEXICAL_GOLDEN=1');
  }
  mkdirSync(dirname(fileURLToPath(snapshot)),{recursive:true});
  writeFileSync(snapshot,actual,'utf8');
 }
 if(!existsSync(snapshot)){
  if(process.env.REQUIRE_LEXICAL_GOLDEN==='1')assert.fail('Golden fixture is required; generate and review using UPDATE_LEXICAL_GOLDEN=1');
  t.skip('Golden fixture not yet generated from installed Lexical 0.52.0; run UPDATE_LEXICAL_GOLDEN=1 and commit reviewed output');return;
 }
 assert.equal(actual,readFileSync(snapshot,'utf8'));
});

test('R02 missing referenced asset fails before editor mutation',()=>{
 const source=editor();
 source.update(()=>{
  $getRoot().append($createSectionNode().append(
   $createFigureNode('body').append(
    $createInlineImageNode('/figures/missing.svg','누락된 그림','missing-asset'),
    $createCaptionNode().append($createTextNode('캡션'))
   )
  ));
 },{discrete:true});
 const base=fixture(),document={...base,lexicalState:source.getEditorState().toJSON()};
 let parses=0,sets=0;
 const fake={parseEditorState(){parses++;throw Error('unexpected parse');},setEditorState(){sets++;}};
 const result=loadDocumentIntoEditor(fake,document);
 assert.equal(result.ok,false);
 assert.ok(result.diagnostics.some(x=>x.code==='MISSING_ASSET'));
 assert.equal(parses,0);
 assert.equal(sets,0);
});

test('R11 successful import returns detached envelope and editor state',()=>{
 const base=fixture();
 let captured;
 const fake={
  parseEditorState(){return {toJSON(){return structuredClone(base.lexicalState);}};},
  setEditorState(state){captured=state;}
 };
 const result=loadDocumentIntoEditor(fake,base);
 assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 assert.notStrictEqual(result.value,base);
 assert.notStrictEqual(result.value.assets,base.assets);
 assert.notStrictEqual(result.value.lexicalState,base.lexicalState);
 const originalTitle=result.value.title;
 const originalState=JSON.stringify(result.value.lexicalState);
 base.title='mutated after import';
 base.lexicalState.root.children=[];
 assert.equal(result.value.title,originalTitle);
 assert.equal(JSON.stringify(result.value.lexicalState),originalState);
 assert.ok(captured);
});
