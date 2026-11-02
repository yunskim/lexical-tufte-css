# P3.1.e 편집기 재사용 경계 — 1차 구현 설계

작성: 2026-11-01. 기준 브랜치: `test/full-deferred-20261031`.

## 현재 코드에서 확인한 사실

- `examples/editor/src/main.tsx`가 `LexicalComposer`, `RichTextPlugin`, `HistoryPlugin`, `TablePlugin`, 노드·명령 등록, 툴바, 선택 UI, 외부 자산 연결, 저장/복구 상태를 함께 소유한다.
- `examples/editor/src/NoteImagePanel.tsx`와 `examples/editor/src/style.css`는 예제 경로에 있다.
- `packages/editor-react`는 아직 없고, `packages/editor-ports`에는 호스트 중립 `AssetProvider` 계약이 있다.
- `examples/editor/package.json`은 React 19.2.0, Lexical 0.52.0을 직접 의존한다. workspace는 `packages/*`, `examples/*`를 포함한다.

## 분리할 공개 계약

```ts
interface TufteEditorProps {
  value: TufteDocument;
  onChange?: (value: TufteDocument) => void;
  onError?: (error: Error) => void;
  assetAdapter?: AssetProvider;
  assetNamespace?: string;
  readonly?: boolean;
}
```

이는 **목표 API 초안**이며 현재 구현된 export가 아니다. `value`는 Lexical JSON을 포함하는 canonical 문서 envelope다. `onChange`는 편집 변경 알림이며 영속 저장 완료 알림이 아니다. 호스트가 문서 저장·revision 충돌·권한·업로드·인증을 책임진다.

## 단계별 이관 순서

- [ ] R1. `packages/editor-react` 패키지·export·React/Lexical peer dependency를 생성하고 독립 소비자 타입 검사 추가.
- [ ] R2. 순수 툴바 action 정의·아이콘·버튼을 먼저 추출하고 기존 접근성 이름과 단축키를 유지한다.
- [ ] R3. SelectionToolbar와 문맥 메뉴를 추출한다. Lexical composer context를 내부에서만 읽고 선택/IME/포커스 경계를 검증한다.
- [ ] R4. NoteImagePanel과 AssetProvider 연결을 옮긴다. namespace·revision·만료 URL·generation guard의 동작을 보존한다.
- [ ] R5. LexicalComposer와 플러그인 조립을 `TufteEditor`로 캡슐화하고 `value/onChange/onError/readonly` 계약을 연결한다.
- [ ] R6. `examples/editor`를 `@lexical-tufte/editor-react` 소비자로 바꾸되 저장/발행/호스트 정책은 예제에 남긴다.
- [ ] R7. 두 편집기 동시 렌더, unmount/remount, 외부 value 교체, readonly, 이벤트 중복 등록, 자산 namespace 격리 및 기존 브라우저 회귀를 실행한다.

## 이동 중 불변식

1. Lexical JSON만 본문 정본이다. React 상태나 HTML을 별도 정본으로 만들지 않는다.
2. 문서 schema·순수 renderer·`AssetProvider`는 React에 의존하지 않는다.
3. 패키지는 예제 코드나 브라우저 `window.lexicalTufteAssetProvider` 전역에 의존하지 않는다. 기존 전역 주입은 예제 호환 계층으로만 유지한다.
4. 공개 HTML에 편집기 UI wrapper가 유출되지 않아야 한다.
5. 여러 편집기 사이에서 선택, 타이머, 비동기 resolve, note ID, 이벤트 리스너가 공유되지 않아야 한다.
6. 단일 파일을 기계적으로 이동한 것만으로 P3.1.e를 완료 처리하지 않는다. 소비자 테스트까지 통과해야 한다.

## 2026-11-02 코드 이관 현황

| 단계 | 실제 변경 | 남은 게이트 |
| --- | --- | --- |
| R1 | `packages/editor-react` 생성, React/Lexical peer·개발 의존성 및 pnpm lockfile 등록, `pnpm dev:editor`에서 종속 패키지 빌드 | 설치·독립 소비자 빌드/타입 검사 실실행 |
| R2 | `ToolbarIcon`, `INLINE_ACTIONS`, `EDITOR_SHORTCUTS`를 공통 패키지로 추출; 예제와 선택 서식 툴바가 같은 등록표를 공유 | `IconButton` 재사용 컴포넌트화 및 브라우저 회귀 |
| R3 | `SelectionToolbar`, `BlockContextMenu`, 명령 가능성 판정 분리. 문맥 메뉴는 `useId`로 인스턴스별 ARIA 연결, 선택 툴바 포커스 검사도 해당 인스턴스에 한정 | 다중 인스턴스·IME·키보드·브라우저 회귀 실실행 |
| R4 | `NoteImagePanel`을 패키지로 이동, 예제 경로는 re-export만 유지. 패널 입력·레이블·제목은 `useId`로 인스턴스별 격리. 선택·메뉴·이미지 패널 CSS를 `@lexical-tufte/editor-react/styles.css`로 분리 | AssetProvider 연결·업로드 정책 분리 및 실환경 검증 |
| R5 일부 | `TufteComposer`가 정본 노드 스키마를 소유하고 `TufteEditingSurface`가 RichText·History·Table·선택·문맥 메뉴 플러그인을 조립. 기존 `examples/editor`에서 두 컴포넌트를 소비 | 문서 `value/onChange/onError/readonly` 제어형 facade, 여러 editor 인스턴스, 플러그인 lifecycle·host API 수락 |
| 패키지 소비자 게이트 | `scripts/pack-and-check.mjs`와 `scripts/check-package-tarballs.mjs`에 6번째 tarball, React UI·composer·surface JS/TS export, 공통 명령표와 CSS 검사 추가 | `pnpm package:check` 실행 및 결과 기록 |

**정적 점검 결과:** 변경된 package.json·lockfile 의존성 항목 일치, 초기 이미지 패널 추출 시 소스 동일성, 추출 CSS 원문 동일성, CSS export와 예제 import 연결, 인스턴스별 문맥 메뉴 ID 사용을 확인했다. 이후 `INLINE_ACTIONS` 미정의 참조를 바로잡고 `TufteComposer`·`TufteEditingSurface`를 추가했으며, 이미지 패널 라벨/ARIA 연관 검사를 기존 브라우저 테스트에 보강했다. 이 점검은 TypeScript 컴파일·실제 브라우저 실행을 대신하지 않는다.

**로컬 실행/수락 명령:**

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm -r typecheck
pnpm package:check
pnpm test:contextual-ui
pnpm test:note-assets
# 별도 실행: node tests/note-image-chooser-browser.mjs
```

현재 실행 환경에서는 저장소의 로컬 체크아웃과 의존성 설치에 접근할 수 없어 이 명령을 실행하지 않았다. 위 명령이 통과하기 전에는 R1–R5 완료 체크박스를 유지하지 않는다. 노트 이미지 편집은 호스트 자산 검색이 아닌 *선택한 노트 안의 이미지 속성 패널*이며, `AssetProvider` 전체를 이관했다는 뜻이 아니다.

## 검증 상태

이 문서는 코드 이관 상태를 함께 추적한다. 패키지 생성 및 UI 일부 이동은 반영됐지만, 이관 이후 빌드·타입·브라우저 검증은 아직 실행되지 않았다. 최신 자동 검증 결과는 [2026-11-01 보고서](VERIFICATION_DEFERRED_2026-11-01.ko.md)를 따른다.
