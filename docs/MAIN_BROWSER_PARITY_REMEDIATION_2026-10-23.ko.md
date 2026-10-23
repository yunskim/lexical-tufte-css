# main 브라우저 불일치 보완 — 2026-10-23

## 후속 실행 판정 — P2.2.b.1

- [최신 인라인 검증](VERIFICATION_INLINE_SPAN_2026-10-23.ko.md): check425개·package5개·Python16/HTTP 통과, browser35파일34통과/보류 자산1실패. 파일timeout·skip0, CI 생략.
- 인라인 HTML4종·서식/URL/방향·정렬 왕복, malformed12종의 기존 상태 보존,1440/375px 실제 UI history/저장/IME·키보드 검증 완료. 공식9섹션6폭 pixel(mask 밖 차이0) 유지.
- P2.2.b.1의 명시된 지원/거부 범위만 완료. 다음은 P2.2.b.2 목록/키보드 경계다. 자산 확대는 계속 보류한다.

## 최신 실행 판정 — 공식 전체 원본 대조 통과

- [최신 보고서](VERIFICATION_UPSTREAM_PARITY_2026-10-23.ko.md), [파일별·pixel JSON](verification/upstream-parity-20261023.json)이 현재 증거다. 아래29/5 등은 과거 이력이다.
- [x] E123 nested-note 파생 서식 직렬화 수정, 이미지 전용 note의 insertion format 보존, 실제9섹션 restore/입력/Undo/Redo/저장/재로드 통과.
- [x] E120 layout:'tufte' 공식 figure/div 구조와 기존 임의5비율을 함께 보존. URL/title/sandbox 및 strict CSP5폭 검증 통과.
- [x] 9섹션/60블록/7노트 v1/v2 왕복·DOM, Figures 및6폭 geometry·exact pixel(mask 밖 차이0) 통과. 기존 예외인 생성 ID/접근성·iframe 현대화·코드 예제1개와 검증 iframe mask는 보고서에 명시.
- [x] check423개·package5개 소비·Python16/HTTP 통과. 전체34 browser33통과/1실패, timeout·skip0. CI 생략.
- [ ] 보류 중인 자산 등록 UI 테스트1개 실패 유지. 각 노드의 전체 GUI 도구·실제 외부 iframe 재생 등 원래 기능 게이트는 별도 미완료.

## 최신 실행 판정 — E117 수정 후

- [보고서](VERIFICATION_NODE_REGISTRY_2026-10-23.ko.md)가 최신 증거다. 아래 이전12/20/2는 이력으로 보존한다.
- [x] E117 core factory/metadata runtime type 등록 분리, canonical 저장/복구 경계 연결 및 회귀 검증.
- [x] E114 titleId v1/v2 저장/재열기 회귀 실제 실행 통과. 기존 golden 변경 없음.
- [x] check418개·package5개 소비·Python16/HTTP 통과. browser34파일 재실행29통과/5실패, timeout·skip0. CI 생략.
- [ ] E123 React 전체9섹션 restore에서 sidenote textFormat:2 추가 원인 분석·원자적 저장 동등성/Undo/Redo 검증.
- [ ] E120 iframe DOM 정리 후 Figures/전체 roundtrip/시각 pixel 검사 재검증.
- [ ] 보류 자산 등록 기능은 미완료 유지. E1/E2/E3 전체 완료 아님.

## 최신 실행 판정 — 383d25c 기준 재검증

- [실행 보고서](VERIFICATION_BROWSER_REMEDIATION_2026-10-23.ko.md), [파일별 JSON](verification/browser-remediation-20261023.json)이 현재 증거다. 아래 작성/미실행 표시는 과거 이력으로 보존한다.
- [x] frozen 설치, 고정 원본 시각 자산9개 무결성 검증·동기화, build/typecheck 실행. TS18046 수정 후 통과.
- [x] 단위·34개 browser·package·Python/HTTP 실행 및 실패 원인/미도달 단계 기록. CI 생략.
- [x] 구형 marginnote accessible-name 기대 수정 및 두 섹션 browser 재실행 통과.
- [ ] E117 paragraph/quote 동일 type 교체 등록 충돌 수정. Lexical62통과/77실패/2취소, root check 미완료.
- [ ] E114 bridge 시간 초과 해소 후 titleId 저장/재열기 회귀 검증. E115 document57개 회귀는 통과.
- [ ] browser12통과/20실패/2시간초과 해소. E120 iframe 구조 불일치로 공식 전체 pixel 검증 미도달.
- [ ] packed JS15초 timeout 해소 후 선언/왕복 소비까지 완료. E1/E2/E3 완료 아님, 자산 확장 보류 유지.

