# 에러 기록

실제 발생한 실패를 기록한다. 재발 방지 대책은 [ERROR_PREVENTION.md](ERROR_PREVENTION.md)에 별도로 관리한다. 실패한 실행을 성공으로 덮어쓰지 않는다. 로그에 토큰·개인정보를 넣지 않는다.

상태: open / investigating / mitigated / verified / reopened. `verified`는 명시한 검증 범위에 한정하며 모든 환경에서 해결됐다는 뜻이 아니다.

## E001 — workspace 밖에서 설치 실행

- 발생: 2026-10-16, P0. Node 24.19.0 / pnpm 11.25.0.
- 증상: `ERR_PNPM_NO_PKG_MANIFEST`, 프로젝트 상위 경로에서 `pnpm install` 실행.
- 원인: 파일 생성 경로와 명령의 workdir가 달랐다.
- 처리: lexical-tufte-work를 workdir로 지정해 설치, frozen install·check 통과.
- 상태: verified. 대책: M001. 증거: docs/PROGRESS.md의 P0 검증.

## E002 — 임시 smoke 코드 문법 오류

- 발생: 2026-10-16, P0 headless smoke.
- 증상: `SyntaxError: Unexpected token ')'`.
- 원인: 즉석 heredoc 코드의 닫는 괄호 중복. 첫 실행은 모듈 import 전에 실패했다.
- 처리: 괄호와 실행 디렉터리 기준 import 경로를 수정, 한글 JSON smoke 통과. 이후 반복 검증을 `packages/lexical/test/note.test.mjs`의 실행 가능한 파일로 옮겼다.
- 상태: verified. 대책: M002. 증거: `pnpm test`의 실제 테스트 2개 통과.

## E003 — 새 export 및 CSS 타입을 소비자가 찾지 못함

- 발생: 2026-10-16, P1.1 첫 `pnpm check`.
- 증상: NoteNode 등 export가 없다는 TS2305, CSS side-effect import TS2882.
- 원인: 소비자가 이전 dist 선언을 읽었고 Vite CSS 타입이 tsconfig에 없었다.
- 처리: 예제 typecheck는 workspace 소스 paths를 사용, `vite/client` types 추가. 브라우저 테스트 명령은 build 후 실행.
- 상태: verified. 대책: M003. 증거: `pnpm check`, `pnpm test:browser` 통과.

## E004 — 브라우저 배포 파일 다운로드 실패

- 발생: 2026-10-16, P1.1 환경 준비.
- 증상: Playwright CDN의 첫 다운로드에서 ZIP central-directory 오류. 런타임 Playwright 1.62.1의 Chromium 151 설치는 실패했다.
- 원인: 수신된 다운로드가 유효한 ZIP이 아니었다. 네트워크/캐시의 구체적 원인은 확인하지 못했다.
- 처리: 별도 검증용 Playwright 1.51.1을 고정. 해당 설치기의 공식 Microsoft 대체 배포 경로에서 Chromium 134와 headless shell 설치 성공.
- 상태: mitigated. 이 환경의 검증 기준 확보이며 최신 브라우저 다운로드 문제가 해결된 것은 아니다.
- 대책: M004. 증거: pnpm-lock.yaml, docs/DEPENDENCIES.md, Chromium 회귀 테스트 결과. 최신 브라우저 검증 확대는 P6.

## E005 — 일반 Chromium 실행 제한

- 발생: 2026-10-16, P1.1 브라우저 테스트.
- 증상: 일반 Chrome binary가 process singleton socket 생성 중 `Operation not permitted`로 종료.
- 원인: 현재 실행 환경에서 해당 OS 기능을 사용할 수 없음. 상세 정책은 확인하지 못했다.
- 처리: Playwright의 기본 headless shell로 실행해 테스트 통과. 시스템 권한은 변경하지 않았다.
- 상태: mitigated. 대책: M004. 증거: tests/note-browser.mjs의 기본 launch 경로 및 통과 결과.

