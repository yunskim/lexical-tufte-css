## P3.1.b 좁은 화면 및 Escape 상태 보완 (검증 대기)

- 화면 너비에 따른 선택 영역 툴바의 수평 위치 계산을 수정했다. 400px 이하 화면에 수평 스크롤과 터치 버튼 최소 크기를 적용했다.
- Escape로 닫은 선택 영역에서 즉시 다시 표시되지 않도록 dismissal 상태를 도입했다. 선택이 해제되면 다시 표시 가능하다.
- 브라우저·IME·모바일 실기기 테스트 미실행. 컨텍스트 블록 메뉴, 키보드 접근 경로, 화면 경계 및 dismissal 상태는 최종 일괄 검증 대상. CI 생략.

## P3.1.b Floating Toolbar 경계·키보드 보완 (검증 대기)

- 화면 상단 선택 시 하단 배치, 수평 위치 제한, Escape 닫기 및 편집기 포커스 복귀를 구현했다.
- IME composition 이벤트 감지와 툴바 내부 키보드 포커스 중 선택 영역 갱신 억제를 추가했다.
- 실제 브라우저/접근성 테스트는 실행하지 않았다. 선택 보존·IME 이벤트 순서·좁은 화면·키보드 열기 경로·블록 메뉴는 여전히 검증/구현 대상이다. CI 생략.

## P3.1.b 선택 영역 Floating Toolbar 초안 (구현·검증 대기)

- `examples/editor/src/main.tsx`: 선택 영역이 비어 있지 않고 편집기 내부이며 IME 조합 중이 아닐 때 `SelectionToolbar`를 렌더링한다. 공통 `INLINE_ACTIONS`를 재사용해 여섯 가지 인라인 서식을 제공한다. selectionchange, editor update, scroll, resize에서 위치를 갱신한다.
- `examples/editor/src/style.css`: 화면 고정 위치, 다크 모드, 수평 스크롤 및 버튼 최소 크기를 추가했다.
- 아직 실제 브라우저 테스트 미실행. 키보드만으로 접근, 화면 경계, 포커스 보존, note 문맥, 모바일 터치, 블록 컨텍스트 메뉴는 후속 검증·구현 대상. CI 생략.

## P3.1.a 인라인 명령 목록 통합 (검증 대기)

- `examples/editor/src/main.tsx`: underline/strikethrough/highlight 아이콘 전환 및 6개 인라인 서식의 `INLINE_ACTIONS` 공통 목록 도입. 공통 목록은 향후 Floating Toolbar가 재사용할 기준이다.
- Floating Toolbar, 블록 메뉴, 플랫폼별 키 바인딩은 미구현. 실행 검증은 최종 일괄 수행하며 CI는 생략한다.

## P3.1.a 단축키 안내 및 타입 정리 (검증 대기)

- `examples/editor/src/main.tsx`: `MouseEvent` 타입을 직접 import하여 React namespace 참조를 제거하고, 일반 서식/이력 명령의 툴팁 단축키 안내를 추가했다.
- 단축키 안내는 명령 등록이나 플랫폼별 실제 키 매핑을 보장하지 않는다. P3.1.a 명령 레지스트리와 P3.1.b–d 컨텍스트 UI는 미완료. 테스트 미실행, CI 생략.

## P3.1 아이콘 중심 툴바 2차 전환 (일괄 검증 대기)

- `examples/editor/src/main.tsx`: 목록(글머리표/번호), 정의목록, sidenote/marginnote, 인용문 attribution 및 섹션 cite 버튼을 `IconButton`으로 전환. 기존 명령·접근성 이름을 유지했다.
- SVG 아이콘은 임시 내부 경로를 사용한다. Lucide 일괄 도입, 단축키 레지스트리, 툴바 그룹 및 테스트 실행은 후속 작업이다. CI 생략.

## P3.1 아이콘 중심 툴바 1차 전환 (일괄 검증 대기)

- `examples/editor/src/main.tsx`: 공통 SVG `ToolbarIcon`·`IconButton` 도입. 굵게·기울임·코드·구분선·실행 취소·다시 실행 및 인용문·Epigraph·섹션 출처를 아이콘 버튼으로 변경. 접근성 이름과 title 툴팁을 유지하여 기존 Playwright 버튼 이름 검색과 호환하도록 작성.
- 전체 F01–F19 아이콘, 단축키 레지스트리, 메뉴 구조는 아직 미완료. 현재 아이콘은 로컬 SVG이며 Lucide 패키지 적용은 후속 결정 사항이다. 테스트 미실행, CI 생략.

## P2.2.c F08–F09 실제 편집기 통합 회귀 (일괄 검증 대기)

- `tests/section-commands-browser.mjs`: 인용문 삽입 → 출처 추가 → quote/attribution/cite JSON 확인 → HTML blockquote/footer/cite 확인 → undo; epigraph 삽입 → epigraph/quote JSON 확인 → 발행 class 확인 → undo 회귀 추가.
- 기존 섹션 불변성도 검사한다. 사용자 지시에 따라 Playwright 테스트는 아직 실행하지 않았으며 F08–F09 검증 완료로 표시하지 않는다. CI 생략.

## P2.2.c F07 섹션 문헌 실제 편집기 회귀 추가 (일괄 검증 대기)

- `tests/section-commands-browser.mjs`: React 툴바에서 섹션 출처 → 섹션 문헌 삽입 후 Lexical JSON의 footer/cite 구조, 다른 섹션 불변성, 독립 렌더러의 HTML footer/cite 및 undo 복귀 검사 추가.
- 사용자 방침에 따라 Playwright 실행은 아직 하지 않았고, 테스트 통과·F07 완료 판정은 보류한다. CI는 생략한다.

## P2.2.c F07 섹션 문헌 저장·복원·발행 회귀 (일괄 검증 대기)

- `packages/lexical/test/quotation-commands.test.mjs`: 문헌 인용 추가 후 Lexical JSON 직렬화, 새 headless editor에서 복원, 원래 본문·footer/cite 구조 보존 확인.
- `packages/render/test/render.test.mjs`: section footer 안 cite가 `<footer>…<cite>…</cite></footer>`로 발행되고 입력 문서가 변경되지 않는지 확인.
- 두 테스트 모두 코드만 추가했다. 사용자 방침에 따라 테스트 실행 및 완료 판정은 마지막 통합 검증으로 보류하며 CI는 생략한다.

## P2.2.c F07 섹션 문헌 UI 연결 (일괄 테스트 대기)

- `examples/editor/src/main.tsx`: `APPEND_TUFTE_SECTION_CITE_COMMAND`를 import하고 `섹션 문헌 추가` 툴바 버튼 연결. 기존 `인용문 출처 추가` 버튼과 별도로 제공한다.
- 앞선 GitHub 수정 차단 후 재시도하여 커밋 `e6aff7f` 반영. 사용자 지시에 따라 테스트는 마지막에 일괄 실행하며 UI 동작 확인은 아직 수행하지 않았다. CI 생략.

## P2.2.c F07 섹션 출처 cite 명령 (일괄 검증 대기)

- `quotationCommands.ts`: `APPEND_TUFTE_SECTION_CITE_COMMAND` 추가. 최상위 섹션의 `tufte-section-footer` 내부 선택만 허용하며, 기존 `tufte-cite`가 있으면 거부하고 스키마를 확인한 뒤 인용 출처를 추가한다.
- `index.ts`: 공개 명령 export. `quotation-commands.test.mjs`: 정상 삽입·직렬화·중복 거부 원자성 회귀 추가.
- 사용자 요청에 따라 단위·브라우저 테스트 실행은 마지막 통합 검증까지 보류한다. 구현 완료와 검증 완료를 구분하고 F07/P2.2.c 체크는 아직 열어 둔다. CI 생략.

## P2.2.c F08–F09 삽입 대상 스키마 검증 강화 (일괄 테스트 대기)

- `packages/lexical/src/quotationCommands.ts`: 삽입 기준 블록의 허용 여부뿐 아니라 요청한 `quote`/`tufte-epigraph`/`tufte-section-footer`가 `tufte-section`의 허용 자식인지 확인한 후 삽입하도록 변경.
- 기존 F07 구분선과 같은 사전 검증 원칙 적용. 사용자 요청에 따라 빌드·단위·브라우저 테스트는 후속 통합 검증에서 일괄 실행하며 현재 통과를 주장하지 않는다. CI 생략.

