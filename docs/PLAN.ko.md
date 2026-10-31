# Lexical Tufte 블로그 라이브러리 계획

작성: 2026-10-16 (Asia/Seoul)
상태: P0·P1·P2.1 완료. Chromium 자동 회귀와 조합 이벤트 검증 범위이며, OS별 실제 IME 및 제품 전체 검증은 후속 단계.
저장소: https://github.com/yunskim/lexical-tufte-css (public, GPL-3.0; 사용자가 생성한 설정 유지).

## 구현 우선순위 보완 (2026-10-18)

고정된 공식 Tufte CSS 예제 페이지의 **의미 있는 모든 노드와 조합을 거의 동일한 DOM/CSS 결과로 재현**하는 것이 우선 목표다. CSS selector 전수 조사만으로 DOM 구조의 완전성을 주장하지 않는다. 별도 예제 DOM 대응표로 실제 구조와 조합을 추적한다. Lexical JSON을 유일한 본문 정본으로 유지하며 Lexical 편집 DOM이나 exportDOM을 발행 정본으로 사용하지 않는다. Tufte HTML의 태그 하나마다 Lexical 노드 하나를 강제하지 않고, note의 label/input/span처럼 하나의 논리 노드가 여러 출력 요소에 대응할 수 있다.

기능 구현 순서는 **예제 DOM 대응 확인 → schema 계약 → Lexical 편집/경계 → 순수 renderer HTML → fixture 작성 → 누적 실행 검증**으로 한다. 기본 Lexical 키 입력을 재구현하기보다 문서 schema를 위반할 수 있는 경계에서만 가로채고, 붙여넣기·IME·undo/redo·저장/발행은 동일 불변식을 검사한다. 사용자 요청에 따라 현재 테스트는 작성·누적하고 일괄 실행하기 전까지 관련 체크박스를 완료 처리하지 않는다. 공식 예제의 지원 범위와 제3자 임의 HTML의 지원 범위는 구분한다.

## 다음 실행 단계: 공식 예제 parity 우선 (2026-10-23)

[공식 예제 재현 실행 체크리스트](UPSTREAM_PARITY_CHECKLIST.ko.md)를 이 단계의 진행 기준으로 사용한다.

1. 공식 upstream HTML과 기존 DOM 비교 테스트의 **실제 비교 범위**를 확인한다.
2. 동일 콘텐츠의 Lexical 문서와 upstream 사이의 구조 차이를 항목별로 분류한다.
3. 확인된 차이부터 편집기/renderer를 최소 수정하고 회귀 테스트를 추가한다.
4. 저장·재열기·발행 및 브라우저 시각·접근성 검증을 누적한다.
5. 사용자가 요청하면 일괄 테스트하고 실패를 수정한다. 그 전에는 실행하거나 완료로 표시하지 않는다.

호스트 참조 연동은 [확정된 인터페이스 경계](host-reference-boundary.md)에서 멈추며 Magnolia Works 구현을 추가하지 않는다.

## 목표와 완료 정의

Lexical로 Tufte CSS의 모든 표현을 구조적으로 작성·수정하고, 같은 문서를 미리보기·HTML 발행·블로그 운영에 사용하는 재사용 라이브러리를 만든다. 최종 산출물은 편집기, 독립 렌더러, 블로그 코어와 저장소 어댑터, 실제 운영 가능한 예제 블로그, 문서 및 배포 패키지다.

‘모든 기능’의 기준은 Tufte CSS 1.9.0, commit `b5d7b7bbe5ce9c4c50fcfad4f19ee3646cfd7ae1`의 `tufte.css`와 `index.html`이다. 새 upstream 기능은 비교 후 표와 fixture에 추가한다. CSS를 단순 적용하는 것으로 완료하지 않는다. 각 기능을 편집하고 저장·재열기·복사·붙여넣기·HTML 변환해도 의미가 보존되어야 한다.

표의 모든 항목과 P0–P7 완료 전에는 ‘전체 지원’ 또는 1.0을 선언하지 않는다. 수식, 인용문헌 관리, 실시간 협업, 댓글, 다중 사용자 SaaS는 후속 확장이다. ImageQuilts는 완성된 이미지의 삽입·배치를 지원하며 이미지 조합 제작 도구는 별도다. 인쇄 전용 조판은 upstream 지원과 별도로 취급한다.

## 구조

TypeScript + pnpm workspace를 제안한다. React 편집기를 첫 UI로 제공하고 문서 모델·렌더링·블로그 코어는 React에 종속시키지 않는다.

| 경로 | 책임 |
| --- | --- |
| packages/document | 버전 있는 문서 envelope, Lexical JSON payload, validator, migration, 공통 노드/속성 계약 |
| packages/lexical | 커스텀 노드, command, transform, JSON/HTML import-export |
| packages/editor-react | 툴바, 삽입 메뉴, 속성 패널, 단축키, 접근성, IME |
| packages/render | 문서에서 의미적 HTML 생성, SSR/정적 출력, 발행 검증 |
| packages/theme | 고정 upstream CSS와 폰트 연결, 편집 화면용 격리 스타일, 한글 본명조·본고딕 |
| packages/blog | 글 생명주기, slug, revision, archive/tag, feed, sitemap, SEO, build |
| packages/adapter-fs | 파일 기반 문서·자산 저장과 revision 관리; Node 전용 |
| examples/editor | 모든 기능을 작성하는 개발용 편집기 |
| examples/blog | 작성→저장→미리보기→발행→수정→비공개 전환 예제 |
| fixtures/tufte | 기능별 원본, JSON, 기대 HTML, 시각 비교 자료 |

독자 화면은 정적 HTML+CSS로 읽을 수 있게 한다. Lexical/React 편집 번들은 관리 화면에만 포함한다. 서버 렌더러는 Lexical JSON을 검증한 뒤 작은 내부 렌더링 트리로 변환한다. 별도의 두 정본 AST는 두지 않는다. headless Lexical 재사용 여부는 P1 spike에서 의존성과 일치성을 비교해 결정한다.

## 한글 서체 정책

- 한글 serif는 본명조(Source Han Serif), sans-serif는 본고딕(Source Han Sans)을 사용한다.
- 기본 본문·제목·인용·주석의 한글에는 본명조를, `.sans` 및 산세리프 표 등의 한글에는 본고딕을 적용한다. 라틴 문자의 ET Book 및 Tufte 기본 서체는 유지하고 한글 글리프를 지정 서체로 보완한다.
- 편집 화면·미리보기·발행 결과에 같은 서체 정책을 적용한다. 글자별 임의 대체 서체를 정규 디자인으로 삼지 않는다.
- 한국어용 글리프/지역 변형을 명시하고 필요한 굵기를 준비한다. 웹폰트 자산·로딩·라이선스 고지를 관리하며, 실패 시에는 시스템 serif/sans-serif로 읽을 수 있게 한다.
- F04에서 한글·라틴 혼용, 굵기, 주석·표, 로딩 성공/실패를 검증한다.

## 문서와 노드 계약

문서 envelope: `schemaVersion`, `id`, `locale`, `title`, `subtitle?`, `lexicalState`, `assets[]`. 블로그 메타데이터: `slug`, `summary`, `tags`, `authors`, `status`, `createdAt`, `updatedAt`, `publishedAt?`, `revision`. 날짜는 timezone을 포함해 저장하고 표시 시간대는 블로그 설정으로 분리한다.

본문은 section 구조를 보존한다. 제목은 메타데이터에서 단일 h1으로 출력하고 본문 h2/h3를 기본으로 한다. h4 이상 import는 진단하며 임의로 잘라내지 않는다. 모든 노드에 타입/버전 계약을 두고 미래 버전은 손실 없이 거부한다.