## E006 — 테스트 서버 연결 실패

- 발생: 2026-10-16, P1.1.
- 증상: `ERR_CONNECTION_REFUSED`, 다른 실행에서 시작한 서버 또는 readiness 확인 없이 서버를 사용.
- 원인: 해당 테스트에서 사용할 서버의 접근 가능·준비 완료를 보장하지 않았다. 네트워크 격리 여부는 확정하지 않았다.
- 처리: 테스트가 직접 Vite 서버 시작→HTTP readiness 확인→브라우저 실행→서버 종료를 소유하도록 변경.
- 상태: verified. 대책: M005. 증거: tests/note-browser.mjs 전체 시나리오 통과.

## E007 — 노트 경계 입력이 본문으로 빠짐

- 발생: 2026-10-16, P1.1 실제 Chromium 테스트.
- 증상: Alt+↓로 노트 시작점에 진입한 후 입력한 텍스트가 본문에 들어감. 이후 링크 삽입이 ‘먼저 노트 안으로 이동’ 메시지로 거부됨.
- 확인한 원인: Lexical 0.52의 inline 경계 입력/선택 정규화. canInsertTextBefore/After 변경과 CONTROLLED_TEXT_INSERTION_COMMAND만으로 해결되지 않았다.
- 처리: prototype 편집기에서 일반 insertText의 노트 경계 beforeinput을 Lexical 기본 처리 전에 직접 반영. IME/composition은 이 guard에서 제외.
- 상태: verified (P1.1 일반 insertText 범위). P1.2에서 드러난 별도 경계 문제와 수정은 E009–E011에 연결한다. Chromium 조합·paste·삭제·split/merge 회귀는 추가 통과했으며 OS별 실제 IME는 P6에 남긴다.
- 대책: M006. 증거: tests/note-browser.mjs의 진입 후 입력/노트 payload/본문 복귀 검증 통과. 후속 P1.2/P1.3.

## E008 — 접힌 검사 패널의 textarea 접근 실패

- 발생: 2026-10-16, P1.1 브라우저 테스트.
- 증상: role=문서 JSON locator가 30초 timeout.
- 원인: details가 접혀 있어 접근성 role 검색 대상에서 textarea가 숨겨짐. JSON 생성 오류는 아니었다.
- 처리: UI의 summary를 열고 값을 검사. 기본 테스트 timeout은 5초로 제한.
- 상태: verified. 대책: M007. 증거: JSON 저장→재로드→복원 비교 통과.

## 새 기록 양식

- ID / 날짜 / 작업 ID / 환경·버전:
- 재현 조건·명령 / 실제 증상 / 기대 결과:
- 확인한 원인 (미확인 사항은 따로 기재):
- 수정·우회 / 영향 범위 / 상태:
- 대책 ID / 회귀 검증 / 코드·문서·이슈 링크:
- 재발 시 이전 ID 연결·재발 횟수·기존 대책이 실패한 이유:

## E009 — 복사·붙여넣기 후 노트 구조가 재생성되지 않음

- 발생: 2026-10-16 P1.2 첫 Chromium 회귀 검사.
- 증상: 노트 전체 선택→Ctrl+C→본문 끝 Ctrl+V 이후 note 개수가 2개가 되지 않아 5초 timeout.
- 확인한 원인: NoteNode의 inherited extractWithChild=false로 노트 wrapper 없이 payload 텍스트만 복사됐다. 실제 본문에 plain text가 붙은 DOM을 확인했다.
- 처리: 노트 wrapper 추출을 보존하고 clipboard import에서 copy ID 재발급·같은 문서 내 cut 이동 ID 보존·중첩 note 붙여넣기 거부를 적용했다.
- 상태: verified (동일 namespace의 내부 rich clipboard와 plain text). 대책 M008: native clipboard 테스트에서 실제 MIME payload·붙여넣기 결과를 확인하고, 복제 ID와 내용 보존을 함께 검사한다.

