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
| M003 | E003 | 소비자 typecheck에 소스 해석 경로/Vite CSS types 설정, 공유 document declaration 선행 build; 브라우저 검증 전에 build | examples/editor/tsconfig.json, 루트 typecheck/test:browser | 적용, package export 변경 시 typecheck+build |
| M004 | E004/E005 | 검증 가능한 Playwright/browser 기준 고정, 공식 설치기 사용, 기본 headless shell. 실패 원인별로 분류하고 무한 재시도하지 않음 | lockfile, DEPENDENCIES, tests/note-browser.mjs | 환경 완화, P6에서 최신·다른 브라우저 재검증 |
| M005 | E006 | 테스트가 서버 생명주기를 소유하고 HTTP readiness를 확인한 후 브라우저 시작 | tests/note-browser.mjs | 적용, 서버 테스트 수정 시 재실행 |
| M006 | E007 | 일반 경계 입력 guard와 실제 키보드 회귀 검사. canInsert 정책만 바꿔 해결했다고 가정하지 않음 | examples/editor/src/main.tsx, tests/note-browser.mjs | 일반 입력 및 P1.2 Chromium 확장 검증, OS IME는 P6·구조 비교는 P1.3 |
| M007 | E008 | 숨겨진 UI는 먼저 사용자가 여는 동작을 수행한 후 role로 검사; timeout으로 원인 은폐 금지 | tests/note-browser.mjs summary click | 적용, UI 변경 시 검사 |
| M008 | E009 | 복사 추출 시 wrapper 보존, paste에서 copy ID 재발급·cut ID 유지, 중첩 명시 거부 | NoteNode.extractWithChild, clipboard command, tests/note-editing-browser.mjs | 내부 rich/외부 plain 경로 검증, 외부 HTML import는 P2.4 |
| M009 | E010 | composition 시작 경계를 보완하고 기본 Lexical 처리 유지; commit/cancel/undo와 표식 제거 검사 | COMPOSITION_START_COMMAND, Chromium CDP 회귀 | Chromium protocol 검증, OS 실제 IME는 P6 |
| M010 | E011 | 일반 입력과 programmatic 삽입을 구분해 edge helper 적용; rich 내용/URL/이미지/ID를 함께 검사 | noteOperations.ts, clipboard·toolbar, rich split/merge 검사 | 적용, 새로운 입력 경로 추가 시 점검 |
| M011 | E012 | 의미 DOM 생성만 공유하고 편집 전용 속성은 createDOM에 한정; 발행 속성과 adjacent CSS 동작을 실제 검사 | InlineImageNode, tests/note-dom-browser.mjs | 적용, 새 노드 export 추가 시 검사 |
| M012 | E013/E014 | 구체적 DOM 반환 타입 지정, 선행 실행 결과 회수·통과 후 의존 검사. shell 묶음은 set -e/&&로 실패 전파 | LayoutNodes.ts, package.json의 build 선행 test:browser, AGENTS 규약 | 적용, 매 의존 검증 묶음 시작 시 점검 |
| M013 | E015 | overflow fixture의 줄바꿈·min-content 조건을 확인; 기준 일치와 실제 overflow를 별도 검사, viewport/치수로 실패 식별 | layoutFixture.ts, layout-reference.html, tests/layout-browser.mjs | 5개 폭 검증, fixture 변경 시 확인 |
| M014 | W001 | 경고 기준을 올리지 않고 작성/독자 번들 분리·지연 로딩과 실제 크기 측정 | P3/P6, PROGRESS의 baseline | 계획, 해당 단계 시작 시 점검 |
| M015 | E016 | JSON roundtrip는 JSON 값으로 정규화, 메모리 불변성은 별도 비교 | server-comparison.test.mjs | 적용 |
| M016 | E017 | 전역 DOM constructor 대신 Lexical node 판별, 서버/브라우저 경로 분리 검사 | NoteNode/LayoutNodes, server 비교 테스트 | 적용 |
| M017 | E018 | DOM adapter 최소 재현 유지, 실패 시 순수 renderer로 발행; upstream 전역 패치 금지 | server-comparison.test.mjs, packages/render | 완화, P2.4 재검토 |
| M018 | E019 | 공개 package specifier와 해당 package cwd로 exports 해석 | 서버 비교 테스트 | 적용 |
| M019 | E020 | fixture 함수 결과를 지역 변수로 명시 | render.test.mjs | 적용, 단위 15개 통과 |
| M020 | E021 | 대형 결과의 출력 예산·완결성을 확인하고 파싱 후 mutation 실행 | Git 업로드 절차 | 적용 |
| M021 | E022 | 기존 변경 보존, 새 단계는 필요 시 별도 worktree | work-p2 | 적용 |
| M022 | E023 | 재귀 노드는 interface 경계, shared build 후 소비자 typecheck | document types.ts | 적용, 단위26개 통과 |

