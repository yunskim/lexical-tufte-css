/**
 * Explicit, integrity-checked acquisition of optional upstream visual fixtures.
 * Never runs implicitly in a test or in a CI workflow.
 */
import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
 upstreamAssetRoot,upstreamAssetManifest,
 verifyUpstreamSourceInventory,verifyUpstreamAsset
} from './upstream-visual-assets.mjs';

verifyUpstreamSourceInventory();
for(const entry of [...upstreamAssetManifest.images,...upstreamAssetManifest.fonts]){
 const url='https://raw.githubusercontent.com/'+upstreamAssetManifest.sourceRepository+
  '/'+upstreamAssetManifest.pinnedCommit+'/'+entry.path;
 const response=await fetch(url,{signal:AbortSignal.timeout(60000)});
 if(!response.ok)throw Error('Upstream download failed '+entry.path+': HTTP '+response.status);
 const bytes=Buffer.from(await response.arrayBuffer());
 // Validate before touching the local copy. A changed remote asset is rejected.
 verifyUpstreamAsset(entry,bytes);
 const target=new URL(entry.path,upstreamAssetRoot);
 mkdirSync(dirname(fileURLToPath(target)),{recursive:true});
 writeFileSync(target,bytes);
 console.log('Pinned upstream visual asset '+entry.path+' ('+bytes.length+' bytes)');
}
console.log('All nine pinned visual assets downloaded and Git-blob verified.');