## E010 — 노트 시작점의 한글 조합 입력 이탈

- 발생: 2026-10-16 P1.2 Chromium CDP composition 검사. E007의 미검증 범위를 확장한 결과다.
- 증상: `ㅎ→하→한` 조합 후 commit해도 note payload가 원문 그대로여서 `^한` 검사 실패.
- 확인한 원인: P1.1 일반 insertText guard가 composition을 제외했고, Lexical의 composition 시작 경계 heuristic이 본문 쪽으로 삽입했다.
- 처리: COMPOSITION_START_COMMAND에서 경계에 Lexical이 정리하는 임시 위치 표식을 제공한 뒤 기본 composition 처리로 넘긴다. 조합을 별도 editor로 이관하거나 직접 확정하지 않는다.
- 상태: verified (Chromium CDP 조합 시작/확정/취소/undo/redo 및 표식 제거 범위). OS별 실제 IME는 미검증. 대책 M009: 조합 시작/갱신/확정/취소를 실제 Chromium 입력 경로로 검사하고 중간 조합 상태를 문서 정본과 분리할지 검토한다. OS별 실제 IME 검증과 CDP 시뮬레이션을 구분한다.

## E011 — rich note 분할·병합 회귀 검사 실패

- 발생: 2026-10-16 P1.2 확장 Chromium 검사.
- 증상: 분할·병합·undo/redo 시나리오에서 기대 개수 1에 실제 0으로 실패. 다른 9개 시나리오는 통과.
- 확인한 원인: 노트 시작점에서 프로그램 방식 insertNodes가 링크를 본문으로 내보냈다. 이어 이미지 삽입은 노트 밖 선택으로 거부됐다. 분할·병합 자체의 유실은 아니었으며 P1.1이 일반 텍스트를 먼저 입력하는 시나리오여서 놓친 경계 변형이다.
- 처리: 경계의 phrasing 삽입을 전용 helper로 처리하고 toolbar·paste에 적용했다. split 후 merge에서 경계의 동일 속성 LinkNode를 다시 합쳐 wrapper 분할도 복원한다.
- 검증: 노트 시작점 링크/이미지 삽입, rich clipboard, 링크 내부 분할/병합과 undo/redo 통과.
- 상태: verified (prototype 지원 경로). 대책 M010: 실제 삽입 위치와 링크·이미지·노트 ID·내용을 단계별로 검사하고 명확한 assertion 위치를 기록한다.

## E012 — 이미지 발행 HTML에 편집 전용 속성 유출

- 발생: 2026-10-16 P1.3 DOM 분리 Chromium 검사.
- 증상: 발행 HTML의 img에 `contenteditable="false"`가 남아 편집 전용 속성 배제 assertion 실패.
- 확인한 원인: InlineImageNode.exportDOM이 편집용 createDOM을 그대로 재사용했다.
- 처리: 의미적 이미지 속성(src/alt) 생성만 공유하고 편집 전용 contentEditable 속성은 createDOM에서만 설정하도록 분리했다.
- 검증: tests/note-dom-browser.mjs에서 두 note 종류의 편집 속성 배제·마크업·export JSON 불변성·모바일 CSS 토글 및 전체 P1.1/P1.2 회귀 통과.
- 상태: verified (현재 주석·이미지 DOM export 범위). 대책 M011: 편집 DOM과 발행 DOM을 별도로 검사하고 발행 결과의 편집 class/data/contenteditable 유출을 회귀 테스트로 차단한다.

## E013 — table export의 DOM 반환 타입 불일치

