# 재발 방지 대책 및 정기 점검

## 2026-10-23 원본 대조 수정 종료 점검

E120/E123 해결과 E125 테스트 오류를 점검했다. E117/E120/E123 제목의 오래된 미해결 표시를 수정하고 현재 실행 범위를 연결했다. E119의 이름 오류 재발은 문서 권고만으로 막히지 않아 활성 소스 audit에 검출 규칙을 추가했고181파일에서 통과했다. 다음 점검은 다음 P2 편집 기능 착수·완료 및 P단계 전환 시다. 보류 자산 UI1개 실패, 실제 외부 iframe 재생·미구현 GUI 기능은 미완료로 유지한다. CI 생략.

## M114 — 파생 편집 상태와 레이아웃 의미를 명시

- E123: rich node를 headless에서만 왕복하지 말고 DOM 부착·재조정·JSON 검사·실제 편집·Undo/Redo·저장/재열기를 확인한다. 텍스트가 링크/span 안에만 있는 경우와 텍스트 없는 이미지 노트를 함께 검사한다. 텍스트 자손에서 계산 가능한 노트 서식은 저장하지 않고 텍스트 없는 노트의 insertion format은 유지한다.
- E120: 원본 고정 padding 레이아웃과 임의 실측 aspect ratio를 하나의 값으로 혼동하지 않는다. layout:'tufte'를 문서·validator·Lexical·publisher·HTML export에 전달하고 불가능한 비율 조합은 거부한다. 원본 geometry/pixel과 기존 CSP 비율 회귀를 모두 실행한다.

## M115 — dormant assertion과 반복된 계약 오류를 실행 절차로 방지

- E125: normalized 값을 비교할 때 동일 함수를 양쪽에 적용한다. 객체 불변성은 비교 대상 자체의 사전 snapshot을 사용하고, 별도 객체의 JSON 속성 순서를 변경 증거로 해석하지 않는다.
- E119/E125: scripts/check-concrete-note-types.mjs가 활성 코드/fixture/tests의 구형 marginnote 접근성 이름도 검출하도록 확장했다. 전체 검색과 audit 후 실제 DOM의 이름·노트 개수·연결 관계 검사를 유지한다.
- 앞선 실패가 해결되면 그 뒤 assertion까지 반드시 재실행한다. 중간 gate 통과로 전체 검증을 완료 처리하지 않는다. exact pixel gate는 단일 검증 iframe mask와 명시한 원본 코드 예제 현대화만 허용하며 수치를 보고서 JSON에 남긴다.

## 2026-10-23 E117 수정 종료 점검

E117/M108과 E114/M105 실행 회귀 통과, M109 시간 제한 유지·package 소비 완료. E120 및 새 E123은 미해결이다. 기존 오류와 대책을 대조해 M111–M113을 추가하고 저장 경계·브라우저 selector·Python 실행 절차에 반영했다. 다음 점검은 E123 최소 React 재현 또는 iframe DOM 수정의 시작/완료 시점이다. CI 생략.

## M111 — runtime registry와 canonical wire를 별도 검증

- E117/E121: runtime type당 klass 하나를 유지하고 core factory와 metadata factory를 각각 실행한다. canonical type 목록만 중복 제거해 registry 안전성을 증명하지 않는다. 새 회귀는 실제 TUFTE_NODES 클래스 type의 고유성도 검사한다.
- 저장 schema/golden을 바꾸지 않는 명시적 adapter를 사용한다. raw runtime snapshot과 canonical 문서를 혼동하지 않도록 README·호스트 계약을 제공하고 저장/복구/JSON 출력 호출부를 검색한다.
- 내부 타입 이름만 변환하며 unknown field/HostAsset/HostLink payload를 삭제·rewrite하지 않는다. bridge의 전체 필드 손실 비교, 입력 불변성, v1/v2 왕복 및 tarball 선언 소비를 함께 검증한다.

## M112 — 테스트 준비 가정과 실제 상태 drift를 구분

- E122/E123: 반복 이름은 exact role로 지정한다. 닫힌 details 안의 폼은 summary를 연 뒤 읽는다. HTML boolean attribute는 truthiness가 아니라 존재 여부로 검사한다.
- fixture에는 실제 원본에서 읽은 속성과 현재 Lexical의 필수 기본값만 넣는다. 공식 내용과 무관한 root 기본값 제거를 이유로 다른 필드/원본 DOM/픽셀 수락을 완화하지 않는다.
- React가 추가한 서식 상태는 headless 성공만으로 정상 처리하지 않는다. raw/inspect/save 단계의 최초 drift를 좁히고, 원인이 확인될 때까지 실패를 유지한다.

## M113 — 같은 실행 환경과 검증된 patch 컨텍스트

