import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,readdirSync,symlinkSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),directory=resolve(process.argv[2]??'/tmp/lexical-tufte-packs'),temp=mkdtempSync(join(tmpdir(),'tufte-package-consumer-'));
try{
 const scope=join(temp,'node_modules','@lexical-tufte');mkdirSync(scope,{recursive:true});
 for(const name of ['document','editor-ports','editor-react','lexical','render','blog']){
  const version=JSON.parse(readFileSync(join(root,'packages',name,'package.json'),'utf8')).version;
  const tarball=join(directory,`lexical-tufte-${name}-${version}.tgz`),list=execFileSync('tar',['-tzf',tarball],{encoding:'utf8'});
  for(const required of ['LICENSE','THIRD_PARTY_NOTICES.md','licenses/source-han-serif-OFL.txt','licenses/source-han-sans-OFL.txt'])assert.ok(list.includes('package/'+required),name+': '+required);
  if(name==='editor-react')assert.ok(list.includes('package/src/styles.css'),'editor-react: exported CSS missing');
  const target=join(scope,name);mkdirSync(target);execFileSync('tar',['-xzf',tarball,'--strip-components=1','-C',target]);
  assert.equal(readFileSync(join(target,'LICENSE'),'utf8'),readFileSync(join(root,'LICENSE'),'utf8'));assert.equal(JSON.parse(readFileSync(join(target,'package.json'),'utf8')).license,'GPL-3.0-only');
 }
 // Use the already verified external dependency versions without an online install.
 const external=join(root,'packages/lexical/node_modules');for(const entry of readdirSync(external)){if(entry==='@lexical-tufte'||entry==='.bin')continue;symlinkSync(join(external,entry),join(temp,'node_modules',entry),'dir');}
 writeFileSync(join(temp,'package.json'),'{"private":true,"type":"module"}');
 writeFileSync(join(temp,'fixture.json'),readFileSync(join(root,'fixtures/tufte/server-document.json')));
 writeFileSync(join(temp,'consumer.mjs'),`
 import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
 import {validateDocument} from '@lexical-tufte/document';import {renderArticle} from '@lexical-tufte/render';import {SqlitePublicationStore} from '@lexical-tufte/blog';
 import {createHeadlessEditor,TUFTE_NODES,loadDocumentIntoEditor,exportEditorToDocument,registerNoteStructureCommands} from '@lexical-tufte/lexical';
 import {ToolbarIcon,SelectionToolbar,BlockContextMenu,NoteImagePanel,TufteNoteImageEditorPlugin,OPEN_TUFTE_NOTE_IMAGE_EDITOR_COMMAND,TufteComposer,TufteEditingSurface,TufteEditor,useTufteAssetContext,HostAssetPicker,HostAssetRefresh,ToolbarButton,TufteNoteInteractionPlugin,TufteNoteStructurePlugin,ENTER_TUFTE_NOTE_COMMAND,LEAVE_TUFTE_NOTE_COMMAND,INSERT_TUFTE_NOTE_COMMAND,SPLIT_TUFTE_NOTE_COMMAND,MERGE_TUFTE_NOTE_COMMAND,MOVE_TUFTE_NOTE_COMMAND,nextImageRefreshAt,INLINE_ACTIONS} from '@lexical-tufte/editor-react';
 const doc=JSON.parse(readFileSync(new URL('./fixture.json',import.meta.url),'utf8'));assert.equal(validateDocument(doc).ok,true);assert.equal(renderArticle(doc).ok,true);assert.equal(typeof SqlitePublicationStore,'function');
 const editor=createHeadlessEditor({nodes:TUFTE_NODES,onError(error){throw error;}});assert.equal(loadDocumentIntoEditor(editor,doc).ok,true);assert.deepEqual(JSON.parse(JSON.stringify(exportEditorToDocument(editor,doc).value)),doc);
 assert.equal([ToolbarIcon,SelectionToolbar,BlockContextMenu,NoteImagePanel,TufteNoteImageEditorPlugin,TufteComposer,TufteEditingSurface,TufteEditor,useTufteAssetContext,HostAssetPicker,HostAssetRefresh,ToolbarButton,TufteNoteInteractionPlugin,TufteNoteStructurePlugin].every(value=>typeof value==='function'),true);assert.equal(typeof OPEN_TUFTE_NOTE_IMAGE_EDITOR_COMMAND,'object');assert.equal(INLINE_ACTIONS.length,6);assert.equal(typeof ENTER_TUFTE_NOTE_COMMAND,'object');assert.equal(typeof LEAVE_TUFTE_NOTE_COMMAND,'object');assert.equal(typeof registerNoteStructureCommands,'function');for(const command of [INSERT_TUFTE_NOTE_COMMAND,SPLIT_TUFTE_NOTE_COMMAND,MERGE_TUFTE_NOTE_COMMAND,MOVE_TUFTE_NOTE_COMMAND])assert.equal(typeof command,'object');assert.equal(Number.isFinite(nextImageRefreshAt(undefined)),false);
 assert.ok(readFileSync(new URL(import.meta.resolve('@lexical-tufte/blog/sql/001_publications_v1.sql')),'utf8').includes('publication_heads_v1'));
 assert.ok(readFileSync(new URL(import.meta.resolve('@lexical-tufte/document/sql/001_posts_v2.sql')),'utf8').includes('posts_v2'));
 `);
 console.log('Checking packed JS imports and editor roundtrip (15s limit).');
 execFileSync(process.execPath,[join(temp,'consumer.mjs')],{cwd:temp,stdio:'pipe',timeout:15_000});
 writeFileSync(join(temp,'consumer.ts'),`import {SqlitePublicationStore,type PublicationDatabase,type PublicationSnapshot} from '@lexical-tufte/blog';import {TUFTE_NODES,createHeadlessEditor,registerSectionCommands,SET_TUFTE_BLOCK_COMMAND} from '@lexical-tufte/lexical';declare const db:PublicationDatabase;const store=new SqlitePublicationStore(db);store.readState('post');const editor=createHeadlessEditor({nodes:TUFTE_NODES});registerSectionCommands(editor);editor.dispatchCommand(SET_TUFTE_BLOCK_COMMAND,'h2');import type {TufteEditorProps,TufteEditingSurfaceProps,HostAssetPickerProps,HostAssetRefreshProps,ToolbarButtonProps,TufteNoteInteractionPluginProps,TufteNoteImageEditorPluginProps} from '@lexical-tufte/editor-react';declare const props:TufteEditorProps;const readonlyFlag:boolean|undefined=props.readonly;const valueId:string=props.value.id;const changeHandler:((value:typeof props.value)=>void)|undefined=props.onChange;const advancedRef=props.editorRef;const imageOpenCallback:((open:boolean)=>void)|undefined=props.onNoteImageEditorOpenChange;declare const surfaceProps:TufteEditingSurfaceProps;const accessibleName:string=surfaceProps.ariaLabel;declare const pickerProps:HostAssetPickerProps;const pickerNamespace:string=pickerProps.namespace;declare const refreshProps:HostAssetRefreshProps;const refreshNamespace:string=refreshProps.namespace;declare const buttonProps:ToolbarButtonProps;const buttonLabel:string=buttonProps.label;declare const notePluginProps:TufteNoteInteractionPluginProps;const noticeHandler:((message:string)=>void)|undefined=notePluginProps.onNotice;declare const imagePluginProps:TufteNoteImageEditorPluginProps;const imageReadonly:boolean|undefined=imagePluginProps.readonly;declare const snapshot:PublicationSnapshot;const revision:number=snapshot.publishedRevision;`);
 execFileSync(join(root,'packages/lexical/node_modules/.bin/tsc'),['--noEmit','--module','NodeNext','--moduleResolution','NodeNext','--target','ES2022','--skipLibCheck',join(temp,'consumer.ts')],{cwd:temp,stdio:'pipe',timeout:30_000});
 console.log('R13 six tarballs: full LICENSE/notices/OFL, packed JS imports, fresh declarations, strict editor roundtrip, renderer/blog and SQL exports PASS. No publishing.');
}finally{rmSync(temp,{recursive:true,force:true});}