## P2.2.c F08 중복 출처 방지 회귀 (일괄 검증 대기)

- `quotation-commands.test.mjs`: quote에 attribution/cite를 추가한 후 같은 quote에서 재삽입을 시도하면 진단을 반환하고 JSON이 바뀌지 않는지 검사.
- 사용자의 일괄 테스트 방침에 따라 이 테스트는 실행하지 않았다. P2.2.c/F08 체크는 검증 전까지 미완료, CI는 생략.

## P2.2.c F09 복수 Epigraph 보존 회귀 (일괄 테스트 대기)

- `packages/lexical/test/quotation-commands.test.mjs`: 한 섹션에 epigraph 두 개를 순차 삽입해 원래 본문과 첫 번째 인용 묶음이 보존되고 두 묶음이 각각 `tufte-epigraph > quote`로 직렬화되는지 확인하는 회귀 추가.
- 사용자 결정: **테스트는 기능 구현 후 한 번에 실행**. 개별 작업마다 DNS·pnpm 환경 점검을 반복하지 않고 구현/회귀 코드를 계속 작성한다. 테스트 코드는 작성했으나 실행하지 않았고, F07–F09 및 P2.2.c 완료 체크는 일괄 검증 전까지 유지한다. CI는 생략한다.

## F07 브라우저 데이터 보존 검증 강화

- `tests/section-commands-browser.mjs`: 실제 React 편집기에서 구분선 삽입 후 이전 섹션 JSON과 기존 본문 블록 JSON이 변경되지 않았는지 검증하는 단언 추가. 삽입·발행·undo/redo 경로는 유지.
- 현재 컨테이너 재확인: Node 22.16.0, checkout/pnpm 없음, `git ls-remote`는 GitHub DNS 조회 실패. 테스트를 실행하지 않았으며 F07 gate 미완료. CI는 생략.

## F07 다중 섹션 회귀 및 검증 순서

- 다중 섹션에서 선택된 섹션에만 구분선이 삽입되고 앞 섹션의 JSON은 불변인지 검사하는 테스트 추가.
- 실제 로컬 확인: `git ls-remote`는 `Could not resolve host: github.com`으로 실패했고 작업 컨테이너에 checkout 및 pnpm이 없다. 이 환경에서 새 코드를 실행하지 못했다.
- 실행 가능 환경에서 저장소 루트 기준 `pnpm install --frozen-lockfile` → `pnpm build` → `pnpm --filter @lexical-tufte/lexical test` → `pnpm --filter @lexical-tufte/render test` → `node tests/section-commands-browser.mjs` → `pnpm check` → `pnpm test:browser` 순서로 검증. 실패하면 ERROR_LOG/ERROR_PREVENTION에 원인과 재발 대책 기록.
- CI는 생략한다. 새 테스트의 실행 성공 및 F07 완료 판정은 아직 보류.

## F07 JSON 복원 테스트의 commit 경계 보완

- `quotation-commands.test.mjs`: `setEditorState(parseEditorState(...))` 뒤 `await flush()`를 추가해 비동기 상태 반영 이전에 JSON을 비교하지 않도록 수정했다. 이전 상태를 검증하는 가짜 성공/실패를 피하기 위한 테스트 수정이다.
- 실제 실행 환경 재점검: Node v22.16.0, pnpm 없음, GitHub DNS 해석 실패. 새 변경의 `pnpm check` 및 Playwright 테스트는 미실행이다. CI 생략. F07 완료 gate는 여전히 보류.

## F07 스키마 경계 강화 및 실행 환경 재확인

- `quotationCommands.ts`: 구분선 삽입 기준 블록이 `tufte-section`의 허용 child type인지도 검사하도록 강화. 기존 구현의 누락된 사전 조건을 수정했다.
- 2026-10-17 실행 컨테이너에서 `git ls-remote https://github.com/yunskim/lexical-tufte-css.git HEAD`를 실제 재시도했으나 `Could not resolve host: github.com` 발생. Node 22.16.0 및 npm 10.9.2는 있으나 pnpm/checkout 부재. 따라서 `pnpm check`/브라우저 검증 미실행.
- GitHub 커넥터로 코드만 반영. CI는 생략하며, 검증 성공·F07 완료 판정은 보류한다.

## F07 노트 경계·명령 생명주기 회귀 추가

- `quotation-commands.test.mjs`: 노트 내부 삽입 거부 시 원본 JSON·노트 ID 보존, unregister 후 명령이 처리되지 않는지 검증하는 테스트 추가.
- 현재 실행 환경에서 GitHub DNS 해석 실패를 다시 확인했으며 pnpm 및 checkout이 없어 테스트를 실행하지 못했다. 이전 검증 성공을 새 변경의 통과로 재사용하지 않는다. CI 생략 유지.
- 다음 실행 가능 환경에서 `pnpm check`, `pnpm test:browser` 및 신규 F07 테스트를 실행하고 실패 기록·대책을 갱신한다. F07 gate 미완료.

## F07 검증 준비 점검 — 실행 환경 제한

- `packages/render/test/render.test.mjs`: 발행 HTML의 문단 내부 래퍼를 고정하지 않고 `before-rule → <hr> → after-rule` 순서로 검사하도록 수정. 렌더러가 인라인 텍스트를 감싸는 기존 계약을 고려했다.
- 실행 환경에서 `git ls-remote https://github.com/yunskim/lexical-tufte-css.git HEAD`는 DNS 해석 실패(`Could not resolve host: github.com`). 로컬 checkout과 pnpm 설치도 없어 이번 턴 `pnpm check`/Playwright를 실행할 수 없었다. **검증 통과로 기록하지 않는다.** GitHub 커넥터로 소스 변경·커밋만 수행했다.
- 다음: 네트워크/checkout 및 Node/pnpm/Chromium이 준비된 실행 환경에서 `pnpm check`, `pnpm test:browser` 실행 후 F07 gate 판단. CI는 사용자 지시에 따라 생략.

## P2.2.c F07 실제 편집기 통합 회귀 추가

- `tests/section-commands-browser.mjs`: 실제 툴바 `구분선 삽입` → React DOM `<hr>` → JSON `horizontalrule` → 독립 발행 HTML `<hr>` → undo/redo → 기존 문서 복귀를 기존 P2.2.a 흐름에 연결.
- 구분선 이후 기존 노트·저장/불러오기 회귀를 계속 수행하도록 원상 복귀한다.
- **이번 변경의 브라우저 테스트는 실행하지 않았다.** 성공 여부·F07 완료 판정은 보류한다. 다음: `pnpm build`, `node tests/section-commands-browser.mjs`, 전체 관련 회귀 및 실패 시 ERROR_LOG/ERROR_PREVENTION 갱신.

## P2.2.c F07 JSON 복원·History 회귀 추가

- `quotation-commands.test.mjs`에 공식 History 등록 후 구분선 삽입/undo/redo 및 새 headless editor의 JSON 복원 동등성 검사 추가.
- 기존 정상 삽입·거부 회귀와 함께 F07 구조 보존 검증 범위를 확장했다.
- **테스트 코드는 작성했으나 이번 턴에 실행하지 않았다.** 타입/빌드/HTML 발행/React UI 연결 및 브라우저 검증은 미완료. F07 전체 체크 유지.

## P2.2.c F07 구분선 명령 회귀 추가

- `packages/lexical/test/quotation-commands.test.mjs`: 섹션 안 구분선 삽입 후 기존 문단 보존 및 JSON `horizontalrule` 노드 검증, 섹션 밖 선택에서 원자적 거부·진단 검증.
- 명령은 공개 API에 연결되어 있다. **이번 추가 코드의 테스트/타입 검사/브라우저 검증은 실행하지 않았으며 F07 완료 판정은 보류**한다.
- 다음: 실제 HistoryPlugin undo/redo 및 발행 HTML 통합, React 툴바 명령 연결 검증.

## 2026-10-17 P2.2.c 구분선 명령 추가 (검증 대기)