- E121/E124: pytest와 HTTP child의 Python interpreter를 명시적으로 맞춘다(RECOVERY_PYTHON). venv 설치 성공을 시스템 Python의 패키지 존재로 해석하지 않는다.
- patch는 현재 파일의 실제 헤더/내용과 절대 경로를 확인해 적용한다. 거부된 patch는 미적용으로 기록하고 상태를 확인한 뒤 재적용한다. build 실패 시 후속 browser를 실행하지 않는다.

## 2026-10-23 remediation 실행 종료 점검

E109/M100의 오래된 accessible-name 오류가 섹션 테스트에 재발해 E119/M110을 추가했다. E114는 bridge timeout으로 미검증, E115/E116은 document57개와 build/typecheck로 검증했다. E117/E120 및 자산 미구현은 미해결로 유지한다. 다음 점검은 노드 등록 설계 수정 직후이며, 기본 paragraph 생성→command→v1/v2 왕복→React mount→전체 브라우저 순서다. CI는 실행하지 않는다.

## M107 — 좁혀진 입력은 중첩 순회 전에 안전하게 캡처

- E116: unknown 객체의 타입 가드를 통과한 필드를 closure에서 참조할 때 안정적인 지역 상수를 사용한다. 빌드 성공 전 후속 브라우저 실행 금지. 실제 전체 build/typecheck 및 validator 회귀로 확인.

## M108 — registry의 type·klass·replacement 경로를 함께 검증

- E117: 노드 getType 중복과 withKlass 경로의 순환 가능성을 점검한다. 단순 importJSON 성공은 기본 factory/transform 호환성의 증거가 아니다.
- 기본 $createParagraphNode/$createQuoteNode, 교체 생성자, command, 등록 transform, JSON 저장/재열기, HostLink/HostAsset 보존 및 React mount를 작은 회귀부터 검증한다. wire type 변경은 schema/bridge 호환성 결정을 분리하고 암묵적으로 적용하지 않는다.

## M109 — 장시간 대기는 실패로 회수하고 후속 검증을 분리

- E118: packed consumer에 JS15초/tsc30초 실행 제한을 실제 반영했다. 임의의 성공 처리나 retry로 숨기지 않는다. 제한이 느린 환경에서 부족한지 판단할 때는 실행 단계 로그와 별도 재현 증거를 먼저 확보한다.
- 집계 시 timeout/cancelled/후속 미도달을 fail·skip과 구분한다. 파일별 제한 실행은 선언된 모든 내부 assertion 실행을 뜻하지 않는다. check 또는 package 중단 뒤 결과를 전체 통과로 승격하지 않는다.

## M110 — 원본 대조의 구조·접근성·시각 게이트를 구분

- E119/E120: 동일 marginnote 접근성 계약을 검사하는 모든 테스트를 검색하고 함께 재검증한다. 제품 문자열만 따라가는 무조건 정규화는 금지한다.
- 전체 시각 테스트의 iframe/snippet 사전 검증, 자산 무결성, geometry, pixel 단계를 따로 보고한다. 보조 comparator self-test와 공식 페이지 parity를 혼동하지 않는다. renderer DOM 변경 때 Figures와 전체 페이지를 함께 재검증한다.

## M105 — 문서 envelope의 선택 필드는 모든 versioned bridge에서 보존

- E114: 새로운 루트 필드(`titleId` 등)는 문서 스키마만 수정하지 말고 `validateDocumentV2`, `migrateStoredDocument`, `loadMigratedDocumentIntoEditor`, `exportEditorToDocumentV2`를 순서대로 점검한다. v1 투영/검증 후 v2 복원에서 필드가 사라지는 수작업 destructuring을 회귀 테스트로 탐지한다.
- 공식 Tufte CSS 9개 섹션 문서를 저장→재열기→발행하는 실제 검증과, 단일 `titleId` 입력을 사용하는 작은 테스트를 분리한다. JSON 왕복 검사뿐 아니라 HTML의 `h1[id]` 실제 앵커도 확인한다.

## M106 — 문서 전체 고유 HTML 앵커 검증

- E115: 제목 앵커 ID와 각각의 heading ID를 개별 값 검증만 하지 않고 **문서 전체 범위**에서 중복 검증한다. 서로 다른 섹션이라도 같은 ID는 잘못된 발행 HTML이므로 거부한다.
- validator에서 기존 안전한 식별자 규칙, `DUPLICATE_TITLE_ID`, 진단 경로를 유지한다. 정적/단위 테스트와 공식 샘플의 9개 섹션 실제 DOM 식별자 유일성 검증을 별도로 수행한다.


## M104 — 이미지 chooser UI와 자산 identity/발행 계약 분리

