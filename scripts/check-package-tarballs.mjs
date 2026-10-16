import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,readdirSync,symlinkSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),directory=resolve(process.argv[2]??'/tmp/lexical-tufte-packs'),temp=mkdtempSync(join(tmpdir(),'tufte-package-consumer-'));
try{
 const scope=join(temp,'node_modules','@lexical-tufte');mkdirSync(scope,{recursive:true});
 for(const name of ['document','lexical','render','blog']){
  const version=JSON.parse(readFileSync(join(root,'packages',name,'package.json'),'utf8')).version;
  const tarball=join(directory,`lexical-tufte-${name}-${version}.tgz`),list=execFileSync('tar',['-tzf',tarball],{encoding:'utf8'});
  for(const required of ['LICENSE','THIRD_PARTY_NOTICES.md','licenses/source-han-serif-OFL.txt','licenses/source-han-sans-OFL.txt'])assert.ok(list.includes('package/'+required),name+': '+required);
  const target=join(scope,name);mkdirSync(target);execFileSync('tar',['-xzf',tarball,'--strip-components=1','-C',target]);
  assert.equal(readFileSync(join(target,'LICENSE'),'utf8'),readFileSync(join(root,'LICENSE'),'utf8'));assert.equal(JSON.parse(readFileSync(join(target,'package.json'),'utf8')).license,'GPL-3.0-only');
 }
 // Use the already verified external dependency versions without an online install.
 const external=join(root,'packages/lexical/node_modules');for(const entry of readdirSync(external)){if(entry==='@lexical-tufte'||entry==='.bin')continue;symlinkSync(join(external,entry),join(temp,'node_modules',entry),'dir');}
 writeFileSync(join(temp,'package.json'),'{"private":true,"type":"module"}');
 writeFileSync(join(temp,'fixture.json'),readFileSync(join(root,'fixtures/tufte/server-document.json')));
 writeFileSync(join(temp,'consumer.mjs'),`
 import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
 import {validateDocument} from '@lexical-tufte/document';import {renderArticle} from '@lexical-tufte/render';import {SqlitePublicationStore} from '@lexical-tufte/blog';
 import {createHeadlessEditor,TUFTE_NODES,loadDocumentIntoEditor,exportEditorToDocument} from '@lexical-tufte/lexical';
 const doc=JSON.parse(readFileSync(new URL('./fixture.json',import.meta.url),'utf8'));assert.equal(validateDocument(doc).ok,true);assert.equal(renderArticle(doc).ok,true);assert.equal(typeof SqlitePublicationStore,'function');
 const editor=createHeadlessEditor({nodes:TUFTE_NODES,onError(error){throw error;}});assert.equal(loadDocumentIntoEditor(editor,doc).ok,true);assert.deepEqual(JSON.parse(JSON.stringify(exportEditorToDocument(editor,doc).value)),doc);
 assert.ok(readFileSync(new URL(import.meta.resolve('@lexical-tufte/blog/sql/001_publications_v1.sql')),'utf8').includes('publication_heads_v1'));
 assert.ok(readFileSync(new URL(import.meta.resolve('@lexical-tufte/document/sql/001_posts_v2.sql')),'utf8').includes('posts_v2'));
 `);
 execFileSync(process.execPath,[join(temp,'consumer.mjs')],{cwd:temp,stdio:'pipe'});
 writeFileSync(join(temp,'consumer.ts'),`import {SqlitePublicationStore,type PublicationDatabase,type PublicationSnapshot} from '@lexical-tufte/blog';import {TUFTE_NODES,createHeadlessEditor} from '@lexical-tufte/lexical';declare const db:PublicationDatabase;const store=new SqlitePublicationStore(db);store.readState('post');createHeadlessEditor({nodes:TUFTE_NODES});declare const snapshot:PublicationSnapshot;const revision:number=snapshot.publishedRevision;`);
 execFileSync(join(root,'packages/lexical/node_modules/.bin/tsc'),['--noEmit','--module','NodeNext','--moduleResolution','NodeNext','--target','ES2022','--skipLibCheck',join(temp,'consumer.ts')],{cwd:temp,stdio:'pipe'});
 console.log('R13 four tarballs: full LICENSE/notices/OFL, packed JS imports, fresh declarations, strict editor roundtrip, renderer/blog and SQL exports PASS. No publishing.');
}finally{rmSync(temp,{recursive:true,force:true});}
