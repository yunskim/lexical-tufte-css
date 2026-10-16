import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join,parse} from 'node:path';
import {createRequire} from 'node:module';
import {createHeadlessEditor} from '@lexical/headless';
import {$getRoot,$createParagraphNode,$createTextNode,CLEAR_HISTORY_COMMAND,COMMAND_PRIORITY_CRITICAL} from 'lexical';
import {SectionNode,NoteNode,InlineImageNode,TufteSpanNode,FigureNode,CaptionNode,TableLayoutNode,$createTableLayoutNode,$createFigureNode,$createCaptionNode,$createInlineImageNode,$createSectionNode,$createNoteNode,$createTufteSpanNode,loadDocumentIntoEditor,loadMigratedDocumentIntoEditor,exportEditorToDocument,exportEditorToDocumentV2,DefinitionListNode,DefinitionTermNode,DefinitionDescriptionNode,$createDefinitionListNode,$createDefinitionTermNode,$createDefinitionDescriptionNode,EpigraphNode,AttributionNode,CiteNode,$createEpigraphNode,$createAttributionNode,$createCiteNode,SectionFooterNode,$createSectionFooterNode,FullwidthNode,$createFullwidthNode,TufteCodeNode,$createTufteCodeNode,ImageQuiltNode,$createImageQuiltNode,EmbedNode,$createEmbedNode} from '../dist/index.js';
import {LinkNode} from '@lexical/link';
import {HeadingNode,QuoteNode,$createHeadingNode,$createQuoteNode} from '@lexical/rich-text';
import {HorizontalRuleNode,$createHorizontalRuleNode} from '@lexical/react/LexicalHorizontalRuleNode';
import {createEmptyHistoryState,registerHistory} from '@lexical/history';
import {NODE_SCHEMA,validateDocument} from '@lexical-tufte/document';
import {ListNode,ListItemNode,$createListNode,$createListItemNode} from '@lexical/list';
import {TableNode,TableRowNode,TableCellNode,$createTableNode,$createTableRowNode,$createTableCellNode} from '@lexical/table';
const fixture=()=>JSON.parse(readFileSync(new URL('../../../fixtures/tufte/server-document.json',import.meta.url),'utf8'));
const editor=()=>createHeadlessEditor({namespace:'document-bridge-test',nodes:[SectionNode,NoteNode,InlineImageNode,TufteSpanNode,FigureNode,CaptionNode,TableLayoutNode,TableNode,TableRowNode,TableCellNode,ListNode,ListItemNode,LinkNode,HeadingNode,QuoteNode,HorizontalRuleNode,DefinitionListNode,DefinitionTermNode,DefinitionDescriptionNode,EpigraphNode,AttributionNode,CiteNode,SectionFooterNode,FullwidthNode,TufteCodeNode,ImageQuiltNode,EmbedNode],onError(e){throw e;}});
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

test('R11 exported document cannot alias mutable editor JSON or base metadata',()=>{
 const base=fixture();
 base.assets.push({id:'alias-asset',src:'/images/alias.png',mimeType:'image/png',width:8,height:8});
 const state=structuredClone(base.lexicalState);
 const fake={getEditorState(){return {toJSON(){return state;}};}};
 const result=exportEditorToDocument(fake,base);
 assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 assert.notStrictEqual(result.value.lexicalState,state);
 assert.notStrictEqual(result.value.assets,base.assets);
 const original=JSON.stringify(result.value.lexicalState);
 const title=result.value.title;
 state.root.children=[];
 base.title='changed after export';
 base.assets.length=0;
 assert.equal(JSON.stringify(result.value.lexicalState),original);
 assert.equal(result.value.title,title);
 assert.ok(result.value.assets.length>0);
});

test('R03 failed editor state installation reports failure without a false success',()=>{
 const base=fixture();
 let attempts=0;
 const fake={
  parseEditorState(){return {toJSON(){return structuredClone(base.lexicalState);}};},
  setEditorState(){attempts++;throw Error('editor rejected state');}
 };
 const result=loadDocumentIntoEditor(fake,base);
 assert.equal(result.ok,false);
 assert.equal(result.diagnostics[0].code,'LEXICAL_IMPORT_FAILED');
 assert.match(result.diagnostics[0].message,/editor rejected state/);
 assert.equal(attempts,1);
});