- `packages/lexical/src/quotationCommands.ts`: `INSERT_TUFTE_HORIZONTAL_RULE_COMMAND` 추가. 선택·조합·섹션 경계 검증 후 공식 Lexical HorizontalRuleNode 삽입, history 경계 표시.
- `packages/lexical/src/index.ts`: 공개 명령 export 추가.
- 이번 변경은 아직 타입 검사·빌드·단위/브라우저 테스트를 실행하지 않았다. F07 완료 판정 보류. 다음 단계: 명령 회귀·UI 연결·F07–F09 통합 검증.

# 진행 기록

## 2026-10-17 Recovery HTTP 추가 검증 종료

- main5fb4d20에서 frozen/check253개/browser11개/package4개, Python 격리 설치/pytest16개 및 실제 TS→Python HTTP→SQLite 왕복 통과. CI 생략.
- E076 SQL all 타입/E077 Python 모듈 설치/E078 middleware 본문 유실을 수정하고 M069–M071 반영. 실행 버전 constraints와 재현 명령 기록.
- [후속 검증 보고서](VERIFICATION_RECOVERY_HTTP_2026-10-17.ko.md)의 체크리스트로 이번 검증 작업 종료. 운영 인증 제공자·배포·원격 복구 UI 및 P2–P7 전체 gate는 계속 미완료.

## 2026-10-17 최신 저장소 검증 작업 종료

- main038e551의 새 clone에서 frozen 설치, check237개(실패/skip0), browser11개, package4개 소비 검사, diff 검사 통과. CI 없음.
- 복구본 타입 술어, 복수 status selector, 최초 폰트 paint 대기를 수정. E072–E075/M066–M068/M058 기록·반영.
- 추가 recovery browser로 조기 pagehide flush·탭 격리·손상 JSON 실제 다운로드·삭제 취소/확인 검증.
- [최신 검증 보고서](VERIFICATION_2026-10-17.ko.md)의 체크리스트로 이번 검증 작업을 닫는다. P2–P7/figure UI 전체 gate·OS IME·한국어 fallback 등은 미완료로 유지한다.

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

## 2026-10-16 — F15 fullwidth container

- `packages/lexical/src/FullwidthNode.ts`: 전체 폭 블록의 ElementNode와 JSON import/export, 편집 DOM 구현.
- index 공개 API 등록, paragraph/quote를 포함한 fullwidth 구조의 strict document roundtrip 테스트 추가.
- 실제 빌드·테스트 실행 및 Tufte CSS 반응형 시각 검증은 미완료. F15 및 P2.2/P2.3 완료 체크 보류. CI 없음.
- 다음 순서: F17 코드 블록 노드 및 공백·탭·언어 정보 보존.

## 2026-10-16 — F17 code block node

- `packages/lexical/src/CodeBlockNode.ts`: `tufte-code`의 width(body/fullwidth), language, JSON import/export와 편집용 pre DOM 추가.
- 공개 API 및 선행 공백·탭·개행을 포함한 왕복 테스트 추가.
- `@lexical/code`의 실제 TabNode/LineBreakNode와 구문 강조 노드 호환성 및 pre>code 발행 구조는 별도 검증 필요. 빌드·테스트 실행 미확인, F17 완료 체크 보류. CI 없음.
- 다음: F19 ImageQuilt 노드와 자산·크기 계약.

## 2026-10-16 — F19 ImageQuilt node

- `packages/lexical/src/ImageQuiltNode.ts`: ImageQuilt 이미지 자산의 URL/alt/assetId/width/height 검증과 JSON import/export 추가.
- 공개 API 연결, fullwidth figure 내부 이미지 자산 왕복 및 잘못된 URL/크기 거부 테스트 작성.
- 실제 빌드·테스트 미실행, asset fixture의 metadata 계약 일치 및 CSS 레이아웃 확인 필요. F19/P2.3 완료 체크 보류. CI 없음.
- 다음 순서: F18 embed node의 provider URL allowlist, wrapper/비율/제목 보존.

## 2026-10-16 — F18 embed 및 Lexical/Tufte 선행 사례 조사

- `packages/lexical/src/EmbedNode.ts`: YouTube/Vimeo 제한 URL, provider/title/wrapper/width/aspectRatio 직렬화 및 편집 DOM, 공개 API 추가.
- 왕복·URL allowlist 거부 테스트 작성. 실제 빌드·테스트 미실행; 발행 렌더러 및 iframe 비율·CSP 검증 전 F18 체크 보류.
- `docs/LEXICAL_TUFTE_REFERENCES.ko.md`: Lexical + Tufte CSS 직접 통합 공개 사례 미발견(검색 범위 한정), Tufte CSS 원본·Pandoc·txt2tufte·classless 변형·Lexical UI 참고 사례와 적용 원칙 기록.
- CI 없음. 다음: 새 노드들의 로컬 실행 검증 환경 복구 및 문서 계약 차이 수정이 우선.

## 2026-10-16 — 신규 노드/validator 계약 감사

- F18 EmbedNode aspectRatio 문자열→number(validator의 0.1..10) 수정 및 테스트 기대값 수정.
- F17 code language 정규식에서 validator가 허용하지 않는 점(.) 제거.
- F19 ImageQuilt 원본 width/height 필수 검사 및 부정 테스트 강화.
- 에러 E026 및 예방 대책 M026 추가. 실제 빌드·테스트 실행 환경 미확보로 완료 체크 보류. CI 생략 유지.
- 다음: 실행 환경 확보 후 pnpm check / node test를 순서대로 실행하고 발견된 실패 수정.

## 2026-10-16 — 실행 환경 재확인 및 F07 부정 테스트 보강

- 현재 실행 컨테이너 Node.js v22.16.0, pnpm 미설치. `git ls-remote https://github.com/yunskim/lexical-tufte.git HEAD` 실행 결과 `Could not resolve host: github.com`으로 실패. 이 환경에서는 저장소 clone 및 pnpm check 실행 불가.
- GitHub 연결 도구를 통해 F07 부정 테스트를 개선: Lexical 편집 중 잘못된 노드 삽입 대신 유효한 직렬화 상태를 변형해 validator와 bridge가 `INVALID_CHILD`를 거부하는지 검사.
- 테스트 실행 통과를 주장하지 않으며 P2/F07 완료 체크 보류. CI 추가 없음.
- 후속: 실행 환경 확보 전까지 validator/serialization 정적 대조 및 부정 테스트 보강. 실행 환경 확보 시 `pnpm install --frozen-lockfile && pnpm check && pnpm test:browser` 순서로 재검증.

## 2026-10-16 — F17/F18/F19 직렬화 계약 회귀 보강

- F18 제목 제한을 validator와 동일하게 1000자로 정렬.
- F19 SerializedImageQuilt의 width/height 필수화. 누락 입력은 런타임 validator에서 거부.
- F17/F18/F19의 serialized JSON에 대한 validator 정상·오류 매트릭스 추가.
- E027 기록. 실행 환경에서 GitHub DNS 접근 불가 및 pnpm 미설치 상태를 재확인; 빌드·테스트 미실행, 완료 체크 보류. CI 없음.
- 후속: Node 생성/편집/발행 HTML 계약까지 확대하고, 실행 가능 환경에서 pnpm check 및 browser regression 검증.

## 2026-10-16 — F15 fullwidth 순수 HTML 발행

- `packages/render/src/index.ts`: tufte-fullwidth를 div.fullwidth로 렌더링. 자식 블록 구조 유지, HTML escape는 공통 serializer 사용.
- `packages/render/src/profile.ts`: F15 발행 지원 목록 추가.
- `packages/render/test/render.test.mjs`: 중첩 paragraph/quote, escape, 입력 불변성, 금지된 중첩 fullwidth 진단 회귀 테스트 추가.
- 실제 빌드·테스트 실행 미확인. CSS/반응형 시각 회귀까지 확인 전 F15 완료 체크 보류. CI 없음.
- 다음: F17 code block의 pre/code 구조와 tab/linebreak 보존 렌더링, 이후 F18 embed의 iframe 안전 정책.

## 2026-10-16 — F17 code 발행 기본 경로

