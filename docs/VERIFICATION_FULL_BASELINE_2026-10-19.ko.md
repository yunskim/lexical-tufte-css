# full-page baseline 브랜치 실행 결과 — 2026-10-19

전체 통과가 아니다. 빌드·타입 검사와 새 노트 DOM/제목/그림 검사 수정은 검증했으나, concrete note 모델로의 저장 fixture/API 이전 누락(E109)이 남았다. 현재 상태를 배포·전체 기능 완료로 판정하지 않는다. CI는 실행하지 않았다.

대상 브랜치: `test/upstream-full-page-baseline-20261019`. 시작 commit: `851ceddb7b363beb63a39784848441965960f2e6`. 이 보고서와 수정 코드를 함께 담은 후속 commit이 검증 결과다. 이전 main의 check318개 통과 기록은 이 브랜치의 결과가 아니다.

## 검토 및 수정

- 최근 노트 generic→SidenoteNode/MarginnoteNode 분리, wrapper 제거와 DocumentFragment export, newthought split-parent 출력, 그림 marginnote 앞뒤 배치 변경을 검토했다.
- `tests/note-dom-browser.mjs`: checkbox 기준 인접 label/span, for/id와 고유 ID, 두 종류, 편집/발행 DOM 분리, JSON 불변성, 모바일 열기·닫기 검증으로 바꿨다. `note-editing-browser`의 구형 wire type 조회 2곳도 수정했다.
- JsonNode의 concrete note/heading ID 선언, TufteHeadingNode.updateDOM의 this 타입, 예제의 삭제된 factory import를 수정했다.
- 제목 변환은 실제 등록된 TufteHeadingNode를 생성하며 h2→h3 ID를 보존한다. 독립 headless 테스트에서 수정 전 클래스 충돌을 재현하고 수정 후 통과했다. publication harness의 같은 factory 오류도 수정했다.
- 그림 inspector의 image-first/구형 kind 조건을 현재 validator와 맞췄다. 노트 앞뒤 허용, caption 역순과 직접 sidenote 거부를 독립 headless 테스트로 확인했다.
- note DOM export 테스트의 active editor와 heading fixture의 canonical root를 수정했다. figure-marginnote 테스트 이미지에 잘못 붙은 element 필드를 제거했다.
- 새 공식 비교 3개의 assets 필수 필드를 채웠다. opening/Getting Started는 SECTION 직속 들여쓰기 Text node만 제외하며 inline/pre/code 공백, 모든 속성과 요소 순서는 보존한다. newthought는 문서 namespace로 바뀐 ID/for 외 구조를 그대로 비교한다.

## 환경과 실행 방식

Node 24.19.0, pnpm 11.25.0, TypeScript 6.0.2, Lexical 0.52.0, Playwright 1.51.1, Chromium 134.0.6998.35. Python 3.12 가상환경에 `apps/recovery-server/test-constraints.txt`를 적용해 editable test 의존성을 설치했다. frozen install로 lockfile 변경 없음.

빌드 결과를 회수한 뒤 브라우저를 순차 실행했다. 각 패키지와 브라우저 파일을 독립 실행하여 첫 실패 뒤 검사도 모두 실행했다. 수정에 영향받은 파일을 다시 실행했으며 최종 결과만 아래 표에 기재한다. 브라우저 실행 중 dist를 rebuild하지 않았다.

| 검사 | 통과 | 실패 | 건너뜀/차단 |
|---|---:|---:|---|
| pnpm install --frozen-lockfile | 통과 | 0 | 0 |
| pnpm build | 통과 | 0 | 0 |
| pnpm -r typecheck | 통과 | 0 | 0 |
| pnpm lint | 통과 | 0 | 0 |
| pnpm inventory:check | 72 CSS rules / 2 media contexts | 0 | 0 |
| pnpm font:check | 통과 | 0 | 0 |
| 수정 mjs 및 기존 tests/package test mjs 구문 검사 | 통과 | 0 | 0 |
| document 단위 테스트 | 10 | 37 | runner skip 0 |
| render 단위 테스트 | 21 | 24 | runner skip 0 |
| blog 단위 테스트 | 22 | 12 | runner skip 0 |
| lexical 단위 테스트 | 12 | 12 | runner skip 0; 10개 import 실패 파일 내부 테스트 미실행 |
| JS 단위 합계(현재 runner 항목) | 65 | 85 | runner skip 0 |
| Python pytest | 16 | 0 | 0 |
| 실제 TS client→Python HTTP→SQLite | 통과 | 0 | 0 |
| pnpm package:check | tarball 4개 생성/라이선스 검사까지 수행 | JS consumer 실패 | 후속 packed 선언 소비 검사 도달 못함 |
| browser 파일 합계 | 16 | 5 | 파일 skip 0 |
| CI | — | — | 사용자 지시로 생략 |

Lexical의 12개 실패 항목에는 import 실패 파일 10개가 포함된다. 파일 내부 개별 테스트 수를 전부 실행한 것으로 계산하지 않는다. 별도 집중 실행한 heading/note-export/figure-structure 7개는 모두 통과하며 lexical 합계에도 포함된다. figure-marginnote 파일 6개는 render 합계에 포함된다. note-editing browser의 17개 시나리오는 모두 통과했다.

빌드에는 Vite chunk >500kB 경고, Python에는 Starlette TestClient의 httpx 지원 deprecation 경고 1개가 있다. 경고를 실패로 집계하지 않았으며 경고가 없다고 주장하지 않는다.

## 브라우저별 결과

각 항목은 `node tests/<이름>.mjs`로 실행했다. 실패 파일의 뒤쪽 assertion은 실행되지 않을 수 있다.

