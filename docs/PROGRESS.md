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
