/**
 * P2.2.e.3 / P4.3.a — OFFLINE, same-content full-page visual geometry probe.
 * Run only after explicit pinned asset download. No automatic network fetch.
 * Screenshots are evidence to inspect; this test does not assert pixel parity.
 * Note accessibility and modern iframe differences remain documented exceptions.
 */
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {createServer} from 'node:http';
import {join} from 'node:path';
import {chromium} from 'playwright';
import {renderArticle} from '../packages/render/dist/index.js';
import {reconstructPinnedArticle} from './helpers/pinned-upstream-article.mjs';
import {loadVerifiedUpstreamAssets,upstreamAssetManifest} from
 '../scripts/upstream-visual-assets.mjs';

const original=readFileSync(new URL('../fixtures/tufte/upstream/index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../fixtures/tufte/upstream/tufte.css',import.meta.url),'utf8');
const publicationCSS=readFileSync(new URL('../packages/render/styles.css',import.meta.url),'utf8');
const assets=loadVerifiedUpstreamAssets(); // Fail closed on missing or modified binaries.
const modernFrame=Object.freeze({
 src:'https://www.youtube-nocookie.com/embed/YslQ2625TR4',
 title:'YouTube video: Tufte CSS example',
 loading:'lazy',referrerpolicy:'strict-origin-when-cross-origin',
 sandbox:'allow-scripts allow-same-origin allow-presentation',
 width:'960',height:'540',allowfullscreen:''
});
const modernCode='<figure class="iframe-wrapper">\n'+
 '  <iframe src="'+modernFrame.src+'" title="'+modernFrame.title+
 '" loading="'+modernFrame.loading+'" referrerpolicy="'+modernFrame.referrerpolicy+
 '" sandbox="'+modernFrame.sandbox+'" width="'+modernFrame.width+
 '" height="'+modernFrame.height+'" allowfullscreen></iframe>\n</figure>';