test('R03 failed editor serialization returns a diagnostic',()=>{
 const base=fixture();
 const fake={getEditorState(){return {toJSON(){throw Error('serialization failure');}};}};
 const result=exportEditorToDocument(fake,base);
 assert.equal(result.ok,false);
 assert.equal(result.diagnostics[0].code,'LEXICAL_EXPORT_FAILED');
 assert.match(result.diagnostics[0].message,/serialization failure/);
});

test('R01 image JSON import rejects unsafe URLs and invalid asset dimensions before node creation',()=>{
 const valid={type:'tufte-inline-image',version:1,src:'/figures/chart.svg',alt:'차트',assetId:'chart-1',width:640,height:360};
 for(const change of [
  {src:'javascript:alert(1)'},{src:'//external.example/image.svg'},
  {assetId:'bad id'},{alt:null},{width:0},{height:-1},{width:1.5},{version:2}
 ]){
  assert.throws(()=>InlineImageNode.importJSON({...valid,...change}),undefined,JSON.stringify(change));
 }
});

test('R01 image factory and JSON import use the same input policy',()=>{
 const valid={type:'tufte-inline-image',version:1,src:'/figures/chart.svg',alt:'차트',assetId:'chart-1',width:640,height:360};
 for(const change of [{src:'data:image/svg+xml;base64,AA=='},{alt:null},{assetId:'bad id'},{width:0},{height:Infinity}]){
  const candidate={...valid,...change};
  assert.throws(()=>InlineImageNode.importJSON(candidate));
  assert.throws(()=>$createInlineImageNode(candidate.src,candidate.alt,candidate.assetId,candidate.width,candidate.height));
 }
});

test('R01 image factory preserves optional asset metadata through real Lexical JSON',()=>{
 const e=editor();
 e.update(()=>{
  $getRoot().append($createSectionNode().append(
   $createParagraphNode().append($createInlineImageNode('/figures/chart.svg','차트','chart-1',640,360))
  ));
 },{discrete:true});
 const image=e.getEditorState().toJSON().root.children[0].children[0].children[0];
 assert.equal(image.type,'tufte-inline-image');
 assert.equal(image.src,'/figures/chart.svg');
 assert.equal(image.alt,'차트');
 assert.equal(image.assetId,'chart-1');
 assert.equal(image.width,640);
 assert.equal(image.height,360);
 const base=fixture();
 const document={...base,assets:[...base.assets,{id:'chart-1',src:'/figures/chart.svg',mimeType:'image/svg+xml',width:640,height:360}],lexicalState:e.getEditorState().toJSON()};
 const valid=validateDocument(document);
 assert.equal(valid.ok,true,JSON.stringify(valid.diagnostics));
});

test('R01 image asset mismatch fails before editor state is installed',()=>{
 const source=editor();
 source.update(()=>{
  $getRoot().append($createSectionNode().append(
   $createParagraphNode().append($createInlineImageNode('/figures/chart.svg','차트','chart-1',640,360))
  ));
 },{discrete:true});
 const base=fixture();
 const state=source.getEditorState().toJSON();
 const validAsset={id:'chart-1',src:'/figures/chart.svg',mimeType:'image/svg+xml',width:640,height:360};
 const destination=editor();
 const before=JSON.stringify(destination.getEditorState().toJSON());
 for(const asset of [
  undefined,
  {...validAsset,src:'/figures/other.svg'},
  {...validAsset,width:320},
  {...validAsset,height:180}
 ]){
  const document={...base,assets:[...base.assets,...(asset?[asset]:[])],lexicalState:state};
  const result=loadDocumentIntoEditor(destination,document);
  assert.equal(result.ok,false);
  assert.ok(result.diagnostics.some(d=>['MISSING_ASSET','ASSET_MISMATCH'].includes(d.code)),JSON.stringify(result.diagnostics));
  assert.equal(JSON.stringify(destination.getEditorState().toJSON()),before);
 }
});

test('P2 note kind can change without losing note identity or content',()=>{
 const e=editor();
 e.update(()=>{
  const note=$createNoteNode('editable-note','sidenote');
  note.append($createTextNode('변경해도 보존'));
  note.setKind('marginnote');
  assert.throws(()=>note.setKind('unknown'));
  $getRoot().append($createSectionNode().append($createParagraphNode().append(note)));
 },{discrete:true});
 const note=e.getEditorState().toJSON().root.children[0].children[0].children[0];
 assert.equal(note.type,'tufte-note');
 assert.equal(note.noteId,'editable-note');
 assert.equal(note.kind,'marginnote');
 assert.equal(note.children[0].text,'변경해도 보존');
});

