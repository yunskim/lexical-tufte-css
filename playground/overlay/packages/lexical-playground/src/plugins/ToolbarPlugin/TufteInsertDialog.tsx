import {isEmbedURL, isSafeURL} from '@lexical-tufte/document';
import {
  $createCaptionNode,
  $createEmbedNode,
  $createFigureNode,
  $createInlineImageNode,
  $createTableLayoutNode,
  $getContainingNote,
  SectionNode,
  type TableLayout,
} from '@lexical-tufte/lexical';
import {$createTableNodeWithDimensions} from '@lexical/table';
import {
  $addUpdateTag,
  $createTextNode,
  $findMatchingParent,
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  HISTORY_PUSH_TAG,
  type LexicalEditor,
} from 'lexical';
import {useId, useState} from 'react';

import type useModal from '../../hooks/useModal';
import '../../ui/Input.css';
import '../../ui/Button.css';
import {DialogActions} from '../../ui/Dialog';

const titles = {
  figure: 'Tufte 그림 삽입',
  table: 'Tufte 표 삽입',
  video: '동영상 임베드 삽입',
};

type InsertKind = keyof typeof titles;

function parseVideo(value: string) {
  if (isEmbedURL(value, 'vimeo'))
    return {provider: 'vimeo', src: value} as const;
  if (!/^https:\/\//i.test(value) || !isSafeURL(value, 'link')) return null;
  const url = new URL(value);
  if (url.port) return null;

  let id: string | null = null;
  if (url.hostname === 'youtu.be') {
    id = url.pathname.slice(1);
  } else if (
    ['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname)
  ) {
    id =
      url.pathname === '/watch'
        ? url.searchParams.get('v')
        : (/^\/(?:embed|shorts)\/([^/]+)$/.exec(url.pathname)?.[1] ?? null);
  } else if (url.hostname === 'www.youtube-nocookie.com') {
    id = /^\/embed\/([^/]+)$/.exec(url.pathname)?.[1] ?? null;
  }
  if (!id || !/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
  return {
    provider: 'youtube',
    src: `https://www.youtube-nocookie.com/embed/${id}`,
  } as const;
}

export function openTufteInsertDialog(
  editor: LexicalEditor,
  showModal: ReturnType<typeof useModal>[1],
  kind: InsertKind,
) {
  const blockKey = editor.read('force-commit', () => {
    const selection = $getSelection();
    if (
      !$isRangeSelection(selection) ||
      !selection.isCollapsed() ||
      editor.isComposing()
    )
      return null;
    const anchor = selection.anchor.getNode();
    if ($getContainingNote(anchor)) return null;
    return (
      $findMatchingParent(anchor, node => {
        const parent = node.getParent();
        return (
          parent instanceof SectionNode &&
          parent.getParent()?.getType() === 'root'
        );
      })?.getKey() ?? null
    );
  });
  showModal(titles[kind], close =>
    blockKey === null ? (
      <p role="status">섹션 본문에서 삽입할 블록에 커서를 두세요.</p>
    ) : (
      <TufteInsertDialog
        editor={editor}
        blockKey={blockKey}
        kind={kind}
        close={close}
      />
    ),
  );
}

function TufteInsertDialog({
  editor,
  blockKey,
  kind,
  close,
}: {
  editor: LexicalEditor;
  blockKey: string;
  kind: InsertKind;
  close: () => void;
}) {
  const id = useId();
  const [source, setSource] = useState('');
  const [description, setDescription] = useState('');
  const [caption, setCaption] = useState('');
  const [rows, setRows] = useState('3');
  const [columns, setColumns] = useState('3');
  const [layout, setLayout] = useState<TableLayout>('body');
  const [error, setError] = useState('');
  const url = source.trim();
  const video = kind === 'video' ? parseVideo(url) : null;
  const valid =
    kind === 'table'
      ? [rows, columns].every(
          value =>
            /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 20,
        )
      : kind === 'video'
        ? video !== null && description.trim().length <= 1000
        : isSafeURL(url, 'image') && caption.trim().length <= 2000;

  function insert() {
    if (!valid) return;
    editor.update(() => {
      const block = $getNodeByKey(blockKey);
      const section = block?.getParent();
      if (
        !block ||
        !(section instanceof SectionNode) ||
        section.getParent()?.getType() !== 'root'
      ) {
        setError(
          '삽입 위치가 바뀌었습니다. 창을 닫고 본문에서 다시 선택하세요.',
        );
        return;
      }
      const width = layout === 'fullwidth' ? 'fullwidth' : 'body';
      $addUpdateTag(HISTORY_PUSH_TAG);
      if (kind === 'figure') {
        const figure = $createFigureNode(width).append(
          $createInlineImageNode(url, description),
        );
        const captionText = caption.trim();
        if (captionText)
          figure.append(
            $createCaptionNode().append($createTextNode(captionText)),
          );
        block.insertAfter(figure);
        figure.selectEnd();
      } else if (kind === 'table') {
        const table = $createTableNodeWithDimensions(
          Number(rows),
          Number(columns),
          true,
        );
        block.insertAfter($createTableLayoutNode(layout).append(table));
        table.selectStart();
      } else if (video) {
        const title =
          description.trim() ||
          (video.provider === 'youtube' ? 'YouTube 동영상' : 'Vimeo 동영상');
        block.insertAfter(
          $createEmbedNode(video.provider, video.src, title, 'figure', width),
        );
      }
      close();
    });
  }

  return (
    <form
      onSubmit={event => {
        event.preventDefault();
        insert();
      }}>
      {kind === 'table' ? (
        <>
          <label className="Input__wrapper" htmlFor={id + '-rows'}>
            행{' '}
            <input
              className="Input__input"
              id={id + '-rows'}
              type="number"
              min="1"
              max="20"
              value={rows}
              onChange={event => setRows(event.target.value)}
              autoFocus
            />
          </label>
          <label className="Input__wrapper" htmlFor={id + '-columns'}>
            열{' '}
            <input
              className="Input__input"
              id={id + '-columns'}
              type="number"
              min="1"
              max="20"
              value={columns}
              onChange={event => setColumns(event.target.value)}
            />
          </label>
        </>
      ) : (
        <>
          <label className="Input__wrapper" htmlFor={id + '-url'}>
            {kind === 'video'
              ? 'YouTube 링크 또는 Vimeo 임베드 URL'
              : '이미지 URL'}
            <input
              className="Input__input"
              id={id + '-url'}
              value={source}
              onChange={event => setSource(event.target.value)}
              autoFocus
            />
          </label>
          <label className="Input__wrapper" htmlFor={id + '-description'}>
            {kind === 'video' ? '동영상 제목 (선택)' : '대체 텍스트'}
            <input
              className="Input__input"
              id={id + '-description'}
              value={description}
              onChange={event => setDescription(event.target.value)}
            />
          </label>
        </>
      )}
      {kind === 'figure' && (
        <label className="Input__wrapper" htmlFor={id + '-caption'}>
          캡션 (선택)
          <input
            className="Input__input"
            id={id + '-caption'}
            value={caption}
            onChange={event => setCaption(event.target.value)}
          />
        </label>
      )}
      <label className="Input__wrapper" htmlFor={id + '-layout'}>
        너비
        <select
          className="Input__input"
          id={id + '-layout'}
          value={layout}
          onChange={event => setLayout(event.target.value as TableLayout)}>
          <option value="body">본문 폭</option>
          <option value="fullwidth">전체 폭</option>
          {kind === 'table' && <option value="scroll">가로 스크롤</option>}
        </select>
      </label>
      {error && <p role="alert">{error}</p>}
      <DialogActions>
        <button className="Button__root" type="submit" disabled={!valid}>
          삽입
        </button>
      </DialogActions>
    </form>
  );
}
