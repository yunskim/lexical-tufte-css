import {test} from 'node:test';
import assert from 'node:assert/strict';
import {element,serializeHTML} from '../dist/index.js';

test('typed serializer escapes text and attribute values',()=>{
 const node=element('a',{href:'https://example.test/?a=1&b="x"'},['<script>alert("x")</script>']);
 assert.equal(serializeHTML(node),'<a href="https://example.test/?a=1&amp;b=&quot;x&quot;">&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;</a>');
});
test('typed serializer rejects unsupported tags, attributes and void children',()=>{
 assert.throws(()=>element('script',{},['bad']),/Unsupported/);
 assert.throws(()=>element('a',{onclick:'alert(1)'},[]),/Unsupported/);
 assert.throws(()=>element('img',{},['bad'],true),/Void/);
 assert.equal(serializeHTML(element('br',{},[],true)),'<br>');
});

test('publication checkbox preserves an accessible name without allowing arbitrary attributes',()=>{
 const input=element('input',{id:'note-toggle',type:'checkbox','aria-label':'Toggle margin note'},[],true);
 assert.equal(serializeHTML(input),'<input id="note-toggle" type="checkbox" aria-label="Toggle margin note">');
 assert.throws(()=>element('input',{'aria-roledescription':'unexpected'},[],true),/Unsupported/);
});
