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
- 상태: verified (일반 insertText 범위). IME·paste·삭제·split/merge의 안전성은 아직 미확인이다.
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
