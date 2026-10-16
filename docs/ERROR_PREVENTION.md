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

## M026 — 왕복 fixture의 문서 수준 참조 무결성

- 관련 오류: E028.
- 절차: Lexical 노드만 생성하는 테스트라도 문서 envelope의 assets와 node.assetId, src, dimensions의 참조 관계를 확인한다. 골든 fixture는 실제 고정 버전 Lexical 출력에서 생성하고 검토 후 커밋한다.
- 검증: pnpm check 및 R02 테스트에서 MISSING_ASSET/ASSET_MISMATCH가 없는지 확인한다.
- 상태: 코드 반영, 실행 대기.

## M027 — 패키지 버전 확인 시 공개 exports만 사용

- 관련 오류: E029, E019.
- 절차: 외부 패키지의 비공개 package.json subpath를 직접 require하지 않는다. 공개 엔트리의 resolve 경로에서 설치 패키지 manifest를 찾아 name/version을 확인한다.
- 검증: pnpm 설치 후 골든 생성 테스트에서 버전 0.52.0 확인, 다른 버전의 생성 거부 여부 확인.
- 상태: 코드 반영, 실행 대기.

## M028 — 경계 함수의 입력·출력 소유권 분리

- 관련 오류: E030.
- 절차: document/editor 경계 성공 반환값은 호출자 소유의 입력 객체를 직접 노출하지 않는다. 입력과 반환 envelope·assets·lexicalState의 참조 비공유 및 사후 변경 내성을 회귀 테스트로 확인한다.
- 검증: R11 snapshot regression과 pnpm check 실행.
- 상태: 코드 반영, 실행 대기.

## 2026-10-16 R11 양방향 경계 점검

- E030/M028을 내보내기 경계까지 확장했다(E031). 가져오기뿐 아니라 `editorJSONToDocument` 성공 결과도 원본 state·base와 참조를 공유하지 않도록 복제한다.
- 다음 검증: R11 양방향 alias 회귀, pnpm check. 실제 실행 전에는 완료 체크하지 않는다.

## M029 — 회귀 테스트 fixture도 문서 계약으로 검증

- 스키마 검증을 대상으로 하는 테스트에서 새로 만든 성공 fixture는 먼저 validateDocument/canonicalizeDocument 성공을 단언한다.
- 조건부 단언을 제거할 때도 테스트 데이터의 노드별 비어 있음 제약과 자식 배치 규칙을 확인한다.
- E032 수정에 반영. 실행 검증은 후속.

## M030 — 복제 fixture의 전역 식별자 점검

- 테스트용 문서 노드 복제 시 비어 있음·부모/자식 계약뿐 아니라 문서 전체에서 유일해야 하는 noteId와 assetId 참조도 검토한다.
- 순서 테스트는 가능한 한 독립적인 최소 유효 노드를 생성해 부수적인 중복을 피한다(E033).

## M031 — 리팩터링 후 전체 테스트 계약 재검토 (E034)

- 테스트 정규식은 소스의 리터럴 escape 수준과 구문 파싱 가능 여부를 확인한다.
- 오류 메시지 변경 시 기존 메시지 기대값을 전역 검색하고, 가능하면 안정적인 오류 코드 기반 단언을 우선한다.
- alias 회귀는 초기 fixture가 실제로 비어 있지 않음을 먼저 단언한 뒤 원본 변경과 결과 불변성을 비교한다.
- 변경 뒤 `pnpm check`와 패키지별 단위 테스트를 로컬 실행한 결과가 없으면 완료 처리하지 않는다.

## M032 — 스키마 버전 간 adapter의 명시적 projection

- 관련 오류: E035.
- 서로 다른 버전의 문서를 연결할 때 `as unknown as`로 구조를 강제하지 않는다. 필수·선택 필드를 명시적으로 구성해 타입 변경이 컴파일 단계에서 드러나게 한다.
- v2 envelope의 accessor/unknown field 거부를 회귀 테스트로 고정한다. 이후 스키마 버전 추가 시 양방향 projection과 지원 버전 행렬을 검토한다.
- 검증: pnpm typecheck 및 document/lexical 테스트 실행 대기.