- E113: 선택 UI는 썸네일과 검색·상세 편집을 제공하되 image node를 통째로 교체하거나 src를 암묵적으로 바꾸지 않는다. assetId/HostAsset locator는 사용자에게 보이는 alt/표시 크기와 다른 항목이며 불변으로 보존한다.
- 모달 열기 전에 Lexical note/image key를 기록하고 실제 편집 시 현재 editor tree에 존재하며 그 note의 자식인지 재검증한다. 이미지 크기는 양의 안전 정수 또는 생략만 허용하고 입력 전체를 검증한 뒤 일괄 반영한다. 접근성 label/aria-pressed/dialog/ESC/Tab, 375px 경계와 자동 복원/저장 왕복을 테스트한다.
- 노트 내 기존 이미지 선택과 **문서 전체 라이브러리 자산 등록**을 혼동하지 않는다. 관련 테스트의 기존 prompt 기대는 실제 GUI 테스트로 교체하되 중복 ID·잘못된 URL·불량 snapshot 거부 등 데이터 안전성 검사는 유지한다.


## M102 — 원본 DOM을 비교할 때 wrapper 및 텍스트의 의미적 추가를 금지

- E111: Lexical 내부 노드 모델과 출력 HTML은 분리한다. 노트는 직접 `label + input + span` 형제이며, 인접 `newthought + sidenote`만 label을 앞 span 자식으로 이동한다. 타입 변환 UI나 저장 JSON 필드 변경으로 문제를 해결하지 않는다.
- 정규 표현식만으로 구조를 단정하지 말고 browser DOMParser로 실제 부모·형제·`for/id`·payload 위치를 확인한다. 일반 prose의 공백은 고정 원본의 HTML 규칙을 사용하고 강제 pre-wrap을 추가하려면 별도 요구/검증을 확보한다.
- 수정 후에도 전체 페이지 parity는 DOM, 모바일 toggle, 키보드 접근성, 원본 이미지·폰트 로딩 및 시각 스크린샷으로 별도 검증한다.

## M103 — 숨김 컨트롤 접근성과 비어 있는 검사 대상 예방

- E112: `display:none` 컨트롤을 `focus()`만 호출해 검증하지 않는다. 실제 문서에서 keyboard modality와 `document.activeElement`, 표시된 focus cue, Space 왕복을 확인한다. 라벨은 접근 가능한 이름과 연결 ID가 있어야 한다.
- 선택자 교체 시 `querySelectorAll(...).every()` 이전에 최소 개수 및 각 요소 존재성을 검사한다. 오래된 wrapper 기반 테스트를 현재 구조에 맞춰 수정하되 기대 구조를 느슨하게 하지 않는다.
- 원본 자체의 구조와 독립 fixture의 차이를 제품 결함이라고 기록하지 않고, 같은 콘텐츠 재구성 검증을 별도로 수행한다.


## 2026-10-23 main 시작·완료 점검

AGENTS, E103/E104·M095/M096 및 기존 active-editor/fixture/타입 좁히기/출력 구조 대책을 확인했다. 시작 기준은 main c081546이며 기존 작업 브랜치와 분리된 worktree에서 실행했다. E105–E110/M097–M101을 설치·코드·테스트·결과 기록에 반영했다. check403/Python16/package5/HTTP 통과, browser19통과/15실패이며 E110을 유지한다. 다음 점검은 main의 schema/renderer/UI/asset helper 선별 통합 시작·완료 시 수행한다. CI 없음.

## M097 — workspace 패키지 추가는 설치와 독립 소비까지 검증

- E105: package manifest, lockfile importer/link, 패킹 대상 및 소비 환경의 workspace 의존성을 함께 확인한다. 새 package에도 LICENSE/notices/prepack을 적용한다. workspace 내부 실행 성공을 tarball 소비 성공으로 대신하지 않는다.

## M098 — 최신 노드 상태와 동기 트랜잭션 경계

- E106: optional 메타데이터의 타입을 좁힐 때 동일한 node snapshot을 재사용하고 내보내는 중첩 객체는 복제한다. Promise API를 동기 Result로 다루지 않는다. SQL 잠금 안에는 기존 동기 head 조회를 쓰고 async 검사와 원자적 commit을 분리한다.

## M099 — 실제 오류 경계까지 도달하는 테스트 fixture

- E107/E108: concrete wire type과 실제 거부 오류를 사용한다. default parameter가 부정 입력 undefined를 유효값으로 바꾸지 않는지 확인한다. Lexical exportDOM은 active editor와 editor 인자를 모두 전달한다. TS parameter property는 compiled JS 소비로 검사한다.
- invalid generation0과 유효한 stale generation을 구별한다. SQL immutable guard와 at-rest corruption 검사는 별개로 확인한다. 손상 주입은 일회용 테스트 DB에만 수행하고 운영 guard를 완화하지 않는다.

## M100 — 이관한 테스트가 현재 제품에 도달하는 경로 확인

