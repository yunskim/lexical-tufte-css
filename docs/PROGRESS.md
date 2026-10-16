# 진행 기록

## P0 — 완료 (2026-10-16)

| ID | 결과 | 증거 |
| --- | --- | --- |
| P0.5 | 완료 | Lexical/@lexical 0.52.0 exact versions, peer-compatible versions, pnpm-lock.yaml, docs/DEPENDENCIES.md |
| P0.6 | 완료 | pnpm workspace, strict TS, policy lint, build/typecheck scripts, GPL package metadata, THIRD_PARTY_NOTICES.md와 licenses/ |
| P0.7 | 완료 | 고정 upstream CSS, SHA-256 inventory, 72개 규칙·2개 media context, F항목 연결, 재생성/차이 검사 script |

검증 환경: Node 24.19.0, pnpm 11.25.0.

- `pnpm install --frozen-lockfile`: 통과.
- `pnpm check`: 정책 lint / inventory / typecheck / build 모두 통과.
- headless Lexical 수동 smoke: 한글 문단 생성→JSON 직렬화→parse→setEditorState 통과.
- CSS inventory 72개 규칙에 미분류 selector 없음. ImageQuilts·여백 그림·복수 article은 조합 기능으로 별도 추적.

아직 폰트 binary와 데모 이미지는 포함하지 않는다. 폰트 자산 release·checksum 확정과 실제 CSS 연결은 P4에서 수행한다. 실제 편집/렌더/모바일 fixture 검증은 후속 단계에서 수행하므로 F01–F22는 모두 미완료다. P0의 lint는 workspace 정책 검사이며 제품 소스 스타일 검사는 필요에 따라 확장한다.

다음: P1.1 문단 중간 note 편집 prototype, 이후 P1.2 선택/복사/이동/undo/IME 검증.

## P1.1 — 완료 (2026-10-16)

- `packages/lexical/src/NoteNode.ts`: 한 편집 상태에 저장되는 inline note prototype, 고유 ID/kind, JSON 복원, label/input/payload HTML 출력.
- `InlineImageNode.ts`: note 내부 phrasing image, 대체 텍스트, 명시적 URL 정책.
- `examples/editor`: 본문 중간 note 삽입, Alt+↓ 진입/Escape 복귀, 강조/코드/링크/그림 삽입, localStorage 저장·복원, JSON/HTML 확인.
- 원본 fixture.svg는 이 프로젝트에서 직접 작성한 단순 SVG 막대 그림이다.

검증:

- `pnpm check`: workspace 정책 검사·CSS inventory·타입 검사·빌드·headless 테스트 2개 통과.
- `node tests/note-browser.mjs`: Playwright 1.51.1 / Chromium 134 headless shell에서 통과. 브라우저 테스트가 자체 Vite 서버를 시작하고 종료한다.
- 브라우저 시나리오: 본문→노트 키보드 이동, 경계 입력, 링크·이미지·bold/italic/code, 중첩 삽입 거부, 본문 복귀, 새 노트 삽입, JSON 저장→페이지 재로드→복원 동일성, HTML label/input/span 인접 구조 및 런타임 오류 없음.
- 발견/수정: Lexical 0.52의 inline 경계 입력이 본문으로 빠지는 문제에 prototype beforeinput guard 적용. guard는 일반 insertText만 처리하며 한국어 IME는 아직 검증하지 않았다.

제한:

- P1.1은 단일 note 편집 모델의 prototype이다. nested editor와의 비교 결정은 P1.3에서 기록한다.
- 링크와 이미지 삽입 버튼은 고정 예제 값을 사용한다. URL/대체 텍스트 등 일반 속성 패널은 P3 대상이다.
- ID 재발급·복사/이동·삭제·split/merge·undo/redo·IME는 P1.2에서 별도 검증한다.
- 여러 article의 export namespace, HTML import, 전체 발행 renderer 및 모바일/접근성 검증은 후속 단계다.
- 한글 서체는 본명조/본고딕을 CSS에 지정했지만 웹폰트 binary 연결·검증은 P4 대상이다.
- F01–F22의 제품 기능 완료 체크는 유지하지 않는다. P1 gate 전체는 아직 미통과다.

다음 작업: P1.2.

오류·대책 점검: E001–E008 / M001–M007를 최초 전수 점검했다. 적용된 대책과 잔여 제한은 ERROR_PREVENTION.md에 기록했다. 다음 정기 점검은 P1.2 시작·완료 시 수행한다.

## P1.2 — prototype 완료 (2026-10-16)

작업 시작 시 E001–E008/M001–M007를 점검했다. 실패 3건(E009–E011)을 추가 기록하고 M008–M010을 실제 코드/테스트에 반영한 뒤 완료 전 점검했다.

변경:

- 노트 wrapper를 보존하는 내부 clipboard. 복사본은 새 ID, 같은 문서 내 잘라내기 이동은 기존 ID 유지. 노트 안에 노트 paste는 명시적으로 거부.
- plain 여러 줄 paste는 note 안 phrasing text/linebreak로 삽입. 블록 paste와 nested note를 조용히 평탄화하지 않는다.
- 프로그램 방식의 노트 경계 삽입 helper를 toolbar/paste에서 공유한다.
- 링크/이미지를 유지하는 note 분할·병합, 같은 속성의 분할 링크 병합 복원, sibling 단위 전체 note 이동. 구조 변경은 history push로 묶는다.
- note 내부 Enter는 linebreak. note 시작 Backspace/끝 Delete는 내용 유실 없이 본문으로 이동한다.
- 한글 composition 시작 위치를 보완하고 Lexical 기본 조합 처리를 사용한다. commit/cancel/undo/redo 후 임시 zero-width 표식이 JSON에 남지 않는지 검사한다.

검증: `pnpm check` 통과(정책/inventory/typecheck/build/단위 2개), `pnpm test:browser` 통과(P1.1 회귀 및 P1.2 15개 시나리오). 기준 환경은 Playwright 1.51.1 / Chromium 134 headless shell이다.

P1.2 브라우저 범위: rich copy/paste의 ID·링크·이미지, note 전체 delete/undo/redo, body split/merge, note 내부 Enter, 한글 시작점 commit/cancel, rich note split/merge/undo/redo, 전체 note move/undo/redo, cut/paste ID 유지, 한글 끝점 commit/표식 제거, multiline plain paste, nested paste 거부, 시작 Backspace, composition undo/redo, 끝 Delete.

제한: 한국어 입력 검증은 Chromium CDP composition 시뮬레이션이며 Windows/macOS/Linux/모바일의 실제 입력기·키 배열 검증을 대신하지 않는다. OS 실제 IME와 Firefox/WebKit은 P6 후속이다. 외부 Tufte HTML의 import 및 cross-namespace clipboard는 P2.4 대상이며 이번 완료 범위는 동일 namespace 내부 rich clipboard + plain text다. 드래그앤드롭 UX·임의 범위 편집의 전수 조합은 제품 단계에서 확장한다. P1 gate와 F01–F22는 아직 완료되지 않았다.

다음: P1.3 시작 전 E007/E009/E010/E011 및 M006/M008–M010을 다시 읽고 inline 모델의 경계 복잡성을 nested editor와 비교한다.

## P1.3 — 완료 (2026-10-16)

결정: [ADR-0001](adr/0001-note-editor-model.ko.md)에 따라 v1의 phrasing 주석은 단일 EditorState의 inline container를 유지한다. nested editor의 별도 state/selection과 명시적 shared history 지원을 고정 버전 소스·실험으로 확인했다. nested 전체 UI를 구현하지 않았다는 증거 범위를 명시했다.

- nested-comparison.test.mjs: child 수정이 부모 JSON/update/selection을 자동으로 바꾸지 않음, 명시적 shared history에서 editor 간 undo 가능함을 검증.
- 노트/여백 주석 모두 편집 DOM과 발행 DOM이 다름을 검사. export 전후 JSON 동일, label/input/span이 직계 형제로 인접하고 for/id 일치·unchecked 기본 상태를 검사.
- InlineImageNode.exportDOM이 편집용 contenteditable을 내보내던 E012를 기록하고 DOM 생성 경로를 분리. M011 회귀를 추가.
- 고정 upstream CSS를 실제 브라우저에 적용해 375px에서 sidenote/marginnote의 label 클릭→checkbox→payload 표시가 동작함을 검증. F20 전체 완료를 의미하지 않는다.

검증: `pnpm check` 통과(정책/inventory/typecheck/build/단위 4개), `pnpm test:browser` 통과(P1.1, P1.2 15개, P1.3 DOM). CI는 생략했다.

