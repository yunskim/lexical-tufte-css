# 누적 테스트 실행 — 2026-10-18

대상 main `0411b03e57fb66ecc6eb0f21d71e28e5d9af0d9c` 및 이번 수정. 별도 worktree에서 AGENTS·오류/대책과 실행 대기 항목을 점검했다. CI는 추가·실행하지 않는다.

## 실행 체크리스트

- [x] frozen 설치 및 53개 mjs 구문 검사.
- [x] 최종 `pnpm check`: lint/inventory/font/typecheck/build 및 **297개** 단위·통합(document47/render30/blog34/lexical186), 실패·skip0. 우선순위 회귀2건 포함.
- [x] `pnpm package:check`: **4개** 로컬 tarball 소비·타입·고지·SQL 검사 통과, 발행 없음.
- [x] Python constraints 설치 및 pytest **16개** 통과. 기존 HTTPX TestClient 경고1건.
- [x] 기존/신규 browser **15개 실행 파일 전체 통과**(exit0). contextual·inline span·list kind/키보드·definition pairs 포함.
- [x] 실제 TS client→Python HTTP→SQLite 저장/조회/목록/checksum/CAS/접근·CSRF 거부/삭제 왕복 통과(exit0).
- [x] 타입 오류2건, 정의목록 이동·메뉴 margin·목록 키 우선순위 오류 및 테스트 helper/fixture 수정. E088–E097/M083–M089 기록.

## 확인 및 수정

- 목록 해제 사전 검증의 배열 타입 narrowing, 메뉴 captureTarget 직전 selection narrowing을 명시했다.
- 정의 그룹 위 이동에서 insertBefore 수신자가 반대여서 그룹 순서가 손상됐다. 기준 용어에 선택 그룹 term과 description을 순서대로 삽입한다. 단일/복합 그룹의 down/up JSON·note ID 왕복 통과.
- 목록 유형 왕복 테스트의 서로 다른 JSON 깊이 비교와 Tab 뒤 wrapper 깊이 검사를 실제 선택 항목 기준으로 수정했다. 제품 구조적 들여쓰기 자체는 변경하지 않았다.
- floating 메뉴의 일반 margin을 0으로 분리해 viewport 하단 overflow를 수정했다. Shift+Tab의 이전 외부 focus 계약을 검사하고 메뉴 내부 toggle 기대값을 제거했다.
- snapshot helper의 접힌 details 및 text wrapper 가정을 수정했다. 키보드 목록 시나리오는 별도 최종 section에 분리하여 실제 대상 목록의 Enter/Backspace를 확인한다.
- RichText가 동일 우선순위에서 빈 목록 Enter를 먼저 소비하던 충돌을 수정했다. 좁은 경계 Enter/Backspace만 HIGH로 등록하고 일반/노트/IME는 위임한다. EDITOR 소비자와 함께 경계 우선·일반 위임2건을 추가했다.

환경: Node24.19/pnpm11.25/Lexical0.52/Playwright1.51.1/Chromium134, Python3.12.14 및 서버 test-constraints. browser 실행 전 check/package build 완료를 회수했다. 기존 Chromium 부재와 첫 CDN ZIP 실패는 설치 도구의 대체 경로로 준비했으며 제품 실패와 분리한다(E073/M067).

## 완료 범위

이번 작성된 누적 자동화 테스트 실행과 발견한 회귀 수정은 완료했다. E088–E097 관련 대책을 반영한 최종 tree에서 check/package/browser/HTTP를 모두 재실행했다. E086/E087의 실행 대기 사항도 현재 자동화 범위에서 검증됐으며 P2.2.b.0만 명시적으로 체크했다.

작성된 자동화의 실행과 그 과정에서 확인된 회귀 수정에 한정한다. P2.2.b의 모든 K1–K5·모바일·접근성·실제 OS IME·다른 브라우저, 아직 구현하지 않은 테스트는 통과로 간주하지 않는다. 전체 P2–P7/F표·Notion-like 블록 조작·운영 인증/원격 복구 UI/배포·전체 생산 폰트·E064/W001 등의 미완료는 유지한다.
