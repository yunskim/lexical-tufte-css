# main 브라우저 불일치 보완 — 2026-10-23

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