- E109/E110: UI 버튼·저장 envelope·schema 필드·renderer output·필수 helper를 현재 main 소스와 대조한다. 편집 HTML과 순수 발행 HTML을 구별한다. 이름/selector만 고친 후에도 엄격한 구조 검사를 유지한다.
- 첫 실패 후 다른 파일도 독립 실행하여 누락을 드러낸다. wrapper 없는 입력/노트의 개수·부모·ID·모바일 왕복을 확인하며 없는 대상을 every로 허위 통과시키지 않는다.

## M101 — 실행 실패와 시각 검증 범위 구분

- E110 후속 선별 이관 원칙: upstream 브랜치의 스키마/렌더러 파일을 그대로 덮어쓰지 않고, main의 HostLink/HostAsset·publication/restore 계약과 비교해 필드·노드 단위로 반영한다. 시각 helper는 고정 Git blob 무결성과 명시적 acquisition을 함께 추가한다. 새 코드의 통과 여부는 전체 재실행 후에만 인정한다. [후속 체크리스트](MAIN_BROWSER_PARITY_REMEDIATION_2026-10-23.ko.md) 참조.

- E110: helper import 실패는 visual 검사 미도달로 기록한다. 원본 binary는 고정 출처·manifest·무결성 검사와 acquisition 경로를 함께 이관한 후 준비한다. 단색 pixel 비교기 자체 통과나 원본 inventory를 동일 콘텐츠 전체 시각 parity로 확대하지 않는다.
- 다른 브랜치의 pass 수와 main의 결과를 합치지 않는다. 최신 보고서에 시작 SHA, 수정 범위, 파일별 실패 원인·차단된 후속 assertion을 기록한다.

## M095 — node type 전환은 active fixture/golden/test까지 동시 감사

- E103: 팩터리와 스키마를 바꾼 경우 호출부, 렌더러, 생성 스크립트, 저장 v1/v2 fixture, Lexical golden, 브라우저 assertion을 하나의 변경 단위로 점검한다.
- `pnpm audit:notes`로 active 코드와 fixture의 `$createNoteNode`, `NoteKind`, 문자열 리터럴 `tufte-note`를 탐지한다. 레거시 문서 마이그레이션 및 그 명시적 테스트만 예외로 한다.
- 자동 감사를 통과해도 golden 런타임 재생성/직렬화 일치를 증명한 것은 아니다. 전체 테스트에서 별도 확인한다.

## M096 — 직렬화기 allowlist와 접근성 마크업 일치 검증

- E104: 렌더러가 추가하는 HTML 속성은 `tree.ts` allowlist에서 허용되는지 같은 변경에서 확인한다. 필요한 속성만 허용하며 이벤트 핸들러 등 임의 속성은 거부한다.
- note 발행 회귀에서 label/input/span 인접성, `for`/`id` 연결, `aria-label` 및 편집 전용 속성 부재를 확인한다. 렌더링 테스트 실행 전에는 검증 완료로 표시하지 않는다.


2026-10-19 완료 점검: E102/M094의 escape 계층 대책과 독립 DOMParser 실행을 반영했다. check318개/Python16개/browser16개/package4개/실제HTTP 통과. 원본 section9/note7과 별도 발행 section1/note2를 같은 콘텐츠 전수 비교로 확대하지 않는다. 다음 구현 시작/완료와 baseline 변경 때 재점검한다.

## 2026-10-19 DOM 대조 시작 점검

AGENTS 및 M077/M090–M093의 원본/확장 범위·속성 순서·실제 노트 구조 규칙을 검토했다. mainaa7cb0a 별도 worktree에서 frozen 설치 및 신규 mjs 구문 검사 후 실행했다. CI 생략. DOMParser 검사는 독립 upstream와 별도 publication fixture의 의미 구조 비교이며 전체 콘텐츠/시각 parity가 아님을 확인했다.

## M094 — 구문 통과와 정규식 의미 통과 구분

- E102/E084/M077: node --check만으로 과도한 정규식 escape를 검출할 수 없다. literal과 RegExp 문자열의 서로 다른 escape 계층을 확인하고 실제 고정 HTML에서 match 실행까지 확인한다.
- 정규식 assertion과 별도의 DOMParser 브라우저 결과를 함께 실행한다. 테스트를 성공시키기 위해 원본 파일/공개 HTML을 escape 패턴에 맞춰 변경하지 않는다.

2026-10-18 upstream 대조 완료 점검: E098–E101/M090–M093을 테스트/진단 코드에 반영했다. check316개/Python16개/browser15개/package4개/실제HTTP 모두 통과. 구조 vocabulary와 별도 fixture 노트 구조, 알려진 차이 존재 검사를 전체 페이지 parity로 확대하지 않는다. 다음 구현 시작/완료와 baseline 변경 때 재점검한다.

## M092 — 진단 분기의 선택/부모 의미 구분

- E100: 선택 대상 wrapper 부재와 해당 wrapper 부모의 스키마 불허는 별도 진단이다. 무변경 거부뿐 아니라 공개 진단 코드를 계약대로 확인한다.