## M033 — untrusted object 필드 접근 전 data descriptor 확인

- 관련 오류: E036.
- 외부 JSON 유사 객체를 판별할 때 `isRecord` 확인만으로 getter 안전성을 가정하지 않는다. 첫 속성 읽기 전에 own property descriptor의 data-only 조건을 검사한다.
- 접근자 부작용 카운터를 이용해 `inspectStoredDocument` 및 `migrateStoredDocument`가 getter를 실행하지 않는 회귀 테스트를 유지한다.
- 검증: pnpm check 및 document 테스트 실행 대기.

## M034 — 문자열 치환 후 원본 소스 구문 점검 (E037)

- GitHub 원격 파일을 문자열 치환으로 편집한 직후 `\\n`, `\\t` 같은 escape가 의도치 않게 코드 본문에 삽입되었는지 재조회한다.
- 신규 함수 추가 후 최소한 소스 파싱과 TypeScript typecheck를 수행해야 완료로 표시한다. 실행 환경이 없으면 검증 미완을 명시한다.

## M035 — 부분 치환 대신 완전 재구성 및 재조회 (E038)

- 원격 소스 파일에 메서드를 추가할 때 단순한 광역 문자열 치환을 지양한다. 변경 후 파일 전체를 다시 읽어 중복 메서드, 잘린 문자열, 의도치 않은 코드 삽입을 점검한다.
- 손상이 발견되면 부분 패치로 누적 복구하지 말고 알려진 계약에 맞춰 파일을 완전 재구성한다.
- 실제 `tsc`/테스트 실행 전에는 해결 여부를 확정하지 않는다.

## M036 — 신규 노드 추가 시 validator 계약 대조 의무화

- 노드 구현 전에 `schema.ts`의 필드/자식 타입과 `validate.ts`의 값 제약을 모두 읽는다.
- factory, importJSON, exportJSON, 테스트 fixture가 같은 자료형·필수 속성·허용 범위를 쓰는지 확인한다.
- 허용값과 거부값을 validator에 직접 넣는 단위 테스트와 editor 왕복 테스트를 구분한다.
- 정적 대조만 수행한 경우 `verified`로 표시하지 않는다. 실제 `pnpm check` 및 테스트 통과 후 갱신한다.

## M037 — 다른 대화 반영분의 실행 증거 재확인

- 관련 오류: E042. 환경이 다른 대화의 코드 반영·정적 점검을 실행 성공으로 간주하지 않는다.
- 실행: 고정 main에서 frozen install → check → browser를 선행 결과 확인 후 실행. 실패는 수정 후 해당 검사와 영향 범위 전체를 다시 실행한다. CI는 추가하지 않는다.
- 작업 시작: 2026-10-16, d78f455 기준. E001–E041 및 M001–M036을 검토하고 중복 ID를 정리했다. 기존 P2.2 로컬 미반영 작업은 별도 worktree에 보존하고 이 감사에 섞지 않는다.
- 상태: E042 수정 검증 중. 다음 점검은 전체 검사 완료 전.

## M038 — 부정 입력별 안정적인 진단 코드 검증

- 관련 오류: E043. 버전 미지원·알 수 없는 필드·잘못된 값의 진단을 혼동하지 않는다. 입력별 정확한 코드를 검사하고 실패 테스트에 맞추려고 validator를 완화하지 않는다.
- 적용: editor-boundary.test.mjs. 전체 회귀 재검증 대기.

## M039 — golden 누락과 저장/메모리 비교 경계 확인

- 관련 오류: E044/E016. 저장 snapshot 비교는 JSON 값을 사용하고 undefined optional 속성과 실제 데이터 유실을 구분한다.
- 골든은 고정 설치 버전을 확인하는 명시적 생성 경로로 생성·검토한다. 통합 확인에서는 REQUIRE_LEXICAL_GOLDEN=1로 누락을 실패 처리하며 skip을 완료로 세지 않는다.
- 대상: document-bridge.test.mjs 및 검증 보고서.

