/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  EditorModeAnnounceExtension,
  FocusManagerExtension,
  FocusTrapExtension,
  HistoryAnnounceExtension,
  RovingTabIndexExtension,
} from '@lexical/a11y';
import {$isCodeNode} from '@lexical/code';
import {
  $defaultShouldInsertAfter,
  AutoFocusExtension,
  ClearEditorExtension,
  ClickAfterLastBlockExtension,
  DecoratorTextExtension,
  HorizontalRuleExtension,
  SelectBlockExtension,
  SelectionAlwaysOnDisplayExtension,
  TabIndentationExtension,
  WatchEditableExtension,
} from '@lexical/extension';
import {HashtagExtension} from '@lexical/hashtag';
import {HistoryExtension} from '@lexical/history';
import {ClickableLinkExtension, LinkExtension} from '@lexical/link';
import {CheckListExtension, ListExtension} from '@lexical/list';
import {PlainTextExtension} from '@lexical/plain-text';
import {LexicalCollaboration} from '@lexical/react/LexicalCollaborationContext';
import {
  CollaborationPlugin,
  CollaborationPluginV2__EXPERIMENTAL,
} from '@lexical/react/LexicalCollaborationPlugin';
import {LexicalExtensionComposer} from '@lexical/react/LexicalExtensionComposer';
import {RichTextExtension} from '@lexical/rich-text';
import {TableExtension} from '@lexical/table';
import {Analytics} from '@vercel/analytics/react';
import {SpeedInsights} from '@vercel/speed-insights/react';
import {configExtension, defineExtension} from 'lexical';
import {type JSX, useMemo} from 'react';
import {Doc} from 'yjs';

import {isDevPlayground} from './appSettings';
import {
  createWebsocketProvider,
  createWebsocketProviderWithDoc,
  skipCollaborationInit,
} from './collaboration';
import {FlashMessageContext} from './context/FlashMessageContext';
import {SettingsContext, useSettings} from './context/SettingsContext';
import {ToolbarContext} from './context/ToolbarContext';
import Editor from './Editor';
import {registerSettingsSynchronization} from './hooks/useSynchronizeSettings';
import {KeywordsExtension} from './nodes/KeywordNode';
import {PlaygroundImportExtension} from './nodes/PlaygroundImportExtension';
import PlaygroundNodes from './nodes/PlaygroundNodes';
import {PlaygroundDOMRenderExtension} from './PlaygroundDOMRenderExtension';
import {AutocompleteExtension} from './plugins/AutocompleteExtension';
import {PlaygroundAutoLinkExtension} from './plugins/AutoLinkExtension';
import {CardExtension} from './plugins/CardExtension';
import {CodeHighlightExtension} from './plugins/CodeHighlightExtension';
import {CollapsibleExtension} from './plugins/CollapsibleExtension';
import {DateTimeExtension} from './plugins/DateTimeExtension';
import DocsPlugin from './plugins/DocsPlugin';
import {DragDropPasteExtension} from './plugins/DragDropPasteExtension';
import {EmojisExtension} from './plugins/EmojisExtension';
import {EquationsExtension} from './plugins/EquationsExtension';
import {ExcalidrawExtension} from './plugins/ExcalidrawExtension';
import {FigmaExtension} from './plugins/FigmaExtension';
import {ReactFindReplaceExtension} from './plugins/FindReplaceExtension';
import {ImagesExtension} from './plugins/ImagesExtension';
import {LayoutExtension} from './plugins/LayoutExtension/LayoutExtension';
import {PlaygroundMarkdownShortcutsExtension} from './plugins/MarkdownShortcutsExtension';
import {MaxLengthExtension} from './plugins/MaxLengthPlugin';
import {MentionsExtension} from './plugins/MentionsExtension';
import {PageBreakExtension} from './plugins/PageBreakExtension';
import {PagesReactExtension} from './plugins/PagesReactExtension';
import PasteLogPlugin from './plugins/PasteLogPlugin';
import {PollExtension} from './plugins/PollExtension';
import {PullQuoteExtension} from './plugins/PullQuoteExtension';
import {ReactReviewExtension} from './plugins/ReviewExtension';
import {RubyExtension} from './plugins/RubyExtension';
import {ShortcutsExtension} from './plugins/ShortcutsExtension';
import {SpecialTextExtension} from './plugins/SpecialTextExtension';
import {TabFocusExtension} from './plugins/TabFocusExtension';
import {TerseExportExtension} from './plugins/TerseExportExtension';
import TestRecorderPlugin from './plugins/TestRecorderPlugin';
import {TwitterExtension} from './plugins/TwitterExtension';
import {tufteSampleEditorState} from './plugins/tufteSampleState';
import TypingPerfPlugin from './plugins/TypingPerfPlugin';
import {VersionsPlugin} from './plugins/VersionsPlugin';
import {VisibleNonPrintingExtension} from './plugins/VisibleNonPrintingExtension';
import {YouTubeExtension} from './plugins/YouTubeExtension';
import Settings from './Settings';
import PlaygroundEditorTheme from './themes/PlaygroundEditorTheme';
import ShadowDomWrapper from './ui/ShadowDomWrapper';
import {validateUrl} from './utils/url';

