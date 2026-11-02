import type {ToolbarIconName} from './toolbar.js';

export type InlineAction='bold'|'italic'|'underline'|'strikethrough'|'code'|'highlight';

/** One registry shared by the prototype toolbar and contextual toolbar. */
export const INLINE_ACTIONS:ReadonlyArray<{id:InlineAction;label:string;icon:ToolbarIconName}>=[
 {id:'bold',label:'굵게',icon:'bold'},
 {id:'italic',label:'기울임',icon:'italic'},
 {id:'underline',label:'밑줄',icon:'underline'},
 {id:'strikethrough',label:'취소선',icon:'strike'},
 {id:'code',label:'코드',icon:'code'},
 {id:'highlight',label:'마크',icon:'highlight'}
];

export const EDITOR_SHORTCUTS:Readonly<Record<string,string>>={
 굵게:'Ctrl/Cmd+B',기울임:'Ctrl/Cmd+I',
 '실행 취소':'Ctrl/Cmd+Z','다시 실행':'Ctrl/Cmd+Shift+Z'
};
