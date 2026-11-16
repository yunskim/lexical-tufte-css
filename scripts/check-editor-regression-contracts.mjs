import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const read=path=>readFileSync(join(root,path),'utf8');
const ensure=(file,fragment,contract)=>{
 assert.ok(read(file).includes(fragment),contract+': '+file+' is missing '+fragment);
};
const pkg=JSON.parse(read('package.json'));
const trackedSuites=[
 'test:browser','test:editor-lifecycle','test:host-assets-controlled',
 'test:host-asset-bridge','test:asset-pickers','test:controlled-editor',
 'test:document-commands','test:editor-stress','test:mobile-editor','test:ime-focus'
];
for(const name of trackedSuites){
 const cmd=pkg.scripts[name];
 assert.ok(cmd?.startsWith('pnpm build && '),name+' must build before running browser tests');
 const paths=[...cmd.matchAll(/\bnode (?:--test )?((?:tests|scripts|packages)\/[-\w./]+\.mjs)\b/g)]
  .map(match=>match[1]);
 assert.ok(paths.length>0,name+' has no test entrypoints');
 assert.equal(new Set(paths).size,paths.length,name+' runs a test more than once');
 for(const path of paths){
  assert.ok(existsSync(join(root,path)),name+' references missing '+path);
 }
}
for(const test of [
 'controlled-document-commands-browser.mjs',
 'controlled-editor-remount-stress-browser.mjs',
 'controlled-host-picker-concurrency-browser.mjs',
 'editor-ime-keyboard-browser.mjs',
 'mobile-editor-touch-browser.mjs',
 'asset-picker-boundaries-browser.mjs',
 'host-asset-single-controller-browser.mjs'
]){
 assert.ok(pkg.scripts['test:browser'].includes('node tests/'+test),
  'Full browser suite is missing '+test);
}

// UI labels belong to their actual hosts; a local catalog dialog must never
// be mistaken for the shared host DAM picker after extraction.
ensure('examples/editor/src/main.tsx','이미지 라이브러리에서 선택','Legacy local catalog button');
ensure('examples/editor/src/main.tsx','문서 이미지 선택','Legacy local catalog dialog');
ensure('examples/editor/src/main.tsx','레이아웃 예제 불러오기','Legacy replacement action');
ensure('packages/editor-react/src/HostAssetPicker.tsx','호스트 이미지 자산 선택','Shared host trigger');
ensure('packages/editor-react/src/HostAssetPicker.tsx','호스트 이미지 자산','Shared host dialog');
ensure('packages/editor-react/src/HostAssetPicker.tsx','대상 노트 또는 이미지가 변경되었습니다','Shared stale target error');
ensure('packages/editor-react/src/HostAssetRefresh.tsx','buttonLabel=','Shared host manual refresh label');
ensure('packages/editor-react/src/NoteImagePanel.tsx','노트 이미지 선택','Shared note image dialog');
ensure('examples/editor/src/controlledDemo.tsx','첫 번째 노트 이미지 속성','Controlled note image trigger');
ensure('examples/editor/src/controlledDemo.tsx','첫 번째 섹션 추가','Controlled document command trigger');
ensure('examples/editor/src/hostAssetDemo.tsx','__hostAssetHarness','Host integration test API');

const fixture=JSON.parse(read('fixtures/tufte/server-document.json'));
const noteIds=[];
const inspect=node=>{
 if((node.type==='tufte-sidenote'||node.type==='tufte-marginnote')&&node.noteId)
  noteIds.push(node.noteId);
 for(const child of node.children??[])inspect(child);
};
inspect(fixture.lexicalState.root);
assert.ok(noteIds.includes('server-note'),'Server document fixture must contain server-note');
ensure('examples/editor/src/main.tsx',"$createSidenoteNode('seed-note')",'Legacy seed note');
ensure('examples/editor/src/hostAssetDemo.tsx',"namespace+'-'+node.noteId",'Host namespace note fixture');
ensure('examples/editor/src/controlledDemo.tsx',"identity+'-'+node.noteId",'Controlled note fixture');

const legacy=read('tests/legacy-host-asset-guard-browser.mjs');
assert.ok(legacy.includes('대상 노트 또는 이미지가 변경되었습니다'),
 'Legacy stale response regression must match the shared picker diagnostic');
assert.ok(!legacy.includes('연결 대상 이미지가 변경되었습니다'),
 'Old error wording is incompatible with the shared picker');
const refresh=read('packages/editor-react/src/HostAssetRefresh.tsx');
assert.ok(refresh.includes('expiryAt?:number')&&refresh.includes('legacyTiming'),
 'Legacy expiry and automatic retry need separate deadlines');
assert.ok(read('tests/host-asset-provider-browser.mjs').includes('beforeConcurrentExpiry'),
 'Preserve the independent retry/expiry browser regression');
console.log('Editor browser regression contracts: referenced files, fixture IDs, UI labels and legacy timing gates PASS.');