기본 문단·리스트·링크·표·코드는 공식 Lexical 패키지를 먼저 평가한다. Section, Subtitle, DefinitionList, Epigraph/Attribution, Figure/Caption, Note, Embed와 newthought/sans/numeral/danger 속성은 추가 계약이 필요하다.

노트는 anchor와 payload가 함께 이동하는 논리적 단위로 관리한다. note ID는 영구 식별자이고 화면 번호는 문서 순서에서 파생한다. 복사 시 ID를 재발급하고 내부 참조를 재연결한다. HTML은 label→input→span.sidenote/marginnote 인접 구조와 article별 고유 namespace를 유지한다. 여러 글을 한 화면에 표시해도 DOM ID와 카운터가 충돌하지 않아야 한다.

노트 본문은 링크·강조·코드·이미지 등 유효한 phrasing content를 지원한다. [ADR-0001](adr/0001-note-editor-model.ko.md)에 따라 v1은 단일 EditorState의 inline container를 사용한다. 블록 노트는 후속 별도 모델 설계 대상으로 두고 span 안에 p/div를 내보내거나 조용히 평탄화하지 않는다. 허용 목록·진단은 [공유 문서 계약](DOCUMENT_SCHEMA_V1.ko.md)과 packages/document에서 구현한다. 중첩 노트 및 동일 노트의 다중 참조는 v1에서 명시적으로 거부하고 진단한다.

## Tufte 전체 기능 검증표

각 F 항목은 독립 fixture를 갖는다. 체크는 편집·JSON roundtrip·HTML roundtrip(지원된 Tufte HTML subset)·발행 구조·반응형·접근성 증거가 모두 있을 때만 한다.

| 완료 | ID | 범위 및 주요 검증 |
| --- | --- | --- |
| [ ] | F01 | body/article/section, 본문 폭·간격·카운터 초기화, 관리 UI와 스타일 격리 |
| [ ] | F02 | h1/h2/h3, subtitle, 제목 안 코드, section 경계 편집 |
| [ ] | F03 | 문단·강조·굵게·링크·sup, 링크 밑줄·방문 상태 |
| [ ] | F04 | ET Book regular/italic/bold/old-style numeral, 한글 본명조(Source Han Serif)·본고딕(Source Han Sans), 폰트 자산 경로와 fallback |
| [ ] | F05 | sans/newthought/numeral/danger 인라인 속성과 sans 안 코드 |
| [ ] | F06 | ol/ul 중첩·들여쓰기, dl/dt/dd와 항목 간격 |
| [ ] | F07 | hr 및 section footer |
| [ ] | F08 | blockquote + footer/cite, 인용문 안 sidenote/marginnote |
| [ ] | F09 | epigraph 묶음·복수 인용·출처·인용 제목 |
| [ ] | F10 | 번호 있는 sidenote 삽입/편집/삭제/재배열, 번호 재계산 |
| [ ] | F11 | 번호 없는 marginnote, toggle 기호, 링크/코드/강조 본문 |
| [ ] | F12 | 여백 이미지·설명·대체텍스트, 노트와 함께 복사/이동 |
| [ ] | F13 | 본문 figure/img/figcaption 및 figure 내부 marginnote |
| [ ] | F14 | fullwidth figure/img/figcaption, 본문으로 전환 |
| [ ] | F15 | div.fullwidth/table.fullwidth 및 clear 동작 |
| [ ] | F16 | table-wrapper 수평 스크롤, 표 셀 편집·헤더 의미 보존 |
| [ ] | F17 | inline code, pre>code 및 pre.fullwidth, 공백·탭·긴 줄 |
| [ ] | F18 | iframe-wrapper의 figure/div 형태, 비율·title·허용 embed |
| [ ] | F19 | ImageQuilts의 본문/전체 폭 배치와 크기 보존 |
| [ ] | F20 | 760px 이하 토글/본문 전환·표/그림/목록, 759/760/761px 경계 |
| [ ] | F21 | 기본 밝은 테마·prefers-color-scheme dark 및 폰트 로딩 실패 |
| [ ] | F22 | 복수 article 카운터·ID 격리, 긴 노트 연속 배치와 overflow |

## API 초안

validateDocument/parseDocument/validateMetadata/validatePostRecord 및 제한된 renderArticle은 구현했다. 나머지는 후속 설계 API다.

- `validateDocument(input) -> Result<Document, Diagnostic[]>`
- `migrateDocument(input, targetVersion) -> Result<Document, Diagnostic[]>`
- `renderArticle(document, {idPrefix, assetResolver}) -> {html, diagnostics}`
- `importTufteHtml(html) -> {document, diagnostics}`
- `<TufteEditor value onChange assetAdapter />`
- `PostRepository`: list/get/create/save(expectedRevision)/delete, published snapshot 읽기
- `AssetStore`: put/get/delete, MIME·크기 검증, 논리 asset ID→URL 매핑
- `publishPost(id, expectedRevision)`, `unpublishPost(id)`, `buildBlog(config)`

에디터 onChange와 저장을 분리한다. 저장 충돌은 expectedRevision으로 검출한다. 저장 중/저장 완료/실패/충돌 상태를 표시한다. publish는 immutable revision을 발행하고 이후 초안 수정이 공개본을 바꾸지 않는다. 첫 어댑터는 filesystem, 이후 DB/object storage는 동일 계약으로 추가한다.

## 실행 체크리스트

CI는 구성하지 않으며 GitHub Actions 실행이나 CI 상태를 완료·병합 조건으로 삼지 않는다. 빌드·타입 검사·관련 테스트는 로컬에서 수행하고 결과를 기록한다.

체크된 항목은 실제 완료된 준비 작업뿐이다. 예상 일정은 P1 spike 이후 산정한다.

### P0 — 범위·저장소·기준선

- [x] P0.1 공식 Lexical 자료와 Tufte 데모/CSS를 읽어 요구사항 작성. 증거: 이 문서와 하단 출처.
- [x] P0.2 Tufte 기준 commit과 F01–F22 추적표 작성. 증거: 이 문서.
- [x] P0.3 단계·완료 조건·작업 규약 작성. 증거: 이 문서 및 AGENTS.md.
- [x] P0.4 사용자가 `yunskim/lexical-tufte` 저장소 생성, 계획·규약·README 업로드. 증거: main의 README.md, AGENTS.md, docs/PLAN.ko.md.
- [x] P0.5 Lexical 안정 릴리스 및 peer dependency 호환 확인, 모든 @lexical 패키지 버전 통일·lockfile 고정.
- [x] P0.6 workspace/TS/lint/build 및 로컬 검증 명령 구성, CSS·폰트·이미지별 라이선스/고지 확인, 기존 GPL-3.0 LICENSE에 맞는 패키지 메타데이터·고지 반영. 데모 이미지 무단 재배포 없이 자체 fixture 제작.
- [x] P0.7 upstream CSS selector·media·font 규칙을 추출해 F표와 전수 대조; 누락 시 항목 추가. 초기 feature inventory snapshot 커밋.

P0 gate: 저장소 URL, 재현 가능한 설치/빌드, 버전/라이선스/전수 목록이 기록되어 있다. 완료 증거: package.json, pnpm-lock.yaml, docs/DEPENDENCIES.md, THIRD_PARTY_NOTICES.md, fixtures/tufte/inventory.json, docs/PROGRESS.md.

### P1 — 어려운 편집 동작을 먼저 검증 (P0 이후)