const browser=await chromium.launch({
 headless:true,
 ...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),
 args:['--no-sandbox']
});
let server;
try{
 const builder=await browser.newPage();
 const reconstructed=await builder.evaluate(reconstructPinnedArticle,{
  html:original,modernFrame,modernCode
 });
 await builder.close();
 assert.equal(reconstructed.inventory.length,9);
 assert.equal(reconstructed.notes.length,7);
 assert.equal(reconstructed.inventory.reduce((n,section)=>n+section.types.length,0),60);
 const output=renderArticle(reconstructed.document);
 assert.equal(output.ok,true,JSON.stringify(output.diagnostics));
 const published='<!doctype html><html lang="en"><head>'+
  '<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'+
  '<title>Tufte CSS</title><link rel="stylesheet" href="tufte.css">'+
  '<link rel="stylesheet" href="publication.css"></head><body>'+
  output.html+'</body></html>';

 // Each document is a full HTML page, with identical CSS origin and assets.
 // Keeping /official/ and /published/ separate also checks relative img/... URLs.
 server=createServer((request,response)=>{
  const pathname=new URL(request.url,'http://127.0.0.1').pathname;
  const scope=pathname.startsWith('/official/')?'/official/':
   pathname.startsWith('/published/')?'/published/':null;
  if(!scope){response.writeHead(404);response.end();return;}
  const resource=pathname.slice(scope.length);
  let data,contentType;
  if(resource===''){
   data=scope==='/official/'?original:published;
   contentType='text/html; charset=utf-8';
  }else if(resource==='tufte.css'){
   data=css;contentType='text/css; charset=utf-8';
  }else if(resource==='publication.css'&&scope==='/published/'){
   data=publicationCSS;contentType='text/css; charset=utf-8';
  }else if(assets.has(resource)){
   data=assets.get(resource);
   contentType=resource.endsWith('.png')?'image/png':'font/woff';
  }else{
   response.writeHead(404);response.end();return;
  }
  response.writeHead(200,{'Content-Type':contentType,'Cache-Control':'no-store'});
  response.end(data);
 });
 await new Promise((resolve,reject)=>{
  server.once('error',reject);
  server.listen(0,'127.0.0.1',resolve);
 });
 const address=server.address();
 assert.ok(address&&typeof address==='object');
 const origin='http://127.0.0.1:'+address.port;
 const context=await browser.newContext({colorScheme:'light'});
 const screenshotDir=process.env.TUFTE_SCREENSHOT_DIR;
 if(screenshotDir)mkdirSync(screenshotDir,{recursive:true});

 // Browser-evaluated collectors cannot close over Node functions.
 const measure=async page=>page.evaluate(async()=>{
  const fontCases=[
   '16px "et-book"',
   'italic 16px "et-book"',
   'bold 16px "et-book"',
   '16px "et-book-roman-old-style"'
  ];
  for(const name of fontCases){
   const loaded=await document.fonts.load(name,'Tufte CSS 123');
   if(loaded.length===0||loaded.some(face=>face.status!=='loaded'))
    throw Error('Required ET Book face was not loaded: '+name);
  }
  await document.fonts.ready;
  const images=[...document.querySelectorAll('article img')];
  await Promise.all(images.map(image=>image.decode()));
  if(images.length!==5)throw Error('Expected exactly five official images');
  const loadedImages=images.map(img=>{
   if(!img.complete||!img.naturalWidth||!img.naturalHeight)
    throw Error('Official image failed to load: '+img.getAttribute('src'));
   const r=img.getBoundingClientRect();
   return {
    src:img.getAttribute('src'),alt:img.getAttribute('alt'),
    naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,
    geometry:{x:r.x,y:r.y,width:r.width,height:r.height}
   };
  });
  const faces=[...document.fonts].filter(face=>
   face.family.replaceAll('"','').replaceAll("'","").startsWith('et-book')
  ).map(face=>({
   family:face.family,style:face.style,weight:face.weight,status:face.status
  })).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
  if(faces.length!==4||faces.some(face=>face.status!=='loaded'))
   throw Error('Expected four loaded ET Book font faces: '+JSON.stringify(faces));
  const article=document.querySelector('body > article');
  if(!article)throw Error('Article missing in visual probe');
  const elements=[...article.querySelectorAll(':scope > section')];
  if(elements.length!==9)throw Error('Nine-section visual inventory missing');
  const rect=element=>{
   const box=element.getBoundingClientRect();
   return {x:box.x,y:box.y,width:box.width,height:box.height};
  };
  return {
   viewport:innerWidth,
   article:rect(article),
   sections:elements.map(rect),
   images:loadedImages,
   notes:[...article.querySelectorAll('.sidenote,.marginnote')].map(rect),
   iframeWrapper:rect(article.querySelector('figure.iframe-wrapper')),
   documentWidth:document.documentElement.scrollWidth,
   fonts:faces
  };
 });

 const delta=(a,b,path)=>{
  for(const coordinate of ['x','y','width','height']){
   const distance=Math.abs(a[coordinate]-b[coordinate]);
   assert.ok(distance<=2,
    path+'.'+coordinate+': upstream '+a[coordinate]+', published '+
    b[coordinate]+' (difference '+distance+'px)');
  }
 };
 for(const width of [375,759,760,761,1024,1440]){
  const pairs=[];
  for(const scope of ['official','published']){
   const page=await context.newPage();
   const failed=[];
   page.on('response',response=>{
    if(response.url().startsWith(origin)&&response.status()>=400)
     failed.push(response.status()+' '+response.url());
   });
   await page.route('**/*',route=>
    route.request().url().startsWith(origin)?route.continue():route.abort()
   );
   await page.setViewportSize({width,height:1100});
   await page.goto(origin+'/'+scope+'/',{waitUntil:'load'});
   const measured=await measure(page);
   assert.deepEqual(failed,[],scope+' '+width+'px: missing local resources');
   if(screenshotDir){
    await page.screenshot({
     path:join(screenshotDir,scope+'-'+width+'.png'),
     fullPage:true,animations:'disabled'
    });
   }
   pairs.push(measured);
   await page.close();
  }
  const [source,publishedPage]=pairs;
  assert.deepEqual(source.images.map(({src,alt,naturalWidth,naturalHeight})=>({
   src,alt,naturalWidth,naturalHeight
  })),publishedPage.images.map(({src,alt,naturalWidth,naturalHeight})=>({
   src,alt,naturalWidth,naturalHeight
  })),width+'px: source/published image inventory or intrinsic dimensions changed');
  assert.deepEqual(source.images.map(item=>item.src),
   upstreamAssetManifest.images.map(item=>item.path));
  assert.deepEqual(source.fonts,publishedPage.fonts,
   width+'px: ET Book load/face status differs');
  assert.equal(source.notes.length,7);
  assert.equal(publishedPage.notes.length,7);
  assert.equal(source.viewport,width);
  assert.equal(publishedPage.viewport,width);
  delta(source.article,publishedPage.article,width+'px article');
  for(let i=0;i<9;i++)delta(source.sections[i],publishedPage.sections[i],
   width+'px section '+(i+1));
  for(let i=0;i<5;i++)delta(source.images[i].geometry,publishedPage.images[i].geometry,
   width+'px image '+source.images[i].src);
  delta(source.iframeWrapper,publishedPage.iframeWrapper,width+'px iframe wrapper');
  // Note checkbox accessibility differs intentionally on mobile: compare
  // visible note position only on desktop, not hidden controls at <=760px.
  if(width>760)for(let i=0;i<7;i++)delta(source.notes[i],publishedPage.notes[i],
   width+'px note '+(i+1));
  console.log('Pinned visual geometry '+width+'px: 9 sections, 5 decoded images, '+
   '4 loaded ET Book faces, 7 notes, wrapper; all measured deltas <=2px');
 }
 await context.close();
 console.log('Pixel parity NOT asserted. Inspect opt-in paired screenshots for '+
  'iframe/accessible note exceptions and text rasterization differences.');
}finally{
 await browser.close();
 if(server)await new Promise((resolve,reject)=>
  server.close(error=>error?reject(error):resolve()));
}
