# P3.1.e 편집기 재사용 경계 — 1차 구현 설계

작성: 2026-11-01. 기준 브랜치: `test/full-deferred-20261031`.

## 이관 전 기준에서 확인한 사실 (2026-11-01)

- `examples/editor/src/main.tsx`가 `LexicalComposer`, `RichTextPlugin`, `HistoryPlugin`, `TablePlugin`, 노드·명령 등록, 툴바, 선택 UI, 외부 자산 연결, 저장/복구 상태를 함께 소유한다.
- `examples/editor/src/NoteImagePanel.tsx`와 `examples/editor/src/style.css`는 예제 경로에 있다.
- *2026-11-01 초기 구조에서는* `packages/editor-react`가 없었다. 현재는 생성되었으며, `packages/editor-ports`의 호스트 중립 `AssetProvider` 계약을 유지한다.
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

이 계약은 현재 `TufteEditor`의 공개 인터페이스로 구현되었다. (추가로 `ariaLabel`, `className`을 제공한다.) `value`는 Lexical JSON을 포함하는 canonical 문서 envelope다. `onChange`는 편집 변경 알림이며 영속 저장 완료 알림이 아니다. 호스트가 문서 저장·revision 충돌·권한·업로드·인증을 책임진다.

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

**후속 정적 검토 (2026-11-02):** GitHub 브랜치에서 가져온 최신 소스에 대해 15개 구조·연결 검사를 수행했고 15개 모두 통과했다. 검사 항목에는 공통 명령표 export/소비, composer의 정본 노드 등록, surface의 5개 플러그인과 예제 중복 제거, 메뉴·이미지 패널 ARIA ID 격리, 패키지 export/lockfile/개발 명령/CSS 연결, 패키지 smoke-test 항목이 포함된다. 검사 자체는 코드를 컴파일하거나 브라우저에 렌더링하지 않으므로 **빌드·TypeScript·브라우저 통과를 뜻하지 않는다**.

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

현재 실행 환경은 GitHub 저장소에 연결된 수정 API는 사용할 수 있지만, 로컬 환경에서 GitHub 주소를 DNS로 해석할 수 없어 코드를 체크아웃하고 의존성을 설치할 수 없다. 따라서 위 명령은 실행하지 않았다. 위 명령이 통과하기 전에는 R1–R5 완료 체크박스를 유지하지 않는다. 노트 이미지 편집은 호스트 자산 검색이 아닌 *선택한 노트 안의 이미지 속성 패널*이며, `AssetProvider` 전체를 이관했다는 뜻이 아니다.

## 2026-11-03 — 제어형 `TufteEditor` 구현 (R5)

`packages/editor-react/src/TufteEditor.tsx`를 추가하고 공개 export를 연결했다. `TufteEditorProps`는 `value/onChange/onError/readonly`에 더해 `className/ariaLabel`을 받으며, 호스트 중립 `assetAdapter/assetNamespace`는 React context로 제공한다.

- **정본:** `TufteDocument.lexicalState`만 편집 상태의 정본이다. JSON 유효성을 검증한 뒤 기존 `loadDocumentIntoEditor`·`exportEditorToDocument` 경계를 이용한다. 렌더된 DOM이나 Markdown을 중간 저장소로 삼지 않는다.
- **변경 알림:** selection-only 변경은 보고하지 않는다. 편집 결과를 검증한 후 분리된 문서 snapshot으로 `onChange`를 호출한다. 부모가 같은 값을 `value`로 반영할 때 재적용·중복 알림을 막는다. `onChange`는 DB 저장 성공 신호가 아니다.
- **외부 교체:** 새로운 문서 본문은 엄격한 파서로 교체하며 기존 undo/redo를 초기화한다. 제목·자산 목록 같은 메타데이터만 바뀌었다면 본문과 history는 유지한다. 유효하지 않은 값은 적용하지 않고 `onError`로 보고한다.
- **읽기 전용:** `editor.setEditable(false)`, `aria-readonly`, 문맥/선택 툴바 비표시를 연결했다.
- **격리와 정리:** 각 인스턴스는 React `useId` 기반 Lexical namespace와 자체 update listener, 문맥 메뉴 상태를 가진다. listener는 컴포넌트 unmount에서 해제한다.
- **자산:** `useTufteAssetContext()`로 설정을 읽을 수 있도록 했지만 **실제 DAM 검색·업로드·만료 URL 갱신을 이 컴포넌트에서 수행하지는 않는다.** 호스트 통합 단계는 미완료다.