test('R03 migrated loader imports compatible v1 and preserves v2 snapshot',()=>{
 const source=editor();
 source.update(()=>$getRoot().append($createSectionNode().append(
  $createParagraphNode().append($createTextNode('migrated'))
 )),{discrete:true});
 const legacy={...fixture(),lexicalState:source.getEditorState().toJSON()};
 const original=JSON.stringify(legacy);
 const destination=editor();
 const imported=loadMigratedDocumentIntoEditor(destination,legacy);
 assert.equal(imported.ok,true,JSON.stringify(imported.diagnostics));
 assert.equal(imported.value.schemaVersion,2);
 assert.deepEqual(imported.value.editorFormat,{engine:'lexical',formatVersion:1});
 assert.deepEqual(destination.getEditorState().toJSON(),legacy.lexicalState);
 assert.equal(JSON.stringify(legacy),original);
 const second=loadMigratedDocumentIntoEditor(editor(),imported.value);
 assert.equal(second.ok,true,JSON.stringify(second.diagnostics));
});
test('R03 migrated loader refuses unsupported format before editor replacement',()=>{
 const destination=editor(),before=destination.getEditorState().toJSON();
 const invalid={...fixture(),schemaVersion:2,editorFormat:{engine:'lexical',formatVersion:999}};
 const result=loadMigratedDocumentIntoEditor(destination,invalid);
 assert.equal(result.ok,false);
 assert.ok(result.diagnostics.some(d=>d.code==='UNSUPPORTED_EDITOR_FORMAT'));
 assert.deepEqual(destination.getEditorState().toJSON(),before);
});

test('R03 migrated document replacement dispatches history reset only on success',()=>{
 const destination=editor();
 let cleared=0;
 const unregister=destination.registerCommand(CLEAR_HISTORY_COMMAND,()=>{
  cleared+=1;
  return false;
 },COMMAND_PRIORITY_CRITICAL);
 const invalid={...fixture(),schemaVersion:2,editorFormat:{engine:'lexical',formatVersion:999}};
 assert.equal(loadMigratedDocumentIntoEditor(destination,invalid).ok,false);
 assert.equal(cleared,0);
 const source=editor();
 source.update(()=>$getRoot().append($createSectionNode().append(
  $createParagraphNode().append($createTextNode('history boundary'))
 )),{discrete:true});
 const valid={...fixture(),lexicalState:source.getEditorState().toJSON()};
 const result=loadMigratedDocumentIntoEditor(destination,valid);
 assert.equal(result.ok,true,JSON.stringify(result.diagnostics));
 assert.equal(cleared,1);
 unregister();
});

test('R03 malformed migrated import leaves editor state and history untouched',()=>{
 const destination=editor();
 let clearCount=0;
 const unregister=destination.registerCommand(CLEAR_HISTORY_COMMAND,()=>{
  clearCount+=1;
  return false;
 },COMMAND_PRIORITY_CRITICAL);
 const source=editor();
 source.update(()=>$getRoot().append($createSectionNode().append(
  $createParagraphNode().append($createTextNode('loss detection'))
 )),{discrete:true});
 const valid={...fixture(),lexicalState:source.getEditorState().toJSON()};
 // Unknown serialized node must be rejected without touching state/history.
 const malformed=structuredClone(valid);
 malformed.lexicalState.root.children[0].children[0].children[0].type='future-text';
 const before=destination.getEditorState().toJSON();
 const result=loadMigratedDocumentIntoEditor(destination,malformed);
 assert.equal(result.ok,false,JSON.stringify(result.diagnostics));
 assert.deepEqual(destination.getEditorState().toJSON(),before);
 assert.equal(clearCount,0);
 unregister();
});