## 점검 기록

| 시점 | 범위 | 확인 결과·개선 | 다음 점검 |
| --- | --- | --- | --- |
| 2026-10-16 P1.1 완료 전 | E001–E008 / M001–M007 초기 전수 점검 | 실제 실패와 추정 분리, 소스 paths·beforeinput guard·서버 readiness·패널 열기·단위/브라우저 테스트 반영. E004/E005 환경 제한과 E007 IME 제한은 유지 | P1.2 시작·완료 및 P1 단계 종료 |
| 2026-10-16 P1.2 시작 | E001–E008 / M001–M007 | repo root와 고정 headless shell·서버 readiness·선행 build를 확인. E007의 IME/paste/delete 제한을 이번 작업의 우선 회귀 범위로 선정 | P1.2 완료 전 |
| 2026-10-16 P1.2 완료 전 | E001–E011 / M001–M010 | M006의 일반 입력 검사만으로 rich 삽입/조합 경계를 보장할 수 없음을 확인, clipboard 추출·ID·IME·programmatic helper 대책으로 확대. 타입·빌드·단위 2개와 P1.1/P1.2 브라우저 회귀 통과. 환경 제한 E004/E005 및 OS IME 후속 유지 | P1.3 시작·완료 및 P1 단계 종료 |
| 2026-10-16 P1.3 시작 | E001–E011 / M001–M010 | inline 경계의 일반/프로그램 입력·clipboard·composition 대책과 잔여 OS IME 제한 확인. nested composer·shared history의 고정 버전 소스를 비교 근거로 확인 | P1.3 완료 전 |
| 2026-10-16 P1.3 완료 전 | E001–E012 / M001–M011 | M006/M008–M010 회귀를 유지하면서 DOM 분리의 E012를 추가 발견·수정. nested 상태/history 비교 실험으로 과도한 결론을 피하고 ADR 근거를 구분. 전체 로컬 검사·브라우저 회귀 통과 | P1.4 시작·완료 및 P1 단계 종료 |
| 2026-10-16 P1.4 시작 | E001–E012 / M001–M011 | 편집/발행 DOM 분리 대책을 새 layout 노드에 적용. TableNode의 공식 export가 tbody를 만드는 것을 소스에서 확인하고 기준 HTML은 table 내부와 CSS direct-child를 구분해 비교할 계획 | P1.4 완료 전 |
| 2026-10-16 P1.4 완료 전 | E001–E015/W001, M001–M014 | M003 선행 결과 회수·실패 전파가 ad-hoc 묶음에 빠진 점을 E014/M012로 보완. 독립 기준 HTML과 줄바꿈 없는 overflow fixture로 5개 폭 검증. 타입·빌드·단위 6개와 전체 브라우저 회귀 통과. 번들 경고는 P3/P6 후속으로 유지 | P1.5 시작·완료 및 P1 단계 종료 |
| 2026-10-16 P1.5 시작 | E001–E015/W001, M001–M014 | DOM 전제/속성 유출·실행 순서·독립 기준 비교 대책을 점검. 서버와 브라우저 입력 경로의 차이를 별도 실험하고 미지원 입력은 진단으로 차단할 계획 | P1.5 완료 전 |
| 2026-10-16 P1.5 완료 / P1→P2 전환 | E001–E021/W001, M001–M020 전체 | JSON 값/메모리/HTML 비교 구분, DOM constructor 제거, adapter 최소 재현과 순수 renderer 선택, fixture 결과 명시, 대형 출력 파싱 후 업로드. frozen install·check(단위15)·전체 브라우저 회귀 통과. E018 adapter 제한은 P2.4, 환경/OS IME와 번들 경고 후속은 유지 | P2.1 시작·완료 및 P2.4 adapter 변경 시 |
| 2026-10-16 P2.1 시작 | E001–E021/W001, M001–M020 | 새 worktree로 P1 커밋을 보존. profile/정본 validator 분리와 metadata·자산 참조·노드 registry를 구현하고 기존 SSR 차등 테스트 유지 | P2.1 완료 전 |

