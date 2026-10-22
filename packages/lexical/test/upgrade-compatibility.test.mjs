import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {migrateStoredDocument,inspectStoredDocument} from '@lexical-tufte/document';
import {
 TESTED_LEXICAL_VERSION,
 loadMigratedDocumentIntoEditor,
 exportEditorToDocumentV2
} from '../dist/index.js';
import {createFixtureEditor} from './all-nodes-fixture.mjs';

// The snapshot is reviewed at *each* Lexical upgrade. The existence of an
// envelope migration does not imply that a new Lexical runtime is compatible.
test('Lexical baseline version, dependency manifest and golden fixture are aligned',()=>{
 const lexical=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
 const golden=new URL('./golden/lexical-'+TESTED_LEXICAL_VERSION+'-all-nodes.json',import.meta.url);
 const fixture=JSON.parse(readFileSync(golden,'utf8'));
 assert.equal(lexical.dependencies.lexical,TESTED_LEXICAL_VERSION);
 for(const [name,version] of Object.entries(lexical.dependencies))
  if(name.startsWith('@lexical/'))
   assert.equal(version,TESTED_LEXICAL_VERSION,name+' must match baseline');
 const lock=readFileSync(new URL('../../../pnpm-lock.yaml',import.meta.url),'utf8');
 const importer=lock.split('  packages/lexical:\n')[1]?.split('\n  packages/render:')[0];
 assert.ok(importer,'Missing frozen lockfile entry for headless lexical package');
 const selected=[...importer.matchAll(/specifier: ([0-9]+\.[0-9]+\.[0-9]+)/g)].map(x=>x[1]);
 assert.ok(selected.includes(TESTED_LEXICAL_VERSION));
 assert.equal(inspectStoredDocument(fixture).ok,true);
 assert.equal(fixture.schemaVersion,1,'The stored legacy regression document must remain v1');
});

test('existing v1 golden storage survives explicit envelope migration and editor import/export',()=>{
 const v='lexical-'+TESTED_LEXICAL_VERSION+'-all-nodes.json';
 const legacy=JSON.parse(readFileSync(new URL('./golden/'+v,import.meta.url),'utf8'));
 const before=JSON.stringify(legacy);
 const upgraded=migrateStoredDocument(legacy);
 assert.equal(upgraded.ok,true,JSON.stringify(upgraded.diagnostics));
 assert.deepEqual(upgraded.from,{schemaVersion:1,formatVersion:'legacy-v1'});
 assert.deepEqual(upgraded.to,{schemaVersion:2,formatVersion:1});
 const editor=createFixtureEditor();
 const loaded=loadMigratedDocumentIntoEditor(editor,legacy);
 assert.equal(loaded.ok,true,JSON.stringify(loaded.diagnostics));
 const saved=exportEditorToDocumentV2(editor,loaded.value);
 assert.equal(saved.ok,true,JSON.stringify(saved.diagnostics));
 assert.deepEqual(saved.value,upgraded.document);
 assert.equal(JSON.stringify(legacy),before,'Migration must not mutate stored bytes');
});

test('unrecognized future Lexical envelope and node fields are rejected, never silently rewritten',()=>{
 const v='lexical-'+TESTED_LEXICAL_VERSION+'-all-nodes.json';
 const old=JSON.parse(readFileSync(new URL('./golden/'+v,import.meta.url),'utf8'));
 const migrated=migrateStoredDocument(old);
 assert.equal(migrated.ok,true);
 for(const [change,code] of [
  [d=>d.editorFormat.formatVersion=2,'UNSUPPORTED_EDITOR_FORMAT'],
  [d=>d.lexicalState.root.children[0].unexpectedField=true,'UNKNOWN_FIELD']
 ]){
  const candidate=structuredClone(migrated.document);change(candidate);
  const failed=migrateStoredDocument(candidate);
  assert.equal(failed.ok,false,'Unknown storage form must require a migration');
  assert.ok(failed.diagnostics.some(d=>d.code===code),JSON.stringify(failed.diagnostics));
  const editor=createFixtureEditor(),load=loadMigratedDocumentIntoEditor(editor,candidate);
  assert.equal(load.ok,false,'A rejected upgrade must never enter the editor');
 }
});
