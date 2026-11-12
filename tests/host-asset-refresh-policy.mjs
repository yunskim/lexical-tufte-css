import assert from 'node:assert/strict';
import {
 isUsableResolvedImage,nextImageRefreshAt,imageRefreshRetryDelay
} from '../packages/editor-react/dist/index.js';

const now=Date.parse('2026-11-03T00:00:00.000Z');
const pinned={assetId:'atlas',revisionId:'rev-1'};
const latest={assetId:'atlas'};
const response={
 assetId:'atlas',revisionId:'rev-1',
 mediaType:'image/svg+xml',url:'/fixture.svg',
 expiresAt:new Date(now+120_000).toISOString()
};
assert.equal(isUsableResolvedImage(pinned,response,now),true);
assert.equal(isUsableResolvedImage(latest,response,now),true,
 'An unpinned locator follows the latest resolved revision');
for(const invalid of [
 null,undefined,{},[],{...response,assetId:'other'},
 {...response,revisionId:'rev-2'},{...response,revisionId:' '},
 (()=>{const {revisionId,...missing}=response;return missing;})(),
 {...response,mediaType:'text/html'},{...response,url:'javascript:alert(1)'},
 {...response,expiresAt:'not-a-date'},
 {...response,expiresAt:new Date(now-1).toISOString()}
])assert.equal(isUsableResolvedImage(pinned,invalid,now),false,JSON.stringify(invalid));
assert.equal(nextImageRefreshAt(undefined,now),Number.POSITIVE_INFINITY);
assert.equal(nextImageRefreshAt(new Date(now+120_000).toISOString(),now),now+60_000);
assert.equal(nextImageRefreshAt(new Date(now+20_000).toISOString(),now),now+10_000,
 'Short-lived signed URLs must not be polled every second');
assert.equal(nextImageRefreshAt(new Date(now+3600_000).toISOString(),now),now+3540_000);
assert.equal(imageRefreshRetryDelay(1),5000);
assert.equal(imageRefreshRetryDelay(2),10000);
assert.equal(imageRefreshRetryDelay(5),80000);
assert.equal(imageRefreshRetryDelay(6),160000);
assert.equal(imageRefreshRetryDelay(7),300000);
assert.equal(imageRefreshRetryDelay(20),300000);
console.log('Host asset policy: provider response validation, pin/latest, expiry margin, short TTL, capped retry PASS.');
