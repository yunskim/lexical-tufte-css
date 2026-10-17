# 컨텍스트 메뉴 후속 검증 — 2026-10-17

대상: main `85ac2c3057fa04f7e204fc810cc64916e8822202`. 이전 `6a6c2a8` 이후의 초점 유지·메뉴 대상 제한·공유 eligibility·포인터 focus·Home/End·실제 viewport 배치·ARIA menu/menuitem·외부 클릭 좌표 초기화 변경을 점검했다. 기존 worktree를 보존한 별도 체크아웃과 Python 격리 venv를 사용했다. CI 추가·실행 없음.

## 검증 체크리스트

- [x] AGENTS 및 E080–E085/M073–M078 검토. 인계된 contextual mjs 구문 검사.
- [x] frozen 설치, lockfile 변경 없음.
- [x] `pnpm check`: lint/inventory/font/typecheck/build 및 **266개** 테스트(document47/render30/blog34/lexical155), 실패·skip0.
- [x] `pnpm package:check`: 로컬 tarball **4개** 소비·JS/types/고지/SQL 검사 통과. npm 발행 없음.
- [x] 고정 constraints의 Python 설치 및 pytest **16개** 통과. 기존 HTTPX TestClient warning1건.
- [x] `pnpm test:browser` 기존11개 실행 파일 전체 통과(exit0).
- [x] `node tests/contextual-ui-browser.mjs` 확장 메뉴 검사 통과(exit0). 브라우저 합계12개 실행 파일.
- [x] 실제 TypeScript client→Python HTTP→SQLite 저장/조회/목록/checksum/CAS/접근·CSRF 거부/삭제 왕복 통과(exit0).
- [x] 제품 코드 변경 없음, 새 테스트 실패 없음. 기존 환경의 Chromium 부재는 공식 고정 실행 파일 설치로 준비했다(E073/M067). diff 검사 통과.

이번 contextual 검사에는 선택 toolbar/키보드 진입·Escape, Home/End/화살표, 우클릭 후 초점, menu/menuitem 역할, 변환 대상·주석 ID 보존, 기본/375px 메뉴 경계, Escape 후 편집기 focus 복귀, 외부 클릭 닫힘과 floating 클래스 제거가 포함된다.

환경: Node24.19/pnpm11.25/Lexical0.52/Playwright1.51.1/Chromium134, Python3.12.14 및 `apps/recovery-server/test-constraints.txt`. 검증은 build/check/package 종료 후 browser→contextual→HTTP를 직렬 실행하여 Vite 산출물 변경과 포트 공유를 피했다.

## 범위

이번 최신 구현분의 로컬 검증은 완료했다. 코드나 테스트 기대값을 변경하지 않고 모두 통과했다. 아래 미완료 범위는 유지한다.

실제 OS IME·다른 브라우저·스크린리더·모바일 터치, focus 이전 매우 빠른 Escape, 네이티브 OS 컨텍스트 메뉴 표시 자체, 모든 미디어/표/주석의 포인터·키보드 조합은 이번 자동화의 완료 범위가 아니다. ARIA role 검사를 전체 접근성 검증으로 확대하지 않는다. P2–P7/F표 전체 및 운영 인증/원격 복구 UI/배포·생산 한글 폰트·E064/W001 등 기존 미완료는 유지한다.
