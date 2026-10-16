# 재발 방지 대책 및 정기 점검

[ERROR_LOG.md](ERROR_LOG.md)의 실제 실패와 연결해 대책을 관리한다. 에러가 수정돼도 기록을 삭제하지 않는다. 환경 우회는 제품 결함 해결과 구분한다.

## 작업 루프와 점검 주기

1. **각 체크리스트 작업 시작 전:** 두 문서의 관련 기록·미해결 사항·대책을 읽는다. 필요한 명령·환경·선행 빌드를 확인한다.
2. **새 오류 발생 직후:** 동일 실패를 근거 없이 재시도하지 않는다. 재현 조건과 증상을 먼저 보존하고 확인된 원인과 추정을 구분한다. 오류 ID와 대책 ID를 연결한다.
3. **수정 시:** 관련 코드·테스트·작업 절차 중 실제 재발을 막는 수단을 반영한다. 우회로 검증 범위가 줄어들면 제한과 후속 작업을 명시한다.
4. **각 작업 완료 전:** 관련 회귀 검증을 실행하고 실제 결과·검증 범위·남은 위험을 갱신한다. 대책 문서 갱신만으로 해결 처리하지 않는다.
5. **각 P단계 전환 시 및 같은 오류 재발 시:** 두 문서 전체를 점검한다. 비슷한 원인을 묶고, 무효한 대책을 수정하며, 수동 확인을 자동 검사로 옮길 필요가 있는지 평가한다.
6. **진행 보고 시:** 적용한 대책과 open/mitigated 후속 작업을 PROGRESS에 기록한다. 작업 중단·재개 시에도 시작 전 점검을 다시 수행한다.

이 주기는 개발 작업 루프 기준이다. 예약된 외부 알림이나 무인 정기 작업은 구성하지 않는다. CI는 생략하고 검증은 로컬에서 실행한다.

## 대책 목록

| ID | 대상 오류 | 실행 대책 | 적용 위치 / 검증 | 상태·다음 점검 |
| --- | --- | --- | --- | --- |
| M001 | E001 | package.json과 pnpm-workspace.yaml이 있는 repo root를 workdir로 지정 | README 명령, 작업 시작 전 root 확인; frozen install 통과 | 적용, 매 명령 묶음 시작 시 확인 |
| M002 | E002 | 재사용 smoke는 즉석 문자열 대신 저장된 테스트 파일로 실행 | packages/lexical/test/note.test.mjs; pnpm test | 적용, 새 검증 추가 시 검토 |
| M003 | E003 | 소비자 typecheck에 소스 해석 경로와 Vite CSS types 설정; 브라우저 검증 전에 build | examples/editor/tsconfig.json, package.json test:browser | 적용, package export 변경 시 typecheck+build |
| M004 | E004/E005 | 검증 가능한 Playwright/browser 기준 고정, 공식 설치기 사용, 기본 headless shell. 실패 원인별로 분류하고 무한 재시도하지 않음 | lockfile, DEPENDENCIES, tests/note-browser.mjs | 환경 완화, P6에서 최신·다른 브라우저 재검증 |
| M005 | E006 | 테스트가 서버 생명주기를 소유하고 HTTP readiness를 확인한 후 브라우저 시작 | tests/note-browser.mjs | 적용, 서버 테스트 수정 시 재실행 |
| M006 | E007 | 일반 경계 입력 guard와 실제 키보드 회귀 검사. canInsert 정책만 바꿔 해결했다고 가정하지 않음 | examples/editor/src/main.tsx, tests/note-browser.mjs | 일반 입력 검증, P1.2에서 IME·paste·delete 확장 및 P1.3 구조 비교 |
| M007 | E008 | 숨겨진 UI는 먼저 사용자가 여는 동작을 수행한 후 role로 검사; timeout으로 원인 은폐 금지 | tests/note-browser.mjs summary click | 적용, UI 변경 시 검사 |

## 점검 기록

| 시점 | 범위 | 확인 결과·개선 | 다음 점검 |
| --- | --- | --- | --- |
| 2026-10-16 P1.1 완료 전 | E001–E008 / M001–M007 초기 전수 점검 | 실제 실패와 추정 분리, 소스 paths·beforeinput guard·서버 readiness·패널 열기·단위/브라우저 테스트 반영. E004/E005 환경 제한과 E007 IME 제한은 유지 | P1.2 시작·완료 및 P1 단계 종료 |

## 새 대책/점검 양식

대책: ID / 관련 오류 / 변경할 절차·코드·테스트 / 검증 방법 / 적용 상태 / 잔여 위험 / 다음 점검 조건.

점검: 날짜·작업 ID / 확인한 오류·대책 ID / 실제 적용 여부·검증 결과 / 무효·중복 대책 개선 / 남은 항목·다음 점검.
