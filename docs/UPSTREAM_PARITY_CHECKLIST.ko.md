# 공식 Tufte CSS 예제 재현 — 실행 체크리스트

기준: `fixtures/tufte/upstream/index.html` (upstream `b5d7b7bbe5ce9c4c50fcfad4f19ee3646cfd7ae1`).
목표: **같은 내용**을 Lexical 문서로 편집·저장·재열기·발행한 결과와 원본의 의미 있는 DOM/CSS 구조를 비교한다.

상태 표기: `[x]`의 확인/실행 범위는 각 항목의 근거에 따른다. 2026-10-23 실행 결과는 [최신 보고서](VERIFICATION_UPSTREAM_PARITY_2026-10-23.ko.md) 및 [파일별/pixel JSON](verification/upstream-parity-20261023.json)이 정본이다. 공식9섹션/60블록/7노트의 저장·실제 편집·DOM·6폭 pixel 대조는 통과했고, 전체34 browser 중 보류 자산 UI1개는 실패다. CI 생략.

## 1. 기존 비교 기반 점검

- [x] 고정 upstream HTML 기준 파일 존재: `fixtures/tufte/upstream/index.html`.
- [x] Chromium DOMParser 기반 비교 스크립트 존재: `tests/upstream-dom-browser.mjs`.
- [x] 비교 스크립트는 원본과 **별도 server-document fixture**를 사용한다. 따라서 원본 전체 페이지와 동일 콘텐츠의 동등성 증거가 아니다.
- [x] 비교 스크립트에 `newthought > sidenote label` 차이가 **known gap**으로 명시되어 있다.
- [x] `tests/helpers/pinned-upstream-article.mjs`가 공식9개 섹션 문서를 재구성한다. 전체 roundtrip/editor/visual browser에서 실제 비교 통과.
- [x] 동일 콘텐츠 fixture를 연결할 수 있는 선택적 `UPSTREAM_FULL_DOCUMENT` 입력과 섹션별 구조 비교 assertion을 작성했다. fixture 경로 미확정·테스트 미실행 상태다.
- [x] 기존 브라우저 비교의 공식9개 섹션 수와 섹션별 구조 수집 assertion을 실행했다. 독립 smoke와 전체 동일 콘텐츠 대조 모두 통과.
- [x] 위 helper와 `tests/upstream-full-document-roundtrip-browser.mjs`, `upstream-full-document-editor-browser.mjs`, `upstream-full-document-visual-browser.mjs`를 정본 전체 비교로 연결. standalone upstream-dom은 별도 smoke로 유지.
- [x] 기존 DOMParser 비교에서 섹션별 heading/직계 자식/노트·그림·표 개수 진단을 실행. 실제 원본에 없는 확장 요소는 필수 기대하지 않는다.

## 초기 비교 계측 기록 (이력)

아래 문단은 전체 helper를 특정하기 전의 조사 이력이다. 현재 정본 경로와 실행 결과는 위 최신 판정을 따른다.

`tests/upstream-dom-browser.mjs`는 이제 `upstreamSectionOutline`과 `publishedFixtureSectionOutline`을 출력하도록 작성되었다. 각각 section 순번, 첫 직계 heading, 직계 자식 태그 배열, note/figure/table 개수를 담는다. 비교 대상은 여전히 **원본 전체 페이지 대 별도 server-document fixture**이므로 이 수치만으로 전체 페이지 parity를 수락하지 않는다. 기존 코드에서 직접 확인된 발행 입력은 `fixtures/tufte/server-document.json`이며 원본 9개 섹션과 같은 콘텐츠가 아니다. 저장소 검색만으로 전체 페이지용 Lexical fixture의 정확한 경로를 확정하지 못했으므로 **존재한다고 가정하거나 새로 중복 생성하지 않는다**. 다음에는 전체 페이지 변환/fixture 생성 코드를 특정한 뒤 이 계측을 연결한다.

## 공식 원본의 섹션 대응표

고정 HTML의 `article > section` 순서와 직접 `h2` 텍스트를 기준으로 작성했다. 첫 섹션에는 `h2`가 없다. 아래는 **원본 구조 목록**이지 Lexical 재현 완료 표시가 아니다.

