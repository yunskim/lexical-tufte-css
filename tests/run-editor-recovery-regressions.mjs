// Opt-in runner: execute locally after pnpm build. Not wired into CI.
import {spawnSync} from 'node:child_process';
const suites=[
 'tests/editor-invalid-restore-browser.mjs',
 'tests/editor-invalid-structure-save-browser.mjs',
 'tests/editor-recovery-isolation-browser.mjs',
 'tests/editor-autosave-isolation-browser.mjs'
];
for(const suite of suites){
 console.log('\n=== '+suite+' ===');
 const result=spawnSync(process.execPath,[suite],{stdio:'inherit',env:process.env});
 if(result.error)throw result.error;
 if(result.status!==0){
  console.error('FAILED: '+suite);
  process.exit(result.status||1);
 }
}
console.log('All editor recovery regression scripts completed.');
