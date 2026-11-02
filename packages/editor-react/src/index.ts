import type {AssetProvider} from '@lexical-tufte/editor-ports';
import type {TufteDocument} from '@lexical-tufte/document';

/** Public contract for the future reusable editor; implementation migration is pending. */
export interface TufteEditorProps {
  value: TufteDocument;
  onChange?: (value: TufteDocument) => void;
  onError?: (error: Error) => void;
  assetAdapter?: AssetProvider;
  assetNamespace?: string;
  readonly?: boolean;
}

export {ToolbarIcon, type ToolbarIconName} from './toolbar.js';

export {SelectionToolbar} from './SelectionToolbar.js';

export {canOpenBlockMenu,blockMenuCapabilities,NO_BLOCK_MENU_ACTIONS,type BlockMenuCapabilities} from './blockMenuCapabilities.js';

export {BlockContextMenu} from './BlockContextMenu.js';

export {NoteImagePanel,type NoteImageChoice,type ImagePresentation} from './NoteImagePanel.js';

export {INLINE_ACTIONS,EDITOR_SHORTCUTS,type InlineAction} from './inlineActions.js';

export {TufteComposer,type TufteComposerProps} from './TufteComposer.js';
export {TufteEditingSurface,type TufteEditingSurfaceProps} from './TufteEditingSurface.js';
