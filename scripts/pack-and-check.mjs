import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
const directory=mkdtempSync(join(tmpdir(),'tufte-local-packs-'));
try{
 for(const name of ['document','editor-ports','lexical','render','blog'])execFileSync('pnpm',['--filter','@lexical-tufte/'+name,'pack','--pack-destination',directory],{stdio:'pipe'});
 execFileSync(process.execPath,['scripts/check-package-tarballs.mjs',directory],{stdio:'inherit'});
}finally{rmSync(directory,{recursive:true,force:true});}