## M040 — 출력 계약의 실제 브라우저 소비자 검증

- 관련 오류: E046. namespace/CSS/serializer 변경은 의미 selector, 인접성, 실제 출력 ID, 여러 article 독립 토글을 함께 검사한다.
- 노드 registry 검사는 테스트 factory의 실제 등록 클래스에서 파생한다. 이미 등록한 노드를 예전 목록 때문에 미지원으로 잘못 분류하지 않는다.
- 신규 발행 기능에는 실제 편집/DOM 및 CSS 비율 검사를 추가하며 iframe 원격 재생과 로컬 레이아웃 검증을 구분한다.

## M041 — 브라우저 harness의 의존성 탐색과 생명주기 고정

- 관련 오류: E047. 실제 UI에 없는 테스트 entry를 동적으로 로드할 때 devserver가 mount 도중 재최적화하지 않도록 테스트 전용 entry 목록에 포함한다.
- 적용: tests/vite-publication.config.mjs. 서버 readiness 및 finally 종료 원칙은 그대로 유지한다.

## M042 — 속성 검사와 실제 레이아웃·의미 DOM 검사의 구분

- 관련 오류: E048/E049. iframe width/height를 출력했다는 사실만으로 반응형 비율을 보장하지 않는다. 1440/761/760/759/375px에서 실제 bounding rect를 비교한다.
- ImageQuilt는 자체 자산의 naturalWidth/naturalHeight를 확인한 뒤 비율을 검사한다. remote iframe은 네트워크를 차단한 채 로컬 레이아웃/보안 속성만 확인하고 provider 재생 성공으로 보고하지 않는다.
- 코드 발행은 pre>code와 정확한 공백·tab·newline을 독립적으로 검사한다. CSS/HTML/script 정책도 함께 확인한다.

## 2026-10-16 통합 검증 완료 점검

- E001–E049 / M001–M042 전수 검토. 중복 ID 재배정, parser/타입/진단/저장 JSON 경계/golden 필수성/브라우저 소비자/CSP/실제 geometry 대책을 코드와 테스트에 반영했다.
- 결과: frozen install, check140개(skip0), 브라우저6개, diff check PASS. 실제 SQLite 오류 주입과 사용자 입력 경로를 포함한다. 과거 환경 차단을 제품 성공으로 해석하지 않았다.
- M036–M042의 적용 범위와 E042–E049의 해결 증거는 VERIFICATION_2026-10-16.ko.md를 따른다. M004/M017/M014의 환경·adapter·번들 후속은 유지한다.
- 다음 점검: 다음 체크리스트 작업 시작/완료, 새 Lexical/CSS/renderer 변경, 오류 재발 및 P단계 전환. CI는 사용하지 않는다.

## 2026-10-16 R02 시작 점검

E001–E049/M001–M042를 확인했다. 새 worktree에서 시작하며 golden은 실제 고정 런타임 생성·명시적 업데이트만 허용한다. 저장 JSON/메모리 객체 차이(E044), schema 자산 참조(M026), 실제 registry 파생(M040), 미지원 출력과 편집 등록의 차이를 이번 검증에 적용한다. CI 없음. 다음 점검은 R02 완료 전.

## M043 — null과 optional 부재의 저장 의미 분리

- 관련 오류: E050. JSON에서 생략되는 undefined 비교를 보정하는 M015를 실제 null 삭제에 확대 적용하지 않는다. 저장된 null은 값으로 보존한다.
- 전체 노드 fixture에는 nullable·비기본 enum·복수 layout/kind·자산 참조를 넣는다. 공식 노드가 값을 정규화하면 무손실 bridge를 완화하지 않고 계약에 맞는 명시적 node adapter와 회귀를 적용한다.
- 적용: TufteCodeHighlightNode, 전체 노드 golden, 노드별 실패 원자성 및 React 저장/재열기 검사.

## M044 — facade package의 실제 타입 export 확인