- [x] P1.1 문단 중간 note, 링크/코드/이미지 payload, 키보드 진입/탈출 prototype.
- [x] P1.2 노트 복사·삭제·split/merge·이동·undo/redo·한국어 IME prototype.
- [x] P1.3 Lexical 소유 DOM과 export DOM을 분리해 label/input/span 인접성 확인; nested editor vs inline container 결정 ADR.
- [x] P1.4 section·figure·caption·fullwidth·표를 조합해 CSS direct-child 규칙과 렌더러 일치 검증.
- [x] P1.5 headless 렌더링·서버 import 방식 비교, API/문서 schema와 허용 노트 콘텐츠 범위 확정 ADR.

P1 gate: 완료. 노트 편집 회귀와 SSR 출력의 실제 브라우저 비교 통과. 증거: [ADR-0002](adr/0002-document-and-rendering.ko.md), [문서 계약](DOCUMENT_SCHEMA_V1.ko.md), packages/render, tests/server-browser.mjs, docs/PROGRESS.md. 전체 제품/OS IME/타 브라우저 검증은 P6에 남는다.

### P2.2 선행 안정화 — 설계 피드백 2026-10-16

아래 항목은 외부 코드 검토 피드백이며, 실제 수정 및 로컬 검증 전까지 미완료로 취급한다. CI는 추가하지 않는다.

- [x] R01 document의 isSafeURL/isIdentifier를 Lexical 노드 import/생성 경로에서 재사용하고, assetId/width/height 보존을 검증한다.
- [x] R02 모든 지원 노드에 document → editor import → export → document 동등성 왕복 하네스와 골든 JSON을 마련한다. 알 수 없는 데이터는 무조건 삭제하지 않고 진단한다.
- [x] R03 Lexical 버전별 JSON 차이를 검증하는 명시적 canonicalization/migration 경계를 설계한다. 버전 업그레이드 때 fixture를 재검증한다.
  - [x] R03.a Lexical 직렬화 형식 버전과 문서 schemaVersion을 분리하여 저장하고, 알 수 없는 버전은 진단한다. 실행 검증: docs/VERIFICATION_2026-10-16.ko.md (현행 format1/legacy envelope 범위).
  - [x] R03.b 기존 저장 JSON → 버전별 명시적 migration → 현행 validator → Lexical parse 순서로 로드한다. migration 없이 기본 필드 차이를 무손실 검사에서 자동 허용하지 않는다.
  - [x] R03.c 각 지원 버전의 golden fixture 및 변환 전후 의미 보존·손실 진단 테스트를 마련한다.
  - [x] R03.d 로드 시 undo/redo 이력의 초기화 정책을 별도 editor integration 계약으로 정의한다. [통합 계약과 검증](HISTORY_R03.ko.md): 두 loader와 실제 React 교체/실패/첫 수정/반복 로드 검증, 전체180개·브라우저7개 통과.
- [x] R04 예제 main.tsx의 clipboard ID 재발급, 내부 참조 갱신, IME 관련 핵심 불변식을 packages/lexical로 옮기고 회귀 검증한다.
- [x] R05 section/figure/table-layout 편집 중 무효 상태의 복구 UX 또는 정규화 transform을 정하고, 무효 상태 저장·발행 정책을 분리한다. [복구 UI·정책](STRUCTURE_RECOVERY_R05.ko.md), 187개·브라우저7개 통과.
- [x] R06 note HTML ID 조합의 모호성을 제거하고 prefix/noteId 충돌 fixture를 추가한다.
- [x] R07 inline style을 class/CSS로 이전하고 CSP 호환성을 검증한다.
- [x] R08 문자열 치환 기반 렌더링을 작은 typed render tree + serializer로 대체한다. prototype exportDOM은 발행 정본이 아님을 명시한다.
- [x] R09 table header를 thead/th scope로 올바르게 출력하도록 F16 계약과 fixture를 마련한다.
- [x] R10 underline/strike/mark의 편집 허용 범위와 Tufte 발행 의미를 명시한다. [실제 편집·발행 검증](TEXT_FORMAT_R10.ko.md), 189개·브라우저8개 통과.
- [x] R11 P5 이전 firstPublishedAt/publishedRevision과 immutable 공개 snapshot의 생명주기를 정의한다. [실제 SQLite 저장·실패 검증](PUBLICATION_LIFECYCLE_R11.ko.md), packages/blog, 201개·브라우저8개 통과.
- [x] R12 adapter-fs의 id 기반 저장 경로, slug case-fold 중복, Windows 예약어·경로 충돌을 검증한다.
- [x] R13 GPL-3.0-only 유지 여부와 재사용 정책을 P7 전에 명시적으로 결정한다. 한글 Source Han 폰트의 subset unicode-range woff2 전략을 P4 전에 검증한다. [기존 GPL 유지·대표 서브셋/원본/패키지 검증](LICENSE_AND_FONTS_R13.ko.md), check201개·browser9개·tarball4개 통과. 전체 생산 폰트는 P4.
- [x] R14 CI 없이 로컬 check + test:browser 실행 경로(pre-push hook은 선택)를 문서화하고 실제 실행 결과를 남긴다.

2026-10-16 통합 검증: [실행 보고서](VERIFICATION_2026-10-16.ko.md). 140개 단위/통합 및 6개 브라우저 실행 파일 통과. 체크한 R 항목은 보고서의 범위에 한정한다. 후속 R 항목은 각 보고서에서 완료했다. P2.2–P7/F표는 미완료다. R02는 후속 [전체 노드 왕복 검증](ROUNDTRIP_R02.ko.md)으로 완료(178개·브라우저7개)했다.

완료 판정: 각 항목은 변경 파일, 테스트 명령, 실행 결과를 docs/PROGRESS.md에 기록한 뒤 체크한다. 코드 실행을 하지 않은 설계 검토만으로 완료 처리하지 않는다.

### P2 — 문서/노드/변환 (P1 이후)

