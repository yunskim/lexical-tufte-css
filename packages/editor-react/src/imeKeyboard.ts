/**
 * Browsers can report an in-progress IME composition through isComposing,
 * the legacy keyCode 229 fallback, or the Process key. None of these
 * keystrokes should navigate away from a note or dismiss a dialog.
 */
export function isImeKeyboardEvent(event:{
 isComposing?:boolean;
 keyCode?:number;
 key?:string;
}|null|undefined):boolean{
 return event?.isComposing===true||event?.keyCode===229||event?.key==='Process';
}