오류/대책 정기 점검: 작업 시작에 E001–E011/M001–M010 확인, 완료 전에 E001–E012/M001–M011을 점검하고 근거·잔여 위험을 갱신했다. 환경 제한과 OS 실제 IME·다른 브라우저·복수 article namespace는 후속 검증 대상으로 유지한다.

다음: P1.4 section/figure/caption/fullwidth/table 조합과 CSS direct-child 구조 검증. P1 gate와 F01–F22는 아직 미완료다.

## P1.4 — 완료 (2026-10-16)

작업 시작에 E001–E012/M001–M011을 점검했다. 상세 구조·측정 근거는 [LAYOUT_PROTOTYPE.ko.md](LAYOUT_PROTOTYPE.ko.md)에 기록한다.

- Section/Figure/Caption/TableLayout prototype 노드와 JSON 직렬화·복원 추가.
- 표의 row/cell/header/colgroup/tbody는 공식 @lexical/table 노드를 사용. body/fullwidth는 편집 래퍼를 제거해 section > table로, scroll은 div.table-wrapper > table로 발행.
- 예제에 ‘레이아웃 예제 불러오기’와 TablePlugin 연결. 실제 캡션·셀 키보드 편집 후 발행·저장·재읽기 검증.
- 별도로 작성한 기준 HTML과 생성 HTML에 고정 Tufte CSS를 적용하고 1440/761/760/759/375px 비교. 일반 본문·표의 55%→100%, 일반 그림 55%→90%, fullwidth 그림·표 90%, 캡션 float/max-width/margin 전환 확인.
- 줄바꿈 없는 긴 표는 wrapper에서만 수평 overflow. 문서 전체 가로 넘침 없음.

검증: `pnpm check` 통과(정책/inventory/typecheck/build/단위 6개), `pnpm test:browser`의 P1.1/P1.2/P1.3/P1.4 전체 통과. `pnpm install --frozen-lockfile`도 최종 lockfile 기준 통과. CI는 생략.

오류/대책 완료 점검: E013 DOM 타입, E014 실패한 빌드 뒤 후속 검사 실행, E015 잘못된 overflow fixture를 기록하고 M012/M013을 코드·테스트·실행 규약에 반영했다. M003의 실행 순서 규약을 실제 ad-hoc shell에도 적용하도록 강화했다. Vite 편집기 chunk 경고 W001은 511.80kB(gzip 160.49kB) 기준으로 기록하고 P3/P6 후속 M014로 유지한다.

제한: 완성된 서버 렌더러가 아닌 브라우저 DOM export prototype과 독립 HTML의 비교다. 노드 삽입/속성 전환 일반 UI, 모든 구조 validation·HTML import·최종 폰트·다른 브라우저·접근성은 후속 작업이다. P1 gate와 F01–F22는 아직 미완료다.

다음: P1.5 시작 전 에러·대책 기록 점검 후 서버 렌더링/스키마 결정.

## P1.5 — 완료, P1 gate 통과 (2026-10-16)

- ADR-0002와 DOCUMENT_SCHEMA_V1.ko.md: canonical JSON envelope, 명시적 JSON import, 발행 API/진단, phrasing-only note 및 namespace 계약 확정.
- packages/render: DOM·Lexical·React runtime dependency 없는 validator/JSON parser/HTML renderer prototype. unknown node/version/property, 잘못된 자식/중첩/중복 note ID, URL/CSS, 예산 초과를 진단하고 전체 발행 차단. metadata/전체 노드 schema는 P2.1에 남긴다.
- fixtures/tufte/server-document.json과 생성 script: 두 note 종류, 서식/링크/그림, caption, body/fullwidth/scroll 조합을 같은 저장 문서로 검증.
- headless JSON roundtrip은 성공. DOM 없는 HTML export는 공식 오류로 거부. withDOM의 전역 복원은 확인했지만 고정 Happy DOM 자기 자신 replaceWith가 table을 제거하므로 현재 DOM adapter 발행은 미지원(E018). 이를 성공으로 보고하지 않고 독립 재현 테스트로 유지.
- tests/server-browser.mjs: 실제 Lexical 브라우저 export와 서버 출력의 구조·텍스트·노트·caption/table·CSS 폭 비율을 1440/761/760/759/375px에서 비교. JS 비활성 모바일 페이지에서 label 토글과 여러 article ID 격리 통과.

검증: frozen install, pnpm check(정책/CSS72규칙/타입/빌드/단위15개), pnpm test:browser(기존 P1.1–P1.4 회귀 + 서버 비교) 모두 통과. CI 없음. HTML byte 동일성·성능·전체 HTML conformance를 검증했다고 주장하지 않는다.

오류 점검: E016–E021과 M015–M020를 새 경로 테스트/실행 절차에 반영. E018은 순수 renderer로 완화했고 adapter 재검토는 P2.4. 이전 E004/E005의 브라우저 환경 제한, OS IME/P6, W001 편집기 511.76kB(gzip160.48kB)/P3·P6는 유지. 단계 전환 전 전체 기록을 점검했으며 fixture 함수 결과·JSON 값/메모리 상태의 비교 경계를 명시했다.

다음 작업: P2.1. 문서/노드 공유 schema·블로그 metadata·자산 참조 계약과 validator를 P1 prototype에서 확장한다. F01–F22의 전체 제품 완료 체크는 유지하지 않는다.

## P2.1 — 완료 (2026-10-16)

- packages/document: runtime dependency 없는 공유 계약. TufteDocument/AssetRef/PostMetadata/PostRecord 및 33개 노드 타입·동결 registry, validateDocument/parseDocument/validateMetadata/validatePostRecord 구현.
- 데이터 구조: h2/h3, Tufte inline class, 목록/정의목록, 인용/epigraph/cite/footer, 주석/그림/ImageQuilt/fullwidth/표/코드/embed 계약. 중첩·버전·알 수 없는 필드·허용 자식·중복 ID·직사각 표·노드/깊이/text/자산 한도 검사. 이 항목은 노드별 편집·HTML 변환 완료를 뜻하지 않는다.
- 자산: 선택적 assetId의 존재와 src/크기 일치, 양의 크기/byteLength, SHA-256 메타데이터 검사. 실제 파일 신뢰성·고아 자산 삭제 보호는 P5 후속.
- 메타데이터: NFC 한글 slug, tags/authors, 상태/revision, 달력 유효성·timezone·발행일 순서 검사. 저장 충돌·상태 전이·발행 snapshot은 P5 후속.
- render: 중복 정본 validator를 제거하고 공유 패키지에 의존. 구조 검증 이후 별도 profile.ts에서 구현 없는 노드/속성을 UNSUPPORTED_RENDER_*로 차단한다. 신규 계약 통과가 부분 HTML 발행으로 이어지지 않는 회귀 추가.
- packages/lexical/test/document-contract.test.mjs: 실제 공식 Heading/Quote/List/ListItem이 생성한 JSON과 validator 일치. 공식 ListItem의 paragraph 평탄화 방식에 맞춰 direct phrasing 계약으로 확정했다.

검증:

- pnpm check 통과: 정책 검사, CSS72규칙, 타입·빌드, 단위26개(document9+lexical9+render8).
- pnpm test:browser 전체 통과: P1.1–P1.4 편집 회귀, 서버/브라우저 출력의 5개 폭 비교, JS 비활성 모바일 토글/article ID 분리.
- document/dist를 임시 보존 위치로 옮긴 뒤 pnpm typecheck 통과. 공유 declaration을 선행 빌드하도록 루트 명령을 보강해 fresh 설치에서도 소비자 타입을 해석한다(M003).
- pnpm install --frozen-lockfile 및 git diff --check 통과. CI 없음.

오류·대책 점검: E022 자동 승인 거부 후 기존 작업을 보존하고 새 worktree에서 재개(M021). E023 재귀 alias 타입 실패를 interface 경계로 해결하고 소비자 검사까지 확인(M022). E001–E023/M001–M022 전수 점검, E018 고정 adapter 제한/P2.4, 환경·OS IME/P6, W001 번들 경고/P3·P6는 유지한다. 체크리스트 작업 시작·완료 및 단계 전환 점검 주기는 계속 적용한다.

다음: P2.2. F01–F09의 실제 노드·속성·command와 JSON 보존 및 renderer 지원을 구현한다. F01–F22의 전체 기능 완료 체크는 아직 하지 않는다.

## 2026-10-16 — P2.2 R01/R02 후속 점검

- 변경: InlineImageNode와 NoteNode가 document 패키지의 URL/식별자 검사를 재사용하고, 이미지의 assetId/width/height를 JSON에서 보존하도록 수정했다.
- 변경: lexical 패키지에 document workspace 의존성을 선언하고 lockfile을 갱신했다.
- 테스트 추가: note.test.mjs에 노트·이미지·링크의 JSON 왕복 사례와 잘못된 이미지/노트 입력 거부 사례를 추가했다.
- 검증: 미실행. 이 세션에서는 GitHub 직접 clone이 DNS 해석에 실패했고 pnpm 명령이 설치되어 있지 않다. pnpm check 및 브라우저 테스트 통과를 주장하지 않는다.
- R01/R02는 완료 처리하지 않는다. 다음: 검증 환경에서 install --frozen-lockfile, check, test:browser를 실행하고 결과를 기록한다.

