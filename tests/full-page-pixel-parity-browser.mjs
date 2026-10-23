import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {compareFullPagePixels} from './helpers/full-page-pixel-parity.mjs';

// Offline comparator self-check; does not claim upstream Tufte parity.
const browser=await chromium.launch({
 headless:true,
 ...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),
 args:['--no-sandbox']
});
try{
 const page=await browser.newPage({viewport:{width:24,height:24},deviceScaleFactor:1});
 const shot=async color=>{
  await page.setContent('<!doctype html><style>html,body{margin:0}'+
   'div{width:24px;height:24px;background:'+color+'}</style><div></div>');
  return page.screenshot({animations:'disabled'});
 };
 const white=await shot('white'),identical=await shot('white'),black=await shot('black');
 const equal=await compareFullPagePixels(page,white,identical);
 assert.equal(equal.unmaskedMismatchPixels,0);
 const different=await compareFullPagePixels(page,white,black);
 assert.equal(different.unmaskedMismatchPixels,576);
 const masked=await compareFullPagePixels(page,white,black,[
  {x:0,y:0,width:12,height:12}
 ]);
 assert.equal(masked.maskedPixels,144);
 assert.equal(masked.maskedMismatchPixels,144);
 assert.equal(masked.unmaskedMismatchPixels,432);
 await assert.rejects(()=>compareFullPagePixels(page,white,black,[
  {x:0,y:0,width:12,height:12},{x:12,y:12,width:12,height:12}
 ]),/Only the verified iframe mask/);
 await page.setViewportSize({width:25,height:24});
 const wider=await shot('white');
 const changedSize=await compareFullPagePixels(page,white,wider);
 assert.equal(changedSize.dimensionsMatch,false);
 assert.deepEqual(changedSize.dimensions.upstream,[24,24]);
 assert.deepEqual(changedSize.dimensions.published,[25,24]);
 console.log('Full-page pixel comparator offline regressions: cases written.');
}finally{await browser.close();}
