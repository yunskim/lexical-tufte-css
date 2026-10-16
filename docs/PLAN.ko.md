# Lexical Tufte 블로그 라이브러리 계획

작성: 2026-10-16 (Asia/Seoul)
상태: P0·P1·P2.1 완료. Chromium 자동 회귀와 조합 이벤트 검증 범위이며, OS별 실제 IME 및 제품 전체 검증은 후속 단계.
저장소: https://github.com/yunskim/lexical-tufte (public, GPL-3.0; 사용자가 생성한 설정 유지).

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
  - [ ] P2.2.b F03/F05 인라인 속성 및 F06 목록/정의목록 명령과 회귀.
  - [ ] P2.2.c F07–F09 구분선/section footer/quote·출처/epigraph 명령과 회귀.
  - [ ] P2.2.d F01–F09 직렬화·발행 지원 경계 통합 검증. F04 전체 폰트/시각 증거는 P4와 연결.
- [ ] P2.3 F10–F19 노트·그림·표·코드·embed 구현.
- [ ] P2.4 JSON 및 HTML import/export, 지원 subset 명시, 손실 진단과 unknown-node 발행 차단.
- [ ] P2.5 schema migration fixture, malformed 입력·ID 충돌·참조 오류 검증.

P2 gate: F01–F19의 데이터 보존 및 구조 검증 통과. 편집·시각 증거 전에는 F표를 완료 처리하지 않는다.

### P3 — 편집기 (P2 이후)

- [ ] P3.1 toolbar/삽입 메뉴/노트·그림 속성 패널, 전체 기능 discoverability.
- [ ] P3.2 키보드·focus·selection·clipboard·undo/redo·한국어 IME·모바일 터치.
- [ ] P3.3 동일 렌더러로 preview, draft 복구·dirty state·오류 표시.
- [ ] P3.4 assets 업로드/진행/취소/실패 재시도, alt/caption, 본문/여백/전체 폭 전환.
- [ ] P3.5 노트의 모바일 작성 UI는 항상 접근 가능하게 제공; 독자용 접힘 상태와 구분.

P3 gate: 예제 글의 모든 F기능을 HTML 직접 편집 없이 생성·수정·재열기 가능.

### P4 — 발행 렌더러와 전체 호환성 (P2/P3 이후)

- [ ] P4.1 Node 서버/정적 renderer, deterministic ID·HTML, JS 없는 공개 글.
- [ ] P4.2 원본 CSS 전체 페이지 모드와 scoped embedded 모드를 분리 검증; 전역 body 스타일이 관리자 UI를 바꾸지 않게 함.
- [ ] P4.3 F01–F22 fixture와 공식 baseline 비교, 의도적 차이는 ADR에 명시.
- [ ] P4.4 CSS 기본 토글 외에 키보드/스크린리더 가능한 progressive enhancement 결정; JS 없어도 내용 접근 fallback 제공.
- [ ] P4.5 dark/한글 본명조·본고딕 및 fallback/장문·연속 노트/여러 article/좁은 화면 overflow 검증.

P4 gate: F01–F22 완료 증거 확보, 공개 페이지에 editor dependency가 포함되지 않음.

### P5 — 블로그 운영 라이브러리 (P4 이후)

- [ ] P5.1 filesystem repository와 asset adapter, 원자적 저장·revision 충돌·초안 복구.
- [ ] P5.2 create/edit/preview/publish/update/unpublish/delete; 공개 snapshot과 초안 분리.
- [ ] P5.3 slug 중복/변경 redirect, 날짜·timezone, 목록·pagination·tag·archive.
- [ ] P5.4 SEO title/description/canonical/Open Graph, RSS/Atom·sitemap·robots, HTML escape.
- [ ] P5.5 정적 build, 콘텐츠/자산 누락 검출, 백업·복원 및 포맷 내보내기.
- [ ] P5.6 호스트가 인증/권한/CSRF/배포를 책임지는 경계 문서화; 예제 관리 API는 인증 또는 로컬 전용으로 제한.
- [ ] P5.7 업로드 MIME/크기 제한·path traversal 방지·URL protocol allowlist·embed provider 정책·SVG 처리·XSS 회귀 검증.

P5 gate: 실제 예제 블로그에서 작성→발행→수정→비공개→복원 및 revision 충돌 시나리오 통과.

### P6 — 품질과 운영 검증 (P3–P5 이후)

- [ ] P6.1 Chromium/Firefox/WebKit e2e, 375/759/760/761/1440px 및 light/dark 시각 비교.
- [ ] P6.2 axe 자동 검사 + 키보드/스크린리더 수동 검사, focus visible 및 note 왕복 탐색.
- [ ] P6.3 HTML conformance 검사, JSON/HTML roundtrip, 자산 유실·저장 실패·악성 입력 테스트.
- [ ] P6.4 5만 자·노트 200개 장문 fixture에서 입력/저장/렌더 baseline 측정 후 성능 예산 확정, 회귀 기준 적용.
- [ ] P6.5 package export/ESM/types/SSR·consumer 설치 smoke test, 브라우저에 Node 전용 모듈이 새지 않는지 검증.

P6 gate: 로컬 빌드·타입 검사·관련 테스트 통과, 남은 결함과 지원 브라우저 범위 명시. 검증 미완료 기능은 지원 완료로 홍보하지 않음.

### P7 — 문서·출시 (P6 이후)

- [ ] P7.1 quickstart/API/어댑터/노드 확장/업그레이드/기능별 사용법.
- [ ] P7.2 F표를 보여주는 전체 기능 showcase와 운영 예제 설치 가이드.
- [ ] P7.3 changeset/SemVer·release dry run·타르볼 검증·지원 버전 표.
- [ ] P7.4 prerelease를 이용한 개인 블로그 실제 운영, 백업 복원 리허설·발행/수정 회귀.
- [ ] P7.5 전체 gate 확인 후 1.0. npm 공개는 별도 명시적 지시에 따라 실행.

## 진행 방식

각 작업 시작·완료 때 [에러 기록](ERROR_LOG.md)과 [재발 방지 대책](ERROR_PREVENTION.md)을 점검한다. 단계 전환과 동일 오류 재발 때는 전체 기록을 점검하고 개선 내역을 남긴다. 오류 기록 → 원인 확인 → 대책 적용 → 관련 검증 → 기록 갱신을 작업 완료 조건에 포함한다.

단계 의존성: P0 → P1 → P2 → P3 → P4 → P5 → P6 → P7. P2 이후 노드 단위로 편집/변환/렌더를 함께 검증해 조기 피드백을 받는다.

각 작업은 같은 ID의 이슈로 만들고 수락 조건을 본문에 복사한다. PLAN을 범위·완료 상태의 기준으로 유지하고 이슈는 실행 증거를 연결한다. 이슈 종료와 체크 갱신을 같은 작업 단위로 처리한다. 단계별 추적 이슈를 생성하고 아래 이슈 목록에서 관리한다.

진행 기록 형식: `작업 ID | 상태(todo/in-progress/blocked/done) | 변경 경로/PR | 검증 명령·결과 | 차단 원인 | 다음 작업`. 증거 없이 체크하지 않는다. 문서 수정만으로 구현 작업을 완료하지 않는다.

현재 다음 작업: P2.2.a 완료 후 P2.2.b 인라인·목록 명령, P2.2.c 인용 명령, P2.2.d 통합 검증. P2.1의 33개 노드 계약을 순서대로 편집/발행 구현에 연결한다. 구조 검증 통과와 제품 기능 완료는 구분한다.

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