- 발생: 2026-10-16 P1.4 타입 검사. 첫 build 결과를 회수하기 전에 두 번째 검사 묶음을 시작해 같은 타입 오류를 재확인했다.
- 증상: TS2322, exportDOM.after에서 querySelector의 Element를 반환하여 HTMLElement 계약과 불일치.
- 확인한 원인: table 선택 결과의 구체적 DOM 타입을 지정하지 않았다.
- 처리: querySelector<HTMLTableElement>로 구체화하고 타입 검사 후 후속 검증을 실행한다.
- 상태: verified (타입·빌드·후속 브라우저 검사 통과). 대책 M012: DOM export 반환 타입을 확인하고 선행 빌드가 끝나고 통과하기 전에는 의존 검증을 시작하지 않는다.

## E014 — 실패한 빌드 뒤 브라우저 검증을 실행함

- 발생: 2026-10-16 P1.4. E003/M003의 선행 build 규약을 ad-hoc 실행 묶음에 일관되게 적용하지 못했다.
- 증상: 선행 pnpm check가 실패했는데 다음 줄의 브라우저 검증이 실행되어 .editor 5초 timeout.
- 확인한 원인: shell 실행 묶음이 실패 시 중단하지 않아 새 export를 빌드하지 못한 상태로 UI를 실행했다. UI timeout만 별도 제품 오류로 해석하면 안 된다.
- 처리: 의존 검증 실행은 set -e 또는 &&로 fail-fast하고 기존 test:browser의 build 선행 조건을 유지한다.
- 상태: verified (타입·빌드·후속 브라우저 검사 통과). 대책 M012: 실행 묶음의 실패 전파와 선행 결과 회수도 점검한다.

## E015 — 스크롤 검증 fixture에 줄바꿈 가능한 문자열 사용

- 발생: 2026-10-16 P1.4 Chromium 레이아웃 검사. 타입·빌드·단위 6개는 통과했다.
- 증상: 실제/기준 CSS 비교는 일치했지만 scroll wrapper의 overflows가 false여서 강제 스크롤 조건 assertion 실패.
- 확인한 조건: 길게 반복한 fixture 문자열에 하이픈이 포함되어 줄바꿈 기회가 있었다. 긴 문자열이라는 이유만으로 min-content 폭 초과를 가정했다.
- 처리: 줄바꿈 기회 없는 연속 문자열로 실제/수동 기준 fixture를 수정하고 viewport·측정값을 assertion에 포함한다.
- 상태: verified (5개 viewport에서 실제 overflow와 문서 넘침 격리 확인). 대책 M013: overflow fixture는 길이뿐 아니라 줄바꿈 가능성과 scrollWidth/clientWidth를 확인하고, 기준 HTML 일치와 제품 요구 조건을 별도로 검사한다.

## W001 — 편집기 prototype 번들 크기 경고

- 발생: 2026-10-16 P1.4. Vite가 minified chunk 500kB 기준 경고를 출력했다. 빌드는 성공했다.
- 관측: 편집기 JS 약 511.80kB, gzip 160.49kB. TablePlugin을 포함한 개발 예제의 값이다.
- 상태: open (경고). 기준을 올려 숨기지 않는다. P3/P6에서 lazy loading/분할 및 성능 예산을 검토한다. 독자용 페이지에 편집기 번들을 넣지 않는 기존 경계를 유지한다.
- 대책 M014: 작성/독자 번들 경계와 실제 번들 크기를 P3/P6에서 확인하고 변경 전후 측정 결과를 기록한다.

## E016 — JSON fixture와 undefined 속성 있는 JS 객체를 직접 비교

- 발생: 2026-10-16 P1.5 headless 비교 실험.
- 증상: JSON roundtrip 비교에서 textFormat/colWidths 등의 `undefined` 속성이 actual에만 존재해 deepStrictEqual 실패.
- 확인한 원인: Lexical toJSON()의 JS 객체와 파일에서 읽은 JSON을 동일한 계층으로 비교했다. JSON.stringify는 undefined 속성을 생략하므로 저장 데이터 유실과 다르다.
- 처리: 저장/재읽기 계약은 JSON.parse(JSON.stringify(...))로 정규화한 JSON 값을 비교한다. 별도의 export 전후 메모리 상태 불변성 비교는 그대로 유지한다.
- 상태: verified. 대책 M015: JS 내부 객체·JSON 저장 값·발행 HTML의 비교 경계를 테스트마다 명시한다.