## 2026-10-23 실행 우선순위 변경

- **현재 P0:** 공식 Tufte CSS 샘플 전 영역(9개 섹션)을 Lexical 문서로 구성·저장·재열기·발행한 결과의 **DOM·구조·시각 패리티**를 확보한다. note/newthought, heading ID, figure, quote, 본문 공백 등 기존 수정 코드의 미검증 부분을 우선한다.
- **테스트 수집:** 편집기 중심 브라우저 실패·통과를 파일별로 유지하고, 전체 재검증은 사용자의 요청에 맞춰 일괄 실행한다. CI는 실행하지 않는다.
- **자산 기능:** Wagtail 스타일 전체 catalog 등록/재사용/선택, HostAsset 어댑터 및 발행 manifest 확장을 **보류**한다. 기존 노트 이미지 UI 초안과 테스트는 유지하되, 성공을 주장하지 않는다. 관리 자산 UI 부재로 실패한 테스트는 삭제하거나 패스를 가장하지 않고 '후속 기능 미구현'으로 분류한다.
- **분기 관리:** `design/host-asset-provider-20261023`에 존재하는 호스트 중립 AssetProvider 타입은 보존한다. `revisionId` 명칭 통일, pinned 기본 UX, floating 명시적 선택은 **후속 설계 체크리스트**에만 추가되어 있으며 실제 코드/노드/발행 스키마 변경은 없다.
- **정본:** 세부 우선순위·재개 조건·완료 게이트는 [이미지 자산 관리 이행 계획](ASSET_CHOOSER_MIGRATION_PLAN_2026-10-23.ko.md)의 *2026-10-23 우선순위 변경*을 따른다. 이 문서 아래에 남은 과거 자산 UI 구현 체크는 이력이며 즉시 진행 지시가 아니다.

## E1 정적 점검 추가 수정 (실행 대기)

- [x] `packages/lexical/src/documentBridge.ts`: v1/v2 투영 시 `titleId` 소실 방지. `packages/lexical/test/document-bridge.test.mjs`에 v1→v2→저장→재열기 회귀 추가 (E114/M105).
- [x] `packages/document/src/validate.ts`: 서로 다른 섹션에서 중복된 `heading.id`를 거부. `packages/document/test/document.test.mjs`에 섹션 간/문서 제목 충돌 테스트 추가 (E115/M106).
- [ ] `pnpm check`, 원본 9개 섹션 roundtrip/실제 React 편집기 테스트 및 h1/heading 앵커 검증 실행.
- [ ] 통과/실패 기록 갱신 및 재발 방지 문서의 실제 결과 반영. **현재 19/34 브라우저 수치는 과거 기준만 의미**한다.

자산 관리 확장은 계속 보류한다. 본 체크의 E1 완료는 코드 작성이 아니라 실제 검증 통과 후 판정한다.

## 검증 기준과 작업 범위

기준은 `test/main-verification-20261023`의 커밋 `2ec9b4e5f83baa47c0b78177a0120b40f7f736ab`이다. 해당 기준에서 unit 403 통과, package 소비 5 통과, Python16 및 실제 HTTP/SQLite 통과, **브라우저 34개 중 19 통과/15 실패**를 기록했다. 이 문서의 후속 코드는 `fix/main-browser-parity-20261023`에서만 수정한다. 기존 `main`과 검증 증거 브랜치는 수정하지 않는다.

**중요: 후속 코드 변경 이후 테스트·빌드·CI를 실행하지 않았다. 기존 수치는 기준 커밋의 결과일 뿐이며 이 수정 브랜치의 통과 수가 아니다.**

## 이번 보완 (구현/테스트 작성, 실행 대기)