console.warn(
  'If you are profiling the playground app, please ensure you turn off the debug view. You can disable it by pressing on the settings control in the bottom-left of your screen and toggling the debug view setting.',
);

const COLLAB_DOC_ID = 'main';

// These are only enabled for rich-text mode
const PlaygroundRichTextExtension = defineExtension({
  dependencies: [
    configExtension(RichTextExtension, {
      escapeFormatTriggers: {
        code: {arrow: true, click: true, enter: true, onlyAtBoundary: true},
      },
    }),
    // Each node extension below registers its own DOM-import rules — the
    // framework nodes (rich-text, list, table, code) and the playground block
    // hosts (Card, PullQuote, Review) alike — so the rich-text importer set
    // tracks this node set automatically (kept out of the always-on
    // PlaygroundImportExtension so plain-text mode doesn't pull in
    // RichTextExtension, which conflicts with PlainTextExtension).
    configExtension(TableExtension, {
      hasStickyScrollbar: true,
    }),
    ImagesExtension,
    HorizontalRuleExtension,
    PageBreakExtension,
    TwitterExtension,
    YouTubeExtension,
    FigmaExtension,
    TabFocusExtension,
    CollapsibleExtension,
    CodeHighlightExtension,
    configExtension(ListExtension, {
      shouldPreserveNumbering: false,
    }),
    CheckListExtension,
    PlaygroundMarkdownShortcutsExtension,
    PageBreakExtension,
    PagesReactExtension,
    PollExtension,
    EquationsExtension,
    LayoutExtension,
    ExcalidrawExtension,
    CardExtension,
    ReactReviewExtension,
    ReactFindReplaceExtension,
    PullQuoteExtension,
    RubyExtension,
    ShortcutsExtension,
    configExtension(TabIndentationExtension, {maxIndent: 7}),
  ],
  name: '@lexical/playground/RichText',
});

const AppExtension = defineExtension({
  dependencies: [
    configExtension(AutoFocusExtension, {defaultSelection: 'rootStart'}),
    ClearEditorExtension,
    DecoratorTextExtension,
    // Exposes editor.isEditable() as a signal; consumed by
    // registerSettingsSynchronization to drive ClickableLinkExtension.
    WatchEditableExtension,
    HistoryExtension,
    HistoryAnnounceExtension,
    EditorModeAnnounceExtension,
    KeywordsExtension,
    HashtagExtension,
    DateTimeExtension,
    MaxLengthExtension,
    SpecialTextExtension,
    DragDropPasteExtension,
    EmojisExtension,
    MentionsExtension,
    configExtension(LinkExtension, {validateUrl}),
    PlaygroundAutoLinkExtension,
    configExtension(ClickableLinkExtension, {newTab: true}),
    SelectionAlwaysOnDisplayExtension,
    configExtension(SelectBlockExtension, {
      cascadeSelection: true,
    }),
    TerseExportExtension,
    configExtension(ClickAfterLastBlockExtension, {
      $shouldInsertAfter: node =>
        $defaultShouldInsertAfter(node) || $isCodeNode(node),
    }),
    configExtension(AutocompleteExtension, {disabled: true}),
    configExtension(VisibleNonPrintingExtension, {
      disabled: true,
    }),
    // DOMImportExtension pipeline — `PlaygroundImportExtension` bundles
    // the shared `CoreImportExtension` baseline, the playground-specific
    // inline-style overlay and the `ClipboardDOMImportExtension` paste
    // handler. Per-node import rules ride along with each node extension.
    PlaygroundImportExtension,
    // Replaces the legacy `buildHTMLConfig().export` overrides.
    PlaygroundDOMRenderExtension,
    FocusTrapExtension,
    RovingTabIndexExtension,
    FocusManagerExtension,
  ],
  name: '@lexical/playground',
  namespace: 'Playground',
  nodes: PlaygroundNodes,
  theme: PlaygroundEditorTheme,
});

