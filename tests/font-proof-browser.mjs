import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,existsSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {chromium} from 'playwright';
const root=new URL('../fixtures/fonts/proof/',import.meta.url),manifest=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8'));
const files=new Map([['/fonts.css',{file:'fonts.css',type:'text/css'}],...manifest.sources.flatMap(source=>source.chunks.map(chunk=>['/'+chunk.file,{file:chunk.file,type:'font/woff2'}]))]);
const originalDir=process.env.FONT_SOURCE_DIR,updating=Boolean(process.env.FONT_SOURCE_DIR&&process.env.UPDATE_FONT_METRICS==='1');
const metricsPath=new URL('reference-metrics.json',root),reference=existsSync(metricsPath)?JSON.parse(readFileSync(metricsPath,'utf8')):null;
assert.ok(reference||updating,'Required original-font metric fixture is missing; regenerate explicitly with pinned originals');
const csp="default-src 'none'; style-src 'self'; font-src 'self'; script-src 'none'; object-src 'none'; base-uri 'none'";
const html=mixed=>`<!doctype html><html lang="ko"><head><meta charset="utf-8"><link rel="stylesheet" href="/fonts.css"></head><body>${manifest.sources.map(source=>`<section id="${source.kind}" class="${source.kind}"><h1>Latin ABC 123</h1>${source.chunks.map(chunk=>`<p><span class="metric" id="${source.kind}-${chunk.kind}">${mixed?chunk.sampleNonAscii:'Latin ABC 123'}</span></p>`).join('')}<p class="sidenote">${mixed?'한글 주석 漢字':'Latin note'}</p><figure><figcaption>${mixed?'그림 캡션':'Figure caption'}</figcaption></figure><table><tbody><tr><td>${mixed?'표 항목':'Table item'}</td></tr></tbody></table></section>`).join('')}</body></html>`;
const server=createServer((req,res)=>{
 if(originalDir&&req.url?.startsWith('/original-')){const source=manifest.sources.find(s=>req.url==='/original-'+s.kind+'.otf');if(source){res.writeHead(200,{'content-type':'font/otf'});res.end(readFileSync(join(originalDir,source.file)));return;}}
 const file=files.get(req.url);if(file?.file==='fonts.css'&&originalDir){res.writeHead(200,{'content-type':'text/css'});res.end(readFileSync(new URL(file.file,root),'utf8')+manifest.sources.map(s=>`@font-face{font-family:"R13 Original ${s.kind}";src:url("/original-${s.kind}.otf") format("opentype");unicode-range:${s.chunks.map(c=>c.unicodeRange).join(',')};}.original-${s.kind}{font-family:${s.kind==='serif'?'et-book,':''}"R13 Original ${s.kind}",${s.kind==='serif'?'serif':'sans-serif'};}`).join(''));}
 else if(file){res.writeHead(200,{'content-type':file.type,'cache-control':'no-store'});res.end(readFileSync(new URL(file.file,root)));}
 else if(req.url==='/'||req.url==='/mixed'){res.writeHead(200,{'content-type':'text/html; charset=utf-8','content-security-policy':csp});res.end(html(req.url==='/mixed'));}
 else{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']}).catch(error=>{server.close();throw error;});
try{
 const page=await browser.newPage();const requests=[];page.on('request',req=>{if(req.url().endsWith('.woff2'))requests.push(req.url());});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const response=await page.goto(url);assert.equal(response.headers()['content-security-policy'],csp);await page.evaluate(()=>document.fonts.ready);assert.deepEqual(requests,[],'Latin-only text must not download CJK subsets');
 await page.goto(url+'/mixed');await page.evaluate(()=>document.fonts.ready);
 if(originalDir){await page.evaluate(sources=>{for(const source of sources)for(const chunk of source.chunks){const p=document.createElement('p');p.className='original-'+source.kind;const span=document.createElement('span');span.id='reference-'+source.kind+'-'+chunk.kind;span.className='metric';span.textContent=chunk.sampleNonAscii;p.append(span);document.body.append(p);}for(const source of sources){const copy=document.getElementById(source.kind).cloneNode(true);copy.id='reference-'+source.kind;copy.className='original-'+source.kind;copy.querySelectorAll('[id]').forEach(e=>e.removeAttribute('id'));document.body.append(copy);}},manifest.sources);await page.evaluate(()=>document.fonts.ready);}
 assert.equal(new Set(requests).size,8);assert.ok(requests.every(request=>request.startsWith(url+'/')));
 const cdp=await page.context().newCDPSession(page);await cdp.send('DOM.enable');await cdp.send('CSS.enable');const {root:doc}=await cdp.send('DOM.getDocument');
 const metrics=[];
 for(const source of manifest.sources)for(const chunk of source.chunks){
  const selector='#'+source.kind+'-'+chunk.kind,{nodeId}=await cdp.send('DOM.querySelector',{nodeId:doc.nodeId,selector});const {fonts}=await cdp.send('CSS.getPlatformFontsForNode',{nodeId});
  assert.ok(fonts.some(font=>font.isCustomFont&&font.postScriptName===chunk.postScriptName&&font.glyphCount>0),JSON.stringify({selector,fonts}));
  assert.ok(fonts.every(font=>font.isCustomFont),JSON.stringify({selector,fonts}));
  const measured=await page.locator(selector).evaluate(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height,fontSize:parseFloat(getComputedStyle(e).fontSize)}));
  if(originalDir){const original=await page.locator('#reference-'+source.kind+'-'+chunk.kind).evaluate(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}));assert.ok(Math.abs(measured.width-original.width)<0.5,JSON.stringify({selector,measured,original}));assert.ok(Math.abs(measured.height-original.height)<0.5);}
  if(reference&&!updating)assert.ok(Math.abs(measured.width-reference.find(m=>m.selector===selector).width)<0.5,JSON.stringify({selector,measured,reference}));
  metrics.push({selector,width:measured.width,height:measured.height});
 }
 for(const source of manifest.sources)for(const part of ['.sidenote','figcaption','td']){
  const selector='#'+source.kind+' '+part,{nodeId}=await cdp.send('DOM.querySelector',{nodeId:doc.nodeId,selector}),{fonts}=await cdp.send('CSS.getPlatformFontsForNode',{nodeId});assert.ok(fonts.some(font=>font.isCustomFont&&font.postScriptName.startsWith(source.family.replaceAll(' ',''))));
  const measured=await page.locator(selector).evaluate(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}));
  if(originalDir){const original=await page.locator('#reference-'+source.kind+' '+part).evaluate(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}));assert.ok(Math.abs(measured.width-original.width)<0.5&&Math.abs(measured.height-original.height)<0.5,JSON.stringify({selector,measured,original}));}
  if(reference&&!updating){const expected=reference.find(m=>m.selector===selector);assert.ok(expected,'Missing reference '+selector);assert.ok(Math.abs(measured.width-expected.width)<0.5&&Math.abs(measured.height-expected.height)<0.5);}
  metrics.push({selector,...measured});
 }
 if(originalDir&&process.env.UPDATE_FONT_METRICS==='1')writeFileSync(metricsPath,JSON.stringify(metrics,null,2)+'\n');
 const slow=await browser.newPage();let releaseFonts;const fontGate=new Promise(resolve=>releaseFonts=resolve);
 await slow.route('**/*.woff2',async route=>{await fontGate;await route.continue();});
 await slow.goto(url+'/mixed',{waitUntil:'domcontentloaded'});await slow.waitForFunction(()=>document.fonts.status==='loading');await slow.waitForTimeout(150);
 const slowCDP=await slow.context().newCDPSession(slow);await slowCDP.send('DOM.enable');await slowCDP.send('CSS.enable');const slowDoc=await slowCDP.send('DOM.getDocument');const slowNode=await slowCDP.send('DOM.querySelector',{nodeId:slowDoc.root.nodeId,selector:'#serif-hangul'});
 const beforeFonts=await slowCDP.send('CSS.getPlatformFontsForNode',{nodeId:slowNode.nodeId});assert.ok(beforeFonts.fonts.some(font=>!font.isCustomFont&&font.glyphCount>0),'swap must render fallback before delayed font delivery');
 const beforeSwap=await slow.locator('#serif-hangul').evaluate(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}));
 releaseFonts();await slow.evaluate(()=>document.fonts.ready);await slow.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));const afterFonts=await slowCDP.send('CSS.getPlatformFontsForNode',{nodeId:slowNode.nodeId});assert.ok(afterFonts.fonts.some(font=>font.isCustomFont&&font.glyphCount>0));
 const afterSwap=await slow.locator('#serif-hangul').evaluate(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}));
 const fallback=await browser.newPage();await fallback.route('**/*.woff2',route=>route.abort());await fallback.goto(url+'/mixed');await fallback.evaluate(()=>document.fonts.ready);
 assert.equal(await fallback.locator('#serif-hangul').isVisible(),true);assert.ok(await fallback.locator('#serif-hangul').evaluate(e=>e.getBoundingClientRect().width)>0);
 const fallbackCDP=await fallback.context().newCDPSession(fallback);await fallbackCDP.send('DOM.enable');await fallbackCDP.send('CSS.enable');const fallbackDoc=await fallbackCDP.send('DOM.getDocument'),fallbackNode=await fallbackCDP.send('DOM.querySelector',{nodeId:fallbackDoc.root.nodeId,selector:'#serif-hangul'}),fallbackFonts=(await fallbackCDP.send('CSS.getPlatformFontsForNode',{nodeId:fallbackNode.nodeId})).fonts;
 const knownKoreanFallback=fallbackFonts.some(font=>/SourceHan/.test(font.postScriptName)&&!font.isCustomFont&&font.glyphCount>0);
 if(process.env.REQUIRE_KOREAN_FALLBACK==='1')assert.ok(knownKoreanFallback,JSON.stringify(fallbackFonts));
 assert.equal(await page.locator('[style],script').count(),0);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({test:'R13 Source Han Serif/Sans renamed proof subsets, disjoint ranges, actual custom fonts, Latin isolation, source table advances and browser reference metrics, self CSP and blocked-font fallback',originalComparison:Boolean(originalDir),knownKoreanFallback,fallbackFonts,fontRequests:new Set(requests).size,delayedSwap:{delayMs:150,before:beforeSwap,after:afterSwap},woff2Bytes:manifest.sources.flatMap(s=>s.chunks).reduce((n,c)=>n+c.bytes,0),metrics}));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