| 순서 | 원본 섹션 제목 | 동일 콘텐츠 Lexical fixture 연결 | DOM 차이 판정 |
| --- | --- | --- | --- |
| 1 | 도입부 (직계 h2 없음) | [x] 전체 helper | [x] 전체 DOM/6폭 pixel |
| 2 | Getting Started | [x] 전체 helper | [x] 전체 DOM/6폭 pixel |
| 3 | Fundamentals | [x] 전체 helper | [x] 전체 DOM/6폭 pixel |
| 4 | Epigraphs | [x] 전체 helper | [x] 전체 DOM/6폭 pixel |
| 5 | Sidenotes: Footnotes and Marginal Notes | [x] 전체 helper | [x] 전체 DOM/6폭 pixel |
| 6 | Figures | [x] 전체 helper | [x] 현대 iframe/코드 예외·검증 mask 포함 |
| 7 | Code | [x] 전체 helper | [x] 전체 DOM/6폭 pixel |
| 8 | ImageQuilts | [x] 전체 helper | [x] 전체 DOM/6폭 pixel |
| 9 | Epilogue | [x] 전체 helper | [x] 전체 DOM/6폭 pixel |

원본 제목과 순서는 `tests/upstream-dom-browser.mjs`의 assertion에도 고정했다. fixture 연결 후 같은 섹션 번호끼리 직계 자식 구조, note, figure, table을 비교한다.

### 동일 콘텐츠 비교 연결 방법 (실행은 별도 승인 후)

`UPSTREAM_FULL_DOCUMENT` 환경변수에 공식 9개 섹션을 담은 **TufteDocument JSON 파일 경로**를 지정하면 `tests/upstream-dom-browser.mjs`가 해당 문서를 `renderArticle`로 발행해 공식 원본과 섹션별 heading, 직계 자식 태그 순서, note/figure/table 개수를 비교한다. 변수를 지정하지 않으면 기존 독립 server fixture 비교만 수행한다. 이 옵션은 아직 fixture를 생성하거나 자동 발견하지 않으며, **동일 콘텐츠를 담은 유효한 문서인지 별도 확인이 필요하다.**

## 2. DOM 차이 분류 및 해결

- [ ] 원본 각 section별 heading, paragraph, link, code, list, quote, epigraph, figure, table, note를 구조적으로 대응시킨다.
- [x] 노트의 label/input/span 인접 관계 및 newthought 안쪽 label 배치를 원본과 대조. note-export-parity/newthought/전체 DOM·pixel 통과.
- [ ] 차이를 (a) schema 표현 불가, (b) Lexical 편집 불가, (c) renderer 출력 차이, (d) 원본에서 의도적으로 생략한 속성으로 구분한다.
- [ ] 원본의 의미 있는 속성·요소 순서를 비교하되 생성 ID, 브라우저 정규화 등 비본질적 차이는 명시적으로 정규화한다.
- [ ] 실제 차이가 확인된 항목부터 **하나의 의미 변화 + 하나의 회귀 테스트**로 수정한다.

## 3. 편집·저장·발행

- [ ] 공식 예제의 각 노드/조합을 GUI에서 생성·수정·삭제할 수 있다.
- [x] Lexical v1/v2 저장→재열기에서 본문·앵커·note identity 유지. 실제 React 입력/Undo/Redo/저장/재열기 통과.
- [x] pure renderer 발행과 Lexical HTML export의 노트 구조 및9섹션 편집 결과를 검증.
- [x] 6폭 geometry/pixel·ET Book4 face·이미지5개·노트7개, 모바일 toggle/키보드 회귀 통과. 외부 iframe 재생·OS별 한글 fallback은 별도 제한.

## 4. 일괄 검증 (2026-10-23 사용자 요청으로 실행)

- [ ] 의존성 설치 및 빌드·타입 검사.
- [x] 단위423개·package5개·Python16/HTTP 및 전체 페이지 DOM 통과.
- [x] 34 browser 실행33통과/1실패,6폭 pixel 통과. 남은 실패는 보류 자산 등록 UI.
- [x] E120/E123 해결·E125/M114/M115 및 파일별 결과 기록. timeout·skip0.
- [x] CI 생략.

## 범위 제한

호스트 검색/저장소/권한 확인은 `ReferenceProvider` 인터페이스 바깥의 책임이다. Magnolia Works 구현은 이 계획에 포함하지 않는다. Markdown import/export는 별도 저우선순위 계획으로 유지한다.