실제 두 인스턴스를 렌더링하는 별도 브라우저 예제를 `examples/editor/controlled.html`에 추가했다. 기존 `examples/editor/index.html`의 저장·발행 프로토타입은 그대로 둔다. 추가한 `tests/controlled-editor-browser.mjs`는 초기 무알림, 첫 인스턴스 편집, 부모 값 반영, 메타데이터만 변경 시 undo 유지, 외부 문서 교체 시 undo 초기화, 읽기 전용, 각각의 unmount/remount, 유효하지 않은 외부 문서의 fail-closed 처리·`onError` 보고와 브라우저 오류를 검사한다.

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm -r typecheck
pnpm test:controlled-editor
pnpm package:check
# 대화형 확인: pnpm dev:editor 실행 후 /controlled.html 방문
```

**검증 제한:** 이 단계에서는 GitHub 코드와 정적 계약을 점검했으며, 실제 pnpm 빌드/Playwright는 실행하지 못했다. 브라우저 테스트와 CI 통과를 주장하지 않는다. 따라서 R5·R7 완료 체크박스는 유지하지 않는다. 구현은 추가됐지만 성공 판정은 보류한다.

## 2026-11-03 — 공통 `TufteEditor`의 호스트 이미지 자산 선택기 (R4 일부)

`packages/editor-react/src/HostAssetPicker.tsx`를 추가하고, `TufteEditor`에 유효한 `assetAdapter`·`assetNamespace`가 전달된 경우에만 표시하도록 연결했다. 실제 자산 서비스 없이 확인하는 별도 예제는 `examples/editor/host-assets.html`이다.

- **검색과 버전:** `AssetProvider.search({text,mediaTypes,limit})`로 이미지 자산을 찾고 `revisions(assetId)`로 고정 버전을 선택한다. 기본값은 최신 버전 추적이며 이 경우 영구 참조의 `revisionId`를 생략한다.
- **기존 이미지 연결:** 현재 문서의 노트 이미지 중 하나를 선택해 `InlineImageNode.setHostAsset()`를 호출한다. 연결된 `hostAsset.namespace/assetId/revisionId?`는 Lexical JSON에 보존하고, 서명된 URL은 `src`로 저장한다.
- **새 이미지 삽입:** 노트 내부에서 선택한 위치를 포착한 경우 **해당 노트 끝에** 새로운 이미지 노드를 삽입한다. 임의의 문단·표·그림으로 범위를 확대하지 않는다.
- **검증 및 실패 차단:** resolve 응답의 자산 ID·선택 revision·이미지 MIME·안전한 URL·만료 시각을 확인한다. 대상 이미지/노트가 교체·이동·재식별됐으면 갱신하지 않는다.
- **비동기 경계:** 검색과 버전 조회는 AbortSignal을 전달하며, resolve는 취소·대상 변경·host adapter/namespace 교체·unmount 시 generation guard를 적용한다. 호스트가 AbortSignal을 무시해도 취소한 응답으로 문서를 변경하지 않는다.
- **접근성:** 고유 `useId` 제목·검색·대체 텍스트·라디오 그룹, 키보드 Escape·Tab 순환 및 닫기 후 포커스 복귀를 제공한다. 실제 보조기술 수락은 별도다.
- **호스트 책임:** 인증·권한·자산 업로드·실제 DAM 연결 및 **서명 URL의 만료 후 자동 재해석/재시도**는 이번 공통 컴포넌트 범위 밖이다. 기존 예제의 갱신 코드와 공통 편집기의 완료 상태를 혼동하지 않는다.

`tests/controlled-host-assets-browser.mjs`를 추가하고 `test:host-assets-controlled`, `test:browser`에 연결했다. 서로 다른 namespace의 두 편집기, provider 지연 로딩, MIME 필터, 명시적 revision, JSON host locator, Undo/Redo, 실패 URL·만료·revision 불일치, 취소 후 늦은 resolve, 노트 끝 삽입을 검사하도록 작성했다.

```bash
pnpm install --frozen-lockfile
pnpm test:host-assets-controlled
# 화면 확인: pnpm dev:editor 실행 후 /host-assets.html
```

**2026-11-03 기존 검증 보고서(`e39b8a1`)는 이번 변경 이전 코드에 대한 결과다.** 이번 변경의 정적 코드·연결 검사 18항목은 통과했으나 새 Playwright 및 전체 타입/빌드 재실행은 아직 수행하지 않았다. 새 검사 통과 전 R4/P3.1.e 전체 완료 처리 금지.

## 2026-11-03 — 공통 이미지 URL 수명 관리 (R4 후속, 자동 검증 대기)

`packages/editor-react/src/HostAssetRefresh.tsx`에 **Lexical 편집기 인스턴스별** 호스트 이미지 URL 갱신 컨트롤러를 추가했다. `TufteEditor`가 유효한 `assetAdapter/assetNamespace`를 받으면 노트 이미지 선택기와 별도로 이 컨트롤러를 설치한다. `readonly`에서도 이미지의 표시 URL은 갱신할 수 있으며, 자산 편집 선택기는 표시하지 않는다. 기존 예제의 전역 `window.lexicalTufteAssetProvider`를 사용하지 않는다.

- `hostAsset.namespace`가 현재 편집기의 namespace와 동일한 이미지 **만** 스캔한다. `AssetProvider.resolve()`에는 namespace를 보내지 않고 자산 ID·선택 revision만 전달한다.
- 자산 locator와 현재 `src`의 조합으로 요청을 추적한다. 새 연결/외부 문서 교체 후 최초 resolve를 수행하고, **만료 60초 전**을 목표로 다음 갱신을 예약한다. 유효기간이 60초 이하인 URL은 남은 시간의 절반 정도 후 재확인해 초당 반복 요청을 피한다.
- `expiresAt`가 없는 정상 응답은 임의 TTL을 추정하지 않는다. 자동 주기 폴링을 하지 않고 **수동 갱신 버튼**과 해당 이미지의 URL·locator가 바뀐 경우의 재확인만 지원한다.
- 정상 URL이 달라지면 현재 Lexical 노드의 locator·URL·대체 텍스트를 변경 직전에 다시 확인한 뒤 `setHostAsset()`로 `src`만 갱신한다. `HISTORY_MERGE_TAG`로 별도의 사용자 Undo 작업을 추가하지 않으며, 실제 JSON이 변한 경우에는 제어형 `onChange`에 반영된다. 동일 URL이면 Lexical 업데이트 자체를 생략한다.
- 잘못된 자산 ID·revision·MIME·URL·이미 만료된 시간은 거절한다. 기존 URL/locator를 유지하며 5초부터 지수 백오프로 자동 재시도한다. 수동 갱신 성공 시 오래된 타이머를 교체한다.
- 각 컴포넌트는 timer·AbortController·세대 번호·캐시·상태를 개별로 갖는다. adapter/namespace 변경 또는 unmount 시 이전 요청·타이머·이벤트 리스너를 정리한다. 응답 사이에 노드가 바뀐 경우 갱신을 적용하지 않는다. 페이지 복귀/가시성 변경 후 예정 시각을 다시 대조한다.
- 보안: URL 검증은 `HostAssetPicker`와 `HostAssetRefresh`가 같은 `hostAssetPolicy.ts` 함수를 사용한다. 인증/서버 통신 구현과 실제 DAM 업로드는 여전히 **호스트 책임**이다.

**추가한 검사(실행 대기):** `tests/host-asset-refresh-policy.mjs`(순수 URL·버전·만료·백오프) 및 `tests/controlled-host-refresh-browser.mjs`(2개 React 편집기에서 60초 마진·URL 회전·수동 재확인·재시도/재시도 취소·외부 문서 교체·unmount 중 지연 응답·namespace 격리). 둘 다 `pnpm test:host-refresh`에 연결하고 전체 `test:browser` 목록에도 브라우저 파일을 추가했다. 패키지 tarball 소비자 검증도 refresh 컴포넌트와 공개 헬퍼·타입을 포함하도록 확장했다.

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm package:check
pnpm test:host-assets-controlled
pnpm test:host-refresh
pnpm test:browser
```

