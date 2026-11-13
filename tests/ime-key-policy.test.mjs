import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isImeKeyboardEvent} from '../packages/editor-react/dist/imeKeyboard.js';

test('IME composition event and fallback variants block navigation keys',()=>{
 for(const e of [
  {isComposing:true,key:'Escape',keyCode:27},
  {isComposing:true,key:'Enter'},
  {key:'Process',keyCode:0},
  {key:'Escape',keyCode:229},
  {key:'Backspace',keyCode:229}
 ])assert.equal(isImeKeyboardEvent(e),true);
});

test('plain keyboard navigation and absent events are not treated as composition',()=>{
 for(const e of [
  {isComposing:false,key:'Escape',keyCode:27},
  {isComposing:false,key:'Tab',keyCode:9},
  {isComposing:false,key:'Enter',keyCode:13},
  {key:'a',keyCode:65},
  null,
  undefined
 ])assert.equal(isImeKeyboardEvent(e),false);
});
