import {readFileSync,readdirSync,existsSync} from 'node:fs';
const root=JSON.parse(readFileSync('package.json','utf8'));
if(existsSync('.github/workflows'))throw Error('CI is omitted by project policy');
for(const dir of readdirSync('packages')){
 const pkg=JSON.parse(readFileSync(`packages/${dir}/package.json`,'utf8'));
 if(pkg.license!==root.license)throw Error('Package license differs');
 for(const [name,version] of Object.entries(pkg.dependencies??{}))
  if((name==='lexical'||name.startsWith('@lexical/'))&&version!=='0.52.0')throw Error('Lexical versions must match exact baseline');
}
console.log('Workspace license/dependency/CI policy checks passed.');