test('R03 actual HistoryPlugin state is cleared after document replacement',()=>{
 const destination=editor();
 const history=createEmptyHistoryState();
 const unregister=registerHistory(destination,history,300);
 const source=editor();
 source.update(()=>$getRoot().append($createSectionNode().append(
  $createParagraphNode().append($createTextNode('replacement'))
 )),{discrete:true});
 const document={...fixture(),lexicalState:source.getEditorState().toJSON()};
 // Seed an old-document undo/redo stack. A successful replacement must clear both.
 history.undoStack.push({editor:destination,editorState:destination.getEditorState()});
 history.redoStack.push({editor:destination,editorState:destination.getEditorState()});
 const rejected=loadMigratedDocumentIntoEditor(destination,{...document,schemaVersion:99});
 assert.equal(rejected.ok,false);
 assert.equal(history.undoStack.length,1);
 assert.equal(history.redoStack.length,1);
 const loaded=loadMigratedDocumentIntoEditor(destination,document);
 assert.equal(loaded.ok,true,JSON.stringify(loaded.diagnostics));
 assert.equal(history.undoStack.length,0);
 assert.equal(history.redoStack.length,0);
 unregister();
});

test('R03 v2 export preserves editor format after migrated import',()=>{
 const source=editor();
 source.update(()=>$getRoot().append($createSectionNode().append(
  $createParagraphNode().append($createTextNode('v2 export'))
 )),{discrete:true});
 const legacy={...fixture(),lexicalState:source.getEditorState().toJSON()};
 const destination=editor();
 const loaded=loadMigratedDocumentIntoEditor(destination,legacy);
 assert.equal(loaded.ok,true,JSON.stringify(loaded.diagnostics));
 const exported=exportEditorToDocumentV2(destination,loaded.value);
 assert.equal(exported.ok,true,JSON.stringify(exported.diagnostics));
 assert.equal(exported.value.schemaVersion,2);
 assert.deepEqual(exported.value.editorFormat,{engine:'lexical',formatVersion:1});
 assert.deepEqual(exported.value.lexicalState,legacy.lexicalState);
 assert.notStrictEqual(exported.value,loaded.value);
 const invalid=exportEditorToDocumentV2(destination,{...loaded.value,editorFormat:{engine:'lexical',formatVersion:99}});
 assert.equal(invalid.ok,false);
 assert.ok(invalid.diagnostics.some(d=>d.code==='UNSUPPORTED_EDITOR_FORMAT'));
});

test('R03 checked-in v2 golden survives real Lexical import and export',()=>{
 const golden=JSON.parse(readFileSync(new URL('../../../fixtures/tufte/server-document-v2.json',import.meta.url),'utf8'));
 const destination=editor();
 const original=JSON.stringify(golden);
 const loaded=loadMigratedDocumentIntoEditor(destination,golden);
 assert.equal(loaded.ok,true,JSON.stringify(loaded.diagnostics));
 assert.deepEqual(loaded.value,golden);
 assert.deepEqual(destination.getEditorState().toJSON(),golden.lexicalState);
 const exported=exportEditorToDocumentV2(destination,loaded.value);
 assert.equal(exported.ok,true,JSON.stringify(exported.diagnostics));
 assert.deepEqual(exported.value,golden);
 assert.equal(JSON.stringify(golden),original);
});
test('R03 checked-in v2 golden rejects unknown editor format without mutation',()=>{
 const golden=JSON.parse(readFileSync(new URL('../../../fixtures/tufte/server-document-v2.json',import.meta.url),'utf8'));
 const destination=editor();
 const before=destination.getEditorState().toJSON();
 golden.editorFormat.formatVersion=2;
 const result=loadMigratedDocumentIntoEditor(destination,golden);
 assert.equal(result.ok,false);
 assert.ok(result.diagnostics.some(d=>d.code==='UNSUPPORTED_EDITOR_FORMAT'));
 assert.deepEqual(destination.getEditorState().toJSON(),before);
});