- 순수 렌더러에서 tufte-code를 pre/code로 출력, text/tab/linebreak의 정확한 공백·개행을 보존하고 HTML 특수문자를 escape.
- tree.ts에 pre 태그 허용. render profile에서 code/tab/code-highlight를 등록하되 language 및 highlightType 정보의 실제 발행은 아직 미구현이므로 fail-closed 진단.
- 공백/이스케이프/미지원 메타데이터 테스트 추가. 기존 미지원 노드 회귀 테스트는 F18 embed로 교체하여 F17 지원과 충돌하지 않도록 조정.
- 빌드 및 테스트 실행 미완료; CSS/시각 회귀와 language/highlight 발행을 검증하기 전 F17 완료 체크 보류. CI 없음.
- 다음: F18 iframe 안전 속성, 화면 비율과 CSP를 검토하고 순수 HTML 렌더러를 확장.

## 2026-10-16 — F18 iframe HTML 발행

- `packages/render`: YouTube/Vimeo 허용 URL은 document validator에서 검증하고, 순수 renderer는 iframe(title, lazy loading, strict-origin-when-cross-origin, sandbox, allowfullscreen)을 figure/div wrapper에 생성.
- aspectRatio 숫자를 iframe width=960 및 계산된 height로 출력, 반응형 CSS로 너비 100%와 intrinsic ratio를 사용하도록 구성. inline style은 사용하지 않음.
- F18 정상 출력·HTML escape·sandbox·URL 거부 테스트 추가. 이전 미지원 노드 테스트는 F19 ImageQuilt로 변경.
- 실제 빌드·브라우저 테스트 및 provider별 iframe 재생 호환성·CSP 검증 미완료. F18 완료 체크 보류. CI 없음.
- 다음: 렌더링 보안 정책과 iframe CSS 실제 동작 검증, F19 ImageQuilt 발행 및 asset 일치 검증.

## 2026-10-16 — F19 ImageQuilt HTML 발행

- `packages/render/src/index.ts`: tufte-imagequilt를 class=imagequilt, 원본 width/height, escaped alt/src를 갖는 img로 출력.
- `packages/render/src/profile.ts`: F19 노드를 지원 목록에 추가. `packages/render/styles.css`: figure 내부 imagequilt 반응형 최대 너비 및 자동 높이 지정.
- renderer tests: 기존 미지원 F19 회귀 테스트를 지원 기대값으로 갱신; 자산 메타데이터 일치 정상 발행, URL/크기/누락 asset ID 거부, 입력 불변성 테스트 추가.
- 실제 pnpm check, unit/browser 테스트 미실행. F19 완료 체크 보류, CI 생략 유지.
- 다음: 누적 렌더러 계약 감사, 실제 테스트 실행 환경 복구 및 문서/에디터/렌더러 end-to-end 회귀.

## 2026-10-16 — F18/F19 편집기·발행 HTML 정적 계약 대조

- F19 ImageQuilt exportJSON이 필수 width/height를 항상 포함하도록 변경 (타입 선언과 실제 JSON 일치).
- F18 EmbedNode.exportDOM이 발행 renderer와 동일한 iframe sandbox/referrer 정책, width/height, wrapper class를 사용하도록 조정.
- E028 기록. 현재 Node.js v22.16.0이지만 pnpm 없음; GitHub git 원격은 DNS 해석 실패. 실제 TypeScript 빌드, node/browser 테스트는 미실행. CI 없음.
- 후속: 로컬 검증 환경 복구 및 전체 테스트 통과 전 체크리스트 완료 표시 금지.

## 2026-10-16 — 다른 대화 반영분 전체 로컬 검증 완료

- 기준 main d78f4559826e13bfcccbdfec4a238613ce096011. 기존 로컬 P2.2 작업을 별도 보존하고 최신 main worktree에서 감사했다.
- 최초 check는 inspectStoredDocument 구문 손상으로 실패했고, 수정 후 진단 기대값·JSON 저장 값 비교·golden 누락을 발견/수정했다(E042–E044).
- 단위 140/140 PASS(document47/lexical67/render26), skip/fail/todo0. 실제 SQLite CAS·backup/restore 오류 주입 및 headless History reset 포함. 고정 Lexical golden을 실제 생성·검토해 필수화했다.
- 브라우저 6개 파일 전체 PASS. 기존 5개 회귀와 신규 publication 검사: 실제 정의목록/cite 편집, pre>code 공백/방향/정렬, 정상 자체 SVG, 5 embed 비율×5폭, CSP script-src none/style-src self. namespace 옛 selector, Vite 재탐색, iframe 비율/폭 및 코드 DOM 구조를 수정(E045–E049)했다.
- frozen install/typecheck/build/inventory72/diff check PASS. CI 실행/추가 없음. editor 번들516.28kB(gzip161.82kB) W001 유지.
- 상세 [검증 보고서](VERIFICATION_2026-10-16.ko.md), [R14](LOCAL_VERIFICATION_R14.ko.md), [노드 범위](P2_NODE_COVERAGE.ko.md). 과거 ‘미실행’ 기록은 이력을 보존하고 현재 보고서로 갱신한다.
- R01/R04/R06–R09/R12/R14 및 R03.a/b/c는 현행 지원 계약의 검증 범위에서 체크했다. R02/R03.d/R05/R10/R11/R13, P2.2–P7 및 전체 F표는 미완료. 웹폰트/OS IME/타 브라우저/접근성/provider 재생/블로그 운영을 검증했다고 주장하지 않는다.

## 2026-10-16 — R02 전체 노드 왕복 완료

- 기준 main457ed661f7e0ddc19c611e466c1a7b3f3b4e0f6d. TUFTE_NODES/CLASSES/TYPES/TESTED_LEXICAL_VERSION을 공개하고 예제 React 및 unit/browser 하네스를 같은33종 registry로 통일했다.
- 실제0.52.0에서 전체 document golden을 생성했다. node type 전수·대표 enum/nullable/asset/table variant·두 차례 실물 왕복·v2 migration 및 타입별 unknown field/future version 원자적 거부를 검사한다. normal 테스트는 golden을 쓰지 않는다.
- 추가 경계 점검에서 code-highlight null 소실(E050)을 발견해 전용 클래스/factory로 보존했다. facade 타입 미노출(E051)과 같은 type replacement 충돌(E052)도 수정·검증했다. M043–M045 적용.
- pnpm check178/178(document47/lexical104/render27), skip/fail/todo0. browser7개 전체 PASS; 실제 예제에서33종 문서 열기→term 입력→저장→재열기 및 null token/note ID/구조 보존. frozen install/diff check PASS. CI 없음.
- R02 체크 완료. 코드 syntax metadata 발행·공식 highlighter plugin 연동, 신규 삽입 명령/속성 UI, 복구 UX, 폰트/접근성은 별개 후속이다. editor JS557.00kB(gzip171.59kB) W001 유지.
- 증거: [R02 보고서](ROUNDTRIP_R02.ko.md), src/nodes.ts, CodeHighlightNode.ts, all-nodes.test.mjs, 전체 golden, tests/all-nodes-browser.mjs. 다음 R03.d 실제 문서 교체 history integration.


## 2026-10-16 R03.d — 문서 교체 history 통합 완료

- 일반/이관 loader와 실제 예제 복원에 공통 replaceEditorDocumentState 적용. 성공 시 이전 undo/redo 삭제, 새 문서를 첫 수정의 undo 기준으로 등록. 실패한 입력은 문서/이력 보존. 반복 로드도 같은 정책.
- [통합 계약](HISTORY_R03.ko.md): HistoryPlugin 등록, update 밖 호출, 기준 재설치의 listener 중복 가능성, 공유 history 및 Yjs 범위 명시. 레이아웃 예제 삽입은 기존 편집 이력 유지.
- 실제 registerHistory 두 loader 흐름 및 React UI 복원/첫 수정/실패 후 redo/재열기 검사. check180/180(document47·lexical106·render27, fail/skip0), browser7, diff check 통과. CI 생략.
- E053(clear 후 첫 수정 기준 소실)/E054(test double 통합 누락)와 M046/M047 기록·반영·검증. R03.d 및 현행 R03 완료 체크. 다음 R05. 전체 P2–P7 기능 완료를 뜻하지 않는다.


## 2026-10-16 R05 — 무효 레이아웃 복구 완료