- [x] 누락된 `scripts/upstream-visual-assets.mjs`, `scripts/sync-upstream-visual-assets.mjs`, `fixtures/tufte/upstream/assets-manifest.json`를 고정 upstream 소스에서 선별 이관.
- [x] 고정된 5개 PNG/4개 ET Book WOFF의 크기·Git blob SHA-1 검증 및 원본 HTML/CSS 인벤토리 검사 복원.
- [x] 다운로드는 `pnpm upstream:assets:sync`의 **명시적 실행**으로만 허용. 테스트 시작 시 암묵적으로 외부 네트워크를 호출하지 않으며 바이너리는 gitignore 처리.
- [x] HostLink/HostAsset이 유지된 `types.ts`와 `schema.ts`에 `titleId`, `heading.id`, `quote.cite`, `paragraph.tufteClass='sans'`를 선별 반영.
- [x] 원본 예제의 안전한 `img/rhino.png` 같은 상대 이미지 경로만 추가 허용; URL scheme·authority·dot segment·공백/제어문자는 계속 거부.
- [x] figure 앞 여백 주석 허용을 문서 validator와 editor 구조 검사에 동일하게 반영. 그림 하나/캡션 0~1개 규칙 유지.
- [x] Lexical `TufteHeadingNode`, `TufteParagraphNode`, `TufteQuoteNode`로 ID/클래스/cite roundtrip 구현. Node registry에서 기존 `HostLinkNode` 유지.
- [x] `renderArticle`에서 문서·제목 앵커, 문단 클래스, 인용 URL 유지. `blockquote[cite]` 직렬화 허용.
- [x] 제목 ID 변경/왕복 회귀와 문서 렌더러 메타데이터 안전성 테스트 추가.
- [ ] 수정 후 `pnpm install --frozen-lockfile`, `pnpm check`, `pnpm package:check` 실행.
- [ ] 관련 브라우저 테스트 독립 실행 후 각 테스트의 새 실패 지점 및 통과 수 갱신.
- [ ] 자산 동기화(고정 manifest 무결성 검증) 후 공식 전체 문서 시각 비교를 실행하고 실제 차이를 기록.
- [ ] 노트/newthought의 원본 수준 발행 DOM, 관리 자산 등록·선택·크기 조정 UI를 본 작업 브랜치에 선별 이관/구현.
- [ ] 수정 시 HostLink/HostAsset/발행 복원·SQLite 기존 계약이 유지되는지 재검증.

## 재검증 권장 순서 (CI 금지)

1. `pnpm install --frozen-lockfile`, `pnpm check`, `pnpm package:check`.
2. `node tests/upstream-same-content-getting-started-browser.mjs` 및 `node tests/upstream-full-document-roundtrip-browser.mjs`로 schema/bridge 문제의 현재 위치 확인.
3. `node tests/upstream-newthought-sidenote-browser.mjs` 및 `node tests/note-export-parity-browser.mjs`로 DOM 문제 분리.
4. `pnpm upstream:assets:sync`로 의도적으로 원본 자산을 받은 후에만 `node tests/upstream-full-document-visual-browser.mjs` 실행. 이 테스트는 불일치가 있으면 원본과의 pixel parity 실패를 보고해야 한다.
5. `pnpm test:browser`, `pnpm test:note-assets`, `pnpm test:upstream-sections`, `pnpm test:upstream-full-page` 및 보고서에 기록된 각 browser 파일을 독립 재실행. CI 실행하지 않음.

원본 대조 실패를 줄이려고 validator를 일괄 완화하거나 수락 조건을 삭제하지 않는다. 새 테스트는 작성 상태이며 통과 여부는 아직 모른다.


## 후속 구현 — 노트/newthought 발행 구조

- [x] 발행 `tufte-sidenote`/`tufte-marginnote`는 `data-tufte-note` wrapper 없이 직접 **label + input + span** 형제를 출력. Lexical의 구체 노드 타입과 ID는 변경하지 않음.
- [x] 문단에서 `newthought` 바로 뒤 `sidenote`가 올 때에만 label을 newthought 안으로 옮겨 원본 **split-parent** DOM 출력. 사이에 텍스트가 끼거나 다음 노트가 marginnote이면 일반 형제 출력.
- [x] 일반 텍스트 노드에 추가되던 `tufte-pre-wrap` span 제거. Tufte CSS 원본의 기본 HTML 공백 처리와 DOM 구조 사용. JSON 텍스트 값 자체는 변경하지 않음.
- [x] 고정 CSS의 `display:none`인 체크박스에 scoped visually-hidden/focusable override를 적용하고 키보드 `:focus-visible` 레이블 윤곽을 추가. 모바일 checked-sibling 표시는 기존 Tufte CSS 사용.
- [x] 렌더러 단위/원본 구조/그림 노트 회귀 검사 갱신. `tests/server-browser.mjs`의 오래된 wrapper selector와 `tests/note-browser.mjs`의 빈 집합 `.every()` 허위 통과 조건 수정.
- [x] 독립 서버 fixture의 노트 구성과 원본 전체 페이지의 newthought pairing을 구분하도록 DOM smoke 설명 수정.
- [ ] 관련 `pnpm check` 및 `tests/upstream-newthought-sidenote-browser.mjs`, `tests/note-export-parity-browser.mjs`, `tests/note-browser.mjs`, `tests/server-browser.mjs` 실제 실행 검증.
- [ ] 공식 같은 콘텐츠 전체 페이지의 시각/픽셀 동등성 검증, 다른 15개 브라우저 실패 및 잔여 UI 구현은 계속 미완료.

