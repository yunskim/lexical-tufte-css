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
