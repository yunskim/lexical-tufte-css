import {isEmbedURL, isSafeURL} from '@lexical-tufte/document';
import {
  $createEmbedNode,
  $createFigureNode,
  $createFullwidthNode,
  $createImageQuiltNode,
  $createInlineImageNode,
  $createSectionNode,
  $createTableLayoutNode,
  $createTufteCodeNode,
  $createTufteParagraphNode,
  $getContainingNote,
  INSERT_TUFTE_DEFINITION_LIST_COMMAND,
  INSERT_TUFTE_QUOTATION_COMMAND,
  INSERT_TUFTE_SECTION_COMMAND,
  SectionNode,
} from '@lexical-tufte/lexical';
import {$createTableNodeWithDimensions} from '@lexical/table';
import {
  $addUpdateTag,
  $createParagraphNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  HISTORY_PUSH_TAG,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
} from 'lexical';
import {type JSX, useState} from 'react';

import type useModal from '../../hooks/useModal';
import {$createDocumentHeadingNode} from '../../nodes/DocumentHeadingNode';
import Button from '../../ui/Button';
import {DialogActions} from '../../ui/Dialog';
import {DropDownItem} from '../../ui/DropDown';
import TextInput from '../../ui/TextInput';

function $sectionBlock(): LexicalNode | null {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) return null;
  const anchor = selection.anchor.getNode();
  if ($getContainingNote(anchor)) return null;
  for (let node: LexicalNode | null = anchor; node; node = node.getParent()) {
    const parent = node.getParent();
    if (parent instanceof SectionNode && parent.getParent()?.is($getRoot())) {
      return node;
    }
  }
  return null;
}

type MediaKind = 'figure' | 'imagequilt' | 'embed';