## E017 — 서버 DOM adapter에서 전역 HTMLElement 참조 실패

- 발생: 2026-10-16 P1.5 withDOM + headless HTML export 실험.
- 증상: NoteNode.after에서 `ReferenceError: HTMLElement is not defined`.
- 확인한 원인: custom export가 전역 constructor 기반 instanceof를 사용했지만 withDOM은 document/window 등을 제공하고 HTMLElement 전역은 설치하지 않는다. 브라우저 한 realm 검사로는 놓친 차이다.
- 처리: NoteNode/LayoutNodes의 검사에 Lexical isHTMLElement를 사용하여 전역 DOM constructor 의존을 제거한다.
- 상태: verified (전역 constructor 의존 제거; 전체 DOM export 제한은 E018로 분리). 대책 M016: Node 무DOM·withDOM·실제 브라우저 경로를 모두 회귀 검증하고 DOM node 판별에 전역 constructor를 가정하지 않는다.

## E018 — 고정 Happy DOM의 자기 자신 replaceWith에서 표 제거

- 발생: 2026-10-16 P1.5 withDOM export, TableLayout의 자식 table 누락.
- 확인: 독립 재현 `parent.append(table); table.replaceWith(table)` 후 parent가 비었다. Lexical HTML export는 after가 같은 element를 반환해도 replaceWith를 호출한다. 단순 :scope 문제라는 추정은 폐기했다.
- 처리: upstream/전역 prototype을 임시 패치하지 않는다. 고정 adapter의 실패와 finally 전역 복원을 회귀 테스트하고, 발행은 DOM 의존 없는 순수 renderer를 선택했다. DOM export 성공으로 보고하지 않는다.
- 상태: mitigated. adapter 경로는 미지원; P2.4에서 버전 갱신/명시적 adapter 도입 시 재검증. 대책 M017.

## E019 — package export 경로를 파일 경로처럼 import

- 발생: E018 최소 재현에서 node_modules 아래 `/dom` 파일 경로 import가 ERR_MODULE_NOT_FOUND.
- 처리: package cwd에서 공개 specifier `@lexical/headless/dom`으로 실행해 재현 성공.
- 상태: verified. M018: package exports는 공개 specifier로 해석하며 즉석 검증은 해당 package cwd에서 수행한다.

## E020 — JSON import 테스트에서 fixture 함수 호출 누락

- 발생: P1.5 추가 테스트가 객체 대신 fixture 함수 자체를 stringify해 정상 입력 assertion 실패.
- 처리: `const doc=fixture()`를 명시하고 정상 입력/미래 버전 입력을 같은 문서로 검사한다.
- 상태: verified (단위 15개와 전체 브라우저 회귀 통과). M019: fixture 생성 함수의 결과를 지역 변수에 고정하고 검증 대상을 명시한다.

## E021 — 대형 Git 변경 목록 출력 잘림을 JSON으로 파싱

- 발생: P1.5 GitHub 업로드 준비. 파일 내용을 모은 실행 결과가 출력 한도로 잘렸고 JSON.parse가 실패했다. 원본 파일은 변경되지 않았다.
- 처리: 충분한 출력 한도로 다시 읽고 head/tail·완전한 JSON 파싱을 확인한 뒤 tree 항목으로 사용한다. 중단된 결과를 업로드하지 않는다.
- 상태: verified (20개 파일의 완전한 JSON 파싱 확인). M020: 대형 도구 결과는 출력 예산/완결성을 확인하고 파싱 성공 이후에만 의존 mutation을 실행한다.

## E022 — 로컬 hard reset 자동 승인 거부