- 관련 오류: E051/M027. 원본 소스의 타입 이름이 facade package에서도 공개된다고 가정하지 않는다. 공개 기본 타입과 명시적 스키마로 계약을 구성하고 typecheck/build 이후에만 후속 검증을 실행한다.
- 실패 명령 뒤 과거 로그를 현재 검증 결과로 보고하지 않는다. 실행 결과/로그의 명령 단위를 구분한다.

## M045 — 동일 wire type의 클래스 등록 충돌 방지

- 관련 오류: E052. class replacement가 기존 type entry를 덮어쓰는 고정 버전 동작을 확인한다. 같은 type을 여러 클래스와 factory로 혼용하지 않는다.
- 공통 TUFTE_NODES와 전용 token factory를 사용한다. 공식 highlighter plugin 연동은 별도 미검증 경계로 기록하고 현재 데이터 왕복 지원과 혼동하지 않는다.

## 2026-10-16 R02 완료 점검

E050–E052와 M043–M045를 코드·골든·검증에 적용했다. 과거 E044의 undefined 비교 대책을 null 삭제에 잘못 확대하지 않았고, validator/strict bridge를 완화하지 않았다. 전체178개(skip0), 브라우저7개, frozen/diff check 통과. 기존 M004/M017/W001의 브라우저·DOM adapter·번들 제한은 유지한다. 다음 R03.d 시작·완료 및 노드/버전 변경 시 다시 점검한다.


## 2026-10-16 R03.d 시작 점검

E001–E052/M001–M045를 점검했다. 기존 migration 경로의 clear 명령 관찰만으로 일반 loader/React 경로를 보장하지 않는다. 실제 registerHistory와 UI 버튼에서 성공/실패·undo/redo·새 문서 첫 수정·반복 로드를 검사한다. CI 없음. 다음 점검은 완료 전.

## M046 — 이력 초기화는 stack뿐 아니라 다음 편집을 검증

- E053: clear 명령 수신/stack 길이 관찰만으로 완료하지 않는다. 새 문서 첫 수정 undo/redo, 반복 로드, 실패 로드 후 redo 유지를 실제 history 구현과 UI에서 검사한다.
- 공개 API의 상태 설치→clear→merge 기준 재설치 순서를 사용한다. listener 중복 호출과 공유 history의 전체 초기화 범위를 통합 계약에 명시한다.

## M047 — editor 통합 double과 실제 구현의 검증 역할 분리

- E054: 통합 메서드가 추가되면 성공 경로 double도 공개 계약을 반영한다. 호출 횟수 검사로 실제 history 의미 검증을 대체하지 않는다. 실패한 선행 검증 후 브라우저를 실행하지 않는다.


## 2026-10-16 R03.d 완료 점검

E053/E054와 M046/M047을 코드·테스트·통합 문서에 반영했다. 전체180개(skip0)와 브라우저7개 통과. baseline 재설치로 생기는 listener 호출 및 공유 history 범위를 명시했다. 기존 OS IME/다른 브라우저/DOM adapter/W001 제한은 유지한다. 다음 R05 시작·완료 및 P단계 전환 시 점검한다.


## 2026-10-16 R05 시작 점검

E001–E054/M001–M047 점검. 자동 삭제/이미지 생성으로 정상 구조를 꾸미지 않고 진단·문제 위치 이동·실행 취소·마지막 정상 구조 복구 UX를 적용한다. 무효 편집 상태는 별도 복구 사본에 보존하고 정본 저장/HTML 생성과 분리한다. M046의 실제 history 회귀를 유지한다. 다음 완료 전 점검.

## M048 — 새 회귀 테스트의 비교 경계를 assertion에 분리

- E055는 M015/M039 재발이다. 무변경 검사는 같은 런타임의 검사 전/후 메모리 값을 비교한다. 저장 fixture 비교는 별도 JSON 값 assertion으로 작성한다. 두 목적을 한 assertion으로 대체하지 않는다.
- 적용: structure-recovery.test.mjs의 33종 구조 검사. null/배열 순서/실제 필드 유실을 보정하지 않는다.

