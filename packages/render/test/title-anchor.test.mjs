import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderArticle} from '../dist/index.js';
const fixture=()=>JSON.parse(readFileSync(new URL(
 '../../../fixtures/tufte/server-document.json',import.meta.url),'utf8'));

test('h1 anchor is stable across namespaces; old documents keep ID-free h1',()=>{
 const old=renderArticle(fixture());
 assert.equal(old.ok,true,JSON.stringify(old.diagnostics));
 assert.match(old.html,/<h1>/);
 assert.doesNotMatch(old.html,/<h1 id=/);
 const doc=fixture();doc.titleId='tufte-css';
 const snapshot=JSON.stringify(doc);
 const a=renderArticle(doc),b=renderArticle(doc,{idPrefix:'other-instance'});
 assert.equal(a.ok,true,JSON.stringify(a.diagnostics));
 assert.equal(b.ok,true,JSON.stringify(b.diagnostics));
 assert.match(a.html,/<h1 id="tufte-css">/);
 assert.match(b.html,/<h1 id="tufte-css">/);
 assert.equal(JSON.stringify(doc),snapshot,'Renderer mutated source title ID');
});

test('h1 anchor cannot shadow generated article or note IDs',()=>{
 const a=fixture();a.titleId=a.id+'-article';
 const articleConflict=renderArticle(a);
 assert.equal(articleConflict.ok,false);
 assert.ok(articleConflict.diagnostics.some(d=>d.code==='DUPLICATE_TITLE_ID'&&d.path==='$.titleId'));
 const b=fixture(),note=b.lexicalState.root.children[0].children[0].children[1];
 b.titleId='tufte-'+b.id.length+'-'+b.id+'-'+note.noteId;
 const noteConflict=renderArticle(b);
 assert.equal(noteConflict.ok,false);
 assert.ok(noteConflict.diagnostics.some(d=>d.code==='DUPLICATE_TITLE_ID'));
 // The runtime prefix matters. An h1 ID must never be changed silently.
 const c=fixture();c.titleId='alternate-article';
 assert.equal(renderArticle(c).ok,true);
 const other=renderArticle(c,{idPrefix:'alternate'});
 assert.equal(other.ok,false);
 assert.ok(other.diagnostics.some(d=>d.code==='DUPLICATE_TITLE_ID'));
});
