import type {MouseEventHandler} from 'react';
import {EDITOR_SHORTCUTS} from './inlineActions.js';
import {ToolbarIcon,type ToolbarIconName} from './toolbar.js';

export interface ToolbarButtonProps {
 name:ToolbarIconName;
 label:string;
 onClick:()=>void;
 onMouseDown?:MouseEventHandler<HTMLButtonElement>;
 disabled?:boolean;
}

/**
 * Shared accessible icon-button. The optional pointer-down handler allows
 * editor toolbars to preserve the Lexical selection before issuing a command.
 */
export function ToolbarButton({name,label,onClick,onMouseDown,disabled=false}:ToolbarButtonProps){
 const shortcut=EDITOR_SHORTCUTS[label];
 return <button type="button" aria-label={label}
  title={shortcut?`${label} (${shortcut})`:label}
  onMouseDown={onMouseDown} onClick={onClick} disabled={disabled}>
  <ToolbarIcon name={name}/>
 </button>;
}