## M093 — 노트 포함 컨테이너의 실제 선택 대상 확인

- E101: listitem 끝 선택은 마지막 inline note 내부로 들어갈 수 있다. 본문에서 실행하는 테스트는 본문 TextNode를 명시한다. note wire type은 공유 registry의 tufte-note와 일치시킨다.

## 2026-10-18 upstream 대조 검증 시작 점검

이전 fixture/DOM 가정·역할 selector·focus readiness·build/browser 직렬화 대책을 재점검했다. main02bb314 별도 worktree에서 frozen 설치 후 새 대조 검사를 포함해 실행했다. CI 생략. 현재 대조 검사는 구조 smoke이며 전체 페이지/시각 parity가 아님을 확인했다.

## M090 — 원본 포함 요소와 확장 지원 구분

- E098: baseline HTML의 실제 태그·클래스를 읽은 뒤 기대 vocabulary를 작성한다. 자체 확장 기능을 원본에 있었다고 가정하지 않는다. 원본 구조 검사와 전체 콘텐츠·시각 대조의 완료 gate를 구분한다.

## M091 — 노트 종류별 라벨 내용·인접 ID 검증

- E099: sidenote 자동 번호용 빈 라벨과 marginnote의 표시 glyph를 구분한다. 두 kind를 실제로 추출하고 for와 바로 인접한 input id를 비교한다. 문서 어딘가에 같은 ID가 존재한다는 약한 검사로 대체하지 않는다.

2026-10-18 완료 점검: E088–E097/M083–M089의 대책을 코드·단위·브라우저·실행 순서에 반영했다. 최종 check297개/Python16개/browser15개/package4개/실제HTTP 모두 통과. E086/E087도 현재 실행 범위로 확인했다. E064·W001 및 OS IME/접근성·다른 브라우저 제한은 유지한다. 다음 구현 시작/완료 및 같은 원인 재발 때 점검한다.

## M088 — snapshot 가시성과 fixture 대상 격리

- E095: 접힌 details의 접근성 role은 기본 탐색에서 숨겨진다. 명시적으로 연 뒤 조회한다.
- E097: 누적 편집 fixture에서 last UL을 신규 목록으로 추정하지 않는다. 시나리오별 section을 격리하고 실제 대상 텍스트/순서를 확인한다.

## M089 — 실제 키 처리 우선순위와 안전 위임 증명

- E096: 별도 headless 핸들러만으로 RichText와의 소유권을 증명하지 않는다. 먼저 등록된 EDITOR 소비자와 함께 boundary 우선·일반 텍스트 위임 회귀를 추가하고 실제 browser도 실행한다.
- HIGH 개입은 비조합·수정키 없는 접힌 선택의 명시한 첫/마지막 빈 최상위 ul/ol 항목에 한정한다. 일반·중첩·노트·IME는 기존 처리로 위임하며 전체 키보드 지원 완료로 확대하지 않는다.

## M086 — fixed 메뉴의 layout 여백 분리

- E092: 일반 배치 margin은 floating 좌표와 분리해 0으로 덮는다. 실제 bounding box의 네 변을 viewport와 비교하며 작은 화면/내용 증가를 포함한다.

## M087 — 브라우저 helper는 명시 계약과 실제 DOM을 기준으로

- E093: Tab 포커스 대상은 사전에 정한 메뉴 안/밖 계약과 일치시킨다. 임의의 과거 selector로 기대값을 정하지 않는다.
- E094: Lexical text wrapper의 존재를 허용하고 실제 Text node를 탐색한 뒤 offset을 검사한다. 의미 없는 DOM 형태 가정을 제품 기능 실패와 구분한다.

## M084 — 노드 이동 수신자와 그룹 순서 검증

- E090: insertBefore/After의 수신자는 이동 대상이 아니라 삽입 기준 노드다. down/up 왕복, 복수 term 공유 dd, 노트 ID와 저장 JSON을 함께 비교한다.

## M085 — 목록 JSON/중첩 항목의 동일 레벨 비교

- E091: inline 배열은 inline 배열과 비교하고 중첩 wrapper를 선택 항목으로 오인하지 않는다. 구조적 indent는 실제 대상 item의 key/텍스트 부모와 노트 ID를 기준으로 검사한다.

## 2026-10-18 일괄 검증 시작

E086/E087 및 M080–M082, 이전 구문·focus readiness·직렬 browser 실행 대책을 점검했다. main0411b03 별도 worktree에서 frozen 설치와 53개 mjs 구문 검사를 수행했다. 테스트 작성 완료와 실행 완료를 구분한다. CI 생략.

## M083 — 제어 흐름과 타입 좁히기 일치