- structureRecovery.ts의 비파괴 검사/문제 위치 이동, 실제 예제 복구 패널·undo 가능한 checkpoint 복구·항상 노출된 복구 사본 열기 구현. 자동 삭제나 임의 이미지/표 생성 없음.
- 무효 raw 상태는 별도 recovery localStorage에만 저장. 일반 저장 보호, prototype HTML 생성 차단 및 정본 renderArticle 전체 발행 차단. [정책](STRUCTURE_RECOVERY_R05.ko.md)에 전체 validator와 구조 검사 차이/메모리 checkpoint 제한 명시.
- check187/187(document47·lexical112·render28, fail/skip0), browser7, diff check 통과. E055/E056 및 M048/M049 기록·반영. CI 생략. R05 체크, 다음 R10.


## 2026-10-16 R10 — 텍스트 포맷 편집·발행 완료

- React 툴바에 밑줄/취소선/마크, 결합 decoration 및 light/dark 마크 CSS 연결. 본문·굵은 주석·링크에서 각 비트/조합/해제/undo·redo/내부 수정/저장 재열기를 검증했다.
- 실제 clipboard의 전체 주석 payload 교체에서 컨테이너 유실(E058)과 첫 수정의 빈 중간 상태(E059)를 수정. 기존 noteId/kind 및 포맷·주변 본문 보존, forward/backward 회귀 통과. E057의 전체 링크 교체는 기본 입력 의미로 별도 문서화.
- 정본 renderer의 u/s/mark 의미·URL·주석/strong 관계 및 실제 결합 CSS 확인. [계약](TEXT_FORMAT_R10.ko.md). check189/189(document47·lexical114·render28, fail/skip0), browser8 및 대상 clipboard 실행 통과. diff check 통과. CI 생략. R10 체크, 다음 R11.


## 2026-10-16 R11 — 실제 SQLite 공개 snapshot 생명주기 완료

- packages/blog 신설: 동기 SQLite 전용 SqlitePublicationStore, 별도 snapshotVersion1 SQL 저장 모델, SHA-256 snapshot ID/읽기 검증, immutable/retained triggers. 기존 draft document/metadata schema는 확장하지 않았다.
- 전체 draft revision+발행 generation 재검사 후 INSERT/공개 pointer를 한 transaction으로 전환. firstPublishedAt 보존, 비공개·재발행·과거 snapshot 조회, asset manifest 보존, slug 변경 거부, caller alias 차단. draft CAS 생성 시각 불변/updatedAt 역행 거부도 구현.
- blog12개: 실제 SQLite 전체 생명주기·두 연결 경쟁·preflight 중 draft 변경·asset/render 및 insert/pointer 실패·close/reopen·checksum 손상·옵션 mutation·시간 불변식 통과. [계약](PUBLICATION_LIFECYCLE_R11.ko.md), packages/blog/README.md.
- check201/201(document47·lexical114·render28·blog12, fail/skip0), browser8, frozen offline install, diff check 통과. E060/M053 기록·반영. CI 생략. R11 체크, 다음 R13. P5 filesystem/redirect/SSG/feed/실제 자산GC·인증·배포는 미완료.


## 2026-10-16 R13 — 라이선스 및 폰트 전략 검증 완료

- 소유자의 기존 GPL-3.0-only 유지·콘텐츠/코드 구분·외부 기여(DCO 권장/CLA 없음) 방침을 CONTRIBUTING과 [R13 계약](LICENSE_AND_FONTS_R13.ko.md)에 공개. prepack 고지 복사 및 실제4개 tarball의 JS/타입/문서 왕복/SQL export 검사 통과. private 유지, 배포/발행하지 않았다.
- 공식 Adobe Serif KR2.003/Sans KR2.005 고정 commit/해시. OFL reserved name에 따라 수정본 이름 변경, 대표4그룹×2family WOFF2 45,172bytes 생성. 전체 생산 글리프/굵기와 제품 연결은 P4.
- 8개 문자샘플+6개 노트/캡션/표 위치 원본 OTF 대조, cmap/hmtx/name 및 WOFF2/CSS/manifest 재생성 byte 일치. Latin-only 요청0, 혼합8, self CSP·150ms fallback→custom swap 확인. 기본 환경에 한국어 시스템 fallback이 없음을 유지하고 별도 fontconfig에서는 실제 SourceHanSansKR fallback glyph 사용 확인.
- check201/201(document47·lexical114·render28·blog12, fail/skip0), browser9, package4 tarball 소비/타입, frozen offline install, diff check 통과. 원본/지연/차단/별도 한국어 fallback 대상 검사도 추가 통과. E061–E066/M054–M059 기록·반영. CI 생략. R13 체크, R01–R14 선행 안정화 완료. 다음 P2.2.


## 2026-10-16 P2.2.a — 섹션·본문 블록 명령 완료

- registerSectionCommands 및 root 묶기/section 추가·블록 앞 분할·속성 일치 병합/paragraph·h2·h3 변환 명령과 실제 툴바 연결. 원본 rich payload·note ID·선택 offset·직렬화 속성 보존, 무효 selection/주석/표 셀/다중 블록/속성 불일치 거부. [계약](SECTION_COMMANDS_P22A.ko.md).
- 신규13개 단위/통합 및 실제 React 명령·undo/redo·저장/재열기·정본 renderer 검사. 패키지 fresh declaration 소비에도 새 명령 API 추가. check214/214(document47·lexical127·render28·blog12, fail/skip0), browser10, package4, frozen/diff 통과.
- E067 fixture 구문/E068 상태 관찰 순서 및 M060/M061 반영. CI 생략. P2.2.a만 체크. P2.2.b/c/d와 전체 F표는 계속 미완료.

## 2026-10-16 P2.2.b — 대화 통합 및 인라인 명령 착수

- 다른 대화의 최신 main과 체크리스트를 재조회: R01–R14 완료, P2.2.a 완료(check214/browser10/package4), 다음은 P2.2.b. 이전 대화의 검증 수치를 이번 환경의 재실행으로 혼동하지 않는다.
- packages/lexical/src/inlineCommands.ts 신규: SET_TUFTE_SPAN_KIND_COMMAND, registerInlineCommands. 기존 span에서 같은 요소 내 selection만 허용하고 IME 중·무효 kind·다른 span 선택은 진단 후 원자적 거부. 기존 자식과 note ID 보존.
- packages/lexical/src/index.ts export 및 lexical/test/inline-commands.test.mjs의 변경·거부 회귀 테스트 추가.
- 이번 변경의 로컬 pnpm check/browser는 미실행. P2.2.b 완료 체크 보류. CI 추가 없음.
- 다음: 테스트 실행, selection/history 및 실제 React 연결; 목록/정의목록 명령, F03/F05/F06 통합 회귀.

## 2026-10-16 P2.2.b 정의목록 명령 추가

- definitionCommands.ts 신규: 섹션 블록 뒤 정의목록 삽입, 현재 정의목록에 term/description 쌍 추가, 잘못된 선택·IME 조합은 진단 후 거부. index.ts 공개 API 반영.
- 선택 안정성을 위해 새 항목은 편집 가능한 용어/설명 초기 텍스트를 포함.
- 테스트 파일 추가 시 연결 도구 요청이 안전 검사에 의해 차단되어 미반영. 실행 검증 미완료이며 P2.2.b 체크 보류.
- 다음: 테스트 추가/실행 및 React 연결, F03/F05/F06 검증, P2.2.c로 이동. CI 없음.

## 2026-10-16 P2.2.b — 정의목록 테스트·실제 편집기 연결

- `packages/lexical/test/definition-commands.test.mjs`: 기존 문단 보존·정의목록 삽입·term/description 쌍 추가 및 선택 부재 원자적 거부 테스트 작성. 이전 도구 차단 상태 해소.
- `examples/editor/src/main.tsx`: registerInlineCommands/registerDefinitionCommands 등록 및 툴바에서 span kind 전환·정의목록 삽입·항목 추가 호출. 기존 mouseDown selection 보존 규약 적용.
- 로컬 환경에서 pnpm/저장소 checkout 미확보로 이번 커밋의 빌드·브라우저 테스트 실행은 아직 미검증. CI 없음. P2.2.b 체크 보류.
- 다음: 테스트 실제 실행, 명령 동작·undo/redo 및 F06 구조 검증, ol/ul 목록 명령 추가.

## 2026-10-16 P2.2.b — 목록 명령 회귀 및 스키마 경계