**주의:** 이 업데이트는 실행 증거가 아닌 코드 수정이다. `2ec9b4e` 기준 19통과/15실패를 새로운 수치로 갱신하지 않는다.

## 후속 구현 — Wagtail을 참고한 노트 이미지 편집 UI (실행 검증 전)

Wagtail의 이미지 chooser(기존 목록에서 검색·선택 → 이미지 상세 속성 편집) 흐름을 사용하되, Wagtail의 서버 저장소/렌디션 구현은 가져오지 않는다. 이 프로젝트는 문서/HostAsset의 로컬 우선 식별자가 정본이다.

- [x] `examples/editor/src/NoteImagePanel.tsx`: 반응형 썸네일 그리드, 검색, 선택 상태(`aria-pressed`), 대체 텍스트 및 선택적 너비·높이 입력을 분리한 대화상자 구현.
- [x] 375px 모바일 폭에서 한 열 배치, 키보드 Escape 취소, Tab 포커스 순환, 열 때 검색 필드로 포커스, 닫을 때 원래 툴바 버튼에 포커스 복귀 구현.
- [x] `InlineImageNode.setImagePresentation()`: alt/width/height를 변경하기 전에 일괄 검증하며, 기존 `assetId`·`hostAsset`·src를 보존. `getImageProperties()`는 식별자 복제본을 제공.
- [x] 현재 선택한 **노트에 속한 이미지**만 수집. 대화상자에서 포커스가 이동한 뒤에도 노트·이미지 node key로 대상 확인 후 수정하며, 다른 노트의 이미지로 잘못 적용되지 않음.
- [x] 기존 이미지 chooser/size 브라우저 테스트의 prompt 가정을 실제 입력 폼·썸네일·검색·잘못된 크기 거부·저장/재로드 테스트로 변경. Lexical 단위 테스트에 등록 자산 및 HostAsset 식별자 보존 반례 추가.
- [ ] 실제 빌드·타입 검사·단위/브라우저 테스트 실행 및 실패 수정. 테스트하지 않은 UI를 완료 검증으로 표시하지 않음.
- [ ] **문서 전체 이미지 자산 라이브러리**: Wagtail 스타일 등록/검색/선택(기존 이미지 재사용)과 canonical assets envelope 및 recovery persistence 통합. 지금 구현한 노트 이미지 선택은 노트 내 기존 이미지에만 한정됨.
- [ ] 파일 업로드와 자산 유효성·크기 검사 및 교체 정책(이미 게시된 문서에 미치는 영향) 검토. Wagtail의 crop/focal point 및 자동 rendition은 아직 미구현.
- [ ] 관리 이미지 등록 브라우저 테스트(`tests/managed-note-assets-browser.mjs`)는 기존 prompt 방식이므로 다음 UI 구현에 맞게 **계약을 유지하면서** 조정 필요. 통과로 판정하지 않음.

**검증 판정:** 앞서 보고된 browser 19/34 통과가 마지막 실행 증거이며 이후 코드 변경은 미검증. `main`과 과거 검증 브랜치는 그대로 보존했고 CI는 실행하지 않았다.


## 이미지 자산 관리 이행 계획 (2026-10-23)

문서 전체 자산 라이브러리, 공통 Wagtail 스타일 chooser, Bynder식 provider 연결, 발행 지원과 검증의 **정본 작업 체크리스트**는 [ASSET_CHOOSER_MIGRATION_PLAN_2026-10-23.ko.md](ASSET_CHOOSER_MIGRATION_PLAN_2026-10-23.ko.md)에서 관리한다.

- 현재 구현됨(실행 검증 전): 노트 내부 이미지 chooser·표현 편집, 문서 카탈로그 등록 순수 함수 초안.
- 현재 미구현: canonical assets 저장·복구 연결, 문서 전체 카탈로그 GUI, 자산 재사용 및 참조 연결, managed/sized 이미지 발행, 외부 provider.
- 우선순위: A0 기준 계약 → A1 순수 catalog → A2 원자적 저장·복구 → A3 chooser → A4 연결 명령 → A5 발행 → A8 통합 검증. A6/A7 외부 provider·DAM 동기화는 별도 후순위.
- 마지막 실행 증거는 이전 기준 브랜치의 19/34 browser 통과이며, 계획 작성으로 테스트 상태는 변경되지 않는다. CI는 실행하지 않는다.

기존 본 문서의 과거 체크박스는 당시 상태를 보여주는 이력이고, **이미지 자산 관리의 이후 완료 표시는 새 계획의 체크리스트를 우선한다.**