- E088: 배열 전체 자식 검증 후 하위 타입 API를 쓰려면 타입 술어 every 등 실제 narrowing 경로를 유지한다. 강제 cast로 런타임 검증을 생략하지 않는다.
- E089: mutable valid 플래그만으로 selection 타입이 좁혀진다고 가정하지 않는다. nullable selection을 소비하는 지점에 공개 type guard를 명시하고 clean build를 실행한다.


## M082 — 구조 편집은 부모 스키마와 그룹 경계를 먼저 확인

- 목록 `UNWRAP_TUFTE_LIST_COMMAND`: 삭제/해제 전에 **선택이 속한 최상위 섹션 직계 목록**, 모든 자식 `listitem`, 각 항목의 깊이 0 및 `paragraph` 허용 자식 타입을 전체 검사한다. 하나라도 불허하면 리스트를 분할·보정하지 말고 기존 문서 전체를 유지한다.
- 성공한 목록 해제는 새 문단 컨테이너로 **기존 inline 자식 노드를 직접 이동**한다. 텍스트·링크·노트 payload/ID를 재생성해 누락·중복시키지 않으며 `HISTORY_PUSH_TAG`로 단일 undo 경계를 둔다.
- 정의목록 `dt/dd`의 그룹 경계를 눈에 보이는 인접 항목만 보고 추정하지 않는다. schema validator가 허용하는 `dt dt dd`는 '하나의 정의에 용어 둘'일 수 있으므로, 쌍 단위 이동/삭제는 오직 전체가 `dt dd`로 교대하는 경우만 허용한다. 마지막 쌍 삭제를 거부해 `EMPTY_NODE`/정의목록 위반을 예방한다.
- 단위 회귀에서 노트 ID·텍스트·노드 식별자, 우회되지 않은 부모 구조, 첫/끝 경계, 비정형 그룹의 **변경 없는 거부**를 각각 검사한다. 브라우저 회귀는 canonical JSON→HTML 발행 및 저장/재열기와 undo/redo를 포함한다.
- E086/E087 및 M080/M081을 재검토했다. 현재 구현과 회귀는 **작성 완료, 실행되지 않음**. 실행 중 실제 오류가 발견되면 새로운 E 기록과 수정/검증 결과를 별도로 남긴다.


## M081 — 패키지 직접 import·lockfile과 신규 인라인 명령의 원자성

- E087: 신규 import를 추가할 때 해당 패키지의 `dependencies`/peer dependency, `pnpm-lock.yaml`의 importer, public package export, consumer smoke를 모두 대조한다. 현재 workspace에서 import가 된다는 이유로 clean frozen install을 생략하지 않는다.
- 신규 Tufte 인라인 span 명령은 기존 span kind 변경과 분리한다. 변환 **전에** range 단일 text key·offset·IME·note/span 중첩·스키마 허용 여부를 검사한다. 다중 텍스트/블록 selection은 명시적으로 거부하고 기존 문서/노트 ID를 유지한다.
- `TextNode.splitText(start,end)`로 생긴 조각의 반환 순서와 좌우 형식 보존을 Lexical 소스·독립 회귀로 교차 검사한다. span 제거는 자식이 기존 부모에 허용되는 경우에만 이동한다.
- 코드 리뷰에서 노드 key/selection 보존을 확인해도 통과라고 하지 않는다. 변경 커밋에서 frozen 설치→타입 검사→단위/HTML/브라우저/undo·redo 순으로 일괄 실행하고 완료 상태를 기록한다. 외부 브라우저·실제 IME 범위는 별도.


## M080 — 컨텍스트 메뉴 세 진입 경로와 focus 복원의 불변식

- E086: 메뉴 열림 처리 코드를 수정할 때 `contextmenu`, `Shift+F10/ContextMenu`, 기본 토글 버튼 세 경로를 각각 점검한다. 각 진입점은 (1) 유효한 Lexical RangeSelection 포착, (2) 액션 허용 범위 계산, (3) `menuOpenRef.current=true`, (4) 열린 메뉴의 첫 버튼 focus를 충족해야 한다.
- 메뉴 focus 이동에 따라 editor의 선택이 `null`이 되더라도 열려 있는 메뉴의 액션과 원래 선택 위치를 덮어쓰지 않는다. 실행 전 저장한 node key가 살아 있는지 확인하고 `discrete` update에서 선택 및 명령을 순서대로 적용한 다음 편집기로 focus를 돌린다.
- Tab/Shift+Tab은 메뉴 내부 항목을 다시 순회하지 않고 다음/이전 외부 tabbable로 이동하고, Escape는 저장한 커서로 복귀한다. 열림 guard와 React 표시 상태는 닫을 때 함께 해제한다.
- 회귀에서 우클릭 대상이 이전 커서와 다른 섹션인 경우, 클릭/Enter 명령 실행, Escape 복귀, Tab 양방향 포커스, undo 원자성을 확인한다. 브라우저 검증을 수행하기 전까지 P3.1.c/d 완료를 선언하지 않는다.


