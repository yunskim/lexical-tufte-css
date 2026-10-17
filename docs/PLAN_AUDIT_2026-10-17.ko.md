# 구현 계획 독립 재점검 — 2026-10-17

상태: **반복 계획 검증 종료(설계·정적 일관성 점검 완료)**. P2.2.b 일부 구현 및 P3.1.g 블록 편집 UX는 별도 구현·검증 대기. 로컬 타입 검사/테스트 **미실행**. 기존 지시에 따라 CI를 구성하거나 실행하지 않는다.

기준: `docs/PLAN.ko.md`, `AGENTS.md`, `docs/DOCUMENT_SCHEMA_V1.ko.md`, 기존 렌더러/명령 구현, `examples/editor`, `package.json`·`pnpm-lock.yaml`, 2026-10-17 실제 검증 보고서. 저장소의 마지막 기존 성공 증거는 `85ac2c3` 범위이며 그 이후 변경에는 적용하지 않는다.

추적: [P2.2.b 이슈 #9](https://github.com/yunskim/lexical-tufte-css/issues/9). 독립 점검에서 추가한 링크 내부 span 해제 시 URL·인접 note ID 보존 회귀는 `0746f88`에 기록했다. 아래 원칙과 결과의 **실행 검증은 여전히 대기**다.

## 1차 독립 검토: 사용자가 작성·발행하는 문서의 전체 수명주기

검토 질문: **기능이 JSON에 표현된다는 사실과 사람이 GUI로 생성/수정/재열기/발행 가능하다는 사실을 구분하는가?** P0–P7 설명이나 초기 구현의 성공률을 근거로 사용하지 않고, 예제 글을 새로 작성해 저장·재열기·발행하는 흐름을 처음부터 따라갔다.

| 독립 발견 | 근거 | 결정 |
| --- | --- | --- |
| F05의 span은 노드 및 `SET_TUFTE_SPAN_KIND_COMMAND`는 있으나 **생성·해제 명령이 없었다** | `TufteSpanNode.ts`, `inlineCommands.ts` | P2.2.b.1을 분리. 이번 변경에서 단일 plain TextNode의 부분 선택 생성과 caret가 있는 span 전체 해제를 구현. 여러 텍스트/링크/노트 경계의 생성은 진단·거부하고 후속으로 유지 |
| F06 목록은 삽입·끝 항목 추가 중심, **중첩·들여쓰기·형태 변경·내어쓰기**를 완료했다고 볼 수 없다 | `listCommands.ts` | P2.2.b.2를 추가. content/ID와 undo·keyboard 경계 테스트가 게이트 |
| 정의목록은 삽입/끝 pair 추가가 가능하지만 편집·삭제/항목 이동 계약과 end-to-end 증거 미흡 | `definitionCommands.ts` | P2.2.b.3 추가 |
| F07–F09 생성 명령 및 렌더 지원 흔적과, 전체 편집/출처 제거/복수 epigraph 완결성은 다름 | `quotationCommands.ts`, `render/src/index.ts`, 검증 보고서 | P2.2.c.1/c.2 추가 |
| P2.3 F10–F19가 단일 거대 작업이라 스키마 지원과 UI 지원이 혼동됨 | F표, node registry | 노트, 그림, 표, 코드/embed를 P2.3.a–d로 분리 |

결과: **기존 P2.2.b/c 및 P3 UI 완료는 선언하지 않음.** 22개 F 항목의 증거 수준은 원래의 보수적인 완료 기준을 유지한다.

## 2차 독립 검토: 외부 사용자가 패키지를 clean 설치하는 경로

검토 질문: **패키지를 직접 의존성만 설치한 빈 환경에서 소비할 수 있는가?** 예제 UI의 모양이나 테스트가 돌아가는 기존 workspace 상태는 판단 근거로 삼지 않았다.

| 독립 발견 | 근거 | 결정 |
| --- | --- | --- |
| editor prototype이 `@lexical-tufte/document`, `@lexical/rich-text`를 직접 import하지만 manifest에는 없었음 | `examples/editor/src/main.tsx` vs `examples/editor/package.json` | P2.2.b.0. 이번 변경에서 manifest+lockfile importer 동시 수정. frozen install 후에만 체크 |
| 계획에 `packages/editor-react`, `packages/theme`, `packages/adapter-fs`, `examples/blog`가 있으나 해당 package.json 경로는 현재 없음 | 대상 경로의 GitHub 파일 조회에서 NOT_FOUND | P3.1.e, P4.6, P5.1.a, P5.8에 새 패키지 생성·소비자 검증 기준 추가 |
| 서버 렌더러는 순수 JSON 출판이 정본이고 편집기의 `$generateHtmlFromNodes`는 검사/보조용 | ADR-0002, `packages/render/src/index.ts`, prototype `exportDocument()` | P2.4.b/P3.3.a로 정본 preview/편집 보조 export 경계 고정 |
| SQLite publication/recovery proof와 운영 blog/FS adapter는 별개 | `packages/blog/src/index.ts`, `apps/recovery-server/README.md` | P5.1.b/P5.8로 호스트 조립·ACL/CSRF·retention 연결 분리 |

결과: **로컬 prototype의 기능 증가를 재사용 API 및 운영 host의 완료로 치환하지 않음.**

## 3차 독립 검토: 실패·공격·접근성·검증 증거

검토 질문: **무효 선택, 조합 중 메뉴, 입력 실패, 서버/브라우저 경계에서 데이터 손실 없이 실패하는가?** 기존 성공 사례 대신 실패 입력과 미측정 경계를 먼저 열거했다.

| 독립 발견 | 근거 | 결정 |
| --- | --- | --- |
| 잘못된 inline 범위를 Lexical `splitText` 이후에 거부하면 내용/selection이 이미 바뀔 수 있음 | `inlineCommands.ts` 신규 설계 | 선택 type/key·offset·simpleText·note/span/parent schema를 먼저 검사. 성공 시에만 split; 거부 시 진단 반환. 단일 TextNode 범위 밖은 보수적으로 거부 |
| CSS/preview와 운영 API의 경계가 독립 테스트 대상이 아니면 초안/관리 데이터 노출 위험 | 계획 P3–P5, R11 문서 | P3.3.a, P4.6, P5.8, P6.7로 보강 |
| 여러 차례 문서/코드가 바뀌었지만 이후 테스트를 실행하지 않아 과거의 pass 수치를 최신 결과로 사용하면 오류 | `docs/PROGRESS.md`, 기존 검증 보고서 | P6.6 및 완료 증거 섹션 추가. 검증 commit SHA 고정·직렬 브라우저·실제 OS 테스트 별도 |
| Tab/Escape/IME/주석 focus 및 browser viewport의 자동 검사만으로 키보드/스크린리더/터치 완결 불가 | E085/E086, M078–M080, P3.1.d | 수동 테스트와 자동 test gate를 별도로 유지. 경계가 해결되기 전 체크 금지 |

결과: **안전성·접근성은 빠진 항목을 상세화했으며, 테스트 코드를 추가한 사실만으로 실행 통과를 주장하지 않음.**

## 4차 교차 재검토: 서로 다른 관점 간 모순 제거

- 1차에서는 빠른 GUI 확장이 매력적이지만 2차에서는 공유 패키지의 소비 가능성이 먼저 필요하다. **P2 기능별 검증 → P3 컴포넌트 추출 → P4 독립 렌더/테마 → P5 운영**으로 우선순위를 유지하고, 기존 편집기 prototype은 기능 검증 하네스로만 활용한다.
- 2차에서는 새 `editor-react` 패키지를 바로 만들 수 있지만 3차의 검증 공백이 크다. **현재 미검증된 UI 변경을 완료로 표시하지 않고 P2.2.b부터 개별 feature slice로 축소**한다.
- 1차의 '모든 선택 텍스트에 span' 이상과 3차의 무손실·원자성이 충돌한다. **이번 첫 implementation은 단일 plain TextNode의 부분 범위에 한정**하고, 다중 범위/노트/중첩 변환은 경계 오류를 진단하도록 한다. 전체 요구는 미완료 체크로 유지한다.
- 기존 Tufte 기본 CSS 표현과 한글 서체 정책은 변경하지 않는다. JSON 문서 정본·렌더러 독립성·호스트 보안 책임·CI 생략 원칙도 그대로 유지한다.

## 이번 실행 기록과 재검증 상태

| 작업 | 수정 경로 | 독립 점검 | 남은 gate |
| --- | --- | --- | --- |
| P2.2.b.0 | `examples/editor/package.json`, `pnpm-lock.yaml` | 실제 direct import 두 개와 manifest/lockfile importer를 서로 대조 | frozen install/build/consumer smoke **미실행** |
| P2.2.b.1 (부분) | `packages/lexical/src/inlineCommands.ts`, `src/index.ts`, `examples/editor/src/main.tsx` | command export/registration/UI/스키마 경계 재조회; Lexical `TextNode.splitText` 반환 규칙의 상류 소스와 교차 확인 | TypeScript 및 unit/browser/IME/undo 검증 **미실행** |
| P2.2.b.1 회귀 작성 | `packages/lexical/test/inline-commands.test.mjs`, `tests/inline-span-browser.mjs`, root `package.json` | 단일 노드/invalid selection/note/JSON/renderer/save·reopen/undo·redo 시나리오가 소스에 존재함을 재조회 | 실제 실행 + 실패 수리 |
| P2.2.b.2 이후 | `docs/PLAN.ko.md` | F03–F22·P2–P7 미완료와 의존성을 다시 비교 | 다음 구현 |

### 일괄 테스트 순서(미실행)

1. `pnpm install --frozen-lockfile` → `pnpm check`
2. `pnpm package:check` (빌드 완료 후)
3. `pnpm test:browser`에 포함된 기존 테스트, contextual, inline-span browser 순차 실행
4. 필요 시 `pnpm test:recovery-python` 및 실제 Python HTTP fixture; Chromium 외 Firefox/WebKit/실기기 IME·터치·스크린리더 검증 별도

**이 보고서는 코드·문서의 독립적인 정적 재검토 증거이지 테스트 통과 보고서가 아니다.** 남은 항목은 검증 후 `docs/PROGRESS.md` 및 해당 P/F 체크를 업데이트한다.

## 최종 교차 검증 및 종결 판정 — 2026-10-17

**판정: 계획 검증 루프 종료.** 범위·단계 의존성·완료 증거 정의가 작성된 수준에서 모순 없이 실행 가능한 체크리스트로 정리됐다. 이것은 **계획의 정적 일관성 판정**이며, 제품 동작·성능·사용성의 검증 완료나 구현 과제 종료를 뜻하지 않는다.

### 추가 독립 4개 관점 최종 대조

| 관점 | 이번에 새로 수행한 검사 | 결과 |
| --- | --- | --- |
| 범위 누락/중복 | `PLAN.ko.md`의 F01–F22 번호를 각각 확인하고 P0–P7 각 단계 및 작업 체크리스트 ID를 비교 | F 항목 22개 전부 존재. P 단계 8개 존재. 체크리스트 ID 89개에서 중복 ID 없음(검사 당시 계획 기준). 범위 항목이 있다는 사실은 기능이 구현됐다는 의미가 아님 |
| 구조/정본 | P2의 document schema·Lexical command·pure renderer, P3.1.g Notion-like 블록 UI의 상하 의존성 비교 | JSON/Lexical 정본 유지, 편집용 블록 UI는 정본 AST가 아님. note anchor와 payload, figure/list/definition 복합 블록은 함께 관리. P6.8에 이동/복제·거부 원자성 명시 |
| 일정/의존성 | P2.2.b.0 → b.1 → b.2 → b.3 → P2.2.c/d → P3.1.e/g → P4/5/6 흐름과 블록 핸들/드래그 구현 단계 대조 | 모순 1건 교정: 초기 UI에 '드래그 핸들'을 표시하되 실제 드래그 기능은 3차에서 구현하도록 `P3.1.g.2/g.7` 문구를 구별함. 부분 구현을 완료로 앞당기지 않음 |
| 검증·운영 실패 | 기존 E085–E087/M078–M081 대응, P6.1–P6.8, 테스트 실행 보류 여부와 사용자 요구 비교 | CI 생략·실행 보류 원칙 유지. 타입/빌드, browser, JSON/HTML, undo/redo, IME·터치·접근성, 공개/초안·보안 게이트가 각각 명시됨. 과거 SHA 성공 결과를 최신 변경에 전용하지 않음 |

### 고정된 결론

- **새 기능 누락으로 인한 계획 확장 루프를 더 진행하지 않는다.** 이미 수집한 기능 항목은 P2.2.b/c/d, P2.3–P6 및 [Notion-like 블록 UX #10](https://github.com/yunskim/lexical-tufte-css/issues/10)에 배정되어 있다.
- 다음 실행 대상으로 [P2.2.b #9](https://github.com/yunskim/lexical-tufte-css/issues/9)를 유지한다. P2.2.b.0 manifest/lockfile 변경과 P2.2.b.1 span create/unwrap는 **코드 작성 상태**이며 실제 `pnpm check`·브라우저/패키지 확인을 통과하지 않았다.
- P3.1.g는 P2 명령/저장/발행 의미론과 P3.1.e 컴포넌트 경계를 확보한 뒤 단계적으로 구현한다. 따라서 Notion-like UX를 계획했다는 이유로 다른 P 작업의 우선순위를 변경하지 않는다.
- 재검토 **재개 조건**은 새로운 사용자 요구, 검증 실패, 새 기능 발견, 호환성·schema 변경, 위험의 실현처럼 기존 전제를 바꾸는 증거가 나왔을 때뿐이다. 이때도 전체 계획 반복 대신 **영향받는 항목만** 재검토한다.
- 이제 계획 검증은 **닫고 실제 P2 구현·일괄 테스트 단계로 전환**한다. 코드·기능 체크박스와 #9/#10 이슈는 별도 검증 전까지 열어 둔다.

증거 범위: 이번 종결 점검은 연결된 GitHub 저장소의 계획·진행·오류 대책 문서를 재조회하고 체크리스트 정합성을 계산한 **정적 문서 검토**다. 실제 제품 빌드/테스트·사용자 환경 검증을 실행했다고 주장하지 않는다.