- 최신 main에서 listCommands.ts 및 React 툴바 연결이 이미 존재함을 확인해 중복 구현을 피함.
- packages/lexical/test/list-commands.test.mjs 추가: bullet 목록 삽입, 기존 문단 보존, 항목 추가, 잘못된 kind/selection 원자적 거부.
- listCommands.ts의 삽입 허용 위치 검사를 document NODE_SCHEMA['tufte-section']에서 직접 도출하도록 변경. 중복 허용 목록 제거.
- 사용자가 테스트는 Work에서 일괄 처리한다고 지시함. 이번 변경의 실행 테스트는 보류하며 P2.2.b 체크하지 않음. CI 없음.
- 다음: P2.2.c 인용문/출처/epigraph/section footer 편집 명령과 회귀 테스트 구현.

## 2026-10-16 P2.2.c — 인용 구조 편집 명령 착수

- quotationCommands.ts 신규: INSERT_TUFTE_QUOTATION_COMMAND (quote/epigraph/section-footer), APPEND_TUFTE_ATTRIBUTION_COMMAND (quote 내부 출처 및 cite). 잘못된 selection/IME/중복 출처는 진단 후 거부; 섹션 삽입 위치는 NODE_SCHEMA 기준 검증.
- 라이브러리 공개 API 및 React 툴바 연결, quotation-commands.test.mjs 회귀 코드 추가.
- 사용자 지시에 따라 테스트 실행은 Work 일괄 검증으로 이관. 실제 검증 전 P2.2.c 완료 체크하지 않음. CI 생략.
- 다음: 인용 구조의 직렬화·DOM·발행 renderer 교차 검토, P2.2.d 통합 검증 자료 준비.

## 2026-10-16 P2.2.d — 정적 계약 점검 및 Work 검증 인계

- quotationCommands.ts: 출처 삽입 대상 quote의 부모가 NODE_SCHEMA에 허용된 구조인지 추가 검사. 잘못된 구조에 대한 변형 거부.
- docs/P22_WORK_VERIFICATION.ko.md: P2.2.a–c 명령별 성공·거부 계약, JSON/renderer 왕복, undo/redo, selection/IME 및 명령 비동기 관찰 검증 체크리스트 작성.
- 사용자가 테스트는 Work에서 일괄 처리하기로 결정함. 이 대화에서는 테스트 미실행, P2.2.d/F01–F09 완료 표시 보류. CI 없음.
- 다음: P2.3 F10–F19의 미구현 편집 조작과 데이터/발행 경계 정적 검토를 진행하되 Work 결과와 충돌하지 않도록 검증 기록 분리.

## 2026-10-16 P2.3 — F13/F14 그림 편집 명령 착수

- packages/lexical/src/figureCommands.ts: INSERT_TUFTE_FIGURE_COMMAND (src/alt/optional caption/width) 및 SET_TUFTE_FIGURE_WIDTH_COMMAND (body/fullwidth) 신규. 섹션·노트·IME·입력값 검증, history push, 공개 API 등록.
- packages/lexical/test/figure-commands.test.mjs: 이미지/캡션 구조와 기존 문단 보존, 잘못된 URL·선택 거부 테스트 코드 추가.
- 사용자 지시에 따라 실행 테스트는 Work에서 일괄 진행. 구현의 빌드·테스트 통과를 주장하지 않으며 P2.3/F13/F14 체크는 보류. CI 없음.
- 다음: 그림 명령 React UI 연결, width 변경 선택 접근성 및 figure 내부 marginnote/asset 경계 보완.

## 2026-10-16 P2.3 — 그림 명령 UI 연결

- registerFigureCommands의 CaptionNode 등록 전제 검사 보강.
- examples/editor/src/main.tsx에 그림 삽입 URL/alt/caption 입력, 본문 폭·전체 폭 명령 버튼 추가. 기존 toolbar selection 유지 방식 사용.
- 현재 width 명령은 figure 내부의 collapsed selection이 있어야 하며, 삽입 직후 이미지 노드 선택/캡션 없는 figure에서의 접근성은 Work 통합 검증 및 후속 UX 보완 대상.
- 테스트 실행은 사용자 지시에 따라 Work에서 일괄 처리. F13/F14 및 P2.3 체크 보류, CI 없음.

## 2026-10-16 P2.3 — 그림 선택 UX 보완

- SET_TUFTE_FIGURE_WIDTH_COMMAND: 기존 collapsed range selection에 더해 단일 figure/image node selection, 섹션의 element offset이 가리키는 figure도 대상으로 허용. IME 조합 및 노트 내부 selection은 거부.
- 섹션 offset 해석은 anchor.type==='element'일 때만 수행해 텍스트 offset과 혼동하지 않음.
- 실행 테스트는 Work 일괄 처리 대기. 신규 선택 분기·undo/redo·caption 없는 figure 검증이 필요. CI 없음, 완료 체크 보류.

## 2026-10-16 저장소 이름 변경

