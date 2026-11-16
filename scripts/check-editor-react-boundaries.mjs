import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const read=path=>readFileSync(join(root,path),'utf8');
const sharedRoot=join(root,'packages/editor-react/src');
const sharedFiles=readdirSync(sharedRoot).filter(name=>/\.tsx?$/.test(name));
assert.ok(sharedFiles.length>=10,'Expected reusable editor source files');

for(const name of sharedFiles){
 const source=read('packages/editor-react/src/'+name);
 // Any dependency on the example makes the supposedly reusable editor
 // unusable by a standalone host application.
 assert.doesNotMatch(source,/from\s*['"][^'"]*(?:examples\/editor|editor-prototype)[^'"]*['"]/,
  name+' must not import the example');
 assert.doesNotMatch(source,/lexicalTufteAssetProvider|lexicalTufteAssetNamespace/,
  name+' must not read the example-only host globals');
 assert.doesNotMatch(source,/\b(?:localStorage|sessionStorage)\b/,
  name+' must not manage host persistence');
}

const surface=read('packages/editor-react/src/TufteEditingSurface.tsx');
assert.match(surface,/import \{TufteDocumentCommandsPlugin\}/);
assert.equal((surface.match(/<TufteDocumentCommandsPlugin\b/g)??[]).length,1,
 'One shared command plugin per TufteEditingSurface');
assert.match(surface,/readonly=\{readonly\}/,'Pass the host readonly contract');

const registrars=[
 'registerSectionCommands','registerInlineCommands','registerDefinitionCommands',
 'registerQuotationCommands','registerFigureCommands','registerListCommands',
 'registerListKeyboardCommands'
];
const plugin=read('packages/editor-react/src/TufteDocumentCommandsPlugin.tsx');
for(const name of registrars)assert.match(plugin,new RegExp(name+'\\(editor'),
 'Missing command registrar '+name);
assert.match(plugin,/COMMAND_PRIORITY_HIGH/,'Host readonly commands need priority interception');
assert.match(plugin,/if\(!current\.current\.readonly&&editor\.isEditable\(\)\)return false/,
 'Readonly must be checked before every mutating command');

const example=read('examples/editor/src/main.tsx');
for(const name of registrars)assert.doesNotMatch(example,new RegExp(name+'\\('),
 'Standalone example must not register '+name+' a second time');
assert.match(example,/TufteEditingSurface/);
assert.match(example,/HostAssetPicker/);
assert.match(example,/HostAssetRefresh/);

const pkg=JSON.parse(read('packages/editor-react/package.json'));
assert.equal(pkg.dependencies['@lexical-tufte/lexical'],'workspace:*');
assert.equal(pkg.dependencies['@lexical-tufte/document'],'workspace:*');
assert.equal(pkg.dependencies['@lexical-tufte/editor-ports'],'workspace:*');
assert.equal(pkg.dependencies['@lexical-tufte/editor-prototype'],undefined,
 'Shared editor may not depend on example package');
const api=read('packages/editor-react/src/index.ts');
assert.match(api,/export \{TufteDocumentCommandsPlugin,type TufteDocumentCommandsPluginProps\}/);
const examplePkg=JSON.parse(read('examples/editor/package.json'));
assert.equal(examplePkg.dependencies['@lexical-tufte/editor-react'],'workspace:*');
console.log('Reusable editor boundary: host-neutral imports, single command owner, readonly guard and package dependencies PASS.');
