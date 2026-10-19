import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {validateDocument} from '../dist/index.js';

const load=filename=>JSON.parse(readFileSync(new URL('../../../fixtures/tufte/'+filename,import.meta.url),'utf8'));
const collect=node=>[node,...(node.children?.flatMap(collect)??[])];
const expected=[
 ['server-note','tufte-sidenote'],
 ['server-margin','tufte-marginnote']
];

test('v1 and v2 server fixtures preserve concrete note types, IDs and payloads',()=>{
 const v1=load('server-document.json');
 const v2=load('server-document-v2.json');
 assert.equal(v1.schemaVersion,1);
 assert.equal(v2.schemaVersion,2);
 assert.deepEqual(v2.editorFormat,{engine:'lexical',formatVersion:1});
 const checked=validateDocument(v1);
 assert.equal(checked.ok,true,JSON.stringify(checked.diagnostics));
 assert.deepEqual(v1.lexicalState,v2.lexicalState,'storage envelope migration must preserve Lexical contents');
 assert.deepEqual(v1.assets,v2.assets);

 for(const fixture of [v1,v2]){
  const nodes=collect(fixture.lexicalState.root);
  assert.equal(nodes.some(node=>node.type==='tufte-note'),false,'legacy wire type must never enter current fixtures');
  const notes=nodes.filter(node=>node.type==='tufte-sidenote'||node.type==='tufte-marginnote');
  assert.deepEqual(notes.map(note=>[note.noteId,note.type]),expected);
  assert.ok(notes.every(note=>!Object.hasOwn(note,'kind')),'note identity lives in the node type');
  assert.equal(notes[0].children.some(node=>node.type==='link'),true,'rich link payload retained');
  assert.equal(notes[0].children.some(node=>node.type==='tufte-inline-image'),true,'inline image retained');
  assert.equal(notes[1].children[0].text,'번호 없는 주석');
 }
});

test('obsolete tufte-note wire type is rejected rather than silently migrated',()=>{
 const fixture=load('server-document.json');
 const first=collect(fixture.lexicalState.root).find(node=>node.type==='tufte-sidenote');
 assert.ok(first);
 first.type='tufte-note';
 first.kind='sidenote';
 const checked=validateDocument(fixture);
 assert.equal(checked.ok,false);
 assert.ok(checked.diagnostics.some(issue=>issue.code==='UNKNOWN_NODE'),JSON.stringify(checked.diagnostics));
});
