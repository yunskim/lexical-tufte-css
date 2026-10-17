# 구분선·출처·컨텍스트 UI 검증 — 2026-10-17

대상 main `d53d7eb` 및 이번 수정. 이전 `42f2b32` 이후 추가된 guarded horizontal rule/section cite 명령·단위/HTML/브라우저 회귀, 아이콘 액션·단축키 힌트·선택 도구막대·블록 컨텍스트 UI를 확인했다. 별도 worktree와 Python venv를 사용했다. CI 추가·실행 없음.

## 종료 체크리스트

- [x] 최신 저장소·AGENTS·오류/대책·P22 인계 확인, frozen install.
- [x] check: **266개** 통과(document47/render30/blog34/lexical155), 실패·skip0. lint/inventory/font/typecheck/build 포함.
- [x] package: **4개** tarball JS/types/고지/SQL/소비 검사 통과. npm 공개 없음.
- [x] Python: 고정 constraints 설치, pytest **16개** 통과. HTTPX TestClient warning1건 유지.
- [x] 실제 TS client→Python HTTP→SQLite 왕복 통과.
- [x] 기존 browser 전체11개 최종 직렬 실행 통과. 후속 contextual 검사는 focus readiness 보완 후 독립 실행 통과. 합계12개 실행 파일 검증.
- [x] 추가 contextual UI 검사 통과: 6개 이름 있는 선택 액션 표시, 굵게/선택 유지, Alt+Shift+F 진입, Escape/재표시 억제, Shift+F10/방향키/Enter 제목 변환, 우클릭 대상 선택과 거부, 375px toolbar 경계.
- [x] E080–E085 및 M073–M078 기록·반영, diff 검사. 50개 mjs 구문 검사 통과.

## 수정 및 판정

- footer/cite 테스트의 텍스트 직결 가정을 실제 공백 보존 span 계약에 맞췄다. footer/cite 의미 부모·순서는 계속 정확히 검사한다.
- 주/선택 도구막대에 같은 포맷 버튼이 생겨 기존 R10 selector가 중복됐다. 기존 검사를 이름 있는 주 toolbar로 한정했다.
- 실제 우클릭에서 DOM caret만 변경하면 Lexical 명령이 이전 선택에 적용됐다. 공개 RangeSelection.applyDOMRange와 discrete $setSelection으로 명령 전 위치를 일치시켰다. 반례에서 이전 제목 유지와 주석 ID 유지, 정상 우클릭 제목 변환을 확인했다.
- 고정 Vite 포트 공유와 build 동시 실행으로 검사 격리가 깨진 시도는 최종 결과로 사용하지 않는다. target 전용5177 및 최종 직렬 실행 절차를 적용했다.
- 인계된 섹션 browser의 이중 escape 정규식 및 현재 블록 뒤 삽입을 섹션 끝으로 가정한 fixture를 수정했다. 구분선·섹션 출처/cite·인용문/attribution·epigraph와 undo/redo 실제 UI 회귀를 실행했다.

환경: Node24.19/pnpm11.25/Lexical0.52/Chromium134(Playwright1.51.1), Python3.12.14 및 서버 test-constraints. 과거 E079의 DNS/checkout 차단은 이번 checkout/설치/실행 성공과 구분한다.

## 남은 범위

이번 검증 작업은 위 실행 범위에 한정한다. Tufte F표나 P2–P7 전체를 닫지 않는다. 실제 OS IME·모바일 터치·다른 브라우저·스크린리더·context menu 전체 접근성, 모든 액션의 아이콘/단축키 할당, 선택 영역 메뉴의 전체 서식 조합은 미완료다. 자동화는 ContextMenu 키와 Shift+F10 중 Shift+F10 경로를 실행했다. 실제 IME 조합 중 메뉴 race 전체를 검증했다고 주장하지 않는다.

F07의 명령/직렬화/HTML/실제 toolbar/undo-redo 증거가 추가됐지만 F표 완료에는 모바일·접근성 등 공통 gate가 남는다. 메뉴 첫 버튼 focus 이전에 매우 빠르게 입력한 Escape는 보장하지 않는다. 원격 복구 UI·운영 인증/배포·전체 생산 폰트·E064 한국어 fallback·W001 bundle 경고와 기존 figure UI gate도 유지한다.

이번 최신 구현분의 검증 작업은 완료한다. 위 미완료 범위는 후속 체크리스트에 유지한다.

재현: `pnpm check`, `pnpm package:check`, `pnpm test:browser`, `pnpm test:contextual-ui` 순서로 실행한다. 별도 Python 설치/pytest/HTTP 검사는 서버 README의 constraints 절차를 따른다.
