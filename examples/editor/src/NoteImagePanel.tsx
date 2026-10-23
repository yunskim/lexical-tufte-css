import {useEffect,useRef,useState,type FormEvent,type KeyboardEvent} from 'react';

/** Current-note images, not the document asset catalog; the host identity remains in Lexical. */
export type NoteImageChoice={
 key:string;src:string;alt:string;assetId?:string;width?:number;height?:number;
};
export type ImagePresentation={alt:string;width?:number;height?:number};

type Props={
 images:readonly NoteImageChoice[];
 onClose:()=>void;
 onSave:(key:string,attributes:ImagePresentation)=>boolean;
};

function pixel(text:string):number|undefined|null{
 if(text==='')return undefined;
 if(!/^[1-9][0-9]*$/.test(text))return null;
 const value=Number(text);
 return Number.isSafeInteger(value)?value:null;
}

/** Wagtail-inspired chooser: browse the images in this note, then edit one. */
export function NoteImagePanel({images,onClose,onSave}:Props){
 const [selectedKey,setSelectedKey]=useState(images[0]?.key??'');
 const [query,setQuery]=useState('');
 const [alt,setAlt]=useState(images[0]?.alt??'');
 const [width,setWidth]=useState(images[0]?.width?.toString()??'');
 const [height,setHeight]=useState(images[0]?.height?.toString()??'');
 const [error,setError]=useState('');
 const search=useRef<HTMLInputElement>(null);
 const selected=images.find(image=>image.key===selectedKey);
 const visible=images.map((image,index)=>({image,index})).filter(({image})=>
  [image.alt,image.src,image.assetId??''].some(value=>value.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
 );
 useEffect(()=>{search.current?.focus();},[]);
 function select(image:NoteImageChoice){
  setSelectedKey(image.key);
  setAlt(image.alt);
  setWidth(image.width?.toString()??'');
  setHeight(image.height?.toString()??'');
  setError('');
 }
 function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(!selected){setError('수정할 이미지를 다시 선택하세요.');return;}
  const w=pixel(width),h=pixel(height);
  if(w===null||h===null){setError('너비와 높이는 빈 값 또는 양의 정수여야 합니다.');return;}
  if(onSave(selected.key,{alt,width:w,height:h}))onClose();
  else setError('이미지 위치가 변경되었습니다. 다시 선택해 주세요.');
 }
 function keys(event:KeyboardEvent<HTMLElement>){
  if(event.key==='Escape'){event.preventDefault();onClose();return;}
  if(event.key!=='Tab')return;
  const focusable=[...event.currentTarget.querySelectorAll<HTMLElement>(
   'button:not([disabled]),input:not([disabled])'
  )].filter(element=>element.getClientRects().length>0);
  if(!focusable.length)return;
  if(event.shiftKey&&document.activeElement===focusable[0]){
   event.preventDefault();focusable.at(-1)?.focus();
  }else if(!event.shiftKey&&document.activeElement===focusable.at(-1)){
   event.preventDefault();focusable[0]?.focus();
  }
 }
 return <div className="note-image-backdrop">
  <section role="dialog" aria-modal="true" aria-labelledby="note-image-title" aria-describedby="note-image-description"
   className="note-image-dialog" onKeyDown={keys}>
   <header className="note-image-dialog-head">
    <div><h2 id="note-image-title">노트 이미지 선택</h2>
     <p id="note-image-description">현재 노트에서 이미지를 선택하고 표시 속성을 수정합니다.</p></div>
    <button type="button" aria-label="이미지 선택 취소" onClick={onClose}>닫기</button>
   </header>
   <div className="note-image-body">
    <div role="group" aria-label="현재 노트의 이미지 선택" className="note-image-library">
     <label htmlFor="note-image-search">이미지 검색</label>
     <input id="note-image-search" ref={search} type="search" value={query}
      onChange={event=>setQuery(event.target.value)} placeholder="이름·경로·자산 ID"/>
     <ul className="note-image-grid">
      {visible.map(({image,index})=><li key={image.key}>
       <button type="button" className="note-image-choice" aria-pressed={selectedKey===image.key}
        aria-label={`이미지 ${index+1}: ${image.alt||image.src}`}
        onClick={()=>select(image)}>
        <img src={image.src} alt="" aria-hidden="true"/>
        <span><strong>이미지 {index+1}: {image.alt||'설명 없음'}</strong>
         <small>{image.assetId? `자산: ${image.assetId}`:image.src}</small></span>
       </button>
      </li>)}
     </ul>
     {visible.length===0&&<p role="status">검색 결과가 없습니다.</p>}
    </div>
    <form className="note-image-properties" aria-label="선택한 이미지 속성" onSubmit={submit}>
     <h3>이미지 세부 정보</h3>
     {selected?<><div className="note-image-preview">
      <img src={selected.src} alt="" aria-hidden="true"/>
      <small>{selected.src}</small>
     </div>
     <label htmlFor="note-image-alt">대체 텍스트</label>
     <input id="note-image-alt" value={alt} onChange={event=>setAlt(event.target.value)}
      placeholder="이미지의 내용을 설명해 주세요"/>
     <div className="note-image-sizes">
      <label htmlFor="note-image-width">너비 (px)
       <input id="note-image-width" type="text" inputMode="numeric" value={width}
        onChange={event=>setWidth(event.target.value)} placeholder="자동"/>
      </label>
      <label htmlFor="note-image-height">높이 (px)
       <input id="note-image-height" type="text" inputMode="numeric" value={height}
        onChange={event=>setHeight(event.target.value)} placeholder="자동"/>
      </label>
     </div>
     <p className="note-image-hint">크기를 비우면 원래 표시 크기를 사용합니다. 파일이나 자산 참조는 변경하지 않습니다.</p>
     {error&&<p role="alert">{error}</p>}
     <div className="note-image-actions">
      <button type="button" onClick={onClose}>취소</button>
      <button type="submit" className="note-image-primary">이미지 변경 저장</button>
     </div></>:<p>선택 가능한 이미지가 없습니다.</p>}
    </form>
   </div>
  </section>
 </div>;
}
