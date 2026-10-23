/**
 * Strict RGBA comparison for deterministic Playwright PNG screenshots.
 * Single explicit rectangle mask; no implicit thresholds or baseline updates.
 */
import assert from 'node:assert/strict';

export async function compareFullPagePixels(page,referencePNG,publishedPNG,masks=[]){
 assert.ok(Buffer.isBuffer(referencePNG)&&Buffer.isBuffer(publishedPNG));
 assert.ok(masks.length<=1,'Only the verified iframe mask is supported');
 for(const mask of masks){
  for(const key of ['x','y','width','height'])
   assert.ok(Number.isFinite(mask[key]),'Invalid mask coordinate '+key);
  assert.ok(mask.width>0&&mask.height>0,'Empty pixel mask');
 }
 return page.evaluate(async ({referenceBase64,publishedBase64,masks})=>{
  const decode=async base64=>{
   const image=new Image();
   image.src='data:image/png;base64,'+base64;
   await image.decode();
   if(!image.naturalWidth||!image.naturalHeight)
    throw Error('Zero-size PNG screenshot');
   return image;
  };
  const [a,b]=await Promise.all([decode(referenceBase64),decode(publishedBase64)]);
  const dimensions={upstream:[a.naturalWidth,a.naturalHeight],
   published:[b.naturalWidth,b.naturalHeight]};
  if(a.naturalWidth!==b.naturalWidth||a.naturalHeight!==b.naturalHeight)
   return {dimensions,dimensionsMatch:false,unmaskedMismatchPixels:null,
    maskedPixels:null,maskedMismatchPixels:null};
  const width=a.naturalWidth,height=a.naturalHeight;
  const regions=masks.map(m=>({
   left:Math.max(0,Math.ceil(m.x)),top:Math.max(0,Math.ceil(m.y)),
   right:Math.min(width,Math.floor(m.x+m.width)),
   bottom:Math.min(height,Math.floor(m.y+m.height))
  }));
  if(regions.some(r=>r.right<=r.left||r.bottom<=r.top))
   throw Error('Mask is outside PNG or covers no pixels');
  const canvas=document.createElement('canvas');
  canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  if(!ctx)throw Error('RGBA canvas unavailable');
  ctx.drawImage(a,0,0);
  const p=ctx.getImageData(0,0,width,height).data;
  ctx.clearRect(0,0,width,height);
  ctx.drawImage(b,0,0);
  const q=ctx.getImageData(0,0,width,height).data;
  let outside=0,inside=0,covered=0,maxDelta=0;
  const samples=[],bbox={left:width,top:height,right:-1,bottom:-1};
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const i=(y*width+x)*4;
   const masked=regions.some(r=>x>=r.left&&x<r.right&&y>=r.top&&y<r.bottom);
   if(masked)covered++;
   let differs=false;
   for(let channel=0;channel<4;channel++){
    const change=Math.abs(p[i+channel]-q[i+channel]);
    if(change>0)differs=true;
    if(!masked)maxDelta=Math.max(maxDelta,change);
   }
   if(!differs)continue;
   if(masked){inside++;continue;}
   outside++;
   bbox.left=Math.min(bbox.left,x);bbox.top=Math.min(bbox.top,y);
   bbox.right=Math.max(bbox.right,x);bbox.bottom=Math.max(bbox.bottom,y);
   if(samples.length<12)samples.push({x,y});
  }
  return {dimensions,dimensionsMatch:true,totalPixels:width*height,
   maskedPixels:covered,maskedMismatchPixels:inside,
   unmaskedMismatchPixels:outside,maxChannelDelta:maxDelta,
   mismatchBounds:outside?bbox:null,firstDifferences:samples};
 },{referenceBase64:referencePNG.toString('base64'),
  publishedBase64:publishedPNG.toString('base64'),masks});
}
