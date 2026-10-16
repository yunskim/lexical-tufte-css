import {test} from 'node:test';
import assert from 'node:assert/strict';
import {postStorageKey,slugCollisionKey,assertUniqueSlugs} from '../dist/index.js';

test('R12 storage path uses immutable document ID, not slug',()=>{
 assert.equal(postStorageKey('post_001'),'posts/post_001/post.json');
 for(const id of ['../evil','a/b','a\\b','CON','con.txt','NUL','COM1','LPT9','a.',''])assert.throws(()=>postStorageKey(id));
});
test('R12 slug collision keys case-fold and reject Windows devices',()=>{
 assert.equal(slugCollisionKey('Hello-World'),slugCollisionKey('hello-world'));
 assert.throws(()=>assertUniqueSlugs(['Hello','hello']),/DUPLICATE_SLUG/);
 assert.throws(()=>assertUniqueSlugs(['한글','한글']),/DUPLICATE_SLUG/);
 for(const slug of ['CON','nul','COM1','lpt9','../x','a/b','a.','x '])assert.throws(()=>slugCollisionKey(slug));
 assert.doesNotThrow(()=>assertUniqueSlugs(['first','second']));
});
