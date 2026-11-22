import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  TufteDocumentCommandsPlugin,
  TufteNoteInteractionPlugin,
  TufteNoteStructurePlugin,
} from '@lexical-tufte/editor-react';
import {
  registerCodeCommands,
  replaceEditorDocumentState,
} from '@lexical-tufte/lexical';
import {useEffect, useState} from 'react';

import '@lexical-tufte/editor-react/styles.css';
import {tufteSampleEditorState} from './tufteSampleState';
import './TuftePlayground.css';

export default function TuftePlaygroundPlugin() {
  const [editor] = useLexicalComposerContext();
  const [notice, setNotice] = useState('');

  useEffect(
    () =>
      registerCodeCommands(editor, diagnostic => setNotice(diagnostic.message)),
    [editor],
  );

  function loadSample() {
    if (!editor.isEditable()) {
      return;
    }
    if (!window.confirm('현재 문서를 Tufte 예제로 바꿀까요?')) {
      return;
    }
    try {
      replaceEditorDocumentState(
        editor,
        editor.parseEditorState(tufteSampleEditorState),
      );
      setNotice(
        'Tufte 예제를 열었습니다. 문단, 주석 또는 그림을 우클릭해 보세요.',
      );
    } catch {
      setNotice('Tufte 예제를 열 수 없습니다.');
    }
  }

  return (
    <>
      <TufteDocumentCommandsPlugin onNotice={setNotice} />
      <TufteNoteStructurePlugin onNotice={setNotice} />
      <TufteNoteInteractionPlugin onNotice={setNotice} />
      <div className="tufte-playground-actions">
        <button type="button" onClick={loadSample}>
          Tufte 예제 열기
        </button>
        <span role="status">{notice}</span>
      </div>
    </>
  );
}