## 2026-10-16 — R04 브라우저 회귀 보강

- tests/note-editing-browser.mjs: 노트 시작 경계에서 단일 키 입력이 정확히 한 번만 삽입되고 노트 JSON 내부에 남는 회귀 시나리오 추가.
- 기존 브라우저 시나리오: 복사/붙여넣기 시 noteId 충돌, cut/paste ID 유지, 한글 조합 시작/끝 및 취소 검사가 이미 존재함을 재확인.
- E024/M023의 실제 브라우저 검증은 미실행. 로컬 pnpm check/test:browser 및 OS별 IME 실행 증거가 없어 R04 체크리스트는 열어 둔다.
- 다음: 클립보드 내부 참조 형식 확정, ID 재발급 시 참조 갱신 정책 구현, 실제 브라우저 테스트 실행.


## 2026-10-16 — R04 노트 내부 참조 정책
- document v1 스키마 확인: tufte-note의 참조 가능한 필드는 noteId이며, noteId를 가리키는 별도 node reference 필드는 아직 없다. 일반 link.url은 noteId 참조가 아니라 독립 URL로 취급한다.
- clipboardNotes.ts는 원본 noteId→새 ID 배열을 반환하며, 동일 ID가 여러 번 붙여넣어지면 1:N 매핑이 된다. 이를 임의의 단일 참조 대상으로 해석하지 않는다.
- note.test.mjs에 잘라낸 중복 noteId 중 한 개만 기존 ID를 유지하는 검사와 외부 링크 URL이 노트 ID 재발급에 의해 변경되지 않는 검사를 추가했다.
- 향후 명시적 note reference 필드 도입 시에는 1:N 매핑의 대상이 모호한 경우 실패 진단 또는 사용자 선택을 요구하고, 참조와 정의를 같은 트랜잭션에서 변경한다.
- 테스트 실행 증거 없음. R04 완료 체크 보류.

## 2026-10-16 — R06 note HTML ID 충돌 방지 (구현, 실행 검증 대기)

- packages/render/src/index.ts: 기존 `prefix-note-noteId` 연결은 prefix/noteId 경계가 모호하므로 `tufte-{prefix.length}-{prefix}-{noteId}`로 변경. label.for와 input.id는 같은 값을 사용.
- packages/render/test/render.test.mjs: 기존 ID 기대값 갱신, `prefix=a-b,noteId=c`와 `prefix=a,noteId=b-c` 충돌 회귀 fixture 추가.
- 브라우저·단위 테스트 실행 불가(E025). R06은 완료 체크하지 않는다. HTML ID 형식은 프로토타입 공개 계약이 아니며 변경 영향은 P4 발행 호환성 검증 시 재확인.

## 2026-10-16 — R07 CSP-friendly 발행 스타일 (코드 반영, 검증 대기)

- packages/render/src/index.ts: 텍스트 pre-wrap, 문단 정렬, article counter-reset 인라인 style 속성을 scoped CSS class로 전환.
- packages/render/styles.css: .tufte-article 범위의 스타일 규칙 추가. packages/render/package.json의 ./styles.css export와 배포 files 목록에 등록.
- packages/render/test/render.test.mjs: 발행 HTML style 속성 부재, CSS 규칙 존재를 검사하는 테스트 추가.
- 별도 CSS를 실제 호스트에서 로드해야 동일한 시각 효과가 유지된다. CSP style-src 'self' 정책에서의 브라우저 실행과 Tufte 원본 CSS 우선순위 검증은 미실행(E025). R07 체크 보류.

## 2026-10-16 — R08 typed render tree 착수

- packages/render/src/tree.ts: 제한된 HTML tag/attribute를 표현하는 RenderElement, element(), serializeHTML() 도입. 텍스트·속성 escape를 직렬화 단계로 통합.
- packages/render/src/index.ts: 기존 escapeHTML을 serializer에서 재사용하고 article envelope를 typed tree로 구성. 하위 노드 렌더러는 아직 문자열 adapter이므로 R08 미완료.
- packages/render/test/tree.test.mjs: text/attribute escaping, 허용되지 않은 태그·속성, void element 자식 거부 검증 코드 추가.
- 테스트 실행 증거 없음(E025). 다음 단계에서 모든 render switch case를 tree로 전환하고 문자열 replace 기반 table fullwidth를 제거한다.

## 2026-10-16 — R08 typed render tree 전체 노드 전환

- packages/render/src/index.ts: 지원 중인 root/section/paragraph/text/linebreak/link/image/note/figure/caption/table-layout/table/row/cell 모두 RenderChild[] 생성 방식으로 이전. article envelope와 본문을 하나의 typed tree로 구성해 serializeHTML 한 번으로 출력.
- table-layout fullwidth는 문자열 replace가 아닌 table element의 class 속성 갱신으로 처리. HTML 문자열 어댑터 제거.
- 기존 render.test.mjs와 tree.test.mjs의 실제 실행은 E025 환경 차단으로 미검증. 구조적 전환은 반영되었지만 R08 완료 체크는 테스트 통과 후 진행.

## 2026-10-16 — R09 표 header 구조 개선

- packages/render/src/index.ts: table의 선행 연속 열 머리글 행(모든 cell.headerState=1)을 thead로 묶고 나머지 행을 tbody에 배치. th scope=col/row는 유지.
- packages/render/src/tree.ts: thead를 typed tree 허용 태그에 추가.
- packages/render/test/render.test.mjs: thead/tbody 경계 및 혼합 머리글 행이 tbody에 남는 회귀 검사 추가. fixture의 첫 행은 headerState=[1,1], 두 번째 행은 [0,0] 확인.
- 실제 실행 검증 미완료(E025), R09 체크 보류. headerState 조합의 세부 정책 및 접근성 검증은 추후 보강.

## 2026-10-16 — R10 text format 의미론 및 회귀 준비

- docs/TEXT_FORMAT_R10.ko.md: underline(8), strikethrough(4), mark(128)의 허용 위치·HTML 의미·조합·링크와의 독립성·스타일/CSP 경계 정의. Tufte 고유 기능이 아닌 HTML 편집 확장으로 구분.
- packages/render/test/render.test.mjs: 각 비트 및 복합 비트의 HTML 태그 중첩 회귀 검사 추가.
- 실제 pnpm 테스트와 Lexical 편집기 선택/IME/undo 검증 미실행(E025). R10 체크 보류.

## 2026-10-16 — R11/R12 진행 기록

- R11: docs/PUBLICATION_LIFECYCLE_R11.ko.md에서 초안·불변 공개 스냅샷 분리, 최초 발행 시각, publishedRevision, 원자적 공개 포인터 전환을 정의했다. 실제 저장 구현과 테스트는 미완료.
- R12: packages/document/src/storageKeys.ts에 ID 기반 상대 저장 경로, Windows 예약 장치명 차단, slug 대소문자 충돌 키를 구현했다. test/storage-keys.test.mjs와 docs/STORAGE_PATH_R12.ko.md 추가.
- R12의 실제 adapter-fs 경로 해석·심볼릭 링크·원자 저장·다중 OS 검증 및 테스트 실행은 미완료(E025). 완료 체크 보류.

## 2026-10-16 — R13 라이선스 및 한글 폰트 배포 정책

- docs/LICENSE_AND_FONTS_R13.ko.md: GPL-3.0-only 현행 상태, 외부 재사용 시나리오, 권리자 결정 필요 항목, 본명조/본고딕 WOFF2 subset 및 unicode-range 검증 체크리스트 작성.
- 라이선스 변경을 임의로 결정하지 않음. 폰트 실측과 브라우저 검증 미실행. R13 완료 체크 보류.

## 2026-10-16 — R14 CI 없는 로컬 검증 경로

- docs/LOCAL_VERIFICATION_R14.ko.md에 Node/pnpm 버전, frozen install → check → test:browser 순서, 실패 기록 양식, 선택적 pre-push 정책을 작성.
- 실제 환경 확인 기록: Node v22.16.0, pnpm 없음, github.com DNS 실패(E025). install/check/browser 모두 BLOCKED이며 PASS로 간주하지 않음.
- CI는 추가하지 않았다. 실행 증거 확보 전 R14 완료 체크 보류.

## 2026-10-16 — P2.2 R01–R14 재점검 및 R06 회귀 보강

