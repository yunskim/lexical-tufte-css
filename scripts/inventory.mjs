import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const path='fixtures/tufte/upstream/tufte.css';
const css=readFileSync(path,'utf8');
const stripped=css.replace(/\/\*[\s\S]*?\*\//g,'').replace(/@charset[^;]+;/g,'');
const rules=[];
function walk(source,context=[]){
 let start=0;
 while(start<source.length){
  const open=source.indexOf('{',start); if(open<0)break;
  const selector=source.slice(start,open).trim().replace(/\s+/g,' ');
  let end=open+1,depth=1;
  while(end<source.length&&depth){if(source[end]==='{')depth++;if(source[end]==='}')depth--;end++;}
  if(depth)throw Error('Unbalanced CSS');
  const body=source.slice(open+1,end-1);
  if(selector.startsWith('@media'))walk(body,[...context,selector]);
  else rules.push({selector,context,features:features(selector,context)});
  start=end;
 }
}
function features(s,c){
 const f=new Set();
 if(s==='@font-face')f.add('F04');
 if(/^(html|body|article|section)$/.test(s))f.add('F01');
 if(/h[123]|subtitle/.test(s))f.add('F02');
 if(/(^|, )p$|sup|a:link|a:visited/.test(s))f.add('F03');
 if(/numeral|danger|\.sans|newthought/.test(s))f.add('F05');
 if(/\bdl\b|\bdt\b|\bol\b|\bul\b|\bli\b/.test(s))f.add('F06');
 if(/\bhr\b|section > footer/.test(s))f.add('F07');
 if(/blockquote/.test(s))f.add('F08');
 if(/epigraph/.test(s))f.add('F09');
 if(/sidenote/.test(s))f.add('F10');
 if(/marginnote|margin-toggle/.test(s))f.add('F11');
 if(/^(figure|img|figcaption)$/.test(s))f.add('F13');
 if(/figure.fullwidth/.test(s))f.add('F14');
 if(s==='.fullwidth'||/div.fullwidth|table.fullwidth/.test(s))f.add('F15');
 if(/table/.test(s))f.add('F16');
 if(/code|\bpre\b/.test(s))f.add('F17');
 if(/iframe/.test(s))f.add('F18');
 if(c.some(x=>x.includes('760px'))){f.add('F20');if(s==='label')f.add('F11');}
 if(c.some(x=>x.includes('color-scheme')))f.add('F21');
 if(f.size===0)throw Error('Unmapped CSS selector: '+s);
 return [...f].sort();
}
walk(stripped);
const result={upstream:'edwardtufte/tufte-css',version:'1.9.0',commit:'b5d7b7bbe5ce9c4c50fcfad4f19ee3646cfd7ae1',sha256:createHash('sha256').update(css).digest('hex'),rules,supplemental:{F12:'Margin images: marginnote plus img; demo HTML fixture required in P2.',F19:'ImageQuilts: regular or fullwidth figure; no dedicated CSS selector.',F22:'Multiple articles/long notes: composition regression fixtures required in P4.'}};
const output=JSON.stringify(result,null,2)+'\n';
const target='fixtures/tufte/inventory.json';
if(process.argv.includes('--write'))writeFileSync(target,output);
else if(readFileSync(target,'utf8')!==output)throw Error('Inventory differs; inspect upstream changes before --write');
console.log(`${rules.length} CSS rules mapped; ${new Set(rules.flatMap(x=>x.context)).size} media contexts; snapshot verified.`);