## M079 — 컨텍스트 메뉴의 선제 유효성 검사와 실제 명령 계약을 분리

- 화면에서는 `NODE_SCHEMA`의 부모·자식 허용 타입을 사용하여 실행 불가능한 변환을 숨기되, 이것만으로 명령의 유효성을 보장했다고 취급하지 않는다. 최종 선택 상태 및 삽입 위치는 `packages/lexical`의 기존 명령에서 다시 검사한다.
- `LexicalNode` 전체가 자식을 갖는 것은 아니므로 `getChildren()` 호출 전 `$isElementNode`로 좁힌다. UI 코드의 타입 검사와 E2E는 추후 일괄 검증 시 함께 수행한다.
- 노트 포함 문단, 인용문, 일반 제목, 섹션 밖 편집 상태를 서로 다른 회귀 사례로 보관한다. 마우스 메뉴와 Shift+F10 메뉴에서 같은 항목 허용 기준을 사용한다.


2026-10-17 20:36 검증 시작/완료 점검: E080–E085/M073–M078을 확인했다. 별도 worktree·구문 검사·명시적 focus readiness·빌드 종료 후 browser 직렬 실행·constraints venv 절차를 적용했다. main85ac2c3의 check266개/Python16개/browser12개/package4개/실제HTTP 모두 통과했고 새 실패는 없었다. Chromium 부재는 E073/M067에 따라 설치 준비로 구분했다. 다음 구현 시작/완료에 재점검한다.

2026-10-17 UI 완료 점검: check266개/Python16개/package4개/기존browser11개+contextual1개/실제HTTP 왕복 통과. E080–E085 대책을 테스트·코드·실행 순서에 반영했다. 우클릭 실제 선택 오류는 반례와 정상 경로로 확인했다. 빠른 Escape/실제 IME/다른 브라우저·접근성 전체는 유지한다. 다음 구현 시작/완료 때 다시 점검한다.

## M078 — 키보드 UI는 표시와 focus readiness를 별도 관찰

- E085: 메뉴 렌더 완료만으로 다음 키 입력의 수신 대상이 확정됐다고 가정하지 않는다. 명시한 키보드 진입 계약의 첫 버튼 focus 후 Escape/방향키를 검증한다. 진입 전 race까지 지원했다고 확대하지 않는다.

## M077 — 인계된 테스트도 구문·fixture 전제를 먼저 점검

- E084/M060: 새로 직접 작성한 파일뿐 아니라 다른 대화에서 인계한 수정 mjs도 node --check한다. 정규식 literal과 문자열의 escape를 구분한다.
- 현재 블록 뒤 삽입 명령을 검사할 때 실제 선택 블록과 expected index를 일치시킨다. 기존 형제가 있으면 마지막 위치를 가정하지 않는다. footer/cite·quote/epigraph·undo/redo 모두 실제 UI에서 실행한다.

## 2026-10-17 UI 검증 시작 점검

M058/M068/M072 및 원자적 명령·실제 선택/이력 규칙을 재점검했다. main d53d7eb 별도 worktree에서 frozen 설치와 실행 환경 준비 후 검사했다. E079의 과거 환경 차단은 이번 checkout/설치 성공과 구분한다. CI 생략.

## M073 — 의미 HTML과 보존용 inline wrapper 구분

- E080: footer/cite 등 부모·순서·내용을 검증하고 renderer가 명시한 공백 보존 wrapper를 허용한다. 모든 태그를 무조건 제거해 의미 오류를 숨기지 않는다.

## M074 — 반복 액션은 이름 있는 UI 영역으로 검사

- E081/M068: toolbar와 floating toolbar의 같은 액션은 영역 이름으로 구분한다. 버튼 중복을 없애기 위해 사용자 기능을 삭제하지 않는다.

## M075 — 우클릭 대상을 실제 편집 선택으로 동기화

- E082: DOM 커서 배치나 focus만으로 Lexical selection이 갱신됐다고 추정하지 않는다. 공개 applyDOMRange API와 discrete update로 명령 전 선택을 반영한다. 이전 블록/주석 포함 블록/정상 제목을 각각 우클릭하고 변환 대상·거부 원자성을 확인한다.

## M076 — 브라우저 테스트 서버 격리

- E083: 고정 포트의 기존 browser 파일은 직렬 실행한다. 독립 target 검사는 별도 포트를 사용한다. 기존 서버 응답을 새 서버 기동 증거로 오인하지 않는다.
- Vite가 참조하는 dist를 갱신하는 build/check/package와 browser도 겹치지 않는다. 최종 제품 판정은 모든 선행 build가 종료한 뒤 직렬 실행한 결과를 사용한다.

## M072 — 원격 코드 수정과 로컬 실행 검증을 분리하고 환경 차단 시 중단