- R01–R14 체크는 실제 검증 증거가 없어 그대로 미완료 유지. P2.2 선행 안정화 이후 본 구현 단계로 진행한다.
- R06: 이전 prefix-note-noteId 조합에서 실제 충돌하는 prefix/noteId 쌍으로 회귀 테스트 교체. legacy 충돌 동등성 assertion 추가. 변경: packages/render/test/render.test.mjs.
- 오류·대책: E026/M025 추가. Corepack pnpm 실행은 registry.npmjs.org DNS EAI_AGAIN(E027)으로 차단. E025/M024 계속 적용.
- 실행: node --version PASS(v22.16.0), corepack pnpm --version FAIL(DNS). pnpm check 및 pnpm test:browser 미실행. CI 없음.

## 2026-10-16 — P2.2 F01–F09 semantic render 확장

- packages/render/src/tree.ts: h2/h3, hr, ol/ul/li, dl/dt/dd, blockquote, footer, cite 등 허용.
- packages/render/src/index.ts: heading/list/definition/quote/epigraph/attribution/cite/section-footer/tufte-span의 typed tree 발행 구현.
- packages/render/src/profile.ts: 새 지원 노드를 render profile에 추가. packages/render/test/render.test.mjs에 대표 조합 회귀 작성.
- 한계: list start/value 등 일부 Lexical 고급 목록 의미와 Tufte 시각 동등성, 편집기 import/export 왕복, CSS 및 브라우저 검증 미완료. 테스트 실행은 E025/E027 환경 차단. P2.2/F01–F09 완료 체크 보류.

## 2026-10-16 — P2.2 목록 numbering 보존

- packages/render/src/tree.ts: start/value HTML 속성 허용.
- packages/render/src/index.ts: ol.start 및 ordered li.value를 발행 HTML에 보존. ul은 번호 속성을 출력하지 않음.
- packages/render/test/render.test.mjs: 시작 번호·불연속 항목 번호·ul 속성 배제 회귀 추가.
- 편집기 import/export 왕복과 브라우저/단위 테스트는 실행 미완료(E025/E027). P2.2 체크 보류.

## 2026-10-16 — P2.2 F05 Lexical TufteSpanNode 시작

- packages/lexical/src/TufteSpanNode.ts: sans/newthought/numeral/danger 인라인 ElementNode 추가. kind 검증, JSON import/export, clone, DOM 업데이트 구현.
- packages/lexical/src/index.ts: 생성자와 타입 공개. 기존 문서 v1 tufte-span 타입에 대응.
- 아직 editor nodes registry 통합, document/editor 왕복, 단위 및 브라우저 실행 검증이 없다(E025/E027). P2.2 완료 체크 보류.

## 2026-10-16 — 외부 코드 검토 피드백 반영

- 검토 대상 커밋 02b2e39의 외부 실행 결과: pnpm install/lint/inventory PASS, 타입 검사 FAIL(render/src/index.ts:67 readonly children), document 12/12, lexical 16/16, render 14/16. 외부 검토자의 보고이며 이 작업 환경에서 독립 재실행한 결과가 아님.
- packages/render/src/tree.ts: element(children)를 readonly RenderChild[]로 수정해 table.children 타입 충돌 해결.
- packages/render/test/render.test.mjs: 지원 노드로 바뀐 heading 대신 미지원 tufte-code를 사용; mixed-header 검사 범위를 첫 table HTML로 제한.
- 외부 검토에서 브라우저 Chromium 다운로드 차단으로 test:browser 미실행. E025/E027의 환경 차단은 기존 실행 환경 기록으로 보존하되, 모든 환경에서 설치 불가능하다는 일반화는 하지 않음.
- R02/R03/R04/R05는 각각 document-editor-document 왕복, Lexical 버전 호환 정규화, 명령 등록 이동, 무효 편집 상태 복구가 남아 있음. R01 및 R06–R09도 이 환경의 check/browser 재실행 증거가 없어 완료 체크 보류.
- 다음 검증: pnpm install --frozen-lockfile; pnpm check; pnpm test:browser. 실패 시 오류/대책 기록.

## 2026-10-16 — F05 Lexical JSON 왕복 회귀 보강

- packages/lexical/test/note.test.mjs의 headless editor 노드 등록에 TufteSpanNode 추가.
- sans/newthought/numeral/danger 네 종류에 대해 Lexical JSON 저장→parse→복원→동등성 검사 추가. 잘못된 kind 생성·import 거부 테스트 추가.
- 실행 환경 재확인: node --version v22.16.0 PASS; pnpm --version command not found; corepack pnpm --version registry.npmjs.org EAI_AGAIN. pnpm check/test:browser 실행 불가.
- 이 테스트는 Lexical JSON 자체 왕복만 검증하도록 작성되었고, R02가 요구하는 document→editor→document 왕복 검증은 여전히 미완료. R05 무효 상태 복구도 미구현.

## 2026-10-16 — R02/R03 JSON 변환 경계 시작

- packages/document/src/editorBoundary.ts 및 index.ts: documentToEditorJSON / editorJSONToDocument 도입. 스키마 검증 전후에 상태를 복사하고, 미지원 Lexical 필드/노드는 진단으로 차단하며 묵시적으로 삭제하지 않음.
- packages/document/test/editor-boundary.test.mjs: 유효 문서의 JSON 왕복, unknown field, unknown node 검사 작성.
- 범위 제한: 실제 Lexical runtime parse/export, 전체 33개 노드와 버전별 fixture/migration은 미구현. R02/R03 체크 보류.
- 실행 증거: pnpm 및 Corepack DNS 환경 차단(E025/E027)으로 신규 테스트 미실행. CI 없음.

## 2026-10-16 — R02/R03 Lexical runtime bridge

- packages/lexical/src/documentBridge.ts: loadDocumentIntoEditor(parseEditorState/setEditorState), exportEditorToDocument(toJSON + document schema validation) 도입. 실패는 diagnostics로 반환하며 미지원 필드 자동 삭제 없음.
- packages/lexical/src/index.ts: bridge API 공개.
- packages/lexical/test/document-bridge.test.mjs: 미등록 노드·문서 버전·무효 내보내기 거부 회귀 작성.
- 제한: 성공적인 full document→Lexical→document 왕복과 33개 노드 등록, Lexical 버전별 골든 fixture는 아직 없음. 실행 검증도 미완료(E025/E027). R02/R03 완료 체크 보류.

## 2026-10-16 — R02 성공 경로 통합 테스트 추가

- packages/lexical/test/document-bridge.test.mjs: headless Lexical에서 section/paragraph/text/tufte-span/tufte-note를 생성하고 문서 envelope에 넣은 뒤, 실제 parseEditorState → setEditorState → toJSON → validateDocument 경유 동등성을 검사하는 성공 경로 테스트 작성.
- 테스트는 작성되었지만 의존성 설치/실행은 현재 환경의 E025/E027로 검증하지 못함. 성공을 주장하거나 R02를 완료 처리하지 않음.
- 서버 fixture 전체(그림·표 등) 및 Lexical 0.52.0 골든 파일 확장은 후속 작업.

## 2026-10-16 — R02 그림·캡션 왕복 테스트 확장

- packages/lexical/test/document-bridge.test.mjs: FigureNode/CaptionNode를 테스트 편집기에 등록하고, fullwidth figure → inline image(assetId/width/height) → caption의 document → 실제 Lexical → document 왕복 테스트 추가.
- 여전히 테스트 미실행(E025/E027). 그림 테스트 성공을 확정하지 않으며 R02 미완료 유지. 표·목록과 Lexical 0.52.0 골든 fixture는 후속 작업.

## 2026-10-16 — R03 Lexical import 무손실성 검증

- packages/lexical/src/documentBridge.ts: parseEditorState 결과를 즉시 toJSON으로 재직렬화하여 원본 상태와 키 정렬 기준으로 비교. 차이가 있으면 LEXICAL_IMPORT_LOSSY 진단을 반환하고 setEditorState를 호출하지 않음.
- packages/lexical/test/document-bridge.test.mjs: 필드 삭제를 흉내 낸 편집기에서 실패·무변경을 검증하고 JSON 키 순서 차이는 허용하는 테스트 추가.
- 테스트 실행 및 실제 Lexical 0.52.0 호환성은 아직 확인하지 못함(E025/E027). R03 완료 체크 보류. 목록·표 확장과 골든 fixture 작업은 남음.

## 2026-10-16 — R02 목록 왕복 및 오류 재현성 보강

