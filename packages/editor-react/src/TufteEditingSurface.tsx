import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';
import {TablePlugin} from '@lexical/react/LexicalTablePlugin';
import {SelectionToolbar} from './SelectionToolbar.js';
import {BlockContextMenu} from './BlockContextMenu.js';
import {TufteNoteInteractionPlugin,TufteNoteStructurePlugin} from './TufteNoteInteractionPlugin.js';

/** All editable React plugins share the same nearest LexicalComposer. */
export interface TufteEditingSurfaceProps {
 className?:string;
 ariaLabel:string;
 ariaDescribedBy?:string;
 readonly?:boolean;
 onNotice?:(message:string)=>void;
}

export function TufteEditingSurface({
 className='editor',ariaLabel,ariaDescribedBy,readonly=false,onNotice
}:TufteEditingSurfaceProps){
 return <>
  <RichTextPlugin
   contentEditable={<ContentEditable className={className} aria-label={ariaLabel} aria-describedby={ariaDescribedBy} aria-readonly={readonly}/>}
   ErrorBoundary={LexicalErrorBoundary}
  />
  <HistoryPlugin/>
  <TablePlugin/>
  <TufteNoteStructurePlugin onNotice={onNotice}/>
  {!readonly&&<TufteNoteInteractionPlugin onNotice={onNotice}/>}
  {!readonly&&<SelectionToolbar/>}
  {!readonly&&<BlockContextMenu/>}
 </>;
}