- 발생: P1 업로드 후 origin 동기화 명령의 reset --hard가 로컬 미커밋 작업 유실 가능성으로 자동 승인 검토에서 거부됐다. 명령은 실행되지 않았다.
- 처리: 기존 디렉터리를 보존하고 fetch 후 별도 worktree(work-p2)를 생성해 검증된 P1 커밋에서 재개했다.
- 상태: mitigated. M021: 동기화 시 미커밋 작업을 버리는 명령을 기본으로 쓰지 않고 독립 worktree/commit 등 보존 가능한 방법을 사용한다.

## E023 — 재귀 generic intersection type의 순환 alias 오류

- 발생: P2.1 document 최초 build, TS2456 JsonNode circularly references itself.
- 원인: generic Element alias가 intersection과 JsonNode children을 통해 순환했다.
- 처리: children을 interface ElementBase로 분리해 재귀 구조의 명시적 경계를 둔다. 선행 build 실패로 render typecheck는 실행되지 않았다.
- 상태: verified (공유 build·소비자 typecheck·단위 26개 통과). M022: 재귀 노드 계약은 interface 경계를 사용하고 소비자 타입 검사까지 통과 후 완료 처리한다.

## E024 — beforeinput 취소 시점과 Lexical update 경계

- 발견: 2026-10-16 R04 공통 noteEdgeTyping 추출 코드 검토. 비동기/지연 update 콜백 내부에서 native beforeinput의 preventDefault를 호출하면 브라우저 기본 입력 취소가 이미 늦을 수 있다.
- 처리: discrete Lexical update에서 처리 여부를 동기적으로 수집하고 이벤트 핸들러에서 preventDefault/stopImmediatePropagation을 수행하도록 변경했다.
- 상태: 코드 수정, 브라우저 검증 대기. 실제 IME·브라우저별 cancelable 이벤트와 Lexical update 동기성은 확인하지 않았다. M023 참조.

## E025 — R04 실행 검증 환경 차단

- 발생: 2026-10-16 R04 테스트 실행 준비. Node.js v22.16.0은 사용 가능하나 pnpm 실행 파일이 없고, git ls-remote에서 github.com DNS 조회 실패.
- 영향: 의존성 설치 및 pnpm check/test:browser를 실행할 수 없었다. 기존 커밋의 테스트 성공을 주장하지 않는다.
- 처리: 테스트 코드 보강만 GitHub에 반영하고 실행 검증은 보류한다. CI를 새로 추가하지 않는다.
- 상태: 환경 차단, 미해결. M024 참조.

## E026 — R06 충돌 회귀 테스트의 잘못된 반례

- 발견: 2026-10-16 P2.2 안정화 재점검. 기존 테스트의 prefix=a-b/noteId=c와 prefix=a/noteId=b-c는 예전 `prefix-note-noteId` 규칙에서도 충돌하지 않았다. 따라서 이전 구현의 결함을 실제로 잡는 회귀 테스트가 아니었다.
- 처리: prefix=a-note-b/noteId=c 및 prefix=a/noteId=b-note-c로 교체. 이전 방식에서는 둘 다 `a-note-b-note-c`이며, 길이 접두어를 붙인 새 방식에서는 서로 다른 ID가 된다.
- 상태: 테스트 코드 수정, 실제 실행 미검증(E025). M025 참조.

## E027 — Corepack pnpm 부트스트랩 네트워크 실패

- 발견: 2026-10-16 R14 재점검. `corepack pnpm --version` 명령이 registry.npmjs.org DNS EAI_AGAIN으로 실패. Node v22.16.0은 정상.
- 처리: 테스트 통과로 기록하지 않고 환경 차단을 유지한다. M024에 따라 네트워크 정상 환경에서 재시도한다.
- 상태: 환경 차단, 미해결.

## E028 — 그림 왕복 fixture의 자산 참조 누락

- 발견: 2026-10-16 R02 정적 코드 점검. 그림 테스트가 assetId=chart-1을 포함하지만 document.assets에 해당 자산을 추가하지 않아 MISSING_ASSET 진단이 발생하는 입력이었다.
- 처리: 테스트 문서의 assets에 chart-1 URL, MIME, 크기를 명시해 검증 조건을 충족시켰다.
- 상태: 코드 수정, 실행 검증 대기(E025/E027). M026 참조.