- E079: GitHub 커넥터로 커밋이 가능해도 테스트가 통과한 것은 아니다. 검증 명령을 반복하기 전에 `git ls-remote`, checkout 존재, `pnpm --version`을 확인한다.
- DNS/checkout이 차단된 동일 환경에서 새 테스트만 계속 늘려 완료로 취급하지 않는다. 실제 실행 가능한 환경으로 옮기거나 네트워크·의존성 준비가 해결될 때까지 F07 gate를 open으로 유지한다.
- 준비되면 `pnpm install --frozen-lockfile`, `pnpm build`, F07 단위·렌더·브라우저 회귀, `pnpm check`, `pnpm test:browser` 순서로 실행한다. CI는 실행하지 않는다. 실패 시 오류 ID를 기록하고 관련 대책을 갱신한다.

2026-10-17 HTTP 후속 완료 점검: E076–E078/M069–M071의 타입·설치·본문 전달 대책을 실제 코드와 실행 절차에 반영했다. check253개/pytest16개/browser11개/package4개/실제 localhost 교차 언어 왕복 통과. E073 브라우저 부재는 공식 설치로 준비했으며 제품 결함 해결과 구분한다. 다음 구현 시작/완료와 framework 업그레이드 때 전체 관련 기록을 다시 점검한다.

## 2026-10-17 Python/HTTP 검증 시작 점검

M058/M065–M068 및 기존 비동기 commit·검증 의존 순서·환경 준비 분리 규칙을 다시 확인했다. main5fb4d20을 별도 worktree로 검사해 과거237개 통과와 새 구현의 결과를 구분한다. Chromium 부재는 E073의 환경 제한 재발로 기록하며 공식 실행 파일 설치 후 회귀를 수행한다.

## M069 — SQL 연산 확장 시 어댑터 타입 동시 변경

- E076: 단일 행/여러 행 조회의 요구를 명시한다. 기존 공개 어댑터의 요구를 무작정 확대하지 않고 recovery 전용 타입을 export하고 clean build로 검사한다.

## M070 — Python 앱의 설치·검증 절차 명시

- E077: flat layout 모듈은 패키지 메타데이터에 명시한다. 격리 venv editable 설치와 pytest를 함께 실행하고 검증 당시 constraints를 기록한다.

## M071 — ASGI 본문 검사 후 실제 downstream 파싱 검증

- E078: stream을 읽은 후 _receive 교체만으로 downstream에 본문이 전달된다고 추정하지 않는다. middleware의 body cache/consumption 상태를 함께 확인한다.
- 정상 PUT→GET, DELETE, content-length 없는 스트리밍 초과, 인증 우선순위, 공통 fixture와 실제 HTTP client 왕복을 실행한다. FastAPI/Starlette 업그레이드는 test-constraints 환경과 비교하고 이 회귀를 다시 실행한다.

2026-10-17 완료 점검: check237개·browser11개·package4개 소비 검사가 모두 통과했다. E072/E074/E075는 현재 실행 범위에서 검증했고 E073은 환경 준비 완료로 구분한다. E069/E070의 단위 회귀는 통과했으나 P23 실제 UI 전체 gate와 E071 provenance 제한은 유지한다. 다음 구현 작업 시작/완료 및 단계 전환 때 다시 점검한다.

2026-10-17 완료 전 추가 점검: E075에서 M058의 최초 로드 누락을 확인해 지연 swap뿐 아니라 최초 custom glyph 조회 전에도 paint 동기화를 적용했다. 성공한 폰트 요청/ready만으로 실제 glyph 교체를 추정하지 않는다.

## 2026-10-17 최신 main 검증 점검

E069–E071/M062–M065 및 이전 비동기 commit·빈 NoteNode·검증 의존 순서 규칙을 점검했다. 기존 작업 폴더를 보존하고 최신 main을 새로 clone했다. 실행 대기 기록을 과거 통과 개수로 대신하지 않는다. 전체 F표/P단계는 해당 gate 증거 없이 닫지 않는다.

## M066 — nullable filter는 실제 추론 타입을 유지

- E072: 이미 좁혀진 필드를 unknown으로 넓힌 타입 술어를 쓰지 않는다. NonNullable<typeof item> 등 실제 원소 타입에서 null만 제거하고 clean build/typecheck를 실행한다.

## M067 — 환경 준비와 제품 검증 결과 분리

- E073: offline 캐시 부재는 lockfile 유지 일반 설치로 확인한다. 브라우저 부재는 고정 Playwright 실행 파일 설치 후 재검증한다. 준비 실패 뒤 dependent 검사를 계속하지 않는다.

## M068 — 복수 live region은 이름으로 구분

- E074: UI에 status가 추가될 때 이름 없는 role selector를 재점검한다. 작업/자동 저장 상태에 고유한 접근 가능 이름을 사용하고 실제 사용자 진단 문구를 정확한 영역에서 검사한다.

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
