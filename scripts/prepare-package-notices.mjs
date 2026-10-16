import {copyFileSync,mkdirSync,readdirSync,readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),destination=process.cwd();
const pkg=JSON.parse(readFileSync(join(destination,'package.json'),'utf8'));
if(!destination.startsWith(resolve(root,'packages')+'/')||pkg.license!=='GPL-3.0-only')throw Error('Expected a project package with GPL-3.0-only policy');
for(const file of ['LICENSE','THIRD_PARTY_NOTICES.md'])copyFileSync(join(root,file),join(destination,file));
mkdirSync(join(destination,'licenses'),{recursive:true});for(const file of readdirSync(join(root,'licenses')))copyFileSync(join(root,'licenses',file),join(destination,'licenses',file));
console.log('Prepared package license and third-party notices; no publication.');
