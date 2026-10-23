/** Fail closed on removed note APIs/wire types or the obsolete toggle name. */
import {readdirSync,readFileSync} from 'node:fs';
import {join,relative,resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const sources=['packages','examples','tests','fixtures/tufte'];
const extensions=new Set(['.ts','.tsx','.js','.mjs','.json']);
const exclusions=new Set([
 'packages/document/src/migrateStoredDocument.ts', // intentional v1 migration
 'packages/document/test/concrete-note-migration.test.mjs', // intentional legacy fixtures
]);
const patterns=[
 {name:'removed note factory',pattern:/\$createNoteNode\b/g},
 {name:'removed NoteKind alias',pattern:/\bNoteKind\b/g},
 {name:'legacy note wire type',pattern:/['"]tufte-note['"]/g},
 {name:'obsolete marginnote accessible name',pattern:/['"]Toggle margin note['"]/g},
];
let examined=0;
const failures=[];
function visit(directory){
 for(const entry of readdirSync(directory,{withFileTypes:true})){
  const absolute=join(directory,entry.name),path=relative(root,absolute).replaceAll('\\','/');
  if(entry.isDirectory()){
   if(['node_modules','dist','.git','upstream'].includes(entry.name))continue;
   visit(absolute);continue;
  }
  if(!entry.isFile()||!extensions.has(extname(entry.name))||exclusions.has(path))continue;
  examined++;
  const body=readFileSync(absolute,'utf8');
  for(const {name,pattern} of patterns){
   pattern.lastIndex=0;
   for(const match of body.matchAll(pattern)){
    const line=body.slice(0,match.index).split('\n').length;
    failures.push(`${path}:${line}: ${name}`);
   }
  }
 }
}
for(const source of sources)visit(join(root,source));
if(failures.length){
 console.error(failures.join('\n'));
 process.exitCode=1;
}else console.log(`Concrete note API audit: ${examined} active files scanned; no legacy notes found.`);