- packages/lexical/test/document-bridge.test.mjs: @lexical/list ListNode/ListItemNode 등록, 시작 번호 7인 ordered list를 실제 headless Lexical에서 생성하여 문서 왕복/시작 번호 보존 검증 코드 추가.
- 미등록 노드 실패 테스트는 서버 fixture 의존을 제거하고, TufteSpanNode를 명시적으로 누락한 편집기로 변경해 재현 조건을 고정.
- 오류 대책 M025 재점검: 테스트가 검출해야 할 조건을 fixture에 명시한다. pnpm 실행 차단(E025/E027)으로 새 테스트 통과 미확인. R02/R03 완료 체크 보류.
- 표 왕복과 Lexical 0.52.0 골든 fixture는 다음 단계로 유지.

## 2026-10-16 — R02 스크롤 표 왕복 테스트 추가

- packages/lexical/test/document-bridge.test.mjs: TableLayoutNode 및 @lexical/table TableNode/TableRowNode/TableCellNode를 headless registry에 등록. 2x2 표, 헤더 셀, scroll 레이아웃을 생성하고 document→Lexical→document JSON 동등성 검사 작성.
- 신규 테스트 실행은 여전히 미확인(E025/E027). Lexical 0.52.0의 실제 table 직렬화 필드가 document schema와 일치하는지는 실행 후 확인해야 함. R02 체크 보류.
- 다음: frozen install/check에서 실패가 드러나면 ERROR_LOG/ERROR_PREVENTION 갱신, 이어서 0.52.0 골든 fixture 구축.

## 2026-10-16 — R03 스키마 지원 범위·미래 표 속성 검사

- packages/lexical/test/document-bridge.test.mjs: headless 테스트 등록 노드와 NODE_SCHEMA 사이의 지원/미지원 유형을 명시적으로 비교하는 회귀 추가. 아직 구현하지 않은 tufte-code/embed/epigraph를 지원 완료로 오인하지 않음.
- TableCellNode 직렬화 결과에 futureTableField를 삽입해 validateDocument가 UNKNOWN_FIELD를 반환하는지 검사 추가.
- Node v22.16.0 확인, pnpm 실행 파일 부재. 의존성 설치와 전체 테스트 실행 증거가 없어 R02/R03 완료 보류. 실제 Lexical 0.52.0 출력 기반 골든 fixture는 아직 생성하지 않음(추측 fixture 금지).

## 2026-10-16 — R02 골든 fixture 생성 준비 및 E028 수정

- 실제 Lexical 0.52.0 직렬화 기반 스냅샷을 생성/비교하는 테스트를 추가했다. UPDATE_LEXICAL_GOLDEN=1로 생성하며 아직 fixture가 없어 해당 테스트는 skip으로 보고되도록 했다. 골든 fixture를 실제로 생성했다고 주장하지 않는다.
- 그림 왕복 테스트의 assetId=chart-1에 대한 문서 자산 메타데이터 누락을 발견하여 수정했다. ERROR_LOG E028, ERROR_PREVENTION M026에 기록.
- 환경에 pnpm이 없어 테스트 미실행. R02/R03 및 골든 fixture 완료 체크 보류. 다음에는 의존성 확보 후 생성 결과 검토·커밋, pnpm check 실행.

## 2026-10-16 — R02 골든 fixture 필수 검증 게이트·자산 오류 회귀

- packages/lexical/test/document-bridge.test.mjs: REQUIRE_LEXICAL_GOLDEN=1일 때 fixture가 없으면 명시적으로 실패하게 수정. UPDATE_LEXICAL_GOLDEN=1은 설치된 Lexical 0.52.0의 실제 결과를 생성하므로 검토 후에만 커밋한다.
- M026에 따라 assetId가 assets에 존재하지 않는 그림을 이용해 MISSING_ASSET 오류와 편집기 파싱·변경 호출 0회를 검사하는 회귀 추가.
- 현재 컨테이너 Node v22.16.0 확인, pnpm 실행 파일 없음. 테스트는 미실행이며 골든 fixture는 미생성. R02/R03 미완료 유지.

검증 명령(의존성 설치 가능한 환경): `pnpm install --frozen-lockfile && pnpm check`; 골든 생성은 `UPDATE_LEXICAL_GOLDEN=1 pnpm --filter @lexical-tufte/lexical test` 후 생성된 JSON을 검토·커밋. 이후 `REQUIRE_LEXICAL_GOLDEN=1 pnpm --filter @lexical-tufte/lexical test`로 필수 검증.

## 2026-10-16 — R02 골든 생성 안전장치

- UPDATE_LEXICAL_GOLDEN=1 경로에서 설치된 lexical/package.json 버전이 0.52.0인지 확인하고 기존 골든 파일을 기본적으로 덮어쓰지 않도록 보호했다. 기존 파일 변경은 OVERWRITE_LEXICAL_GOLDEN=1을 추가로 지정해야 한다.
- 현재 실행 환경 확인: Node v22.16.0, pnpm 명령 없음, 로컬 의존성 없음. 골든 생성/테스트 실행을 성공으로 기록하지 않는다. require('lexical/package.json')의 package exports 호환성도 실제 의존성 설치 후 확인할 것.
- R02/R03 미완료, CI 추가 없음.

## 2026-10-16 — R02 골든 버전 검사 수정 및 환경 재점검

- `require('lexical/package.json')`의 비공개 exports 의존을 제거하고 `require.resolve('lexical')` 공개 엔트리 기준 manifest 탐색으로 변경(E029/M027).
- 컨테이너에서 `node -v`는 v22.16.0, `pnpm` 없음, `/mnt/data`에 checkout 없음, `git ls-remote`는 github.com DNS 조회 실패를 재확인했다. 의존성 설치·실제 골든 fixture 생성·테스트는 실행하지 못함.
- R02/R03 체크 보류. CI 추가 없음. 다음은 연결 가능한 환경에서 pnpm install --frozen-lockfile 및 pnpm check, 골든 생성과 리뷰.

## 2026-10-16 — R11 가져오기 스냅샷 분리

- loadDocumentIntoEditor 성공 반환이 입력 문서 원본을 그대로 참조하던 문제(E030)를 수정하여 structuredClone된 독립 envelope를 반환한다.
- 호출자가 가져오기 이후 title/lexicalState를 변경해도 반환된 값이 바뀌지 않는 R11 회귀 테스트 추가. M028 기록.
- 현재 환경에서 pnpm과 로컬 프로젝트 의존성 미확보. 실제 테스트 미실행, R11/R02/R03 완료 체크 보류. CI 생략 유지.

## 2026-10-16 — R11 내보내기 스냅샷 분리

- `editorJSONToDocument` 성공 결과의 lexicalState가 입력 editor state를 참조하던 문제(E031)를 수정했다. 성공 시 문서 전체 structuredClone 반환.
- R11 회귀: 내보내기 후 editor state와 base title/assets를 변경해도 반환된 문서가 바뀌지 않는지 검사.
- E031/M028 점검 반영. pnpm 실행 불가로 테스트 미검증; R11/R02/R03 완료 체크 보류. CI 추가 없음.

## 2026-10-16 — R11 document 패키지 단위 회귀

- `packages/document/test/editor-boundary.test.mjs`에 editorJSONToDocument 성공 결과가 원본 editor state 및 base metadata/assets와 참조를 공유하지 않는지 검사하는 테스트 추가.
- 기존 Lexical bridge 회귀와 별도로 문서 패키지 경계에서 스냅샷 독립성을 검증하도록 범위를 분리했다.
- 테스트 코드는 커밋했지만 실행은 미확인. R11 완료 체크 보류, CI 추가 없음.

## 2026-10-16 — R11/R03 경계 입력 불변성 회귀

- `packages/document/test/editor-boundary.test.mjs`에 가져오기 JSON과 원본 lexicalState의 참조 분리 및 양방향 변경 독립성 테스트 추가.
- 알 수 없는 필드로 내보내기가 거부되어도 원본 base와 전달된 editor JSON이 변경되지 않는 회귀 테스트 추가.
- 코드 반영 완료, 의존성 미확보로 실행 검증 대기. R11/R03 체크 보류, CI 생략 유지.

## 2026-10-16 — R03 편집기 실패 경로 회귀

- `packages/lexical/test/document-bridge.test.mjs`에 `setEditorState` 예외 시 `LEXICAL_IMPORT_FAILED` 및 `toJSON` 예외 시 `LEXICAL_EXPORT_FAILED`를 반환하는 회귀 테스트 추가.
- 성공 반환을 잘못 보고하지 않는 실패 경로 검사이며 실제 Lexical 0.52.0 통합 검증과 별개.
- 의존성 미확보로 테스트 실행은 미확인. R03/R02/R11 완료 체크 보류, CI 추가 없음.

## 2026-10-16 — R03 canonical serialization 회귀