- [x] P2.1 envelope·metadata·asset·노드 schema 및 validator 구현. 증거: packages/document, DOCUMENT_SCHEMA_V1.ko.md, document-contract.test.mjs, PROGRESS.md.
- [ ] P2.2 F01–F09 노드/속성/commands와 JSON serialization 구현.
  - [x] P2.2.a section 묶기/추가/블록 경계 분할/병합 및 paragraph·h2·h3 명령, 내용 보존·거부 원자성·실제 UI 왕복. [명령 계약](SECTION_COMMANDS_P22A.ko.md), check214개·browser10개·package4개 통과.
  - [x] P2.2.b F03/F05 인라인 속성 및 F06 목록/정의목록 명령과 회귀의 명시한 지원·거부 범위 수락. [추적 이슈 #9](https://github.com/yunskim/lexical-tufte-css/issues/9), [정의목록 최종 수락/범위](VERIFICATION_DEFINITION_LIST_2026-10-31.ko.md). 전체 F06/P2.2.d/P4/P6 게이트를 완료했다는 뜻은 아니다.
    - [x] P2.2.b.0 editor prototype의 직접 import가 package.json과 pnpm-lock에 명시되는지 확인하고 workspace frozen install/package 경계를 검증한다. 2026-10-18 frozen/check297개/package4개 통과, [실행 보고서](VERIFICATION_2026-10-18.ko.md). E087 실행 검증 완료.
    - [x] P2.2.b.1 선택 텍스트 span 생성·기존 kind 변경·해제의 지원/거부 경계 및 atomic undo/redo, JSON/인라인 HTML 왕복 검증. 한 TextNode 부분 선택·링크·rich text·인접 note identity를 보존하고 cross-node/부모·노트 내부·IME는 명시적 거부. [지원 계약](INLINE_SPAN_P22B1.ko.md), [실행 증거](VERIFICATION_INLINE_SPAN_2026-10-23.ko.md): check425개, browser35개 중34통과/보류 자산1실패, 모바일/데스크톱·키보드·CDP IME 검증. 전체 문서 HTML importer는 P2.4, 실제 OS IME/스크린리더는 P6.
    - [x] P2.2.b.2 ul/ol 항목 생성·추가·형태 변경·중첩·들여쓰기·내어쓰기/해제 및 Enter/Backspace/Tab의 명시된 지원·거부 범위 구현·검증. 빈/최초·중간·최종·혼합/중첩·노트/범위 보존 검사 완료. [K5 수락 행렬·제한](VERIFICATION_LIST_ACCEPTANCE_2026-10-31.ko.md): 최종 unit483·package5·Python16/HTTP 통과, browser35/36(보류 자산1실패), 공식6폭 pixel차이0. 임의 mixed-parent 변환·실제 OS IME/스크린리더 전체 지원을 뜻하지 않는다.
      - [x] P2.2.b.2-K1 키보드 소유권 확인: 실제 registerRichText 앞/뒤와 Tufte HIGH 경계 및 기본 EDITOR 분할을 headless/browser로 검증. root-level Tufte 섹션의 ul/ol에 한정하고 note/IME/범위·수정키·미지원 체크리스트는 자체 변경 없이 위임. [계약](LIST_KEYBOARD_P22B2.ko.md), [실행 결과](VERIFICATION_LIST_KEYBOARD_2026-10-27.ko.md): 최종 check458·package5·목록1440/375px 통과, 전체 browser34/35(보류 자산1실패; 마지막 checklist guard 이후 집중 재검증 범위 명시).
      - [x] P2.2.b.2-K2 Enter: 처음/중간/끝 native 분할, 최종 빈 항목 종료, nested 빈 항목 한 단계 outdent를 구현·검증. 혼합 부모 텍스트/노트 ID·앞뒤 형제·목록 metadata 보존, 각각 한 Undo/Redo·저장/재열기·실제 nested JSON 발행을1440/375px에서 검사. [계약](LIST_KEYBOARD_P22B2.ko.md), [실행 결과](VERIFICATION_LIST_KEYBOARD_2026-10-27.ko.md). 실제 OS IME/스크린리더는 P6.
      - [x] P2.2.b.2-K3 Backspace: root-level section의 첫 phrasing 항목을 내용·서식·노트 보존 paragraph로 해제. 일반 문자 삭제/병합·안전한 nested outdent는 RichText 위임, 위험한 혼합 부모와 첫 nested payload는 진단·무변경 거부. 2026-10-31 check465·package5·목록1440/375px의 각 Undo/Redo·저장/발행 및 note browser3개 통과. [지원 범위·실행 결과](VERIFICATION_BACKSPACE_2026-10-31.ko.md). 실제 OS IME/다른 브라우저는 P6, K4/K5는 별도 미완료.
      - [x] P2.2.b.2-K4 Tab/Shift+Tab: ul/ol 깊이19↔20, 깊이20/최상위/첫 항목/혼합 부모/컨테이너·범위·note/paragraph 거부 시 실제 앞뒤 focus 및 무변경을1440/375px에서 검증. no-op 컨테이너는 keyboard 위임/toolbar 진단. 최종 check475·집중10개·패키지5개·목록 두 폭·contextual UI 통과. [실행 결과](VERIFICATION_TAB_FOCUS_2026-10-31.ko.md). 실제 OS IME/스크린리더는 P6, K5는 미완료.
      - [x] P2.2.b.2-K5 수락: [조합별 수락 행렬·전체 실행 결과](VERIFICATION_LIST_ACCEPTANCE_2026-10-31.ko.md), [소스/로그·최초/재실행 및 pixel 수치](verification/list-acceptance-20261031.json). 지원/거부 범위의 최초·중간·최종·빈·혼합/nested·노트/IME·history·JSON 저장/재열기/발행·실제 focus를 통합 검증. unit483·package5·Python16/HTTP 통과, browser35/36(보류 자산1실패), 실제 OS IME/스크린리더는 P6.
    - [x] P2.2.b.3 정의목록 쌍/그룹의 추가·수정·삭제·복수dt 순서/노트 보존 및 canonical 재열기·editor native/pure renderer 의미 HTML 비교. malformed/section 밖/범위·조합·note 내부 진단·무변경. [지원/제한과 실행 결과](VERIFICATION_DEFINITION_LIST_2026-10-31.ko.md): check501·package5·정의목록1440/375px 및 publication/contextual 통과. 임의 HTML import/모든 속성·별도 alias GUI는 이 수락 범위에 포함하지 않는다.
  - [ ] P2.2.c F07–F09 구분선/section footer/quote·출처/epigraph 명령과 회귀.
    - [ ] P2.2.c.1 이미 구현된 생성·출처 추가 명령을 기준으로 기존 노드의 속성/내용 수정, 출처·인용 삭제, 복수 epigraph 항목 관리의 지원/거부 경계를 정한다. [명령 계약·구현 체크리스트](QUOTATION_COMMANDS_P22C.ko.md)에 범위 설계 완료; C1.a URL/삭제 명령·예제 UI 구현, check551·quotation63·UI1440/375px·package5개 통과. C1.b epigraph 내부 항목 추가/이동은 미완료.
    - [ ] P2.2.c.2 선택 위치·동일 블록 원자성·undo/redo·JSON→발행 HTML·재열기·스크린리더 읽기 순서를 회귀 검증한다.
  - [ ] P2.2.d F01–F09 직렬화·발행 지원 경계 통합 검증. F04 전체 폰트/시각 증거는 P4와 연결.
    - [ ] P2.2.d.1 `NODE_SCHEMA`에서 허용되는 타입/속성과 editor import/export 및 순수 renderer capability를 기능별 매트릭스로 대조한다. 구현하지 않은 속성은 침묵 변환 대신 진단·발행 차단.
    - [ ] P2.2.d.2 F01–F09 대표/거부 fixture에 대해 편집→JSON 저장→재열기→HTML 발행→semantic DOM 비교를 실행하고 명령별 history/IME/접근성 증거를 남긴다.
  - [ ] P2.2.e 공식 Tufte CSS 1.9.0 고정 예제 `index.html`의 의미 있는 DOM 요소·부모/자식·순서·CSS direct-child 관계를 전수 대조한다. `fixtures/tufte/inventory.json`의 selector 목록과 별개로 예제 DOM → F01–F22 → 문서 schema → Lexical node/command → 순수 renderer HTML의 대응표와 대표/거부 fixture를 작성한다. 한 논리 노드가 여러 HTML 요소로 출력되는 note처럼 1:n 관계를 명시하고, 비지원·의도적 차이는 진단/ADR에 남긴다. **P2.2의 기능별 수락 전에 대응표의 관련 행을 먼저 확인한다.**
- [ ] P2.3 F10–F19 노트·그림·표·코드·embed 구현.
  - [ ] P2.3.a 노트 F10–F12: note 종류 전환/텍스트·이미지 편집/삭제/이동, anchor/ID 일체성, copy/paste/undo/redo, 복수 article 번호와 모바일 fallback.
  - [ ] P2.3.b 그림·ImageQuilts F13/F14/F19: src/alt/caption/asset ID 수정 및 body/fullwidth/여백 변환, 자산 유실·삭제 시 진단, schema 유효성 보존.
  - [ ] P2.3.c 표/전체 폭 F15/F16: 셀·헤더·행/열 편집, 스크롤/폭 전환, 병합 거부와 접근 가능한 설명, 좁은 화면 overflow.
  - [ ] P2.3.d 코드/embed F17/F18: code block·language·fullwidth·공백/탭 및 embed의 provider allowlist/title/aspect ratio/서식 편집. 외부 HTML/sanitization 정책과 통합.
  - [ ] P2.3.e 각 F10–F19 기능은 문서 schema·Lexical 편집·순수 JSON→HTML 렌더링을 한 단위로 구현한다. 편집만 가능한 상태를 기능 완료로 판정하지 않는다. CSS의 direct-child 관계와 note/asset ID를 보존하는 HTML fixture를 기능별로 준비하고, 실행 검증은 사용자 요청에 따라 묶어서 수행한다.
- [ ] P2.4 JSON 및 HTML import/export, 지원 subset 명시, 손실 진단과 unknown-node 발행 차단.
  - [ ] P2.4.0 importer 범위를 단계화한다: (1) 고정 공식 Tufte 예제의 지원 구조, (2) 본 라이브러리 발행 HTML의 역변환, (3) 제3자 Tufte 스타일 HTML. 1·2를 우선하며 범용 HTML 수용을 목표로 하지 않는다. 지원되지 않는 구조는 위치 있는 진단으로 거부하고 침묵 손실을 금지한다.
  - [ ] P2.4.a 문서 정본(JSON)을 유지하고 외부 Tufte HTML importer의 허용 태그/속성/URL·노트 인접 DOM 계약을 고정한다. 비지원 요소는 삭제하지 않고 위치 있는 진단과 중단/명시적 손실 선택을 제공한다.
  - [ ] P2.4.b renderer(순수 JSON→HTML), Lexical exportDOM(편집 보조), preview(발행 출력) 간 의미 차이를 fixture로 검사한다. 발행 정본으로 exportDOM을 사용하지 않는다.
- [ ] P2.5 schema migration fixture, malformed 입력·ID 충돌·참조 오류 검증.
  - [ ] P2.5.a schemaVersion·stored format·Lexical 노드 버전을 분리해 지원 버전별 명시적 migration과 실패 시 원본 복원/백업을 검증한다.
  - [ ] P2.5.b duplicate note/asset ID·깨진 참조·URL·unknown fields·깊이/크기 상한·취소/부분 저장 입력을 검증한다.

P2 gate: F01–F19의 데이터 보존 및 구조 검증 통과. 편집·시각 증거 전에는 F표를 완료 처리하지 않는다.

### P3 — 편집기 (P2 이후)

- [ ] P3.1 toolbar/삽입 메뉴/노트·그림 속성 패널, 전체 기능 discoverability.
- [ ] P3.1.a 아이콘·툴팁·단축키 명령 레지스트리를 정의하고 툴바·삽입 메뉴·컨텍스트 UI에서 공유한다. Windows/Linux/macOS 키 충돌 및 접근성 이름을 검증한다.
- [ ] P3.1.b 텍스트 선택 영역에 Floating Toolbar를 제공한다. 굵게·기울임·밑줄·링크·코드·강조·Sidenote/Marginnote 삽입을 문맥에 맞게 노출한다. 비어 있거나 접힌 선택, 주석 내부, IME 조합 중에는 적절히 숨기거나 제한한다.
- [ ] P3.1.c 블록 컨텍스트 메뉴를 제공한다. 문단·제목·인용문·목록·그림·주석의 종류와 스키마에 따라 가능한 변환·편집 명령만 표시한다. 지원하지 않는 변환은 숨기거나 사유를 알리고 원본 내용을 보존한다.
- [ ] P3.1.d 선택 영역 보존, 포커스 복귀, 키보드 열기/닫기(Escape), 스크린리더, 툴바 위치·화면 가장자리, 모바일 터치·IME 및 undo/redo를 회귀 검증한다. 우클릭 메뉴와 선택 영역 툴바의 동작을 구분한다.
- [ ] P3.1.e `examples/editor`에 집중된 액션/선택/노트 도구·상태를 `packages/editor-react` 재사용 가능한 컴포넌트와 hook/API로 이동한다. 호스트 props(`value/onChange/onError/assetAdapter/readonly`), lifecycle/unmount·초안 교체·여러 편집기 독립성, accessibility contract를 공개 예제로 검증한다. 예제는 소비자여야 하며 역의존 금지.
- [ ] P3.1.f 편집 툴바는 핵심 서식만 기본 노출, 삽입 메뉴·문맥 메뉴·figure/note 속성 패널로 작업을 분산한다. 섹션·목록·주석·그림·인용·코드를 발견/생성/수정하는 작업 경로를 1개 문서 showcase에서 모두 실연한다. 기존 테스트의 역할·이름 변경은 접근성 계약과 함께 명시적으로 이관한다.
- [ ] P3.1.g **Notion-like 블록 편집 UX** ([추적 이슈 #10](https://github.com/yunskim/lexical-tufte-css/issues/10)): 블록 단위 조작을 기존 Lexical/Tufte 문서 스키마 위의 UI·command 계층으로 구현한다. 특정 제품 UI를 그대로 복제하지 않으며 새 범용 block AST를 문서 정본으로 추가하지 않는다.
  - [ ] P3.1.g.1 블록 의미·액션 수락 조건 정의: `root → tufte-section → 허용 block`을 유지하고 paragraph/heading/quote/list/definition-list/figure/table/code/embed/fullwidth/footer/hr의 지원 명령 매트릭스를 작성한다. **노트는 독립 이동 블록이 아니라 본문 inline anchor와 payload의 단위**다. figure의 caption/여백 주석, 목록의 listitem/dt/dd는 부모와 함께 관리한다.
  - [ ] P3.1.g.2 커서가 있는 블록 옆에 더하기(+) 삽입·블록 조작 핸들(드래그 이동 자체는 3차)을 노출하고, `/` 슬래시 메뉴(검색/유형별 삽입: 문단·h2/h3·목록·정의목록·인용·구분선·그림·코드 등)를 제공한다. IME 조합·노트 입력·코드 입력에서는 슬래시 진입/단축키를 가로채지 않는다. 명령 실행 시 입력한 트리거의 처리와 Escape 취소 시 리터럴 `/` 보존·커서 복구를 명시하며, 기존 `INSERT_*/SET_*` 명령과 action registry를 재사용한다.
  - [ ] P3.1.g.3 블록 선택·위/아래 이동·복제·삭제·유형 전환을 command로 분리한다. 마우스 드래그와 키보드 동등 경로(블록 선택, 위/아래 이동, 메뉴 호출)를 모두 제공한다. section 경계의 이동은 명시적 목적지/스키마 검사 뒤 허용하거나 진단하며, root·section 자체의 재정렬과 자식 블록 이동을 구분한다.
  - [ ] P3.1.g.4 목록·정의목록·표·figure·epigraph·fullwidth 같은 **복합 블록**의 내부 항목 선택/이동과 상위 블록 이동을 구분한다. 구조를 임의 div로 감싸거나 section 밖으로 노드를 빼내지 않는다. 미지원 drag/drop·다중 블록 변환/중첩은 원문을 유지하고 이유를 알린다.
  - [ ] P3.1.g.5 블록 복제/붙여넣기에서 note ID·내부 참조를 필요 시 재발급/재연결하고 자산 참조는 보존한다. drag/drop 전후 caret/selection·focus·history(한 번에 undo/redo)·자동저장 상태를 일치시킨다. 블록 외부 drop, 조합 중 drop, 스키마 불허 대상, 취소(Escape)는 무변경.
  - [ ] P3.1.g.6 모바일 터치에서 핸들·삽입 메뉴·블록 이동을 키보드/마우스와 기능적으로 동등하게 제공하고 screen reader용 블록 종류/위치·이동 결과를 알린다. 손잡이 hover에만 의존하지 않고 touch/assistive 기술로 발견 가능해야 한다.
  - [ ] P3.1.g.7 적용 순서: **1차** 핸들 표시·삽입/슬래시 메뉴·블록 유형 전환 → **2차** 키보드 이동·삭제·복제/undo → **3차** 실제 포인터 드래그·섹션 간 이동 → **4차** 복합 블록/모바일·접근성 확대. 각 차수마다 최소 반례와 JSON 저장→재열기→발행 HTML 동등성 증거를 남긴다. P2 명령·스키마 gate 및 P3.1.e 재사용 컴포넌트 경계를 먼저 확보한다.
- [ ] P3.2 키보드·focus·selection·clipboard·undo/redo·한국어 IME·모바일 터치.
- [ ] P3.3 동일 렌더러로 preview, draft 복구·dirty state·오류 표시.
  - [ ] P3.3.a `renderArticle` 정본 결과를 독립 sandbox/격리 스타일의 preview로 보여 주고 발행 실패 진단을 위치·원인과 연결한다. JSON/HTML 텍스트 표시를 실제 미리보기로 오인하지 않는다.
  - [ ] P3.3.b 로컬 복구본 목록·선택적 복원·복원 전 diff/확인, dirty/saving/saved/error/conflict 표시와 navigate-away 보호, 비공개 draft 및 최종 공개 snapshot 분리를 검증한다.
- [ ] P3.4 assets 업로드/진행/취소/실패 재시도, alt/caption, 본문/여백/전체 폭 전환.
  - [ ] P3.4.a `AssetStore` 어댑터와 브라우저 임시 blob/외부 URL/저장 asset ID의 소유권·중복 제거·미참조 회수 기준을 명시한다. 업로드 실패 시 공개본 참조 보호, 취소 후 복구·재시도를 검증한다.
  - [ ] P3.4.b 파일 MIME 매직바이트·크기 제한·SVG 정책·alt 필수/장식 이미지·캡션 수정/삭제를 테스트하고 외부 URL과 호스트 인증 경계를 유지한다.
- [ ] P3.5 노트의 모바일 작성 UI는 항상 접근 가능하게 제공; 독자용 접힘 상태와 구분.

P3 gate: 예제 글의 모든 F기능을 HTML 직접 편집 없이 생성·수정·재열기 가능. **P3.1.g 블록 편집은 별도 단계별 gate로 판정**하며, Tufte section/inline note의 무손실 보존·명령/스크린리더·모바일 등 누락된 입력 경로가 있으면 'Notion-like 전체 지원'이라고 표시하지 않는다.

### P4 — 발행 렌더러와 전체 호환성 (P2/P3 이후)

- [ ] P4.1 Node 서버/정적 renderer, deterministic ID·HTML, JS 없는 공개 글.
- [ ] P4.2 원본 CSS 전체 페이지 모드와 scoped embedded 모드를 분리 검증; 전역 body 스타일이 관리자 UI를 바꾸지 않게 함.
- [ ] P4.3 F01–F22 fixture와 공식 baseline 비교, 의도적 차이는 ADR에 명시.
- [ ] P4.3.a 고정 upstream 예제와 발행 결과를 대표 뷰포트(1440/761/760/759/375px)에서 비교한다. DOM 의미·CSS direct-child 구조·폰트 로딩 상태·노트 위치·표/그림 폭을 분리 기록하고, 의도적 차이는 ADR에 남긴다. P2 단계에서도 기능별 구조/시각 fixture를 준비하되 전체 시각 수락은 P4에서 수행한다.
- [ ] P4.4 CSS 기본 토글 외에 키보드/스크린리더 가능한 progressive enhancement 결정; JS 없어도 내용 접근 fallback 제공.
- [ ] P4.5 dark/한글 본명조·본고딕 및 fallback/장문·연속 노트/여러 article/좁은 화면 overflow 검증.
- [ ] P4.6 `packages/theme`를 편집기 DOM·출판 scoped/full-page 2모드에서 재사용할 수 있게 분리한다. 폰트 subset coverage·ET Book 우선순위·font-display·license·패키지 자산 base URL·CSP/no-JS 및 CSS 충돌을 확인한다.

P4 gate: F01–F22 완료 증거 확보, 공개 페이지에 editor dependency가 포함되지 않음.

### P5 — 블로그 운영 라이브러리 (P4 이후)

- [ ] P5.1 filesystem repository와 asset adapter, 원자적 저장·revision 충돌·초안 복구.
  - [ ] P5.1.a `packages/adapter-fs` 구현: fsync/원자 rename·expectedRevision CAS·경로/slug 중복·삭제/정리 오류·동시 프로세스 쓰기·복구/백업·Windows 파일명 경계를 테스트한다.
  - [ ] P5.1.b `packages/blog`의 현 SQLite publication/recovery proof를 실제 호스트 저장소 어댑터와 연결하되 공개 snapshot·초안·편집 세션·복구본 데이터 소유권 및 retention/삭제 규칙을 분리한다.
- [ ] P5.2 create/edit/preview/publish/update/unpublish/delete; 공개 snapshot과 초안 분리.
- [ ] P5.3 slug 중복/변경 redirect, 날짜·timezone, 목록·pagination·tag·archive.
- [ ] P5.4 SEO title/description/canonical/Open Graph, RSS/Atom·sitemap·robots, HTML escape.
- [ ] P5.5 정적 build, 콘텐츠/자산 누락 검출, 백업·복원 및 포맷 내보내기.
- [ ] P5.6 호스트가 인증/권한/CSRF/배포를 책임지는 경계 문서화; 예제 관리 API는 인증 또는 로컬 전용으로 제한.
- [ ] P5.7 업로드 MIME/크기 제한·path traversal 방지·URL protocol allowlist·embed provider 정책·SVG 처리·XSS 회귀 검증.
- [ ] P5.8 `examples/blog` 소비자 예제로 문서 생성→편집→preview→publish→update→unpublish→restore→delete·검색/목록을 실제 경로로 연결한다. 공개 라우트는 편집 의존성, 초안·복구본·인증 비밀 누출 금지. 호스트의 인증·ACL·Origin/CSRF와 recovery 서비스 연결 책임을 문서화한다.

P5 gate: 실제 예제 블로그에서 작성→발행→수정→비공개→복원 및 revision 충돌 시나리오 통과.

### P6 — 품질과 운영 검증 (P3–P5 이후)

- [ ] P6.1 Chromium/Firefox/WebKit e2e, 375/759/760/761/1440px 및 light/dark 시각 비교.
- [ ] P6.2 axe 자동 검사 + 키보드/스크린리더 수동 검사, focus visible 및 note 왕복 탐색.
- [ ] P6.3 HTML conformance 검사, JSON/HTML roundtrip, 자산 유실·저장 실패·악성 입력 테스트.
- [ ] P6.4 5만 자·노트 200개 장문 fixture에서 입력/저장/렌더 baseline 측정 후 성능 예산 확정, 회귀 기준 적용.
- [ ] P6.5 package export/ESM/types/SSR·consumer 설치 smoke test, 브라우저에 Node 전용 모듈이 새지 않는지 검증.
- [ ] P6.6 문서·기능별 evidence matrix를 유지하며 검증 게이트를 분리한다: 정적 타입/빌드, 명령·JSON·렌더, Playwright UI, 실제 OS IME/터치/스크린리더, SSR/정적 빌드, end-to-end 블로그·복원. 메뉴 단독 통과로 전체 기능 완료를 선언하지 않는다.
- [ ] P6.7 host 안전성: CSP/Trusted Types 가능 범위, URL/iframe/자산 응답 헤더, 비인가 관리 라우트·CSRF·세션 만료·rate limit, 글과 자산의 백업/복구/삭제 권한을 실제 호스트로 검증한다.
- [ ] P6.8 Notion-like 블록 조작 E2E 매트릭스: 슬래시 메뉴·핸들·키보드·드래그·터치에서 삽입/이동/복제/삭제·취소를 검증한다. section 시작/끝 및 다른 section으로 이동, 노트/그림/복합 블록의 ID·참조 보존, 불허 drop의 무변경, undo/redo·IME·focus, 접근성 발표, JSON 저장→재열기→순수 renderer 출력 비교를 포함한다. 블록 이동 결과에 편집기 전용 wrapper가 HTML에 새지 않는지 확인한다.

P6 gate: 로컬 빌드·타입 검사·관련 테스트 통과, 남은 결함과 지원 브라우저 범위 명시. 검증 미완료 기능은 지원 완료로 홍보하지 않음.

### P7 — 문서·출시 (P6 이후)

- [ ] P7.1 quickstart/API/어댑터/노드 확장/업그레이드/기능별 사용법.
- [ ] P7.2 F표를 보여주는 전체 기능 showcase와 운영 예제 설치 가이드.
- [ ] P7.3 changeset/SemVer·release dry run·타르볼 검증·지원 버전 표.
- [ ] P7.4 prerelease를 이용한 개인 블로그 실제 운영, 백업 복원 리허설·발행/수정 회귀.
- [ ] P7.5 전체 gate 확인 후 1.0. npm 공개는 별도 명시적 지시에 따라 실행.

## 진행 방식

각 작업 시작·완료 때 [에러 기록](ERROR_LOG.md)과 [재발 방지 대책](ERROR_PREVENTION.md)을 점검한다. 단계 전환과 동일 오류 재발 때는 전체 기록을 점검하고 개선 내역을 남긴다. 오류 기록 → 원인 확인 → 대책 적용 → 관련 검증 → 기록 갱신을 작업 완료 조건에 포함한다.

단계 의존성: P0 → P1 → **P2 기능별 닫힘** → P3 재사용 editor UI → P4 독립 발행/테마 → P5 블로그/어댑터 → P6 운영 검증 → P7 출시. 기존 P3 프로토타입은 폐기하지 않고 P2 기능 검증 하네스로 활용하되, 새로운 UI 미관/메뉴 확장은 P2의 데이터/렌더/명령 게이트보다 우선하지 않는다. P2 이후 노드 단위로 editor↔JSON↔render를 함께 검증해 조기 피드백을 받는다.

각 작업은 같은 ID의 이슈로 만들고 수락 조건을 본문에 복사한다. PLAN을 범위·완료 상태의 기준으로 유지하고 이슈는 실행 증거를 연결한다. 이슈 종료와 체크 갱신을 같은 작업 단위로 처리한다. 단계별 추적 이슈를 생성하고 아래 이슈 목록에서 관리한다.

진행 기록 형식: `작업 ID | 상태(todo/in-progress/blocked/done) | 변경 경로/PR | 검증 명령·결과 | 차단 원인 | 다음 작업`. 증거 없이 체크하지 않는다. 문서 수정만으로 구현 작업을 완료하지 않는다.

현재 다음 작업(2026-10-17 재점검): **P2.2.b.0 직접 의존성/lockfile 정합성 → P2.2.b.1 span 생성·해제 → P2.2.b.2 목록 중첩/전환 → P2.2.b.3 정의목록**, 이어서 P2.2.c/d. 기존 구현·과거 성공 증거는 재사용하지만 마지막 성공 커밋 이후의 변경은 일괄 검증 전까지 미완료로 둔다. 테스트 작성과 실행을 구분하며 사용자가 보류한 실행은 한 번에 수행한다. P2.1의 33개 노드 계약을 편집/발행에 연결하고 구조 검증 통과와 제품 기능 완료를 구분한다.

## 재점검 통제와 완료 증거

- **계획 자체의 반복 재검증은 종료**했다. 2026-10-17 최종 결과와 확인한 범위는 [계획 재점검 보고서](PLAN_AUDIT_2026-10-17.ko.md)에 기록한다. 후속 작업에서는 이 계획을 정본으로 실행하고, 새 요구사항·실제 검증 실패·스키마/API 계약 변경·외부 의존성 변경으로 전제에 실질적 변화가 생긴 경우에만 영향받는 항목을 다시 검토한다. 같은 계획을 근거 없이 계속 처음부터 재검증하지 않는다.
- 한 항목의 완료는 **실제 변경 코드 + 독립 fixture/회귀 + 타입·단위·브라우저 실행 결과 + 검증한 commit SHA + 미지원·환경 제약**을 함께 기록한 후 체크한다. 실행 보류 중에는 구현 상태만 진행 기록으로 보고하고 [ ]를 유지한다.
- 기본 배치 검증: frozen workspace 설치 → `pnpm check` → `pnpm package:check` → 각 targeted browser → `pnpm test:browser`(직렬) → Python recovery/HTTP(해당 시); 실제 OS IME·터치·스크린리더 수동 검증. 빌드 중 browser 병렬 실행 금지, 서로 다른 Vite port 사용, 성공을 다른 commit으로 전이하지 않는다.
- P2–P5 모두 성공/거부 예제를 최소 1개씩 둔다. 값이 잘못된 입력에서 저장·발행 상태가 변하지 않는지 및 undo/history를 검사한다. 기능/보안/접근성의 미지원 경계를 명시한다.

## 주요 위험과 처리

| 위험 | 대응/확인 단계 |
| --- | --- |
| 편집 DOM과 Tufte HTML 제약 충돌 | export DOM 별도 구성, P1 prototype에서 검증 |
| nested note editor의 undo/selection/IME 분리 | 원자성 테스트 후 구조 확정, 실패 시 단일 editor 모델 검토 |
| CSS 직계 자식 selector가 wrapper 때문에 깨짐 | semantic HTML fixture + scoped mode 별도 비교 |
| 노트 복사/여러 글에서 ID·번호 충돌 | permanent ID와 표시 번호 분리, article namespace |
| 긴 노트 배치와 모바일 정보 접근 | overflow fixture, 키보드 enhancement와 fallback |
| Lexical API 변화/JSON 호환성 | 버전 고정·migration·지원 버전 matrix |
| Markdown 변환 시 Tufte 정보 유실 | 정본 JSON 유지, Markdown은 손실 진단을 가진 선택적 출력 |
| 초안 유출/자산 삭제로 공개 글 손상 | immutable published snapshot, asset 참조 추적·삭제 보호 |
| 드래그/블록 복제 과정에서 section 구조 위반·노트 ID 충돌·자산 참조 유실 | 기존 `NODE_SCHEMA` 기반 command preflight, atomic history, 실패 시 무변경 및 JSON/HTML 왕복 fixture; P3.1.g/P6.8 |
| 슬래시 메뉴와 IME/노트·코드 입력, 키보드/스크린리더·터치 제스처 충돌 | 입력 영역 및 조합 상태에 따른 동작 분기, 키보드 동등 명령·focus/발표 테스트; P3.1.g/P6.8 |

## 공식 출처

2026-10-16 조회. 구현 착수 시 Lexical 실제 안정 버전을 다시 확인한다.

- https://github.com/facebook/lexical — 프레임워크 구조·공식 패키지·소스
- https://lexical.dev/docs/intro — Lexical 소개
- https://lexical.dev/docs/concepts/nodes — 노드 확장
- https://lexical.dev/docs/concepts/editor-state — editor state
- https://lexical.dev/docs/serialization — JSON/HTML 변환
- https://github.com/edwardtufte/tufte-css/tree/b5d7b7bbe5ce9c4c50fcfad4f19ee3646cfd7ae1 — 고정 기준
- https://github.com/edwardtufte/tufte-css/blob/b5d7b7bbe5ce9c4c50fcfad4f19ee3646cfd7ae1/tufte.css — selector/media/font 전체 지원 기준
- https://edwardtufte.github.io/tufte-css/ — 공식 사용 예제와 HTML 관례

## 단계별 추적 이슈

| 단계 | 이슈 |
| --- | --- |
| P0 | [#1](https://github.com/yunskim/lexical-tufte/issues/1) |
| P1 | [#2](https://github.com/yunskim/lexical-tufte/issues/2) |
| P2 | [#3](https://github.com/yunskim/lexical-tufte/issues/3) |
| P3 | [#4](https://github.com/yunskim/lexical-tufte/issues/4) |
| P4 | [#5](https://github.com/yunskim/lexical-tufte/issues/5) |
| P5 | [#6](https://github.com/yunskim/lexical-tufte/issues/6) |
| P6 | [#7](https://github.com/yunskim/lexical-tufte/issues/7) |
| P7 | [#8](https://github.com/yunskim/lexical-tufte/issues/8) |

## P8 — Docker 패키징 및 실행 배포 (최종 단계)

P0–P7의 기능·보안·복구·배포 검증을 마친 후 수행한다. Docker는 npm 라이브러리 자체의 대체 배포물이 아니라 **블로그 서버·관리 UI·정적 자산을 실행하는 선택적 운영 패키지**로 제공한다.

- [ ] P8.1 배포 경계 확정: 정적 발행만 사용하는 경우와 서버/API·관리 UI를 사용하는 경우를 구분하고 이미지의 entrypoint, 포트, 볼륨, 환경 변수, healthcheck를 문서화한다.
- [ ] P8.2 멀티스테이지 Dockerfile: pnpm lockfile 고정 설치, 빌드와 런타임 분리, 비루트 사용자, 최소 런타임 파일, `.dockerignore`, 재현 가능한 이미지 태그·버전·라이선스 고지.
- [ ] P8.3 Compose 예제: 영속 문서·자산·SQLite 저장소의 볼륨, 백업·복구 절차, secrets/환경변수 분리, 명시적 포트와 재시작 정책. SQLite 파일은 여러 독립 쓰기 컨테이너에서 공유하지 않는다.
- [ ] P8.4 보안: 비밀값 이미지 미포함, 권한 최소화, 읽기 전용 root filesystem 가능성, healthcheck·graceful shutdown, 의존성/이미지 취약점 점검, 외부 공개 시 TLS reverse proxy·인증·CSRF 검증.
- [ ] P8.5 수락 검증: clean build → `docker compose up` → 관리/발행/저장/재시작/볼륨 유지 → 백업·복구 → 비정상 종료·복구 → 이미지 재빌드. Docker 미설치 환경에서는 실행 완료로 체크하지 않는다.
- [ ] P8.6 사용 설명서: 로컬 개발과 운영 배포의 차이, Docker/Compose 요구 버전, 초기 설정, 업데이트·롤백·데이터 마이그레이션·문제 해결 절차. 기존 pnpm 패키지 설치 경로는 계속 지원한다.

완료 기준: 이미지와 Compose 설정, 재현 가능한 빌드, 실제 컨테이너 기동·지속성·복구 검증, 운영 문서 및 결과 기록. CI 실행 여부는 별도로 결정하며 현재 지시대로 CI는 생략한다.


## P9 — Payload CMS 참고 구조화 문서 계약 감사 및 보강 (최후순위·보류)

**착수 조건:** 현재 계획의 **P0–P8 전체**와 기존 공식 Tufte CSS parity, 테스트·운영·출시 관련 미완료 항목을 모두 완료하고 검증 증거를 기록한 **이후에만** P9에 착수한다. P9는 기존 단계의 선행조건이나 출시 차단 게이트가 아니며, 기존 작업 중 P9 구현·리팩터링·테스트 확대를 끼워 넣지 않는다. 현재 상태: **계획만 수립, 전 항목 미착수**. 이 계획 이후 기존 로드맵에 작업이 추가된다면 추가 작업도 먼저 완료한다.

목적: Payload CMS의 구조화된 Lexical 콘텐츠 관리 방식에서 **노드 계약, 문서 수준 검증, 편집 명령의 원자성, 변환 경계, 검증 증거 관리**만 참고한다. Payload 자체나 범용 CMS·동적 스키마 빌더·권한/워크플로 프레임워크는 도입하지 않는다. Lexical JSON 정본, 독립 renderer, 기존 33종 노드 registry/validator 및 버전 이전을 재사용하고 중복 구현을 피한다.

### P9 실행 체크리스트

- [ ] **P9.1 현황 감사:** `packages/document`, `packages/lexical`, `packages/render`, `packages/editor-react`의 실제 구현과 기존 테스트를 조사한다. 33종 노드별 타입/버전, 필수·선택 필드, 허용 자식·부모, 식별자, import/export, 명령, 오류 정책을 표로 정리하고 **기존 구현 / 보강 필요 / 의도적 미지원**을 구분한다.
- [ ] **P9.2 노드 계약 보강:** 실제 결함이 확인된 노드에 한해 데이터·위치·참조·복제·삭제·분할·병합·Undo/Redo·직렬화 불변조건을 명문화한다. 기존 `NODE_SCHEMA`/validator와 단일 정본을 유지하고 범용 스키마 엔진을 새로 만들지 않는다.
- [ ] **P9.3 문서 수준 검증:** 노드 간 참조, note ID/발행 HTML ID 충돌, section/figure의 허용 위치, asset 참조, 스키마 버전 및 이전 결과를 문서 전체에서 검사한다. 저장/발행 경계의 실패 정책(거부·진단·명시적 복구)을 정하고, 잘못된 입력이 정본이나 공개 snapshot을 변경하지 않음을 확인한다.
- [ ] **P9.4 편집 시나리오 감사:** note/figure/section/list 등의 삽입→복사→이동→분할/병합→삭제→Undo/Redo→저장/재열기→발행 조합을 검토한다. 선택 영역, IME, 붙여넣기, ID 재생성, 실패 시 원자성 및 history 보존을 확인하고 누락된 회귀만 추가한다.
- [ ] **P9.5 변환 경계 감사:** Lexical JSON 정본 ↔ 버전 이전 ↔ 순수 HTML renderer ↔ 공식 Tufte CSS DOM/시각 fixture의 의미 보존을 확인한다. 편집 DOM을 발행 정본으로 삼지 않으며 Markdown import/export는 기존 낮은 우선순위 및 손실 진단 정책을 유지한다.
- [ ] **P9.6 노드별 편집 UI 점검:** 노드의 선택·속성 변경·키보드 접근·오류 표시가 계약을 일관되게 따르는지 확인한다. 범용 관리자 UI나 동적 블록 설계 화면은 범위 밖으로 둔다.
- [ ] **P9.7 완료 증거:** 발견 문제별 재현 fixture, 수정 코드, 타입·단위·브라우저·왕복 검증 결과, 검증 commit SHA, 남은 제약을 기록한다. 실행하지 않은 테스트는 완료로 체크하지 않는다. 기존 오류 기록·재발 방지 문서도 필요한 경우 갱신한다.

**완료 조건:** 기존 구현과의 중복 없이 계약·검증·변환의 실제 공백을 해소하고, 수정된 불변조건에 대한 회귀 증거를 남긴다. 감사 결과 결함이 없으면 근거를 남기고 해당 항목을 종료할 수 있다. P9 작업 때문에 P0–P8의 완료 기준이나 우선순위를 소급 변경하지 않는다.
