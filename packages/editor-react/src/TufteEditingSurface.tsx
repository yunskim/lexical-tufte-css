import {RichTextPlugin} from '@lexical/react/LexicalRichTextPlugin';
import {ContentEditable} from '@lexical/react/LexicalContentEditable';
import {HistoryPlugin} from '@lexical/react/LexicalHistoryPlugin';
import {LexicalErrorBoundary} from '@lexical/react/LexicalErrorBoundary';
import {TablePlugin} from '@lexical/react/LexicalTablePlugin';
import {SelectionToolbar} from './SelectionToolbar.js';
import {BlockContextMenu} from './BlockContextMenu.js';

/** All editable React plugins share the same nearest LexicalComposer. */
export interface TufteEditingSurfaceProps {
 className?:string;
 ariaLabel:string;
 ariaDescribedBy?:string;
 readonly?:boolean;
}

export function TufteEditingSurface({
 className='editor',ariaLabel,ariaDescribedBy,readonly=false
}:TufteEditingSurfaceProps){
 return <>
  <RichTextPlugin
   contentEditable={<ContentEditable className={className} aria-label={ariaLabel} aria-describedby={ariaDescribedBy}/>}
   ErrorBoundary={LexicalErrorBoundary}
  />
  <HistoryPlugin/>
  <TablePlugin/>
  {!readonly&&<SelectionToolbar/>}
  {!readonly&&<BlockContextMenu/>}
 </>;
}