- `packages/document/test/editor-boundary.test.mjs`에 canonicalizeDocument의 객체 키 순서 불변성, 배열 순서 보존, parseCanonicalDocument 왕복, unknown field 거부 및 입력 비변경 회귀 추가.
- 배열 순서 변경 검사는 root에 섹션이 둘 이상 있을 때만 수행하도록 조건화했으므로 단일 섹션 fixture에서는 해당 단언이 실행되지 않는다. 다중 섹션 fixture로 강화할 여지가 있다.
- 테스트 실행 미확인. R03 체크 보류, CI 생략 유지.

## 2026-10-16 — R03 배열 순서 검증 공백 보완

- 이전 canonical serialization 테스트의 `children.length > 1` 조건 때문에 단일 섹션 fixture에서는 배열 순서 보존 단언이 생략되던 문제를 수정했다.
- 테스트가 서로 다른 두 개의 유효한 section을 명시적으로 구성하고 순서 반전 전후 직렬화 차이를 무조건 검사한다.
- 실행 검증은 여전히 대기. R03 완료 체크 보류, CI 생략 유지.

## 2026-10-16 — R03 테스트 fixture 오류 수정

- 빈 `tufte-section`을 만드는 잘못된 synthetic fixture(E032)를 발견하여 유효한 자식을 가진 섹션으로 수정했다.
- 테스트 fixture 유효성 선행 단언을 M029로 기록하고 오류·예방 문서를 갱신했다.
- 테스트 실행 검증 대기, R03 미완료, CI 없음.

## 2026-10-16 — R03 테스트 fixture 전역 ID 충돌 예방

- synthetic section 복제 시 noteId가 중복될 수 있는 문제(E033)를 발견하고, 두 번째 section의 자식을 독립 text paragraph로 대체.
- M030 예방 규약 반영. 실행 검증 미확인, R03 체크 보류, CI 없음.

## 2026-10-16 — R03 최소 fixture 구성

- canonical 배열 순서 테스트의 두 번째 section을 기존 section 복제 대신 `{type:'tufte-section',version:1,children:[...]}`로 직접 구성.
- E032/E033/M029/M030에서 발견한 빈 노드 및 전역 note ID 중복 위험을 fixture 구조 차원에서 차단.
- 실제 테스트 실행은 미확인. R03 완료 체크 보류, CI 없음.

## 2026-10-16 — R01 이미지 import 거부 경로 회귀

- `packages/lexical/test/document-bridge.test.mjs`에 `InlineImageNode.importJSON`의 위험 URL(`javascript:`, protocol-relative), 잘못된 assetId, 0/음수/소수 크기, 미래 노드 버전 거부 테스트 추가.
- 정상 이미지의 assetId/width/height 왕복 테스트와 함께 R01 경계를 추적한다.
- 기존 E032/E033 및 M029/M030을 재점검해 synthetic section은 독립 최소 노드로 유지했다.
- 실행 검증 미확인으로 R01/R03 체크 보류. CI 추가 없음.

## 2026-10-16 — R01 이미지 입력 정책 통합

- `InlineImageNode`의 JSON import와 `$createInlineImageNode`에서 중복된 URL/alt/assetId/width/height 검증을 `assertImageProperties`로 통합했다.
- 잘못된 alt, data URL, ID, 크기 등 동일 거부 정책을 확인하는 회귀 테스트를 추가했다.
- E032/E033의 fixture 제약과 M029/M030 재발 방지 내용을 점검했다. 새로운 실행 오류는 확인되지 않았으나 테스트 자체는 미실행.
- R01 완료 체크 보류, CI 없음.

## 2026-10-16 — R01 이미지 생성→Lexical 직렬화 검증 보강

- 실제 headless Lexical에서 `$createInlineImageNode`로 이미지를 생성하고 `EditorState.toJSON()` 결과의 src/alt/assetId/width/height 보존을 검사하는 회귀 추가.
- 해당 JSON을 asset metadata와 함께 문서 envelope에 넣어 `validateDocument` 성공을 검증하도록 구성.
- 기존 E032/E033, M029/M030 관련 fixture 제약 재점검. 테스트 실행은 미확인으로 R01 체크 보류. CI 추가 없음.

## 2026-10-16 — R01 자산 참조 무결성 회귀

- 실제 Lexical image JSON과 envelope의 asset 목록이 불일치할 때 `loadDocumentIntoEditor`가 MISSING_ASSET/ASSET_MISMATCH로 거부하는 테스트 추가.
- 자산 누락, URL 변경, width 변경, height 변경 네 가지 사례에서 거부 전후 editor state 불변성 검사.
- E032/E033/M029/M030 재검토: fixture의 note ID 복제 없이 독립 image state를 구성하고 asset metadata는 사례별로 변경.
- 로컬 실행 검증 미확인, R01 미완료, CI 추가 없음.

## 2026-10-16 — P2 주석 종류 편집 API

- `packages/lexical/src/NoteNode.ts`에 `setKind('sidenote'|'marginnote')` 추가, 잘못된 종류 거부.
- 실제 Lexical editor update에서 종류를 전환해 noteId·텍스트 보존과 JSON 직렬화 결과를 검사하는 회귀 테스트 추가.
- E032/E033 및 M029/M030의 synthetic fixture 제약을 재점검. 테스트 실행은 미확인, P2.3 및 F기능 완료 체크 보류. CI 없음.

## 2026-10-16 — 외부 검증 피드백 E034 대응

- 사용자 제공 독립 검증: 설치/lint/inventory/type 검사 통과, document 20/20 통과, render 정규식 임시 수정 시 17/17 통과, lexical 40건 중 2건 실패. 브라우저 Chromium 다운로드 제한으로 미실행. 해당 검증은 수정 전 `cd0f5ef` 기준.
- 저장소에서 render 정규식, note 이미지 오류 메시지 기대값, R11 alias 자산 fixture를 각각 수정.
- E034/M031에 원인과 재발 방지 조치를 기록. **수정 후** `pnpm check` 및 단위 테스트 실행 결과는 아직 확보하지 못했으며 통과로 표기하지 않음.
- R02 전체 노드 왕복, R03 버전별 migration, R05 무효 상태 복구 및 undo history 정리 문제는 여전히 미완. CI 추가 없음.

## 2026-10-16 — 실행 검증 보류, R03 호환성 설계 우선

- 현 환경에서는 `pnpm check`와 브라우저 테스트를 실제 실행할 수 없어 추가 테스트 기반 완료 판정을 보류했다.
- R03을 R03.a–d로 세분화: 별도 Lexical format version, 명시적 migration, 버전별 golden fixture, 문서 교체 시 undo/redo 정책.
- 현행 `loadDocumentIntoEditor`의 엄격한 JSON 동등성은 손실 방지에 유용하지만 구버전 저장 문서의 호환성을 보장하지 않는다. 버전별 변환이 구현되기 전에는 로드 호환성이 해결된 것으로 간주하지 않는다.
- CI 추가 없음. 다음은 format version 저장 위치 및 migration 입력·출력 계약 설계.

## 2026-10-16 — R03 migration 경계 계약 설계

- docs/LEXICAL_MIGRATION_CONTRACT.ko.md 작성. schemaVersion 1과 Lexical node version의 구분, schemaVersion 2의 editorFormat 후보, legacy v1 명시적 분기, 실패 시 editor 불변, HistoryPlugin undo/redo 정책, 필수 fixture 및 판정 기준을 정리.
- 현재 validator가 unknown top-level field를 거부하므로 기존 v1에 editorFormat을 임의 추가하지 않기로 설계. 설계안은 미확정이며 migration 함수는 아직 구현되지 않음.
- 실행 환경 제한으로 테스트 미실행. R03/P2.5 체크 보류, CI 없음.

## 2026-10-16 — R03.b v1→v2 변환 규칙 명세

- docs/LEXICAL_MIGRATION_CONTRACT.ko.md에 필드별 복제/거부 규칙, legacy JSON의 실제 호환성 검증 전 자동 승격 금지, inspect/migrate/load API 분리, 저장 시 revision·백업·원자적 교체·롤백 정책 추가.
- 현재 v1 validator의 unknown-field strict 정책은 유지한다. TufteDocumentV2, validator, migration 및 editor integration은 아직 구현하지 않았다.
- 실행 테스트 불가 상태이므로 R03.b와 P2.5 완료 체크 보류. CI 없음.

## 2026-10-16 — R03.a 버전 식별 API 부분 구현

- `inspectStoredDocument` 및 공개 export 구현: strict v1 검증 후 legacy-v1 식별, v2 editorFormat descriptor 식별, 미지원 버전 진단.
- document 단위 테스트에 원본 불변·v1/v2 구분·알 수 없는 버전/필드 거부 사례 추가.
- v2는 descriptor 식별만 하며 전체 문서 검증/실제 migration을 수행하지 않는다. 실행 검증 미확인, R03.a 체크 보류. CI 없음.