test('R01 image import rejects unsafe URL and invalid asset identifier',()=>{
 const valid={type:'tufte-inline-image',version:1,src:'/assets/chart.png',alt:'chart',assetId:'chart_1',width:640,height:360};
 assert.throws(()=>InlineImageNode.importJSON({...valid,src:'javascript:alert(1)'}),/Invalid image properties/);
 assert.throws(()=>InlineImageNode.importJSON({...valid,assetId:'../escape'}),/Invalid image properties/);
 assert.throws(()=>InlineImageNode.importJSON({...valid,width:0}),/Invalid image properties/);
 assert.throws(()=>InlineImageNode.importJSON({...valid,height:-1}),/Invalid image properties/);
 assert.throws(()=>InlineImageNode.importJSON({...valid,version:99}),/Unsupported image version/);
});
test('R01 image export preserves validated asset and dimensions',()=>{
 const source=editor();
 source.update(()=>{
  $getRoot().append($createSectionNode().append(
   $createParagraphNode().append($createInlineImageNode('/assets/chart.png','chart','chart_1',640,360))
  ));
 },{discrete:true});
 const node=source.getEditorState().toJSON().root.children[0].children[0].children[0];
 assert.equal(node.src,'/assets/chart.png');
 assert.equal(node.assetId,'chart_1');
 assert.equal(node.width,640);
 assert.equal(node.height,360);
});


test('R02 all supported Tufte span kinds and both note kinds roundtrip',()=>{
 const source=editor();
 source.update(()=>{
  const paragraph=$createParagraphNode();
  for(const kind of ['sans','newthought','numeral','danger']){
   paragraph.append($createTufteSpanNode(kind).append($createTextNode(kind)));
  }
  paragraph.append(
   $createNoteNode('note-left','sidenote').append($createTextNode('left')),
   $createNoteNode('note-right','marginnote').append($createTextNode('right'))
  );
  $getRoot().append($createSectionNode().append(paragraph));
 },{discrete:true});
 const base=fixture(),document={...base,lexicalState:source.getEditorState().toJSON()};
 const target=editor(),loaded=loadDocumentIntoEditor(target,document);
 assert.equal(loaded.ok,true,JSON.stringify(loaded.diagnostics));
 const saved=exportEditorToDocument(target,document);
 assert.equal(saved.ok,true,JSON.stringify(saved.diagnostics));
 assert.deepEqual(saved.value.lexicalState,document.lexicalState);
 const children=saved.value.lexicalState.root.children[0].children[0].children;
 assert.deepEqual(children.slice(0,4).map(node=>node.kind),['sans','newthought','numeral','danger']);
 assert.deepEqual(children.slice(4).map(node=>[node.noteId,node.kind]),[['note-left','sidenote'],['note-right','marginnote']]);
});

test('R02 figure body width and table fullwidth layout roundtrip',()=>{
 const source=editor();
 source.update(()=>{
  const table=$createTableNode().append(
   $createTableRowNode().append(
    $createTableCellNode(1).append($createParagraphNode().append($createTextNode('heading')))
   )
  );
  $getRoot().append($createSectionNode().append(
   $createFigureNode('body').append(
    $createInlineImageNode('/images/plot.png','plot','plot-asset',320,200),
    $createCaptionNode().append($createTextNode('caption'))
   ),
   $createTableLayoutNode('fullwidth').append(table)
  ));
 },{discrete:true});
 const base=fixture();
 const document={...base,assets:[...base.assets,{id:'plot-asset',src:'/images/plot.png',mimeType:'image/png',width:320,height:200}],lexicalState:source.getEditorState().toJSON()};
 const target=editor(),loaded=loadDocumentIntoEditor(target,document);
 assert.equal(loaded.ok,true,JSON.stringify(loaded.diagnostics));
 const saved=exportEditorToDocument(target,document);
 assert.equal(saved.ok,true,JSON.stringify(saved.diagnostics));
 assert.deepEqual(saved.value.lexicalState,document.lexicalState);
 assert.equal(saved.value.lexicalState.root.children[0].children[0].width,'body');
 assert.equal(saved.value.lexicalState.root.children[0].children[1].layout,'fullwidth');
});

test('P2.2 heading h2/h3 and quote roundtrip through real Lexical',()=>{
 const source=editor();
 source.update(()=>{
  $getRoot().append($createSectionNode().append(
   $createHeadingNode('h2').append($createTextNode('제목 2')),
   $createHeadingNode('h3').append($createTextNode('제목 3')),
   $createQuoteNode().append($createTextNode('인용문'))
  ));
 },{discrete:true});
 const base=fixture(),document={...base,lexicalState:source.getEditorState().toJSON()};
 const target=editor(),loaded=loadDocumentIntoEditor(target,document);
 assert.equal(loaded.ok,true,JSON.stringify(loaded.diagnostics));
 const saved=exportEditorToDocument(target,document);
 assert.equal(saved.ok,true,JSON.stringify(saved.diagnostics));
 assert.deepEqual(saved.value.lexicalState,document.lexicalState);
 const blocks=saved.value.lexicalState.root.children[0].children;
 assert.deepEqual(blocks.map(node=>node.type),['heading','heading','quote']);
 assert.deepEqual(blocks.slice(0,2).map(node=>node.tag),['h2','h3']);
});

