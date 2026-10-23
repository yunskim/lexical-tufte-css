import {test} from 'node:test';
import assert from 'node:assert/strict';
import {$getRoot,$createParagraphNode,$createTextNode,ParagraphNode} from 'lexical';
import {$createQuoteNode,$createHeadingNode,QuoteNode,HeadingNode} from '@lexical/rich-text';
import {createHeadlessEditor,TUFTE_NODES,$createSectionNode,$createTufteParagraphNode,$createTufteQuoteNode,$createTufteHeadingNode,exportCanonicalEditorState,parseCanonicalEditorState,loadDocumentIntoEditor,exportEditorToDocument,loadMigratedDocumentIntoEditor,exportEditorToDocumentV2,inspectEditorStructure} from '../dist/index.js';
const editor=()=>createHeadlessEditor({nodes:TUFTE_NODES,onError:error=>{throw error;}});
test('core factories and transform registration have no replacement cycles',()=>{
 const e=editor();
 assert.equal(new Set(TUFTE_NODES.map(K=>K.getType())).size,TUFTE_NODES.length,'one class per runtime type');
 const classes=[ParagraphNode,QuoteNode,HeadingNode];
 const dispose=classes.map(K=>e.registerNodeTransform(K,()=>{}));
 e.update(()=>{
  const nodes=[$createParagraphNode(),$createQuoteNode(),$createHeadingNode('h2')];
  nodes.forEach((node,i)=>assert.equal(node.constructor,classes[i]));
  $getRoot().append($createSectionNode().append(...nodes));
 },{discrete:true});
 dispose.forEach(f=>f());
 assert.deepEqual(inspectEditorStructure(e),[]);
});
test('metadata runtime types are distinct while canonical storage types stay unchanged',()=>{
 const e=editor();
 e.update(()=>$getRoot().append($createSectionNode().append(
  $createTufteParagraphNode('sans').append($createTextNode('Sans')),
  $createTufteQuoteNode('https://example.org/source').append($createTextNode('Quote')),
  $createTufteHeadingNode('h2').setId('anchor').append($createTextNode('Heading'))
 )),{discrete:true});
 const raw=e.getEditorState().toJSON().root.children[0].children;
 assert.deepEqual(raw.map(n=>n.type),['tufte-paragraph','tufte-quote','tufte-heading']);
 const canonical=exportCanonicalEditorState(e.getEditorState());
 const blocks=canonical.root.children[0].children;
 assert.deepEqual(blocks.map(n=>n.type),['paragraph','quote','heading']);
 assert.equal(blocks[0].tufteClass,'sans');assert.equal(blocks[1].cite,'https://example.org/source');assert.equal(blocks[2].id,'anchor');
 assert.deepEqual(inspectEditorStructure(e),[]);
 const doc={schemaVersion:1,id:'metadata',locale:'en-US',title:'Metadata',assets:[],lexicalState:canonical};
 const before=JSON.stringify(doc),second=editor();
 assert.equal(loadDocumentIntoEditor(second,doc).ok,true);
 const result=exportEditorToDocument(second,doc);assert.equal(result.ok,true);
 assert.deepEqual(result.value,doc);assert.equal(JSON.stringify(doc),before);
 const third=editor();third.setEditorState(parseCanonicalEditorState(third,JSON.parse(JSON.stringify(canonical))));
 assert.deepEqual(exportCanonicalEditorState(third.getEditorState()),canonical);
 const fourth=editor(),migrated=loadMigratedDocumentIntoEditor(fourth,doc);
 assert.equal(migrated.ok,true);
 const savedV2=exportEditorToDocumentV2(fourth,migrated.value);
 assert.equal(savedV2.ok,true);assert.deepEqual(savedV2.value,migrated.value,'v2 metadata is preserved');
 blocks[0].tufteClass=undefined;
 assert.equal(exportCanonicalEditorState(e.getEditorState()).root.children[0].children[0].tufteClass,'sans','export detached');
});
test('canonical loader rejects unknown metadata without installing partial state',()=>{
 const e=editor();e.update(()=>$getRoot().append($createSectionNode().append($createParagraphNode().append($createTextNode('kept')))),{discrete:true});
 const before=exportCanonicalEditorState(e.getEditorState());
 const doc={schemaVersion:1,id:'reject',locale:'en-US',title:'Reject',assets:[],lexicalState:structuredClone(before)};
 doc.lexicalState.root.children[0].children[0].tufteClass='unknown';
 assert.equal(loadDocumentIntoEditor(e,doc).ok,false);
 assert.deepEqual(exportCanonicalEditorState(e.getEditorState()),before);
 assert.throws(()=>parseCanonicalEditorState(e,{}),/root/);
});