## 2026-10-16 — R03 v2 validator 및 inspect 통합

- `validateDocumentV2` 구현·공개 export: v2 envelope, editorFormat strict 검사 및 v1 본문 계약 재사용. `inspectStoredDocument`가 v2 전체 유효성 검사 후 형식을 반환하도록 수정.
- document 테스트에 v2 복제 독립성, unknown field, 미지원 formatVersion 및 노드 거부 사례 추가.
- v1→v2 migration 및 editor 설치는 아직 구현하지 않았다. 타입 검사·단위 테스트는 환경 제약으로 미실행; 체크리스트 완료 처리하지 않음. CI 없음.

## 2026-10-16 — R03.b envelope migration 구현

- `migrateStoredDocument` 구현 및 공개 export: v1→v2 외피 승격, v2 복제, unsupported format 거부.
- 단위 테스트에 입력 불변, 본문·자산 보존, 복제 분리, 반복 변환 결정성, 미지원 버전 진단 추가.
- **Lexical runtime 호환성 확인/로드 통합 미완**이며 실제 테스트 미실행. migration API 성공만으로 R03/P2.5 완료 체크하지 않음. CI 없음.

## 2026-10-16 — R03 Lexical migration 로드 경로 연결

- `loadMigratedDocumentIntoEditor` 구현 및 export: v1/v2 migration 결과를 기존 strict Lexical bridge의 parse/serialize 무손실 검사 후 editor에 설치하는 opt-in 경로.
- Lexical 단위 테스트에 v1→v2 로드/스냅샷 및 미지원 버전 시 기존 상태 불변 사례 추가.
- 실행 테스트 미확인. undo/redo history reset, 저장 경로 및 브라우저 검증 미완. R03/P2.5 완료 체크 보류, CI 없음.

## 2026-10-16 — R03 문서 교체 history reset 명령

- 성공한 migrated load에 한해 `CLEAR_HISTORY_COMMAND` dispatch 구현. 실패한 migration에서는 history를 건드리지 않음.
- Lexical 단위 테스트에 성공 1회·실패 0회 dispatch 검증 추가.
- 실제 HistoryPlugin undo/redo 통합과 브라우저 테스트 미실행; 환경 제약으로 타입 검사/테스트 미실행. R03/P2.5 체크 보류. CI 없음.

## 2026-10-16 — R03 history 실패 경로 회귀 보강

- migrated load에서 unknown node 거부 시 editor state 불변 및 CLEAR_HISTORY_COMMAND 미전달을 검사하는 테스트 추가.
- HistoryPlugin 실물 undo/redo 시나리오와 호스트 등록 요건을 migration 계약 문서에 명시.
- 명령 전달 단위 테스트 외 실제 HistoryPlugin 통합은 미검증. 환경 제약으로 테스트 미실행; R03 완료 체크 보류. CI 없음.

## 2026-10-16 — R03 HistoryPlugin 실물 통합 테스트 작성

- @lexical/history의 실제 history state와 registerHistory를 이용한 테스트 추가. 거부된 문서에서는 undo/redo 유지, 성공한 교체에서는 양쪽 스택 비움을 단언.
- 환경 제약으로 테스트/타입 검사 미실행. 실행 결과가 없으므로 R03 완료 체크 보류, CI 없음.

## 2026-10-16 — R03 v2 export API

- `exportEditorToDocumentV2` 구현·공개 export. v2 base 검증 → v1 editor state 검증 → v2 재검증으로 편집기 저장 경계에서 editorFormat 손실 방지.
- migrated v1→v2 load 이후 v2 export roundtrip 및 unsupported editor format 거부 테스트 추가.
- 타입 검사/테스트 미실행. R03.c 골든·브라우저·HistoryPlugin 검증 및 P5 저장 트랜잭션 미완. CI 없음.

## 2026-10-16 — R03 migration adapter 타입 안전성 개선

- v2→v1 Lexical load projection에서 이중 강제 타입 변환을 제거하고 v1 필드를 명시적으로 구성.
- v2 envelope에 getter/unknown field가 포함된 경우 거부하는 document 테스트 추가.
- E035/M032 기록 및 예방 대책 반영. 테스트·타입 검사 미실행, 체크리스트 완료 처리하지 않음. CI 없음.

## 2026-10-16 — R03.c v1/v2 envelope golden fixture

- `fixtures/tufte/server-document-v2.json` 추가. 기존 v1 서버 fixture와 비교하는 migration golden 회귀 테스트 추가.
- Lexical runtime 버전별 golden과 실제 테스트 실행은 미완. R03.c 체크 보류. CI 없음.

## 2026-10-16 — R03.c v2 golden headless Lexical 왕복 테스트 작성

- 저장된 `server-document-v2.json`을 실제 Lexical 로드·export 경계에 통과시켜 완전 동등성·입력 불변성을 검사하는 테스트 추가.
- 지원하지 않는 editor format 거부 시 editor state 불변 테스트 추가.
- 로컬 의존성/테스트 실행 불가(E025/E027). R03.c 체크 미완료, CI 없음.

## 2026-10-16 — R03 버전 판별 접근자 방어·진단 계약

- inspectStoredDocument에서 schemaVersion 읽기 전에 접근자 및 symbol own property를 거부하도록 변경.
- untrusted getter 미실행 및 unsupported version/editor format/unknown field 진단 경로 테스트 추가.
- E036/M033 기록. 테스트 미실행(E025/E027), R03 완료 체크 보류. CI 없음.

## 2026-10-16 — v2 PostRecord validation 경계

- `validatePostRecordV2` 구현·export 및 v2 골든 문서/메타데이터 결합 테스트 추가.
- 오류 진단 경로를 document/metadata 하위로 분리. 실제 revision 충돌 처리·저장 트랜잭션은 별도 후속 작업.
- 타입 검사 및 테스트 실행 미확인. R03/P2.5 완료 처리 보류, CI 없음.

## 2026-10-16 — v2 revision 충돌 preflight

- `preparePostRevisionV2` 구현·공개 export. stale expected revision, revision gap, slug 변경 거부 테스트 추가.
- 사전 검사만 구현됨. CAS/원자적 저장 및 실제 테스트 실행은 미완. CI 없음.

## 2026-10-16 — v2 저장소 CAS 계약 및 in-memory 참조 adapter

- `PostRevisionStoreV2` 인터페이스와 `InMemoryPostRevisionStoreV2` 구현·export.
- 동일 revision의 경쟁 저장 시 단일 성공, snapshot 격리, 후속 revision 테스트 추가.
- 영속 저장소 트랜잭션/백업·복구는 미구현. 테스트 실행 미확인, R03/P2.5 체크 보류, CI 없음.

## 2026-10-16 — SQLite/D1 단일 SQL revision CAS

- `SqlitePostRevisionStoreV2` 추가: ID/slug/revision 조건부 단일 UPDATE, 1행 갱신만 성공 처리.
- SQL 바인딩·0행 충돌·revision 오류 mock 테스트 추가. 실제 DB 연동/DDL 적용/백업은 미구현, 실행 검증 미확인.
- CI 생략, R03/P5 완료 체크 보류.

## 2026-10-16 — SQLite/D1 스키마 및 최초 insert

- `packages/document/sql/001_posts_v2.sql` 추가, payload/행 키 일관성 CHECK와 id/slug unique 정의.
- `SqlitePostRevisionStoreV2.insert` 추가: revision 1만 허용, 중복 덮어쓰기 금지. mock 단위 테스트 추가.
- 실제 DB 통합 테스트 및 백업·복원 미완. CI 없음, P5.1 체크 보류.

## 2026-10-16 — 실제 SQLite 통합 테스트 코드

- Node `node:sqlite` 기반 스키마/insert/CAS/constraint 통합 테스트 추가.
- 환경 SQLite 3.46.1에서 동일 DDL과 revision 조건 UPDATE 1행 성공·재시도 0행 smoke 확인.
- 저장소의 TS 빌드 및 node 통합 테스트는 미실행. D1 실제 연결/백업·복원 미완. CI 없음.

## 2026-10-16 — v2 backup envelope 및 revision 보호 복원

- `createPostBackupV2`, `inspectPostBackupV2`, `restorePostBackupV2` 구현·export.
- 복원은 동일 id/slug에 새 revision을 CAS로 기록, stale restore 거부. 단위 테스트 작성.
- 파일/DB 백업의 내구성 및 실제 실행 검증 미완. R03/P5.1 완료 보류, CI 없음.

## 2026-10-16 — SQLite adapter 오염 복구 및 백업 복원 통합 테스트

