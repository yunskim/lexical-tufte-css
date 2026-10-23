import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateDocument} from '@lexical-tufte/document';
import {renderArticle} from '../dist/index.js';
const fixture=()=>JSON.parse(readFileSync(
 new URL('../../../fixtures/tufte/server-document.json',import.meta.url),'utf8'
));
function firstImage(root){
 if(root.type==='tufte-inline-image')return root;
 for(const node of root.children??[]){
  const image=firstImage(node);
  if(image)return image;
 }
 return null;
}
test('optional inline image dimensions publish as HTML attributes and omission is byte stable',()=>{
 const doc=fixture();
 const image=firstImage(doc.lexicalState.root);
 assert.ok(image);
 assert.equal(Object.hasOwn(image,'width'),false);
 assert.equal(Object.hasOwn(image,'height'),false);
 const original=renderArticle(doc);
 assert.equal(original.ok,true,JSON.stringify(original.diagnostics));
 assert.match(original.html,/src="\/fixture.svg" alt="주석 그림"/);
 image.width=640;
 image.height=480;
 const validated=validateDocument(doc);
 assert.equal(validated.ok,true,JSON.stringify(validated.diagnostics));
 const sized=renderArticle(doc);
 assert.equal(sized.ok,true,JSON.stringify(sized.diagnostics));
 assert.match(sized.html,/src="\/fixture.svg" alt="주석 그림" width="640" height="480"/);
 delete image.width;delete image.height;
 assert.equal(renderArticle(doc).html,original.html,
  'Original upstream output is unchanged when dimensions are omitted');
});
