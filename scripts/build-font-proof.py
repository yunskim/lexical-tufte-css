"""Rebuild R13 proof subsets from pinned, checksum-verified Adobe OTF inputs.
This is a sample coverage fixture, not the production Korean font bundle.
"""
import argparse, hashlib, json
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools import subset
import fontTools, brotli

ROOT=Path(__file__).resolve().parents[1]
SOURCES=[
 {'kind':'serif','file':'SourceHanSerifKR-Regular.otf','version':'2.003','commit':'7889f11bf31170b5d092a083b357c8c8130f89e0','sha256':'b2b310255186ce92de2909f96522b9183a9f6c323dbe5663f205f02d6ece08b7','repo':'source-han-serif'},
 {'kind':'sans','file':'SourceHanSansKR-Regular.otf','version':'2.005','commit':'a4f7cf94edfb9d7ffbdfc4841de276358bd7e0f2','sha256':'d8299926a5284f7461b46fa0617cc05d4f1fce8f034ffff78084225ce8b38071','repo':'source-han-sans'},
]
SAMPLES={
 'hangul':'한글 본명조 본고딕 섹션 본문 여백 주석 캡션 표 그림 편집 저장 발행 복구 값 항목 대한민국',
 'hanja':'漢字 大韓民國 學問 文書 春夏秋冬',
 'punct':'「」『』、。！？〈〉《》…—·',
 'jamo':'한 ㅎㅏㄴ',
}
def ranges(points):
 spans=[]
 for point in sorted(points):
  if spans and point==spans[-1][1]+1:spans[-1][1]=point
  else:spans.append([point,point])
 return ','.join(f'U+{a:X}' if a==b else f'U+{a:X}-{b:X}' for a,b in spans)

def build(source_dir,out):
 assert fontTools.__version__=='4.61.1' and brotli.__version__=='1.2.0','Use pinned font-proof-requirements.txt'
 out.mkdir(parents=True,exist_ok=True)
 manifest={'fixtureVersion':1,'scope':'R13 proof only; sample glyph coverage, Regular weight','fontTools':fontTools.__version__,'brotli':brotli.__version__,'samples':SAMPLES,'sources':[]}
 css=[]
 for spec in SOURCES:
  source=source_dir/spec['file'];raw=source.read_bytes();assert hashlib.sha256(raw).hexdigest()==spec['sha256'],f'Unexpected source bytes: {source}'
  original=TTFont(source,recalcTimestamp=False);cmap=original.getBestCmap();family=f'Lexical Tufte Han {spec["kind"].title()} Proof';record={**spec,'url':f'https://raw.githubusercontent.com/adobe-fonts/{spec["repo"]}/{spec["commit"]}/SubsetOTF/KR/{spec["file"]}','family':family,'originalBytes':len(raw),'unitsPerEm':original['head'].unitsPerEm,'chunks':[]};seen=set()
  for label,sample in SAMPLES.items():
   points={ord(c) for c in sample if ord(c)>127};assert not points&seen;seen|=points
   assert points<=set(cmap),f'Missing original glyphs {points-set(cmap)}'
   font=TTFont(source,recalcTimestamp=False);options=subset.Options();options.recalc_timestamp=False;options.name_IDs=['*'];options.name_legacy=True;options.name_languages=['*'];options.layout_features=['*'];options.notdef_glyph=True
   sub=subset.Subsetter(options=options);sub.populate(unicodes=points);sub.subset(font)
   ps=family.replace(' ','')+'-'+label
   names={1:family,2:'Regular',3:ps+'-R13',4:family+' Regular',6:ps,16:family,17:'Regular',18:family+' Regular',21:family,22:'Regular'}
   for item in list(font['name'].names):
    if item.nameID in names:font['name'].setName(names[item.nameID],item.nameID,item.platformID,item.platEncID,item.langID)
   if 'CFF ' in font:
    cff=font['CFF '].cff;cff.fontNames=[ps]
    for top in cff.topDictIndex:
     top.FamilyName=family;top.FullName=family+' Regular'
   filename=f'{spec["kind"]}-{label}.woff2';font.flavor='woff2';font.save(out/filename)
   reopened=TTFont(out/filename);actual=reopened.getBestCmap();assert set(actual)==points
   assert all('Source' not in n.toUnicode() for n in reopened['name'].names if n.nameID in names)
   for cp in points:assert reopened['hmtx'][actual[cp]]==original['hmtx'][cmap[cp]],f'Advance changed U+{cp:X}'
   data=(out/filename).read_bytes();sample_non_ascii=''.join(c for c in sample if ord(c)>127)
   entry={'postScriptName':ps,'kind':label,'file':filename,'characters':''.join(map(chr,sorted(points))),'unicodeRange':ranges(points),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'advanceUnits':sum(original['hmtx'][cmap[ord(c)]][0] for c in sample_non_ascii),'sampleNonAscii':sample_non_ascii,'hhea':{'ascent':original['hhea'].ascent,'descent':original['hhea'].descent,'lineGap':original['hhea'].lineGap}}
   record['chunks'].append(entry)
   css.append(f'@font-face{{font-family:"{family}";font-style:normal;font-weight:400;font-display:swap;src:url("./{filename}") format("woff2");unicode-range:{entry["unicodeRange"]};}}')
  manifest['sources'].append(record)
 css+=['body{font-size:24px;line-height:1.6;max-width:700px;margin:2rem auto;padding:1rem;}','.serif{font-family:et-book,"Lexical Tufte Han Serif Proof",serif;}','.sans{font-family:"Lexical Tufte Han Sans Proof",sans-serif;}','.metric{display:inline-block;font-kerning:none;font-variant-ligatures:none;white-space:nowrap;}','section{border:1px solid #bbb;padding:1rem;margin:1rem 0;}']
 (out/'fonts.css').write_text('\n'.join(css)+'\n',encoding='utf8');(out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 print(json.dumps({'fonts':len(SOURCES)*len(SAMPLES),'woff2Bytes':sum(c['bytes'] for s in manifest['sources'] for c in s['chunks']),'output':str(out)}))

if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--source-dir',type=Path,required=True);parser.add_argument('--output',type=Path,default=ROOT/'fixtures/fonts/proof');args=parser.parse_args();build(args.source_dir,args.output)