- GitHub 저장소 이름을 yunskim/lexical-tufte-css로 변경한 것을 API로 확인. README 제목·저장소 URL 갱신.
- npm 워크스페이스/패키지 식별자(@lexical-tufte/*)는 공개 API 호환성을 위해 그대로 유지. 저장소 rename과 패키지 rename을 혼동하지 않음.
- 후속 GitHub 작업은 yunskim/lexical-tufte-css를 정본 주소로 사용. CI 생략, Work 일괄 테스트 정책 유지.

## 2026-10-16 P2.3 — 그림 자산 메타데이터 보존

- INSERT_TUFTE_FIGURE_COMMAND에 assetId/imageWidth/imageHeight 옵션 추가. isIdentifier 및 양의 안전한 정수 검증 후 InlineImageNode에 전달해 직렬화 필드를 유지.
- figure-commands.test.mjs에 assetId/width/height 직렬화 필드 확인, 잘못된 식별자·음수 크기의 원자적 거부 회귀 코드 추가.
- 외부 자산 스토어 업로드/조회 연동은 아직 구현하지 않음. 기존 자산 참조를 편집 문서에 전달하는 범위만 지원.
- 테스트 실행은 Work 일괄 처리 대기. P2.3 완료 표시 보류, CI 없음.

## 2026-10-16 P2.3 — F13 그림 내부 marginnote 삽입

- INSERT_TUFTE_FIGURE_MARGINNOTE_COMMAND 추가: 선택된 figure 내부에 marginnote 삽입, noteId 형식·문서 전역 중복 검사, IME/선택 조건 검사, history push, caption 앞 배치.
- 공개 API 및 examples/editor의 그림 여백 주석 입력 버튼 연결.
- noteId 자동 생성, 이미지 업로드, 그림-주석 이동/복사 시 ID 재발급, 렌더러·접근성·undo/redo 검증은 후속 작업.
- 테스트 실행은 Work 일괄 처리 대기. P2.3/F13 체크 보류, CI 없음.

## 2026-10-16 P2.3 — 그림 주석 ID/클립보드 회귀 보강

- figureCommands의 문서 전체 주석 ID 검색을 기존 $collectNoteIds()로 공통화하여 검사 경로 중복 제거.
- figure-commands.test.mjs에 figure 내 marginnote 삽입 순서, kind/ID/내용, 중복 ID 거부 및 중첩 figure 복사 노드의 $reidentifyPastedNotes ID 재발급 검증 코드를 추가.
- 실제 DOM clipboard 이벤트 연결·브라우저 복사/붙여넣기·undo/redo 검증은 Work에서 별도 확인 필요. 테스트 실행하지 않음, CI 생략, 체크리스트 완료 보류.

## 2026-10-16 P2.3 — 그림 포함 cut/paste 주석 ID 처리

- React 편집기 CUT_COMMAND의 cutIds 수집을 RangeSelection/NodeSelection 양쪽으로 확대하고, 선택된 figure 하위 NoteNode를 재귀적으로 수집하도록 수정.
- $reidentifyPastedNotes에서 cutIds가 중복 등장하는 입력에 대해 첫 원본 ID만 보존하고 후속 동일 ID는 새로 발급하도록 방어.
- 실제 브라우저 clipboard 이벤트, CUT_COMMAND와 SELECTION_INSERT_CLIPBOARD_NODES_COMMAND 간 이벤트 순서, 편집·삭제·undo/redo는 Work 검증 대기. 실행 테스트 없음, CI 생략, 체크리스트 완료 보류.

## 2026-10-16 P2.3 — clipboard ID 재검토

- $reidentifyPastedNotes의 기존 existing 집합이 붙여넣기 payload 내 중복을 이미 차단하므로 중복 processed 집합을 제거.
- 문서에 이미 연결된 그림의 동일 noteId가 cutIds에 포함되어도 기존 문서 ID와 충돌하면 재발급되는 회귀 케이스 추가.
- 실제 cut 후 노드가 분리된 경우 원본 ID 보존, DOM paste 이벤트, undo/redo, figure note 삭제는 Work 검증 대기. 테스트 실행하지 않음, CI 생략.

## 2026-10-16 P2.3 — 그림 내부 marginnote 삭제

- REMOVE_TUFTE_FIGURE_MARGINNOTE_COMMAND(noteId) 추가. 선택된 FigureNode의 직접 자식 marginnote만 대상으로 하며, ID 형식·선택·존재 검증과 history push 처리.
- packages/lexical 공개 API 및 examples/editor의 그림 여백 주석 삭제 버튼 연결.
- docs/PLAN.ko.md의 저장소 정본 URL을 lexical-tufte-css로 정정.
- 삭제/삽입/undo/redo와 브라우저 동작 테스트 실행은 Work 일괄 처리 대기. CI 생략, F13 완료 체크 보류.

## 2026-10-16 P2.3 — 그림 여백 주석 수정과 삭제 회귀

- UPDATE_TUFTE_FIGURE_MARGINNOTE_COMMAND({noteId,text}) 구현 및 공개 API/React 예제 버튼 연결. 선택된 figure의 직접 자식 marginnote에 한정, ID/본문 검사, 동일 본문 no-op, history push.
- figure-commands.test.mjs에 주석 텍스트 변경과 삭제 후 figcaption/이미지 형제 유지 검증 추가.
- 명령 기반 수정은 기존 rich phrasing을 일반 텍스트로 대체하므로 링크·강조 유지 편집과 구별. 실제 Undo/Redo 및 브라우저 편집 테스트는 Work 일괄 실행 대기. CI 생략, F13 완료 체크 보류.

## 2026-10-16 P2.3 — Work 검증 인계 확대

- figure-commands.test.mjs에 잘못된 수정 내용·존재하지 않는 ID에 대한 원자적 거부 테스트 추가, 연결된 cut payload 테스트 이름을 실제 의미에 맞게 수정.
- docs/P23_WORK_VERIFICATION.ko.md 신규 작성: figure/주석 삽입·수정·삭제, Undo/Redo, Node/Range clipboard, 자산 참조, 발행 HTML·반응형·접근성 및 비동기 commit 경계 확인.
- 테스트 실행은 Work로 이관; 아직 통과 증거 없음. CI 생략, 완료 체크 보류.

## 2026-10-16 P2.3 — 오류 대책 재점검

- figure-commands.test.mjs의 중복 ID fixture가 고정 ID 생성기를 사용하여 두 번째 재발급에서 최대 100회 충돌 후 throw할 수 있던 오류를 수정. 서로 다른 ID 2개를 기대하도록 변경. 실행 검증 대기.
- E059/M052(빈 NoteNode 중간 상태 방지) 재점검 결과 UPDATE_TUFTE_FIGURE_MARGINNOTE_COMMAND의 note.clear() 후 append 경로가 같은 위험을 재도입했음을 확인. 새 자식 append→기존 자식 remove 순서로 수정.
- P2.3 Work 검증에서 주석 수정 후 selection·Undo/Redo 및 자식 구조 확인 필요. 테스트 실행하지 않음, CI 생략, 완료 체크 보류.

## 2026-10-16 P2.3 — figure note 교체 선택 보존

- E059/M052 재발 방지에 따라 figure note 텍스트 교체를 새 자식 추가→새 텍스트 선택→기존 자식 제거 순서로 변경.
- figure-commands.test.mjs에 교체 직후 RangeSelection이 새 텍스트 끝에 유지되는지 검사하는 회귀 추가.
- 실행 테스트 및 브라우저 Undo/Redo 검증은 Work 대기, CI 생략, F13 완료 보류.

## 2026-10-16 P2.3 — 클립보드 cut ID 무효화

- React 예제 COPY_COMMAND에서 이전 CUT_COMMAND로 수집된 cutIds를 초기화하도록 변경하고 cleanup을 등록. 잘라내기 후 복사 전환의 stale ID 위험 완화.
- P23_WORK_VERIFICATION.ko.md에 cut→copy→paste 및 clipboard 이벤트 순서 검증을 추가. 외부 앱 clipboard 변경·취소된 copy/cut의 provenance는 미해결 제한.
- 테스트 실행하지 않음, CI 생략. Work 검증 후 완료 여부 판정.

## 2026-10-16 P2.3 — 오류/대책 문서 정기 점검

- E069–E071에 최근 figure note 테스트 ID factory, 빈 NoteNode 교체, cut→copy provenance 문제를 실제 원인·수정·미검증 상태로 등록.
- M062–M064에 고유 ID 생성 계약, 새 자식 선택 후 이전 자식 제거, clipboard 상태 전환 규칙을 추가. E059/M052 및 E067/M060 재점검.
- Work 일괄 실행과 브라우저 검증 전까지 수정 사항을 verified로 승격하지 않음. CI 생략.

## 2026-10-16 P2.3 — 코드 블록 삽입 API 착수

- `packages/lexical/src/codeCommands.ts`: INSERT_TUFTE_CODE_COMMAND 및 registerCodeCommands 추가. payload text/width/language 검사, 최상위 section의 선택 위치 및 IME/노트 중첩 거부, history tag 처리.
- `packages/lexical/src/index.ts`에 공개 API export 추가.
- 아직 React 예제 등록·회귀 테스트·빌드/실행 검증 전. Work 일괄 검증 대기, CI 생략, P2.3 체크 미완료.

## 2026-10-16 clean checkout 검증 피드백 대응

- 외부 Work 검증 보고: Node 22.22 clean checkout에서 루트 pnpm check의 blog typecheck가 render 선행 빌드 누락으로 실패. 루트 typecheck를 pnpm build → pnpm -r typecheck로 변경.
- Lexical 명령 테스트 9건의 비동기 커밋 읽기 실패 보고에 따라 definition/figure/inline/list/quotation 5개 테스트 파일의 dispatchCommand 뒤에 discrete update flush를 추가. 실제 회귀 성공 여부는 재실행 전 미확정.
- 설계 검토에서 저장소 책임 혼재, 파일/SQLite 정본 불일치, snapshot purge, v2→v1 렌더 변환, invalid draft 복구 슬롯을 후속 높은 우선순위로 식별.
- 이 변경 이후 pnpm check·browser·package 검증을 아직 실행하지 않음. CI 생략. 과거 README 검증 개수를 현재 통과 결과로 인용하지 말 것.

## 2026-10-16 발행 purge·무효 편집 복구 설계

- `docs/PUBLICATION_PURGE_AND_RECOVERY.ko.md` 신규: 현재 snapshot 불변 트리거/FK, 긴급 비공개와 영구 purge 분리, 감사·권한·generation 재검사, 백업/CDN 삭제 범위, 정식 posts_v2와 격리된 무효 Lexical 복구 슬롯의 저장·충돌·보안 계약 정의.
- SQL migration·purge API·recovery adapter는 미구현. Work 검증 전 설계 완료를 기능 완료로 표시하지 않음. CI 생략.

## 2026-10-16 editor recovery v1 초기 구현

- blog/sql/002_editor_recovery_v1.sql에 정식 posts_v2와 분리된 세션별 복구 슬롯 추가.
- blog/src/recovery.ts에 원본 JSON 복구 저장/읽기, 2MB 크기 제한, sequence CAS, BEGIN IMMEDIATE, SHA-256 checksum 검증 추가. blog 공개 API에 export.
- blog/test/recovery.test.mjs에 구조적으로 무효한 JSON의 복구, stale CAS, 변조, 잘못된 JSON/크기 회귀 fixture 추가.
- 아직 실행 검증 전. 편집기 자동 저장 UI, 복구 선택, 권한/보존 정책, purge 구현은 미완료. CI 생략.

## 2026-10-16 복구 슬롯 CAS 삭제 및 세션 격리

- SqliteEditorRecoveryStore.remove(postId,sessionId,expectedSequence): BEGIN IMMEDIATE에서 현재 순번 비교 후 해당 슬롯만 삭제; stale/missing 요청은 RECOVERY_CONFLICT.
- recovery.test.mjs에 두 번째 저장 이후 stale 삭제 거부, 정상 삭제, 다른 session 보존 회귀 추가.
- 테스트·빌드 실행은 Work 일괄 검증 대기. CI 생략. 자동 저장/복구 UI·호스트 권한·보존 정책·purge 구현은 아직 미완료.

## 2026-10-16 브라우저 자동 복구 저장 초기 연결

- examples/editor/src/main.tsx: Lexical update listener에서 내용 변경 시 800ms debounce로 현재 JSON을 localStorage 복구 슬롯에 저장, 성공/실패 상태와 복구본 존재 여부 표시, 복구 버튼 연결.
- 이 예제는 SQLite recovery store와 연결되지 않으며 세션 CAS·서버 권한·보존 정책을 제공하지 않는다. 기존 수동 저장/정상 문서 슬롯과 구분한다.
- 아직 browser/typecheck/회귀 실행 전. 타이머 종료 시 pending write가 취소되는 한계와 탭 충돌/스토리지 quota 문제는 후속 Work 검증 및 개선 대상. CI 생략.

## 2026-10-16 자동 복구 종료 flush

- editor 자동 복구의 마지막 미저장 EditorState를 보존하고 visibilitychange(hidden), pagehide, React cleanup에서 동기 localStorage flush를 시도하도록 변경.
- 오류 예방 M065 추가. 강제 종료, 브라우저 제한, 여러 탭 충돌은 여전히 미해결. 브라우저/타입/회귀 실행은 Work 대기; CI 생략.

## 2026-10-16 탭별 복구본 격리

- editor 예제의 localStorage 복구 키를 세션 UUID별로 분리하고 저장 시각 메타데이터 추가. storage 이벤트로 복구본 존재 여부 갱신.
- 복구 UI는 저장 시각 목록을 prompt로 선택하고 confirm 후 편집기 상태를 교체. 기존 v1 단일 키는 자동 이관하지 않음.
- 저장본 누적 정리, 세션 복원 식별자 지속성, 접근 제어, SQLite 연동, Work 브라우저 검증은 미완료. CI 생략.

## 2026-10-16 복구본 이관 및 보존 한도

- editor 예제에서 legacy v1 단일 복구본을 v2:legacy 슬롯으로 복사하고 복사본 확인 후 원본 삭제.
- 정상 메타데이터가 있는 일반 세션 복구본을 최신순 최대 12개로 제한. 읽을 수 없는 항목과 legacy 항목은 자동 삭제하지 않음.
- 복구 선택 prompt 취소(null)를 명시적으로 처리해 첫 항목이 잘못 선택되는 문제 방지.
- Work 브라우저/타입 테스트 미실행. 저장 공간이 이미 꽉 찬 경우 최초 새 복구본 기록은 여전히 실패할 수 있고, 복구본 정리 UI/SQLite 연결/권한 처리는 미완료. CI 생략.

## 2026-10-17 복구본 정리 정책 보완

- editor 예제에 세션별 복구본 목록·명시적 삭제·확인 UI 추가. 저장 실패 시 복구본 확인 안내.
- 기존 자동 최대 12개 정리 로직은 복구 가능성이 있는 유일한 사본을 예고 없이 삭제할 수 있어 제거함. 이전 진행 기록의 자동 정리 정책은 현재 코드에 적용되지 않음.
- 복구본 용량·보존 기간 정책과 SQLite 연동은 미완료. 실제 빌드/브라우저 테스트는 Work 검증 대기. CI 생략.

## 2026-10-17 복구본 JSON 내보내기

- editor 예제에 복구본 선택 후 원본 localStorage JSON을 파일로 내보내는 버튼 추가. 복구본 정리 전에 외부 보관 가능하며 손상된 문서를 임의로 파싱·수정하지 않음.
- 브라우저 다운로드 성공 보장 및 실제 검증은 아직 하지 않음. SQLite 연결, 복구 UI 개선, 자동 보존기간/용량 정책은 후속. CI 및 테스트 실행 생략(Work 대기).

## 2026-10-17 SQLite 복구 세션 목록 API

- `packages/blog/src/recovery.ts`: `SqliteEditorRecoveryStore.list(postId)` 추가. 해당 글의 복구 세션 메타데이터를 저장 시각 내림차순으로 반환하며 원본 payload는 반환하지 않는다.
- 입력 ID 검증 및 DB 조회 실패 진단을 유지한다. 원본 조회·무결성 검사는 기존 `read`를 사용한다.
- 테스트·타입 검사·브라우저 검증은 사용자 요청에 따라 일괄 실행 시점까지 보류. CI 생략. 완료 판정 보류.
- 다음: 복구 목록 조회의 회귀 테스트 코드 작성, 호스트 저장소 어댑터 계약과 편집기 연결 경계 정의. 브라우저 localStorage를 SQLite 정본과 혼동하지 않는다.

## 2026-10-17 복구 HTTP 경계 회귀 코드 및 입력 강화

- `packages/blog/test/recovery-http.test.mjs`: GET 목록/원문 읽기, PUT CAS, DELETE CAS, 권한 거부, 경로·본문 불일치, 지원하지 않는 메서드 회귀 코드 추가.
- `packages/blog/src/recoveryHttp.ts`: 요청 본문의 `checksum` 필드 제공을 명시적으로 거부하고 서버 저장소가 계산하도록 강제. 위조 checksum 입력 회귀 추가.
- 실행 테스트·타입 검사·브라우저 검증은 사용자 요청에 따라 보류. CI 생략. 완료 체크 보류.
- 다음: 실제 인증·CSRF를 포함하는 호스트 연결 및 브라우저 어댑터. 프레임워크 중립 dispatcher만으로 인증된 HTTP 서버가 만들어진 것은 아니다.

## 2026-10-17 브라우저 복구 클라이언트 회귀 코드

- `packages/blog/test/recovery-client.test.mjs` 추가: 경로·쿠키·CSRF 헤더·캐시 정책·CAS 요청 및 오류 응답 검사 코드.
- `packages/blog/src/recoveryClient.ts`: JSON 파싱 실패를 네트워크 오류와 구분하고 HTTP 성공 여부와 Result.ok의 불일치를 프로토콜 오류로 처리.
- 테스트·타입 검사·CI 실행은 사용자 지시로 보류. 브라우저 편집기 UI 연결과 실제 호스트 보안 구현 미완료.

## 2026-10-17 Python Recovery HTTP v1 계약 검증 준비

- FastAPI의 HTTPException/RequestValidationError를 공통 Result 오류 envelope로 매핑하는 코드를 추가하고 savedAt 시간대 유효성 검사를 추가했다.
- `apps/recovery-server/tests/test_contract.py`에 CAS·checksum·목록 metadata·삭제·권한 거부·입력 오류 계약 테스트 코드를 작성했다.
- 미완료: 실제 호스트 인증·CSRF, request body 상한, 오류 코드 전 범위 일치, Python↔TypeScript 공통 fixture, 테스트 실행. CI 생략.

## 2026-10-17 Python 서버 계약 정합성 점검

- 요청 본문 제한/Content-Type 조기 거부 응답에도 `Cache-Control: no-store`를 부여하도록 수정했다.
- Python 계약 테스트의 DELETE+JSON 호출을 `TestClient.request('DELETE', ..., json=...)`로 변경해 HTTPX 호출 규약과 일치시켰다.
- 테스트·CI는 실행하지 않았다. 인증/CSRF 운영 연결, Python–TypeScript 실행 상호운용 검증, 응답 코드 전 범위 점검은 미완료다.

## 2026-10-17 인증 우선 처리

- 복구 API 경로에서 본문 파싱 및 크기 검사 이전에 호스트 인증·게시글 접근권·변경 요청 CSRF 정책을 호출한다.
- 인증 거부 시 403 오류 envelope 및 no-store를 즉시 반환한다. 승인 결과는 요청 상태에 보존해 엔드포인트에서 중복 호출하지 않는다.
- 미인증 요청의 잘못된 Content-Type 우선순위 및 인증 콜백 1회 실행 회귀 테스트를 작성했다.
- 테스트/CI 미실행. 실제 호스트 제공자 연결과 실행 검증은 여전히 필요하다.