**후속 정적 점검:** 새 컨트롤러·검증 정책·선택기·공개 API·브라우저 fixture·패키지 소비자·문서·스크립트 연결을 GitHub 소스 기준 **33/33 항목 대조**했다. 이는 AST 파싱이나 TypeScript 빌드 및 Playwright 실행 증거가 아니다.

**검증 구분:** 2026-11-03 전수 통과 보고서의 기준 `e39b8a1`은 **이번 코드 이전**이다. 이번 신규 갱신 기능의 실제 TypeScript 컴파일·Playwright·CI는 아직 실행하지 않았다. 실제 DAM, 브라우저 수명/백그라운드 제한, 네트워크 권한, 다중 탭, 장시간 성능/누수 계측도 여전히 별도 수락 조건이다. R4/P3.1.e 전체를 완료로 체크하지 않는다.

## 검증 상태

이 문서는 코드 이관 상태와 실행 범위를 함께 추적한다. 2026-11-03 frozen/build/typecheck·unit629·package6·browser40개를 실제 실행해 통과했다. 최신 근거는 [2026-11-03 보고서](VERIFICATION_DEFERRED_2026-11-03.ko.md)를 따른다. 이전 절의 미실행 문구는 당시 이력이며, controlled API의 관찰된 동작 검증과 전체 자산/운영·수동 접근성 수락을 구분한다. R4–R7/P3.1.e 전체 게이트는 유지한다.
