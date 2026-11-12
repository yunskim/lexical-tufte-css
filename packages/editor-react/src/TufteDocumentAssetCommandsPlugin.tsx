import {useEffect,useRef} from 'react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import type {AssetRef} from '@lexical-tufte/document';
import {registerDocumentAssetCommands} from '@lexical-tufte/lexical';

export interface TufteDocumentAssetCommandsPluginProps{
 assets:readonly AssetRef[];
 onNotice?:(message:string)=>void;
}

/** Stable registration with the current per-editor catalog and notice callback. */
export function TufteDocumentAssetCommandsPlugin({assets,onNotice}:TufteDocumentAssetCommandsPluginProps){
 const [editor]=useLexicalComposerContext();
 const latest=useRef({assets,onNotice});
 latest.current={assets,onNotice};
 useEffect(()=>registerDocumentAssetCommands(
  editor,()=>latest.current.assets,message=>latest.current.onNotice?.(message)
 ),[editor]);
 return null;
}