test('P2.2 horizontal rule retains node type and position across editor roundtrip',()=>{
 const source=editor();
 source.update(()=>{
  $getRoot().append($createSectionNode().append(
   $createParagraphNode().append($createTextNode('before')),
   $createHorizontalRuleNode(),
   $createParagraphNode().append($createTextNode('after'))
  ));
 },{discrete:true});
 const base=fixture(),document={...base,lexicalState:source.getEditorState().toJSON()};
 const target=editor(),loaded=loadDocumentIntoEditor(target,document);
 assert.equal(loaded.ok,true,JSON.stringify(loaded.diagnostics));
 const saved=exportEditorToDocument(target,document);
 assert.equal(saved.ok,true,JSON.stringify(saved.diagnostics));
 assert.deepEqual(saved.value.lexicalState,document.lexicalState);
 assert.deepEqual(saved.value.lexicalState.root.children[0].children.map(node=>node.type),['paragraph','horizontalrule','paragraph']);
});

test('F06 definition list with multiple descriptions roundtrips without flattening',()=>{
 const source=editor();
 source.update(()=>{
  $getRoot().append($createSectionNode().append(
   $createDefinitionListNode().append(
    $createDefinitionTermNode().append($createTextNode('Term A')),
    $createDefinitionDescriptionNode().append($createParagraphNode().append($createTextNode('Meaning A1'))),
    $createDefinitionDescriptionNode().append($createParagraphNode().append($createTextNode('Meaning A2'))),
    $createDefinitionTermNode().append($createTextNode('Term B')),
    $createDefinitionDescriptionNode().append($createParagraphNode().append($createTextNode('Meaning B')))
   )
  ));
 },{discrete:true});
 const base=fixture(),document={...base,lexicalState:source.getEditorState().toJSON()};
 const target=editor(),loaded=loadDocumentIntoEditor(target,document);
 assert.equal(loaded.ok,true,JSON.stringify(loaded.diagnostics));
 const saved=exportEditorToDocument(target,document);
 assert.equal(saved.ok,true,JSON.stringify(saved.diagnostics));
 assert.deepEqual(saved.value.lexicalState,document.lexicalState);
 assert.deepEqual(saved.value.lexicalState.root.children[0].children[0].children.map(node=>node.type),
  ['tufte-term','tufte-definition','tufte-definition','tufte-term','tufte-definition']);
});
test('F06 malformed definition list is rejected before editor installation',()=>{
 const source=editor();
 source.update(()=>{
  $getRoot().append($createSectionNode().append(
   $createDefinitionListNode().append(
    $createDefinitionDescriptionNode().append($createParagraphNode().append($createTextNode('Orphan')))
   )
  ));
 },{discrete:true});
 const document={...fixture(),lexicalState:source.getEditorState().toJSON()};
 const target=editor(),before=target.getEditorState().toJSON();
 const loaded=loadDocumentIntoEditor(target,document);
 assert.equal(loaded.ok,false);
 assert.ok(loaded.diagnostics.some(d=>d.code==='INVALID_DEFINITION_LIST'),JSON.stringify(loaded.diagnostics));
 assert.deepEqual(target.getEditorState().toJSON(),before);
});