## M049 — 복수 섹션 fixture의 대상 선택

- E056: 구조 반례 생성 시 섹션 위치를 가정하지 않는다. 실제 트리에서 type/식별자로 대상을 찾고 대상 존재를 확인한다. 전체 노드 fixture의 배치를 편집기 계약으로 오인하지 않는다.


## 2026-10-16 R05 완료 점검

E055/E056 및 M048/M049를 적용했다. 저장 JSON/메모리 비교 경계의 재발을 assertion 분리로 보완하고 복수 섹션 fixture 대상을 탐색하도록 고쳤다. check187개와 browser7 통과. 검사/저장/발행 범위, 단일 복구 사본 및 메모리 checkpoint 제한을 명시했다. 다음 R10 시작·완료 및 P단계 전환 때 재점검.


## 2026-10-16 R10 시작 점검

E001–E056/M001–M049 점검. 실제 UI에서 각 format bit와 조합·기존 bold와의 공존·선택 토글·undo/redo·저장 재열기 및 정본 renderer 의미 태그를 검사한다. 밑줄과 취소선 CSS는 결합 class로 둘 다 보존한다. OS 실제 IME/대비 전체 평가는 P6 범위로 남긴다. 다음 완료 점검.

## M050 — 링크 포맷과 링크 컨테이너 교체를 분리 검증

- E057: format 토글의 링크 독립성, 링크 내부 caret 수정, 링크 전체 내용 교체를 각각 구분한다. 전체 선택 삭제/입력이 기존 컨테이너를 유지한다고 가정하지 않는다. 실제 런타임 의미와 테스트 기대값을 맞추고 후속 UX 정책을 문서에 남긴다.

## M051 — 주석 payload 교체에서 컨테이너 정체성 유지

- E058: collapsed edge뿐 아니라 주석 전체 payload의 forward/backward 선택 후 삽입도 검사한다. 같은 note 내부의 완전 선택에만 명시적 child 교체를 적용한다. 교차 주석/본문 범위 삭제의 의미는 변경하지 않는다.
- 실제 clipboard 회귀에서 noteId·kind·format과 주변 본문 보존을 확인한다.

## M052 — canBeEmpty=false 컨테이너의 교체 순서

- E059: 최종 내용뿐 아니라 mutation 중간의 빈 상태도 피한다. 새 자식을 먼저 연결하고 이전 자식을 제거하며 최종 selection을 생존 노드로 이동한다. forward/backward 실제 선택 회귀를 모두 통과시킨다.


## 2026-10-16 R10 완료 점검

E057–E059/M050–M052 반영. 전체 주석 교체의 정체성/중간 빈 상태/선택 유실을 수정하고 실제 clipboard와 양방향 단위 회귀를 통과했다. check189개·browser8 통과. 링크 전체 선택 교체와 내부 수정의 차이를 명시하고, OS 실제 IME/타 브라우저/전체 대비 평가는 P6로 유지한다. 다음 R11 시작·완료 점검.


## 2026-10-16 R11 시작 점검

E001–E059/M001–M052를 검토했다. snapshot alias, 실제 SQLite CAS, 실패 시 rollback, single SELECT snapshot, 공개 포인터와 초안 분리를 적용한다. public 저장 모델은 document/metadata 기존 schema를 암묵적으로 확장하지 않는 별도 snapshotVersion1이다. 메모리 mock 대신 실제 SQLite와 close/reopen 및 오류 주입으로 검증한다. 다음 완료 점검.

## M053 — SQL 조건과 bind 계약의 동시 변경

- E060: CAS 조건을 바꿀 때 parameter 순서 기대값과 실제 DB 의미 테스트를 함께 갱신한다. 문자열/배열 계약 검사만으로 데이터 불변식을 대신하지 않는다. 동일 revision의 생성 시각 변경·갱신 시각 역행을 실제 SQLite와 메모리 구현에서 검증한다.


## 2026-10-16 R11 완료 점검