/**
 * The *only* settings that require tearing down and rebuilding the editor,
 * because they change the set of extensions in use (and therefore the initial
 * editor state). Building a dynamic extension from settings at all is an
 * anti-pattern — extensions should be as static as possible — and is tolerated
 * here only because the playground builds fundamentally different editors from
 * the query string.
 *
 * IMPORTANT: Do NOT add a setting here unless changing it genuinely requires a
 * different extension graph. Anything a live editor can react to through an
 * extension's config signals — table behavior toggles, link attributes,
 * character limits, autocomplete, etc. — MUST instead be synced with
 * `useSyncExtensionSignal` in `Editor.tsx`. Adding such a setting here forces a
 * full editor rebuild (discarding content, selection, and history) on every
 * toggle, which is exactly the bug that moving the table settings out of here
 * fixed.
 */
interface DynamicSettings {
  isCollab: boolean;
  emptyEditor: boolean;
  isRichText: boolean;
}

function buildExtensionFromSettings(settings: DynamicSettings) {
  const {isCollab, emptyEditor, isRichText} = settings;
  return defineExtension({
    $initialEditorState: isCollab
      ? null
      : emptyEditor || !isRichText
        ? undefined
        : tufteSampleEditorState,
    dependencies: [
      AppExtension,
      /* @__PURE__ */ configExtension(HistoryExtension, {disabled: isCollab}),
      isRichText ? PlaygroundRichTextExtension : PlainTextExtension,
    ],
    name: '@lexical/playground/dynamic-config',
    // Apply INITIAL_SETTINGS to the extension config signals synchronously as
    // the editor is built (and wire the editable→clickable-link signal),
    // before the React useSynchronizeSettings effect takes over live updates.
    register: registerSettingsSynchronization,
  });
}

function App(): JSX.Element {
  const {
    settings: {
      isCollab,
      useCollabV2,
      emptyEditor,
      isRichText,
      isShadowDOM,
      measureTypingPerf,
    },
  } = useSettings();

  // Only the editor-recreating settings belong in this memo's deps. Table
  // behavior toggles (and other live-reconfigurable settings) are applied
  // reactively in Editor.tsx via useSyncExtensionSignal, so they must NOT
  // appear here or they would rebuild the whole editor on every change.
  const app = useMemo(
    () => buildExtensionFromSettings({emptyEditor, isCollab, isRichText}),
    [emptyEditor, isCollab, isRichText],
  );

  return (
    <LexicalCollaboration>
      <LexicalExtensionComposer extension={app} contentEditable={null}>
        <ToolbarContext>
          <header className="editor-brand">
            <img src="/lexical-tufte-css.svg" alt="" width={36} height={36} />
            <span>lexical-tufte-css</span>
          </header>
          {isRichText && isCollab ? (
            useCollabV2 ? (
              <CollabV2
                id={COLLAB_DOC_ID}
                shouldBootstrap={!skipCollaborationInit}
              />
            ) : (
              <CollaborationPlugin
                id={COLLAB_DOC_ID}
                providerFactory={createWebsocketProvider}
                shouldBootstrap={!skipCollaborationInit}
                selectionHighlight={true}
              />
            )
          ) : null}
          {isShadowDOM ? (
            <ShadowDomWrapper>
              <div className="editor-shell">
                <Editor />
              </div>
            </ShadowDomWrapper>
          ) : (
            <div className="editor-shell">
              <Editor />
            </div>
          )}
          <Settings />
          {isDevPlayground ? <DocsPlugin /> : null}
          {isDevPlayground ? <PasteLogPlugin /> : null}
          {isDevPlayground ? <TestRecorderPlugin /> : null}

          {measureTypingPerf ? <TypingPerfPlugin /> : null}
        </ToolbarContext>
      </LexicalExtensionComposer>
    </LexicalCollaboration>
  );
}

function CollabV2({
  id,
  shouldBootstrap,
}: {
  id: string;
  shouldBootstrap: boolean;
}) {
  // VersionsPlugin needs GC disabled.
  const doc = useMemo(() => new Doc({gc: false}), []);

  const provider = useMemo(() => {
    return createWebsocketProviderWithDoc('main', doc);
  }, [doc]);

  return (
    <>
      <CollaborationPluginV2__EXPERIMENTAL
        id={id}
        doc={doc}
        provider={provider}
        __shouldBootstrapUnsafe={shouldBootstrap}
        selectionHighlight={true}
      />
      <VersionsPlugin id={id} />
    </>
  );
}

export default function PlaygroundApp(): JSX.Element {
  return (
    <SettingsContext>
      <FlashMessageContext>
        <App />
      </FlashMessageContext>
      <Analytics />
      <SpeedInsights />
    </SettingsContext>
  );
}
