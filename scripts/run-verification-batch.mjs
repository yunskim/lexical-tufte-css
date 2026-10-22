/**
 * Local/Work verification runner; CI is never invoked.
 * Build before tests, run discovered files independently so a single import
 * error cannot hide later files, then aggregate per-file exit statuses.
 * Individual node:test assertion/skip totals stay visible in each runner's
 * output; the summary counts steps, not assertions or skipped subtests.
 */
import {readdirSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {setTimeout} from 'node:timers/promises';
import {upstreamAssetManifest,upstreamAssetRoot} from './upstream-visual-assets.mjs';

const packageCommand=process.platform==='win32'?'pnpm.cmd':'pnpm';
const results=[];
const run=(label,command,args)=>{
 console.log('\n=== '+label+' ===');
 const started=Date.now();
 const child=spawnSync(command,args,{stdio:'inherit',env:process.env});
 const code=child.status??1;
 const result={label,ok:code===0,exitCode:code,elapsedSeconds:Math.round((Date.now()-started)/1000),
  ...(child.error?{error:child.error.message}:{})};
 results.push(result);
 console.log('=== '+(result.ok?'PASS':'FAIL')+' '+label+' (exit '+code+') ===');
 return result.ok;
};

for(const [label,args] of [
 ['Frozen install',['install','--frozen-lockfile']],
 ['Lint',['lint']],
 ['CSS inventory',['inventory:check']],
 ['Font verification',['font:check']],
 ['Build',['build']],
 ['Typecheck',['-r','typecheck']]
]){
 if(!run(label,packageCommand,args)){
  console.error('Prerequisite failed. Stopping before test runs to avoid stale dist artifacts.');
  console.log('VERIFICATION_SUMMARY='+JSON.stringify(results));
  process.exitCode=1;
  process.exit();
 }
}

const locations=[
 'packages/document/test',
 'packages/render/test',
 'packages/blog/test',
 'packages/lexical/test'
];
for(const directory of locations){
 const filenames=readdirSync(directory).filter(name=>name.endsWith('.test.mjs')).sort();
 for(const filename of filenames)
  run(directory+'/'+filename,process.execPath,['--test',directory+'/'+filename]);
}

const browsers=readdirSync('tests')
 .filter(name=>name.endsWith('-browser.mjs'))
 .sort();
for(const name of browsers){
 if(name==='upstream-full-document-visual-browser.mjs'){
  const missing=[...upstreamAssetManifest.images,...upstreamAssetManifest.fonts]
   .filter(entry=>!existsSync(new URL(entry.path,upstreamAssetRoot)))
   .map(entry=>entry.path);
  if(missing.length){
   const reason='Pinned assets not downloaded: '+missing.join(', ')+
    '. Run pnpm assets:upstream-visual before the full visual gate.';
   results.push({label:'tests/'+name,skipped:true,reason});
   console.log('=== SKIP tests/'+name+': '+reason+' ===');
   continue;
  }
  // Present but corrupt assets, bad hashes or source drift are test FAILURES,
  // never SKIP. The visual browser test verifies every byte before launch.
 }
 run('tests/'+name,process.execPath,['tests/'+name]);
 // Browser test files may release their own Vite child process in finally.
 // Let the port close before starting a different independent browser test.
 await setTimeout(300);
}

run('Packed package consumption',packageCommand,['package:check']);
run('Python HTTP/SQLite integration',packageCommand,['test:recovery-python']);

const passed=results.filter(item=>item.ok).length;
const skipped=results.filter(item=>item.skipped).length;
const failed=results.filter(item=>!item.ok&&!item.skipped);
console.log('\nVERIFICATION_SUMMARY='+JSON.stringify({
 passed,failed:failed.length,skipped,total:results.length,results
}));
if(failed.length){
 console.error('Failed steps: '+failed.map(item=>item.label).join(', '));
 process.exitCode=1;
}