E060/M053 반영. R11 신규12개는 실제 SQLite 두 연결·영속 재열기·오류 주입·checksum·옵션 소유권·시간 불변식을 포함한다. check201개와 browser8, frozen offline install 및 diff check 통과. source record/metadata를 변경하지 않고 snapshotVersion1 경계를 도입했다. filesystem/D1/GC/redirect/인증과 불확실한 commit 응답 범위를 문서화했다. 다음 R13 시작·완료 및 P단계 전환 점검.

## M054 — 폰트 CSS 선언과 실제 사용 글리프의 식별 구분

- E061: font-family CSS나 document.fonts.check만으로 실제 font 사용을 판정하지 않는다. manifest의 PostScript name과 CDP custom-font glyph 사용을 비교한다. 브라우저 렌더 백엔드가 붙이는 family 표시 접미사는 안정된 font ID가 아니다.

## M055 — 폰트 테이블 메트릭과 실제 shaping 결과 구분

- E062: hmtx 무변경은 정적 데이터 검증이며 브라우저 폭의 단순 합 공식을 보장하지 않는다. 동일 CSS·브라우저로 원본 OTF와 subset WOFF2를 직접 비교한다.
- reference-metrics.json은 고정 원본/해시/도구 버전과 UPDATE_FONT_METRICS=1을 함께 제공할 때만 갱신한다. 일반 검사는 필수 fixture를 생성하거나 누락을 허용하지 않는다. 다른 엔진의 표시 차이를 확인 없이 폰트 손실로 분류하지 않는다.


## 2026-10-16 R13 시작 점검

E001–E060/M001–M053 점검 후 작업을 시작했다. 소유자가 설정한 GPL-3.0-only 유지, 별도 폰트 OFL 및 reserved name 보존 정책을 적용한다. 공식 Adobe 고정 commit/해시를 확인하고, 대표 문자 샘플 WOFF2와 실제 원본 비교로 범위를 한정한다. source family 유지와 수정본 naming을 혼동하지 않는다. 다음 완료 점검.

## M056 — 폰트 비교의 비대상 문자와 fallback 고정

- E063: 대상 한글/한자 외에 Latin/공백/fallback과 CSS 기능도 원본·수정본 양쪽에 동일하게 적용한다. full-font face와 제한 unicode-range face를 그대로 비교하지 않는다. 문자 샘플 외 노트·캡션·표 위치도 함께 검사한다.

## M057 — fallback 가시성과 글리프 가독성의 구분

- E064: CSS 박스/텍스트/폭 존재를 글리프 지원의 증거로 사용하지 않는다. 실제 fallback font 식별과 언어 지원을 확인한다. 기본 환경의 한국어 폰트 부재는 남기며, 별도 fontconfig 성공을 모든 사용자 환경의 성공으로 확대하지 않는다.

## M058 — font readiness 이후 paint 동기화

- E065: 폰트 다운로드/디코딩 완료와 glyph paint 교체를 구분한다. 지연 로드 검사는 fonts.ready와 animation frame을 거쳐 실제 custom font로 바뀌었는지 확인한다.


## M059 — 공식 자료 조회 차단 시 확인 가능한 1차 채널 사용

- E066: 실패한 검색 페이지를 반복 호출하지 않는다. 공식 repository API/ref/raw 파일로 출처·고정 버전·해시를 확인한다. 조회 성공을 제품 실행 성공으로 대신하지 않는다.

## 2026-10-16 R13 완료 및 P2.2 전환 점검

E061–E066/M054–M059를 반영했다. 원본/서브셋의 동일 fallback 정책·실제 custom glyph·font-ready/paint·기본 한국어 fallback 부재를 구분했다. E064 기본 환경 제한 및 기존 OS IME/다른 브라우저/DOM adapter/W001은 유지한다. check201개, browser9개 및 추가 지연/원본/별도 한국어 fallback, package4 tarball 소비·타입, frozen install/diff 통과. R01–R14의 선행 안정화 범위 완료이며 F표나 P2–P7 전체 완료로 확대하지 않는다. 다음 P2.2 작업 시작/완료 및 같은 오류 재발 때 점검한다.