- 원격 파일 점검으로 `sqliteRevisionStore.ts` 중복 코드 오염 발견(E038), 완전 재작성. M035 예방 규약 추가.
- 실제 Node SQLite 엔진에서 백업→수정→CAS 복원→stale replay 거부를 검사하는 통합 테스트 추가.
- 저장소 테스트/타입 검사 실제 실행 미확인. 파일 백업 내구성·D1 검증 미완, CI 없음.

## 2026-10-16 — Node 파일 백업 쓰기/읽기

- `packages/document/scripts/backup-file.mjs` 추가: 임시 파일+fsync+rename 및 크기 제한 읽기.
- 파일 백업 roundtrip, 손상 JSON, 용량 초과 테스트 추가.
- Node 테스트 미실행, 파일시스템 장애 복구·권한 정책·DB snapshot 정합성 미검증. P5.1 완료 보류, CI 없음.

## 2026-10-16 — 백업 snapshot revision guard

- `backup-snapshot.mjs` 추가: 기대 revision과 조회 결과가 다르면 기존 파일을 변경하지 않음.
- 회귀 테스트 추가, 실행 미확인. DB 조회 일관성은 호출자 책임. CI 없음.

## 2026-10-16 — SQLite/D1 단일 조회 스냅샷

- `readSqlitePostSnapshotV2` 추가: 단일 SELECT로 id/slug/revision/payload 조회 및 행-문서 일치 검증.
- 실제 SQLite 엔진용 조회/CAS 후 최신 스냅샷 회귀 테스트 작성. 실행 미확인.
- D1 실행 검증과 장애 복구는 미완료. CI 없음.

## 2026-10-16 — SQLite snapshot→파일 백업 연결

- `scripts/sqlite-backup.mjs`에서 단일 SQLite 조회, expectedRevision 검사, 파일 백업을 연결.
- 조회 실패 및 revision 충돌 시 기존 백업 파일을 보존하는 실제 SQLite 통합 테스트 작성.
- 코드 리뷰 중 Result 봉투를 record로 전달하는 초안 오류를 발견하여 같은 작업에서 수정. 실행 검증 미완, CI 없음.

## 2026-10-16 — 파일→SQLite CAS 복원

- `scripts/sqlite-restore.mjs` 추가: 파일 백업 검증, 단일 SELECT 현재 게시물 조회, CAS revision 증가 복원.
- SQLite 통합 테스트 작성: 정상 복원, stale revision 거부, 손상 JSON 시 기존 데이터 보존.
- 실제 테스트 실행 미확인. 복원 파일 읽기 시 최대 크기 제한은 기본 16 MiB. D1 실환경/장애 주입 미검증, CI 없음.

## 2026-10-16 — 복원 충돌 및 쓰기 실패 주입 테스트

- SQLite 통합 테스트에 읽기 이후 CAS 이전의 경쟁 갱신을 주입하여 승자 데이터 보존을 단언.
- 저장소 UPDATE 실패를 주입하여 기존 revision과 payload 불변을 단언.
- 실제 Node 테스트 실행 미확인. 프로세스 강제 종료, 디스크 부족, D1 네트워크 실패 주입은 미완. CI 없음.

## 2026-10-16 — 백업 파일 rename 실패 주입

- `writePostBackupFile`에 파일시스템 의존성 주입 경계 추가.
- rename 실패 시 기존 백업 유지 및 임시 파일 삭제 회귀 테스트 작성.
- 프로세스 강제 종료는 아직 시뮬레이션하지 않음. 실행 테스트 미확인, CI 없음.

## 2026-10-16 — 임시 백업 파일 정리 안전장치

- 임시 파일 정리 기본 최소 연령 1시간, 삭제 직전 inode/mtime 재확인 추가.
- 최근 생성된 파일을 보존하는 회귀 테스트 추가. 실행 미확인.
- TOCTOU 위험을 완전히 제거하지 못하므로 writer 중지/배타적 유지보수 상태에서만 삭제 실행. CI 없음.

## 2026-10-16 — 백업 부분 쓰기 실패 주입

- `backup-file.test.mjs`: 임시 파일에 부분 기록 후 디스크 쓰기 예외를 발생시키는 테스트 추가.
- 기존 백업 불변 및 실패한 임시 파일 삭제를 단언. 실제 테스트 실행 미확인.
- 프로세스 강제 종료 및 OS 수준 디스크 장애 실험은 별도. CI 없음.

## 2026-10-16 — 파일 fsync 실패 주입

- `backup-file.test.mjs`: 임시 파일 기록 후 파일 동기화 예외를 주입하는 회귀 테스트 추가.
- 기존 백업 불변과 임시 파일 정리를 단언. 실제 실행 결과 미확인.
- P2.2 및 R01–R08 선행 안정화는 계획 순서대로 남아 있음. CI 없음.

## 2026-10-16 — P2.2 R01 이미지 노드 검증 보강

- 기존 `InlineImageNode`가 공통 `isSafeURL`/`isIdentifier`를 사용함을 재확인.
- Lexical bridge 테스트에 unsafe URL, 부적절한 assetId, 0/음수 크기 및 미래 버전 import 거부 검증 추가.
- 정상 이미지의 src/assetId/width/height 직렬화 보존 테스트 추가.
- 실행 미확인으로 R01 체크 보류. CI 없음.

## 2026-10-16 — R02 지원 노드 왕복 검증 확대

- `packages/lexical/test/document-bridge.test.mjs`에 Tufte span 4종과 note 2종의 조합 왕복 테스트 추가.
- 본문 폭 figure/caption과 fullwidth table-layout 왕복 테스트 추가.
- 지원되지 않은 노드의 무손실 왕복은 여전히 미구현이며 R02 전체 완료 아님. 실제 테스트 실행 미확인, CI 없음.

## 2026-10-16 — P2.2 노드 커버리지 조사

- `docs/P2_NODE_COVERAGE.ko.md` 작성: 공개 커스텀 노드 7종, 공식 Lexical 노드 재사용 후보, 미구현 노드 우선순위 및 수락 조건 정리.
- 다음 작업: heading/quote/horizontalrule 공식 노드의 JSON 호환성 및 최소 왕복 fixture 검증.
- 조사만 완료한 상태이며 P2.2 및 R02 체크 보류. CI 없음.

## 2026-10-16 — P2.2 공식 제목/인용문 노드

- `packages/lexical/test/document-bridge.test.mjs`에서 공식 `HeadingNode`와 `QuoteNode` 등록, h2/h3/quote 문서 왕복 테스트 추가.
- `horizontalrule`은 아직 미연결. 공식 노드의 실제 직렬화 결과와 문서 validator 호환성은 실행 전 미확인.
- P2.2 체크 보류, CI 없음.

## 2026-10-16 — P2.2 horizontalrule 연결

- `packages/lexical/test/document-bridge.test.mjs`에 공식 HorizontalRuleNode 등록 및 paragraph → horizontalrule → paragraph 엄격 왕복 테스트 추가.
- 테스트 실행 및 실제 Lexical 0.52.0 JSON 호환성 확인은 미완료. 실패 시 노드 serialization 차이를 진단하고 문서 계약과 함께 수정할 것.
- 다음 구현 순서: definition-list/term/definition. P2.2 완료 체크 보류, CI 없음.

## 2026-10-16 — P2.2 F06 정의 목록 노드

- `packages/lexical/src/DefinitionListNodes.ts`: definition-list/term/description 3종 ElementNode와 JSON import/export, dl/dt/dd 편집 DOM 구현.
- 공개 API에 노드/팩토리 추가. 복수 dd 왕복 및 orphan dd의 문서 validator 거부 테스트 작성.
- 테스트·typecheck 실행은 미확인. P2.2/F06/R02 완료 체크 보류. CI 없음.
- 다음 순서: F08/F09 attribution/cite/epigraph 노드 및 구조 왕복 검증.

## 2026-10-16 — P2.2 F08/F09 인용 노드

- `packages/lexical/src/QuotationNodes.ts`에 EpigraphNode/AttributionNode/CiteNode 추가, index API 노출.
- quote 내부 attribution/cite 포함 왕복 및 내용 없는 quote 구조 거부 테스트 작성.
- Lexical 정규화와 schema의 실제 호환성은 테스트 미실행으로 미확인. P2.2/F08/F09 완료 체크 보류, CI 없음.
- 다음 순서: tufte-section-footer 노드 및 직계 섹션 왕복 검증.

## 2026-10-16 — P2.2 F07 section footer

- `packages/lexical/src/SectionFooterNode.ts`에 section footer ElementNode, JSON import/export 및 footer DOM 추가.
- index 공개 API 및 footer + cite 문서 왕복, paragraph 내부 footer 구조 거부 테스트 추가.
- 테스트·typecheck 실행 미확인. F07/P2.2 완료 체크 보류, CI 없음.
- 다음 작업: F15 tufte-fullwidth 블록 노드와 문서 직계 구조 검증.
