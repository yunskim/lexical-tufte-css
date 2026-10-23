import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ReferenceSelection} from '../dist/index.js';

test('selection resolution is discarded when a new search begins',async()=>{
 let resolveChoice;
 const item={namespace:'workspace',kind:'note',id:'same',title:'Old'};
 const provider={
  search:async()=>({items:[],nextCursor:null}),
  resolve:()=>new Promise(resolve=>{resolveChoice=resolve;}),
  backlinks:async()=>({items:[],nextCursor:null})
 };
 const selection=new ReferenceSelection(provider);
 const pending=selection.choose(item);
 await selection.search({text:'new'});
 resolveChoice(item);
 assert.equal(await pending,null);
});

test('selection resolution is discarded when picker is cancelled',async()=>{
 let resolveChoice;
 const item={namespace:'workspace',kind:'note',id:'same',title:'Old'};
 const provider={
  search:async()=>({items:[],nextCursor:null}),
  resolve:()=>new Promise(resolve=>{resolveChoice=resolve;}),
  backlinks:async()=>({items:[],nextCursor:null})
 };
 const selection=new ReferenceSelection(provider);
 const pending=selection.choose(item);
 selection.cancel();
 resolveChoice(item);
 assert.equal(await pending,null);
});