## E029 — 골든 버전 확인의 package exports 가정

- 발견: 2026-10-16 R02 검토. `require('lexical/package.json')`는 패키지의 exports 설정에 따라 ERR_PACKAGE_PATH_NOT_EXPORTED를 낼 수 있어 버전 확인 방법으로 불안정하다.
- 처리: 공개 엔트리 `require.resolve('lexical')`의 실제 설치 위치에서 상위 package.json을 탐색하고 name=lexical인 manifest의 version을 검사하도록 수정.
- 상태: 코드 수정, 의존성 설치 후 실제 검증 대기(E025/E027). M027 참조.

## E030 — 가져오기 성공 결과의 호출자 객체 alias

- 발견: 2026-10-16 R11 코드 점검. `loadDocumentIntoEditor()`가 검증 성공 후 `input as TufteDocument`를 그대로 반환하여 호출자 수정이 성공 결과를 바꾸는 alias가 있었다.
- 처리: editor 상태 적용 전 구조화 복제본을 만들고 성공 결과로 반환. 호출자 title 및 lexicalState 변경 후 결과 불변성을 검사하는 회귀 테스트 추가.
- 상태: 코드/테스트 반영, 실행 검증 대기(E025/E027). M028 참조.

## E031 — 내보내기 성공 결과의 편집기 상태 alias

- 발견: 2026-10-16 R11 점검. `editorJSONToDocument()`가 validateDocument 결과를 그대로 반환하므로 lexicalState가 호출자/편집기 소유의 mutable state를 참조할 수 있었다.
- 처리: 성공 시 문서 전체를 structuredClone하여 반환. editor state와 base metadata를 사후 변경하는 회귀 추가.
- 상태: 코드·테스트 반영, 실행 검증 대기(E025/E027). M028 확대 적용.

## E032 — R03 테스트 fixture의 빈 섹션 생성

- 발견: 2026-10-16 테스트 자체 검토. 배열 순서 검사를 무조건 수행하도록 변경하면서 synthetic section의 children을 비웠으나 schema는 빈 tufte-section을 거부한다.
- 수정: 유효한 원본 section을 복제하고 기존 자식 하나를 추가해 유효하고 서로 다른 두 섹션을 구성한다.
- 검증: 코드 검토 완료, 실행 테스트 미확인.

## E033 — R03 synthetic section의 중복 note ID 위험

- 발견: 2026-10-16 테스트 fixture 재점검. 원본 section의 자식을 복제하면 기존 sidenote/marginnote의 noteId까지 중복될 수 있어 schema가 거부한다.
- 처리: 두 번째 section은 주석을 포함하지 않는 고유 text paragraph로 구성하여 순서 차이만 검증.
- 상태: 코드 수정, 실행 검증 대기.

## E034 — 외부 전체 검증에서 발견된 세 가지 테스트 실패 (2026-10-16)

- `packages/render/test/render.test.mjs`의 테이블 정규식 이스케이프 오류로 테스트 파일 구문 분석 실패.
- `packages/lexical/test/note.test.mjs`의 이미지 오류 메시지 기대값이 검증 함수 통합 이후 변경된 메시지와 불일치.
- `packages/lexical/test/document-bridge.test.mjs`의 R11 alias 테스트는 빈 assets fixture를 사용하면서 비어 있지 않음을 단언.
- 조치: 각각 정규식 수정, 메시지 허용 범위 수정, 실제 asset fixture 추가. 외부 보고에서 임시 수정 후 render 17/17, document 20/20, lexical 2건 실패를 확인했다고 전달받음. 저장소 수정 후 재실행은 아직 확인되지 않음.

## E035 — migration adapter의 불필요한 타입 강제 변환