test('F08 F09 epigraph quotation and attribution cite survive document roundtrip',()=>{
 const source=editor();
 source.update(()=>{
  $getRoot().append($createSectionNode().append(
   $createEpigraphNode().append(
    $createQuoteNode().append(
     $createTextNode('Quoted passage'),
     $createAttributionNode().append(
      $createTextNode('Author, '),
      $createCiteNode().append($createTextNode('Book title'))
     )
    )
   )
  ));
 },{discrete:true});
 const base=fixture(),document={...base,lexicalState:source.getEditorState().toJSON()};
 const target=editor(),loaded=loadDocumentIntoEditor(target,document);
 assert.equal(loaded.ok,true,JSON.stringify(loaded.diagnostics));
 const saved=exportEditorToDocument(target,document);
 assert.equal(saved.ok,true,JSON.stringify(saved.diagnostics));
 assert.deepEqual(saved.value.lexicalState,document.lexicalState);
 const epigraph=saved.value.lexicalState.root.children[0].children[0];
 assert.equal(epigraph.type,'tufte-epigraph');
 assert.deepEqual(epigraph.children[0].children.map(n=>n.type),['text','tufte-attribution']);
 assert.equal(epigraph.children[0].children[1].children[1].type,'tufte-cite');
});
test('F08 quotation rejects attribution before quoted content',()=>{
 const source=editor();
 source.update(()=>{
  $getRoot().append($createSectionNode().append(
   $createEpigraphNode().append(
    $createQuoteNode().append(
     $createAttributionNode().append($createTextNode('Attribution only'))
    )
   )
  ));
 },{discrete:true});
 const document={...fixture(),lexicalState:source.getEditorState().toJSON()};
 const result=loadDocumentIntoEditor(editor(),document);
 assert.equal(result.ok,false);
 assert.ok(result.diagnostics.some(d=>d.code==='INVALID_QUOTE'),JSON.stringify(result.diagnostics));
});

test('F07 section footer with cite survives strict document roundtrip',()=>{
 const source=editor();
 source.update(()=>{
  $getRoot().append($createSectionNode().append(
   $createParagraphNode().append($createTextNode('Article body')),
   $createSectionFooterNode().append(
    $createTextNode('Source: '),
    $createCiteNode().append($createTextNode('Original essay'))
   )
  ));
 },{discrete:true});
 const document={...fixture(),lexicalState:source.getEditorState().toJSON()};
 const target=editor(),loaded=loadDocumentIntoEditor(target,document);
 assert.equal(loaded.ok,true,JSON.stringify(loaded.diagnostics));
 const saved=exportEditorToDocument(target,document);
 assert.equal(saved.ok,true,JSON.stringify(saved.diagnostics));
 assert.deepEqual(saved.value.lexicalState,document.lexicalState);
 const footer=saved.value.lexicalState.root.children[0].children[1];
 assert.equal(footer.type,'tufte-section-footer');
 assert.equal(footer.children[1].type,'tufte-cite');
});
test('F07 validator rejects footer nested inside a paragraph without Lexical normalization',()=>{
 const source=editor();
 source.update(()=>{
  $getRoot().append($createSectionNode().append(
   $createParagraphNode().append($createTextNode('Body')),
   $createSectionFooterNode().append($createTextNode('Invalid placement'))
  ));
 },{discrete:true});
 const document={...fixture(),lexicalState:source.getEditorState().toJSON()};
 const section=document.lexicalState.root.children[0];
 const footer=section.children.pop();
 section.children[0].children.push(footer);
 const checked=validateDocument(document);
 assert.equal(checked.ok,false);
 assert.ok(checked.diagnostics.some(d=>d.code==='INVALID_CHILD'),JSON.stringify(checked.diagnostics));
 const result=loadDocumentIntoEditor(editor(),document);
 assert.equal(result.ok,false);
 assert.ok(result.diagnostics.some(d=>d.code==='INVALID_CHILD'),JSON.stringify(result.diagnostics));
});

test('F15 fullwidth block preserves nested block structure through strict roundtrip',()=>{
 const source=editor();
 source.update(()=>{
  $getRoot().append($createSectionNode().append(
   $createParagraphNode().append($createTextNode('Regular body')),
   $createFullwidthNode().append(
    $createParagraphNode().append($createTextNode('Wide paragraph')),
    $createQuoteNode().append($createTextNode('Wide quotation'))
   )
  ));
 },{discrete:true});
 const document={...fixture(),lexicalState:source.getEditorState().toJSON()};
 const target=editor(),loaded=loadDocumentIntoEditor(target,document);
 assert.equal(loaded.ok,true,JSON.stringify(loaded.diagnostics));
 const saved=exportEditorToDocument(target,document);
 assert.equal(saved.ok,true,JSON.stringify(saved.diagnostics));
 assert.deepEqual(saved.value.lexicalState,document.lexicalState);
 const wide=saved.value.lexicalState.root.children[0].children[1];
 assert.equal(wide.type,'tufte-fullwidth');
 assert.deepEqual(wide.children.map(node=>node.type),['paragraph','quote']);
});

