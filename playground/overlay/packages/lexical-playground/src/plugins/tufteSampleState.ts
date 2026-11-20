import {serializeRuntimeEditorState} from '@lexical-tufte/lexical';
import tufteSample from './tufte-sample.json';

import type {DocumentHeadingKind} from '../nodes/DocumentHeadingNode';

function documentHeading(kind: DocumentHeadingKind, text: string, id?: string) {
  return {
    children: [
      {
        detail: 0,
        format: 0,
        mode: 'normal',
        style: '',
        text,
        type: 'text',
        version: 1,
      },
    ],
    direction: null,
    format: '',
    indent: 0,
    kind,
    type: 'document-heading',
    version: 1,
    ...(id ? {id} : {}),
  };
}

const {root} = tufteSample.lexicalState;
export const tufteSampleEditorState = serializeRuntimeEditorState({
  root: {
    ...root,
    children: [
      documentHeading('title', tufteSample.title, tufteSample.titleId),
      documentHeading('subtitle', tufteSample.subtitle),
      ...root.children,
    ],
  },
});
