/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$isLinkNode, TOGGLE_LINK_COMMAND} from '@lexical/link';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  NodeContextMenuOption,
  NodeContextMenuPlugin,
  NodeContextMenuSeparator,
} from '@lexical/react/LexicalNodeContextMenuPlugin';
import {
  $addUpdateTag,
  COPY_COMMAND,
  CUT_COMMAND,
  HISTORY_PUSH_TAG,
  type LexicalNode,
  PASTE_COMMAND,
} from 'lexical';
import {type JSX, useEffect, useMemo} from 'react';

import {createTufteContextOptions} from './tufteOptions';

function $canDeletePlaygroundNode(node: LexicalNode): boolean {
  for (
    let current: LexicalNode | null = node;
    current;
    current = current.getParent()
  ) {
    if (current.getType().startsWith('tufte-')) return false;
  }
  return true;
}

export default function ContextMenuPlugin({
  tufteEnabled = false,
}: {
  tufteEnabled?: boolean;
}): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const tufte = useMemo(() => createTufteContextOptions(editor), [editor]);
  useEffect(() => {
    if (tufteEnabled) return tufte.register();
  }, [tufte, tufteEnabled]);

  const items = useMemo(() => {
    return [
      new NodeContextMenuOption(`Remove Link`, {
        $onSelect: () => {
          editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
        },
        $showOn: (node: LexicalNode) => $isLinkNode(node.getParent()),
        disabled: false,
        icon: <i className="PlaygroundEditorTheme__contextMenuItemIcon" />,
      }),
      new NodeContextMenuSeparator({
        $showOn: (node: LexicalNode) => $isLinkNode(node.getParent()),
      }),
      new NodeContextMenuOption(`Cut`, {
        $onSelect: () => {
          editor.dispatchCommand(CUT_COMMAND, null);
        },
        disabled: false,
        icon: (
          <i className="PlaygroundEditorTheme__contextMenuItemIcon page-break" />
        ),
      }),
      new NodeContextMenuOption(`Copy`, {
        $onSelect: () => {
          editor.dispatchCommand(COPY_COMMAND, null);
        },
        disabled: false,
        icon: <i className="PlaygroundEditorTheme__contextMenuItemIcon copy" />,
      }),
      new NodeContextMenuOption(`Paste`, {
        $onSelect: () => {
          navigator.clipboard.read().then(async function (...args) {
            const data = new DataTransfer();

            const readClipboardItems = await navigator.clipboard.read();
            const item = readClipboardItems[0];

            if (navigator.permissions) {
              const permission = await navigator.permissions.query({
                // @ts-expect-error These types are incorrect.
                name: 'clipboard-read',
              });
              if (permission.state === 'denied') {
                alert('Not allowed to paste from clipboard.');
                return;
              }

              for (const type of item.types) {
                const dataString = await (await item.getType(type)).text();
                data.setData(type, dataString);
              }

              const event = new ClipboardEvent('paste', {
                clipboardData: data,
              });

              editor.dispatchCommand(PASTE_COMMAND, event);
            } else {
              alert('Your browser does not support navigator.permissions');
            }
          });
        },
        disabled: false,
        icon: (
          <i className="PlaygroundEditorTheme__contextMenuItemIcon paste" />
        ),
      }),
      new NodeContextMenuOption(`Paste as Plain Text`, {
        $onSelect: () => {
          navigator.clipboard.read().then(async function (...args) {
            if (navigator.permissions) {
              const permission = await navigator.permissions.query({
                // @ts-expect-error These types are incorrect.
                name: 'clipboard-read',
              });

              if (permission.state === 'denied') {
                alert('Not allowed to paste from clipboard.');
                return;
              }

              const data = new DataTransfer();
              const clipboardText = await navigator.clipboard.readText();
              data.setData('text/plain', clipboardText);

              const event = new ClipboardEvent('paste', {
                clipboardData: data,
              });
              editor.dispatchCommand(PASTE_COMMAND, event);
            } else {
              alert('Your browser does not support navigator.permissions');
            }
          });
        },
        disabled: false,
        icon: <i className="PlaygroundEditorTheme__contextMenuItemIcon" />,
      }),
      new NodeContextMenuSeparator(),
      new NodeContextMenuOption(`Delete Node`, {
        $showOn: node =>
          editor.isEditable() &&
          $canDeletePlaygroundNode(node) &&
          node.getTopLevelElement() !== null,
        $onSelect: node => {
          $addUpdateTag(HISTORY_PUSH_TAG);
          node.getTopLevelElement()?.remove();
        },
        disabled: false,
        icon: (
          <i className="PlaygroundEditorTheme__contextMenuItemIcon clear" />
        ),
      }),
      ...(tufteEnabled ? tufte.items : []),
    ];
  }, [editor, tufte, tufteEnabled]);

  return (
    <NodeContextMenuPlugin
      className="PlaygroundEditorTheme__contextMenu"
      itemClassName="PlaygroundEditorTheme__contextMenuItem"
      separatorClassName="PlaygroundEditorTheme__contextMenuSeparator"
      items={items}
    />
  );
}
