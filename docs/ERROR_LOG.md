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
