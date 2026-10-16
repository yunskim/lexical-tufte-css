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