| 테스트 | 결과 | 근거/범위 |
|---|---|---|
| note-browser | 통과 | 기본 노트 동작 |
| note-editing-browser | 통과 | 17개 시나리오, concrete note 조회 수정 |
| note-dom-browser | 통과 | 형제 제어 구조·두 종류·모바일 toggle 왕복 |
| layout-browser | 통과 | 1440/761/760/759/375px |
| server-browser | 실패 | 저장 fixture의 tufte-note → UNKNOWN_NODE |
| publication-browser | 통과 | 등록 heading factory 수정; 실제 편집/export·CSP·5개 폭 |
| all-nodes-browser | 실패 | 구형 golden load 실패 뒤 기존 seed가 남아 JSON 불일치 |
| text-format-browser | 실패 | 구형 서버 fixture load 실패로 본문 target 부재 |
| font-proof-browser | 통과 | proof font 검사; production 전체 한글 coverage 판정 아님 |
| section-commands-browser | 통과 | 실제 h2/h3/문단 변환·undo/redo·저장/재개·발행 |
| recovery-browser | 통과 | 복구 회귀 |
| contextual-ui-browser | 통과 | 선택/블록 메뉴·focus·undo·375px 경계 |
| inline-span-browser | 통과 | inline span 회귀 |
| list-kind-browser | 통과 | 목록 회귀 |
| definition-pairs-browser | 통과 | 정의 목록 회귀 |
| upstream-dom-browser | 실패 | 발행 전에 기존 fixture UNKNOWN_NODE |
| upstream-full-page-baseline-browser | 통과 | 원본 inventory, 아래 제한 참조 |
| upstream-geometry-browser | 실패 | 발행 전에 기존 fixture UNKNOWN_NODE |
| upstream-same-content-opening-browser | 통과 | 동일 콘텐츠 text/link/DOM; section 들여쓰기 제외 |
| upstream-same-content-getting-started-browser | 통과 | heading ID/inline code/link/pre/DOM; section 들여쓰기 제외 |
| upstream-newthought-sidenote-browser | 통과 | split-parent DOM; ID namespace 제외 |

## 공식 Tufte CSS 대조의 한계

저장된 공식 Tufte CSS 1.9.0 기준 commit은 `b5d7b7bbe5ce9c4c50fcfad4f19ee3646cfd7ae1`이다. CSS SHA-256은 `4ca43dfac57225714c8d903a6e59e44b25fe6424db90240a7c378bd80991765c`, index.html은 `5096d0c54d572f157c25643a7bc8ab4bbe7ce1479184d11348b221f3fa3f1764`이다.

full-page baseline은 원본 HTML/CSS에서 1440/1024/761/760/759/375px 각각 section 9, note 7, epigraph 3, fullwidth figure 2 및 newthought note 관계를 확인했다. Lexical에서 원본 전체를 재구성해 발행한 결과와 비교하는 검사가 아니다. 외부 이미지·ET Book 폰트의 완전한 로딩이나 전체 페이지 스크린샷/pixel 동등성, 각 요소 geometry 동등성을 입증하지 않는다. 동일 콘텐츠 DOM 검증은 opening/Getting Started 및 별도 newthought 샘플에 한정된다. 기존 upstream DOM/geometry 검사는 발행 입력 검증에서 실패하여 비교 단계에 도달하지 못했다.

## 미해결 원인과 남은 체크리스트

E109: 구현은 `tufte-sidenote`/`tufte-marginnote`로 바뀌었지만 기존 저장 fixture, golden, 테스트 factory, 일부 진단 기대값은 `tufte-note {kind}`/삭제된 `$createNoteNode`를 사용한다. `schemaVersion:1`의 내부 노드 형식이 달라졌고 기존 envelope migration은 이를 변환하지 않는다. 이는 테스트 selector만의 문제가 아니라 저장 문서 호환성 문제다. validator의 UNKNOWN_NODE 거부는 유지했다.

Lexical import 실패 파일: all-nodes, definition-commands, document-bridge, figure-commands, inline-commands, list-commands, note, quotation-commands, section-commands, structure-recovery. all-nodes-fixture 공용 생성기도 기존 factory를 사용한다. server-comparison의 2개 실패는 구형 fixture의 입력 검증 거부에 따른 후속 HTML/global assertion 실패다. packed consumer는 `fixtures/tufte/server-document.json`을 읽고 `validateDocument(...).ok`에서 실패한다.

- [x] 요청 브랜치 변경과 기존 테스트 검토.
- [x] 오래된 note DOM wrapper 가정 수정 및 실제 Chromium 검증.
- [x] 설치·빌드·타입·각 패키지 단위·브라우저·공식 샘플 비교 실행.
- [x] 재현한 타입/제목 생성/그림 검사/신규 fixture 오류 수정 후 재실행.
- [x] 오류 E103–E110 및 대책 M095–M100 기록·완료 점검.
- [ ] 구형/신형 저장 문서 판별 및 명시적 migration, IDs/종류/서식/자산/무손실 왕복 보장.
- [ ] concrete factory로 기존 테스트 생성기와 fixture/golden을 이전하고 제거된 API·과거 known-gap 기대값 재검토.
- [ ] 현재 실패 85개 runner 항목과 브라우저 5개를 다시 실행. import 차단 해소 후 새로 드러나는 실패까지 해결.
- [ ] packed JS consumer 및 이후 선언 소비 검사 통과.
- [ ] 전체 원본 콘텐츠를 Lexical로 재구성한 DOM/geometry·이미지/폰트·시각 비교.

통과한 범위만 완료했다. 미해결 항목은 다음 작업으로 남기며 전체 P2–P8 또는 Tufte 기능 완료 체크를 올리지 않는다.