- 발견: 2026-10-16 R03 정적 점검. v2→v1 편집기 어댑터가 `Record<string,unknown>`에서 `TufteDocument`로 이중 캐스팅한 뒤 schemaVersion을 덮어쓰고 있었다.
- 영향: v2 계약 변경 시 projection 누락 또는 잔존 필드가 컴파일러에 드러나지 않을 위험.
- 처리: v1 필드를 명시적으로 구성하는 타입 검사 가능한 projection으로 교체하고 hostile v2 envelope 회귀 테스트 추가.
- 상태: 코드/테스트 반영, 실제 타입 검사·테스트 미실행. M032 참조.

## E036 — 저장 문서 버전 판별 전 접근자 실행 위험

- 발견: 2026-10-16 R03 정적 점검. `inspectStoredDocument`가 `isRecord`만 확인한 뒤 `input.schemaVersion`을 읽어, plain prototype을 가진 getter 객체가 검사 중 코드를 실행할 수 있었다.
- 처리: 버전 필드 접근 전에 자체 속성 descriptor와 symbol을 검사해 접근자 포함 객체를 거부한다. getter 미실행 및 실패 진단 경로 회귀 테스트 추가.
- 상태: 코드·테스트 반영, 실행 검증 대기. M033 참조.

## E037 — SQLite adapter에 문자 그대로 삽입된 `\\n`으로 TypeScript 구문 손상

- 발견: 2026-10-16 후속 코드 점검. `sqliteRevisionStore.ts`를 문자열 치환으로 수정하는 과정에서 실제 줄바꿈 대신 역슬래시+n이 소스에 남았다.
- 영향: TypeScript 파서가 해당 파일을 읽지 못해 빌드 차단.
- 조치: literal `\\n`을 실제 줄바꿈으로 교체. 실행 검증 대기. M034 참조.

## E038 — SQLite adapter 파일 전체의 중복 코드 오염

- 발견: 2026-10-16 저장소 원문 재조회. `sqliteRevisionStore.ts`에서 이전 문자열 치환이 메서드 일부를 여러 위치에 중복 삽입하여 TypeScript 파일이 손상됨. E037의 단순 escape 수정으로 해결되지 않았음.
- 조치: 파일을 완전한 단일 구현으로 재작성하고 원격 저장소에 반영. 테스트/타입검사 실행 미확인.
- 예방: M035 참조.

## E026 — 신규 Lexical 노드와 문서 스키마의 정적 계약 불일치

- 발견: 2026-10-16, F17/F18/F19 구현 이후 소스 대조.
- 증상(정적 검토): EmbedNode.aspectRatio는 문자열인데 validator는 유한 숫자 0.1..10을 요구함; 코드 언어 정규식에 점 허용 여부 불일치; ImageQuilt 생성 시 필수 원본 크기를 생략 가능.
- 원인: 신규 노드 구현 시 `packages/document/src/validate.ts`의 실제 제약을 동시에 대조하지 않음.
- 처리: 비율 숫자화, 언어 허용 문자 일치, ImageQuilt 필수 크기 검증, 관련 테스트 fixture 수정.
- 상태: mitigated (소스 수정 확인, 빌드/실행 테스트 미실행). 대책 M026. CI 없음.

## E027 — Embed 제목 길이와 ImageQuilt TypeScript 직렬화 계약 불일치

- 발견: 2026-10-16, F17/F18/F19 정적 계약 재점검.
- 증상: EmbedNode는 제목 최대 500자를 요구하지만 문서 validator는 1000자까지 허용. ImageQuilt는 필수 width/height를 런타임에 검증하지만 직렬화 TypeScript 타입은 선택 속성으로 선언.
- 처리: 제목 길이 1000자로 통일하고 직렬화 타입의 width/height를 필수화. 유효·무효 직렬화 계약 회귀 테스트 추가.
- 상태: mitigated (코드 수정; 실제 실행 검증 미완료). M026 재적용.
