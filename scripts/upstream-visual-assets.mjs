/**
 * Offline upstream visual fixture: pinned upstream Git objects only.
 * This module never downloads missing files as a side effect of a test.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync} from 'node:fs';

export const upstreamAssetRoot=new URL('../fixtures/tufte/upstream/',import.meta.url);
export const upstreamAssetManifest=JSON.parse(readFileSync(
 new URL('assets-manifest.json',upstreamAssetRoot),'utf8'
));

export function verifyUpstreamSourceInventory(){
 const html=readFileSync(new URL('index.html',upstreamAssetRoot),'utf8');
 const css=readFileSync(new URL('tufte.css',upstreamAssetRoot),'utf8');
 const images=[...html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)].map(match=>match[1]);
 const fonts=[...css.matchAll(/url\("([^"]+\.woff)"\)/g)].map(match=>match[1]);
 assert.equal(upstreamAssetManifest.pinnedCommit,
  'b5d7b7bbe5ce9c4c50fcfad4f19ee3646cfd7ae1','Upstream pin changed');
 assert.deepEqual(images,upstreamAssetManifest.images.map(entry=>entry.path),
  'Official image inventory changed: update pin and audit before changing manifest');
 assert.deepEqual(fonts,upstreamAssetManifest.fonts.map(entry=>entry.path),
  'Official CSS WOFF inventory changed: update pin and audit before changing manifest');
 const paths=[...upstreamAssetManifest.images,...upstreamAssetManifest.fonts].map(entry=>entry.path);
 assert.equal(new Set(paths).size,paths.length,'Duplicated upstream asset path');
 for(const path of paths){
  assert.match(path,/^(?:img|et-book)\/[a-zA-Z0-9._/-]+$/);
  assert.ok(!path.split('/').includes('..'),'Upstream asset path traversal');
 }
}

export function verifyUpstreamAsset(entry,bytes){
 assert.ok(Number.isSafeInteger(entry.size)&&entry.size>0);
 assert.equal(bytes.length,entry.size,entry.path+': unexpected upstream byte count');
 assert.match(entry.gitBlobSha,/^[a-f0-9]{40}$/);
 const prefix=Buffer.from('blob '+bytes.length+'\0','utf8');
 const digest=createHash('sha1').update(prefix).update(bytes).digest('hex');
 assert.equal(digest,entry.gitBlobSha,entry.path+': Git blob hash mismatch');
}

export function loadVerifiedUpstreamAssets(){
 verifyUpstreamSourceInventory();
 const assets=new Map();
 for(const entry of [...upstreamAssetManifest.images,...upstreamAssetManifest.fonts]){
  const location=new URL(entry.path,upstreamAssetRoot);
  assert.ok(existsSync(location),
   'Missing pinned upstream asset '+entry.path+
   '; run `node scripts/sync-upstream-visual-assets.mjs` before visual testing');
  const bytes=readFileSync(location);
  verifyUpstreamAsset(entry,bytes);
  assets.set(entry.path,bytes);
 }
 return assets;
}
