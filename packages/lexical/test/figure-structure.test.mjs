import assert from 'node:assert/strict';
import {test} from 'node:test';
import {$getRoot,$createTextNode} from 'lexical';
import {createHeadlessEditor,TUFTE_NODES,$createSectionNode,$createFigureNode,$createInlineImageNode,$createMarginnoteNode,$createSidenoteNode,$createCaptionNode,inspectEditorStructure} from '../dist/index.js';

function inspect(order){
 const editor=createHeadlessEditor({namespace:'figure-structure',nodes:[...TUFTE_NODES],onError:error=>{throw error;}});
 editor.update(()=>{
  const figure=$createFigureNode();
  const factories={
   image:()=>$createInlineImageNode('/figure.svg','Figure'),
   margin:()=>$createMarginnoteNode('figure-margin').append($createTextNode('Margin')),
   side:()=>$createSidenoteNode('figure-side').append($createTextNode('Side')),
   caption:()=>$createCaptionNode().append($createTextNode('Caption')),
  };
  for(const kind of order)figure.append(factories[kind]());
  const section=$createSectionNode().append(figure);
  $getRoot().append(section);
 },{discrete:true});
 return inspectEditorStructure(editor).map(issue=>issue.code);
}
test('figure inspection accepts margin notes on either side of the image',()=>{
 assert.deepEqual(inspect(['margin','image','caption']),[]);
 assert.deepEqual(inspect(['image','margin','caption']),[]);
});
test('figure inspection rejects a caption before the image and direct sidenotes',()=>{
 assert.ok(inspect(['caption','image']).includes('INVALID_FIGURE'));
 assert.ok(inspect(['image','side']).includes('INVALID_FIGURE_NOTE'));
});
