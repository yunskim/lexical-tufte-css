import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../fixtures/fonts/proof/',import.meta.url),manifest=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8'));
assert.equal(manifest.fixtureVersion,1);assert.equal(manifest.sources.length,2);
const css=readFileSync(new URL('fonts.css',root),'utf8');assert.equal((css.match(/@font-face/g)??[]).length,8);assert.match(css,/font-display:swap/);
for(const source of manifest.sources){const seen=new Set();assert.ok(!source.family.includes('Source'));for(const chunk of source.chunks){
 const bytes=readFileSync(new URL(chunk.file,root));assert.equal(bytes.subarray(0,4).toString(),'wOF2');assert.equal(bytes.length,chunk.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),chunk.sha256);assert.ok(css.includes('unicode-range:'+chunk.unicodeRange));
 for(const character of chunk.characters){assert.ok(character.codePointAt(0)>127);assert.ok(!seen.has(character));seen.add(character);}
}
 const license=readFileSync(new URL('OFL-'+source.kind+'.txt',root),'utf8');assert.match(license,/SIL OPEN FONT LICENSE Version 1.1/);assert.match(license,/Reserved Font\s+Name 'Source'/);
}
console.log('R13 proof font signatures/hashes/licenses/range partition PASS; production coverage remains P4.');