| 2026-10-16 P2.1 완료 | E001–E023/W001, M001–M022 전체 | M003에 공유 declaration 선행 build/fresh 검사 추가. 재귀 타입 interface 경계와 실제 공식 노드 JSON 검사, 구조/출력 capability 분리 적용. check(단위26)·전체 브라우저·frozen install 통과. DOM adapter/OS IME/번들 후속 유지 | P2.2 시작·완료 및 P2.4 adapter 변경 시 |

## 새 대책/점검 양식

대책: ID / 관련 오류 / 변경할 절차·코드·테스트 / 검증 방법 / 적용 상태 / 잔여 위험 / 다음 점검 조건.

점검: 날짜·작업 ID / 확인한 오류·대책 ID / 실제 적용 여부·검증 결과 / 무효·중복 대책 개선 / 남은 항목·다음 점검.

## M023 — 입력 이벤트 취소와 편집 상태 변경의 동기성

- 관련 오류: E024.
- 절차: beforeinput 핸들러에서 Lexical update 실행 결과를 동기적으로 확인하고, 처리한 입력에 대해서만 native 이벤트를 취소한다. 조합 중 입력은 Lexical에 위임한다.
- 검증: 브라우저에서 일반 입력·한국어 조합·선택 경계·취소 가능한 beforeinput·중복 삽입 여부를 테스트한다. 단위 테스트만으로 완료하지 않는다.
- 상태: 코드 반영, 실제 브라우저 검증 대기.

## 2026-10-16 R04 점검

E001–E024와 M001–M023 대책을 대상으로 R04 변경 영향 범위를 점검했다. 신규 E024/M023을 추가하고, 기존 OS별 IME 제한과 브라우저 입력 경계의 미검증 상태를 유지한다. 다음 점검은 R04 브라우저 회귀 수행 후다.

## M024 — 로컬 실행 불가 시 검증 상태 분리

- 관련 오류: E025.
- 절차: Node/pnpm/DNS 및 브라우저 런타임 상태를 먼저 확인한다. 코드·테스트 작성과 실제 테스트 통과를 별개 상태로 기록하고, 실행 불가를 성공으로 해석하지 않는다. CI 생략 원칙을 유지한다.
- 검증: 연결 가능한 개발 환경에서 pnpm install --frozen-lockfile, pnpm check, pnpm test:browser를 순서대로 실행해 실패 로그와 재발 방지를 갱신한다.
- 상태: 절차 기록, 실행 대기.

## 2026-10-16 R04 재점검

E024/M023의 beforeinput 이벤트 취소 시점은 discrete update 사용만으로 브라우저별 보장을 입증할 수 없다. 노트 경계 중복 입력과 일반 본문 입력 회귀를 모두 유지하고 실제 브라우저 검증 전에는 완료 처리하지 않는다. E025/M024 환경 차단을 별도로 추적한다.

## M025 — 충돌 방지 회귀의 반례 검증

- 관련 오류: E026.
- 절차: 충돌 방지 테스트는 변경 이전 함수가 실제로 같은 결과를 내는 입력 쌍을 명시적으로 증명한 뒤, 변경 이후 결과가 달라짐을 검사한다. 단순히 새 결과가 서로 다르다는 assertion만으로 충돌 수정의 증거로 삼지 않는다.
- 검증: `packages/render/test/render.test.mjs`의 legacy 조합 동등성 및 새 ID 비동등성 테스트를 실행한다.
- 상태: 코드 반영, pnpm 환경 차단으로 실행 대기.

## 2026-10-16 P2.2 재점검

- E025/M024는 지속: Node 22.16.0 정상, Corepack pnpm 부트스트랩은 npm registry DNS EAI_AGAIN(E027)으로 실패. 테스트 성공을 주장하지 않는다.
- E026/M025 신규 추가: 과거 버그의 반례를 먼저 계산해 실제 재발 검출력이 있는지 점검한다. 이후 namespace/slug/path 충돌 테스트에도 같은 절차를 적용한다.