test('F17 code block retains leading spaces, tabs, line breaks and language',()=>{
 const source=editor();
 source.update(()=>{
  $getRoot().append($createSectionNode().append(
   $createTufteCodeNode('fullwidth','typescript').append(
    $createTextNode('  const value = 1;\t'),
    $createTextNode('\n    return value;')
   )
  ));
 },{discrete:true});
 const document={...fixture(),lexicalState:source.getEditorState().toJSON()};
 const target=editor(),loaded=loadDocumentIntoEditor(target,document);
 assert.equal(loaded.ok,true,JSON.stringify(loaded.diagnostics));
 const saved=exportEditorToDocument(target,document);
 assert.equal(saved.ok,true,JSON.stringify(saved.diagnostics));
 assert.deepEqual(saved.value.lexicalState,document.lexicalState);
 const code=saved.value.lexicalState.root.children[0].children[0];
 assert.equal(code.type,'tufte-code');
 assert.equal(code.width,'fullwidth');
 assert.equal(code.language,'typescript');
 assert.ok(code.children.map(child=>child.text??'').join('').includes('  const value = 1;\t'));
});

test('F19 ImageQuilt retains src alt assetId dimensions and figure width',()=>{
 const source=editor();
 source.update(()=>{
  $getRoot().append($createSectionNode().append(
   $createFigureNode('fullwidth').append(
    $createImageQuiltNode('/assets/quilt.png','Composite panels','quiltAsset',1200,720)
   )
  ));
 },{discrete:true});
 const base=fixture(),document={...base,lexicalState:source.getEditorState().toJSON(),
  assets:[...base.assets,{id:'quiltAsset',src:'/assets/quilt.png',mimeType:'image/png',width:1200,height:720,byteLength:4096}]};
 const target=editor(),loaded=loadDocumentIntoEditor(target,document);
 assert.equal(loaded.ok,true,JSON.stringify(loaded.diagnostics));
 const saved=exportEditorToDocument(target,document);
 assert.equal(saved.ok,true,JSON.stringify(saved.diagnostics));
 assert.deepEqual(saved.value.lexicalState,document.lexicalState);
 const quilt=saved.value.lexicalState.root.children[0].children[0].children[0];
 assert.deepEqual([quilt.type,quilt.src,quilt.alt,quilt.assetId,quilt.width,quilt.height],
  ['tufte-imagequilt','/assets/quilt.png','Composite panels','quiltAsset',1200,720]);
});
test('F19 ImageQuilt rejects unsafe source and invalid dimensions',()=>{
 assert.throws(()=>$createImageQuiltNode('javascript:alert(1)','bad'));
 assert.throws(()=>$createImageQuiltNode('/assets/q.png','bad',undefined,0,720));
 assert.throws(()=>$createImageQuiltNode('/assets/q.png','bad'));
});

test('F18 embed retains provider title wrapper width and ratio through document roundtrip',()=>{
 const source=editor();
 source.update(()=>{
  $getRoot().append($createSectionNode().append(
   $createEmbedNode('youtube','https://www.youtube-nocookie.com/embed/abcdefghijk','Demonstration','figure','fullwidth',16/9)
  ));
 },{discrete:true});
 const document={...fixture(),lexicalState:source.getEditorState().toJSON()};
 const target=editor(),loaded=loadDocumentIntoEditor(target,document);
 assert.equal(loaded.ok,true,JSON.stringify(loaded.diagnostics));
 const saved=exportEditorToDocument(target,document);
 assert.equal(saved.ok,true,JSON.stringify(saved.diagnostics));
 assert.deepEqual(saved.value.lexicalState,document.lexicalState);
 const embed=saved.value.lexicalState.root.children[0].children[0];
 assert.deepEqual([embed.provider,embed.wrapper,embed.width,embed.aspectRatio],['youtube','figure','fullwidth',16/9]);
});
test('F18 embed disallows arbitrary iframe domains and query strings',()=>{
 assert.throws(()=>$createEmbedNode('youtube','https://example.com/embed/abcdefghijk','unsafe'));
 assert.throws(()=>$createEmbedNode('youtube','https://www.youtube-nocookie.com/embed/abcdefghijk?autoplay=1','unsafe'));
 assert.throws(()=>$createEmbedNode('vimeo','https://player.vimeo.com/video/12345',''));
});