function normalizeYouTubeURL(value: string): string | null {
  if (isEmbedURL(value, 'youtube')) return value;
  if (!/^https:\/\//i.test(value) || !isSafeURL(value, 'link')) return null;
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.port) return null;

  let videoId: string | null = null;
  if (url.hostname === 'youtu.be') {
    videoId = url.pathname.slice(1);
  } else if (
    ['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname)
  ) {
    videoId =
      url.pathname === '/watch'
        ? url.searchParams.get('v')
        : (/^\/(?:embed|shorts)\/([^/]+)$/.exec(url.pathname)?.[1] ?? null);
  } else if (url.hostname === 'www.youtube-nocookie.com') {
    videoId = /^\/embed\/([^/]+)$/.exec(url.pathname)?.[1] ?? null;
  }

  if (!videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null;
  return `https://www.youtube-nocookie.com/embed/${videoId}`;
}

function TufteMediaForm({
  kind,
  insert,
}: {
  kind: MediaKind;
  insert: (create: () => LexicalNode) => void;
}): JSX.Element {
  const [src, setSrc] = useState('');
  const [description, setDescription] = useState('');
  const [wide, setWide] = useState(false);
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const url = src.trim();
  const youtubeURL = kind === 'embed' ? normalizeYouTubeURL(url) : null;
  const provider = youtubeURL
    ? 'youtube'
    : isEmbedURL(url, 'vimeo')
      ? 'vimeo'
      : null;
  const dimensions = [Number(width), Number(height)];
  const valid =
    kind === 'embed'
      ? provider !== null && description.trim().length <= 1000
      : isSafeURL(url, 'image') &&
        (kind !== 'imagequilt' ||
          dimensions.every(n => Number.isSafeInteger(n) && n > 0));

  return (
    <>
      <TextInput
        autoFocus
        label={
          kind === 'embed' ? 'YouTube 링크 또는 Vimeo 임베드 URL' : '이미지 URL'
        }
        value={src}
        onChange={setSrc}
        placeholder={kind === 'embed' ? 'https://youtu.be/…' : ''}
      />
      <TextInput
        label={kind === 'embed' ? '동영상 제목 (선택)' : '대체 텍스트'}
        value={description}
        onChange={setDescription}
        placeholder=""
      />
      {kind === 'imagequilt' && (
        <>
          <TextInput
            label="너비(px)"
            value={width}
            onChange={setWidth}
            placeholder=""
          />
          <TextInput
            label="높이(px)"
            value={height}
            onChange={setHeight}
            placeholder=""
          />
        </>
      )}
      <label>
        <input
          type="checkbox"
          checked={wide}
          onChange={event => setWide(event.target.checked)}
        />{' '}
        전체 폭
      </label>
      <DialogActions>
        <Button
          disabled={!valid}
          onClick={() => {
            if (!valid) return;
            const layout = wide ? 'fullwidth' : 'body';
            if (kind === 'embed' && provider) {
              insert(() =>
                $createEmbedNode(
                  provider,
                  youtubeURL ?? url,
                  description.trim() ||
                    (provider === 'youtube'
                      ? 'YouTube 동영상'
                      : 'Vimeo 동영상'),
                  'figure',
                  layout,
                ),
              );
            } else if (kind === 'imagequilt') {
              insert(() =>
                $createFigureNode(layout).append(
                  $createImageQuiltNode(
                    url,
                    description,
                    undefined,
                    Number(width),
                    Number(height),
                  ),
                ),
              );
            } else {
              insert(() =>
                $createFigureNode(layout).append(
                  $createInlineImageNode(url, description),
                ),
              );
            }
          }}>
          삽입
        </Button>
      </DialogActions>
    </>
  );
}

export default function TufteBlockMenu({
  editor,
  showModal,
}: {
  editor: LexicalEditor;
  showModal: ReturnType<typeof useModal>[1];
}): JSX.Element {
  function insertBlock(create: () => LexicalNode, targetKey?: NodeKey) {
    editor.update(() => {
      if (!editor.isEditable() || editor.isComposing()) return;
      const target = targetKey ? $getNodeByKey(targetKey) : $sectionBlock();
      if (!target?.isAttached() || !(target.getParent() instanceof SectionNode))
        return;
      $addUpdateTag(HISTORY_PUSH_TAG);
      const block = create();
      target.insertAfter(block);
      if ($isElementNode(block)) block.selectStart();
      else block.selectNext();
    });
  }

  function insertHeading(kind: 'title' | 'subtitle') {
    editor.update(() => {
      if (!editor.isEditable() || editor.isComposing()) return;
      const root = $getRoot();
      const heading = $createDocumentHeadingNode(kind);
      const firstSection = root
        .getChildren()
        .find(node => node instanceof SectionNode);
      $addUpdateTag(HISTORY_PUSH_TAG);
      if (firstSection) firstSection.insertBefore(heading);
      else root.append(heading);
      heading.selectStart();
    });
  }

  function insertSection() {
    const inSection = editor.read(() => $sectionBlock() !== null);
    if (inSection) {
      editor.dispatchCommand(INSERT_TUFTE_SECTION_COMMAND, undefined);
      return;
    }
    editor.update(() => {
      if (!editor.isEditable() || editor.isComposing()) return;
      const paragraph = $createParagraphNode();
      $addUpdateTag(HISTORY_PUSH_TAG);
      $getRoot().append($createSectionNode().append(paragraph));
      paragraph.selectStart();
    });
  }

  function openMedia(kind: MediaKind, title: string) {
    const targetKey = editor.read(() => $sectionBlock()?.getKey());
    if (!targetKey) return;
    showModal(title, onClose => (
      <TufteMediaForm
        kind={kind}
        insert={create => {
          insertBlock(create, targetKey);
          onClose();
        }}
      />
    ));
  }

  const inSection = editor.read(() => $sectionBlock() !== null);
  const items: [string, () => void][] = [
    ['문서 제목 삽입', () => insertHeading('title')],
    ['부제목 삽입', () => insertHeading('subtitle')],
    ['Tufte 섹션 삽입', insertSection],
  ];
  if (inSection) {
    items.push(
      [
        '산세리프 문단 삽입',
        () => insertBlock(() => $createTufteParagraphNode('sans')),
      ],
      [
        '제사(Epigraph) 삽입',
        () =>
          editor.dispatchCommand(INSERT_TUFTE_QUOTATION_COMMAND, 'epigraph'),
      ],
      [
        '정의 목록 삽입',
        () =>
          editor.dispatchCommand(
            INSERT_TUFTE_DEFINITION_LIST_COMMAND,
            undefined,
          ),
      ],
      [
        '섹션 출처 삽입',
        () =>
          editor.dispatchCommand(
            INSERT_TUFTE_QUOTATION_COMMAND,
            'section-footer',
          ),
      ],
      [
        '전체 폭 코드 블록 삽입',
        () => insertBlock(() => $createTufteCodeNode('fullwidth')),
      ],
      [
        '전체 폭 블록 삽입',
        () =>
          insertBlock(() =>
            $createFullwidthNode().append($createParagraphNode()),
          ),
      ],
      [
        '본문 폭 표 삽입',
        () =>
          insertBlock(() =>
            $createTableLayoutNode('body').append(
              $createTableNodeWithDimensions(2, 2),
            ),
          ),
      ],
      [
        '전체 폭 표 삽입',
        () =>
          insertBlock(() =>
            $createTableLayoutNode('fullwidth').append(
              $createTableNodeWithDimensions(2, 2),
            ),
          ),
      ],
      [
        '스크롤 표 삽입',
        () =>
          insertBlock(() =>
            $createTableLayoutNode('scroll').append(
              $createTableNodeWithDimensions(2, 2),
            ),
          ),
      ],
      ['Tufte 그림 삽입', () => openMedia('figure', 'Tufte 그림 삽입')],
      ['ImageQuilt 삽입', () => openMedia('imagequilt', 'ImageQuilt 삽입')],
      ['동영상 임베드 삽입', () => openMedia('embed', '동영상 임베드 삽입')],
    );
  }
  return (
    <>
      {items.map(([label, onClick]) => (
        <DropDownItem
          className="item wide tufte-block-option"
          key={label}
          onClick={onClick}>
          <span className="text">{label}</span>
        </DropDownItem>
      ))}
    </>
  );
}