## 2026-10-16 P2.2.a 시작 점검

E001–E066/M001–M059의 원인·조치·제한을 점검했다. 과거 실행 대기 문장은 역사 기록으로 보존하고 현재 판정은 audit 및 후속 보고서를 따른다. 명령은 mutation 전에 selection/부모/자식/속성 보존 조건을 검사하고 undo tag·실제 UI·JSON 경계를 확인한다. root 변환은 자동 수행하지 않고 명시적 명령만 제공한다. P2.2/F표 완료를 명령 일부 구현과 혼동하지 않는다.

## M060 — 구조 반례 fixture는 단계별 노드 구성

- E067/E002: 깊게 중첩된 append 호출 대신 의미 있는 노드를 지역 변수로 구성한다. 새/수정 mjs 테스트는 node --check를 선행해 parser 오류와 제품 회귀 실패를 분리한다.

## M061 — UI 상태 증거의 관찰 시점

- E068: 진단/status는 다음 사용자 동작이 덮어쓸 수 있다. helper가 누르는 버튼의 부수 효과를 확인하고 원래 진단 직후 상태를 관찰한다. 내용 snapshot과 상태 문구 검증 순서를 명시한다.


## 2026-10-16 P2.2.a 완료 점검

E067/E068·M060/M061 반영. 새 테스트 구문 선행 확인과 상태 관찰 순서를 적용했다. 구조 명령은 mutation 전 계약 검사 및 실제 선택/history/DOM/저장/정본 발행을 검증했다. check214개·browser10개·package4개 소비 검사·frozen/diff 통과. P2.2/F01/F02 전체 완료는 유지하지 않으며 해당 a 범위만 체크한다. 다음 P2.2.b 시작·완료 점검.

## 2026-10-16 P2.3 오류 재점검

E059/M052 및 E067/M060의 선행 대책을 그림 주석 명령·회귀 테스트에 다시 적용한다. 실제 테스트 미실행 상태에서는 해결을 verified로 표기하지 않는다.

## M062 — 충돌 재발급 테스트는 고유 ID 공급 계약을 지킨다

- E069: 여러 노드에 대해 ID 재발급을 검증할 때 고정 문자열 ID factory를 사용하지 않는다. 첫 ID가 existing에 추가된 이후 다음 ID가 달라야 한다. 각 결과의 유일성과 changes map을 확인하고 실제 분리된 clipboard 입력과 연결 노드 fixture를 구분한다.

## M063 — 빈 노드 불허 컨테이너의 교체 순서와 선택 보존

- E070/E059: `canBeEmpty=false`인 노드의 자식을 교체할 때 기존 자식을 먼저 전부 제거하지 않는다. 새 자식 추가→새 자식으로 selection 이동→옛 자식 제거 순서를 유지하고 실제 Lexical state/Undo/Redo에서 검증한다. 비슷한 편집 명령을 추가할 때 E059를 다시 검색한다.

## M064 — 클립보드 ID 출처의 상태 전환 관리

- E071: cut ID는 새로운 copy, 다음 paste, 새 cut에서 적절히 무효화한다. cut→copy→paste 및 연속 붙여넣기를 테스트한다. 클립보드 provenance를 추적하지 못하는 외부 앱 변경·취소된 작업은 보장하지 않으며, 보장 범위를 문서화한다.

## M065 — 자동 복구 debounce 종료 처리

- debounce만 사용하는 자동 저장은 pagehide/visibilitychange/unmount 직전의 마지막 변경을 잃을 수 있다. pending EditorState를 별도 보유하고 종료 이벤트에서 동기 localStorage 쓰기를 시도한다.
- 최신 상태를 성공적으로 쓴 뒤에만 pending 참조를 비운다. 저장 실패는 사용자에게 표시하고 정상 문서 슬롯을 덮어쓰지 않는다.
- 종료 이벤트는 강제 종료·OS kill에서 보장되지 않는다. Work 브라우저 검증에 800ms 미만 종료, 숨김, 복귀, quota 실패, 여러 탭 시나리오를 포함한다.
