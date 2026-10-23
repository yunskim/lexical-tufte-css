# 공식 전체 원본 대조 및 노트/iframe 수정 검증 — 2026-10-23

기준 `bb2b80e19d7afce5e97f189d8086afa7f2514bbf` 후속, 브랜치 `fix/main-browser-parity-20261023`. **편집기/원본 대조의 남은4개 실패는 해결했다. 전체34 browser는33통과/1실패이며, 남은1개는 보류 중인 자산 등록 기능이다.** CI·배포·패키지 발행은 실행하지 않았다.

## 최종 검증 결과

| 검증 | 결과 | 실패/취소/건너뜀 |
| --- | --- | --- |
| pnpm check | build/typecheck/audit/lint/inventory/font 및 unit423 통과 | 0/0/0 |
| 패키지별 unit | document57/render51/blog77/editor-ports2/Lexical236 | 모두 통과 |
| pnpm package:check | tarball5개 JS·선언·strict 왕복·SQL·라이선스 소비 | 모두 통과 |
| 브라우저34파일 | 33통과 | 1실패, 파일timeout·skip0 |
| Python pytest | 16통과 | 실패·skip0, deprecation 경고1 |
| 실제 TS→Python HTTP→SQLite | save/read/list/checksum/CAS/access/CSRF/delete 통과 | 없음 |
| 공식9섹션 v1/v2 저장/재열기·전체 DOM | 통과 | 명시된 현대화 예외 유지 |
| 실제 React 편집·Undo/Redo·저장·재열기 | 통과 | 다른8개 섹션 불변성 포함 |
| 공식 전체 페이지 geometry·RGBA | 6폭 통과 | 검증된 iframe mask 밖 차이0 |

단위423개는 기존418개에 이번 노트2개·bridge1개·renderer2개 회귀를 더한 수다. 브라우저 파일 수와 내부 assertion 수는 합산하지 않는다. 과거29/5 등의 결과는 각 이전 tree의 이력이다.

## 수정 내용과 원인

**E123 노트 서식 상태:** Lexical0.52 reconciler의 reconcileTextFormat/reconcileTextStyle이 하위 텍스트에서 insertion format을 계산한다. ElementNode.shouldSerializeTextStyles는 직접 TextNode 자식만 확인하므로, 링크 안에 italic 텍스트만 있는 노트가 textFormat2를 새 저장 필드로 내보냈다. NoteNode에서 모든 텍스트 자손을 확인해 파생 서식을 저장하지 않게 했다. 텍스트 없는 이미지 노트에는 명시적 insertion format이 필요하므로 보존한다. leaf format/내용·note identity와 JSON 왕복, 실제 전체 문서 restore/입력/Undo/Redo/저장/재열기를 검증했다.

**E120 iframe:** 원본 Tufte CSS의 padding 기반 배치는 임의 비율 iframe의 실측 aspect ratio 계약과 다르다. 선택 필드 `layout:'tufte'`를 document schema/validator/Lexical/renderer/HTML export에 추가해 원본 `figure/div.iframe-wrapper > iframe`을 명시한다. layout 생략은 기존 비율·SVG·CSP 경로를 유지하며 golden은 변경하지 않았다. 원본 레이아웃에는16:9 CSS 규칙만 허용하고 충돌값/알 수 없는 mode를 거부한다. 자세한 API·호환성은 [계약](EMBED_LAYOUT.ko.md)에 기록했다. 이전 소비자는 새 필드를 거부하므로 document/lexical/render 패키지를 함께 갱신해야 한다.

두 iframe 경로는 provider allowlist/title/lazy/referrerpolicy/sandbox/allowfullscreen을 유지한다. 기존5개 비율과 새 figure/div wrapper는5개 폭의 실제 script-src none/style-src self CSP 응답에서 검증했고, inline style/script·overflow가 없었다. 원본 레이아웃의 iframe 테두리는 외부 CSS로0을 적용했다.

**E125 테스트 오류:** 이전 제품 gate 뒤에 가려졌던 빈 attrs 배열과 객체 문자열 비교, 옛 marginnote 접근성 이름, 별도 객체의 JSON 속성 순서를 이용한 불변성 검사를 수정했다. 불변성은 onDisk 자체의 사전 snapshot을 사용하며 전체 DOM·한정된 한 텍스트 수정 검사는 유지했다. audit:notes에 구형 접근성 이름 검출을 추가해 tree serializer 테스트2곳까지 찾아 수정하고181개 활성 파일 검사를 통과했다.

## 공식 페이지 대조 범위

고정 upstream commit `b5d7b7bbe5ce9c4c50fcfad4f19ee3646cfd7ae1`의 index.html/tufte.css와 검증된 이미지5개/ET Book4 face를 사용했다. 원본 HTML/CSS 파일과 기존 저장 golden은 변경하지 않았다. 재구성 helper는9섹션/60블록/7노트와 원래 heading/title anchor, rich note, figures/quote/code를 보존한다.

DOM에서 허용하는 예외는 생성된 note ID namespace와 접근 가능한 control 이름, modern HTTPS/privacy iframe의 보안·접근성 속성, 그 속성을 가르치는 **코드 예제1개**, formatting-only note control whitespace2곳이다. 전체 시각 검사는 원본 페이지를 live DOM에서 그 코드 예제1개만 현대화하고 pristine screenshot도 별도 남긴다.

외부 iframe은 요청을 차단하므로 실제 provider의 재생 콘텐츠를 비교하지 않는다. 검증된 양쪽 iframe의 교집합 mask1개(면적 제한·geometry 검사 포함)만 RGBA 비교에서 제외한다. 나머지 모든 픽셀은 허용 오차 없이 같아야 한다. 해당 mask와 정확한 수치는 [JSON 결과](verification/upstream-parity-20261023.json)에 보존했다.

| viewport 폭 | 양쪽 전체 이미지 크기 | mask 밖 다른 픽셀 | mask 픽셀 수 |
| --- | --- | --- | --- |
| 375 | 375 × 15247 | 0 | 56883 |
| 759 | 759 × 10948 | 0 | 219459 |
| 760 | 760 × 10950 | 0 | 219842 |
| 761 | 761 × 14211 | 0 | 145270 |
| 1024 | 1024 × 12587 | 0 | 259776 |
| 1440 | 1440 × 11630 | 0 | 507969 |

모든 폭에서 dimensionsMatch=true, unmaskedMismatchPixels=0, maxChannelDelta=0. 이 실행의 차단된 iframe 내부도 차이0이지만, 실제 외부 재생의 동등성으로 해석하지 않는다. 화면 폭은 모바일/760px 경계 전후/데스크톱을 포함한다.

## 브라우저 파일별 결과

| 파일 | 결과 | 종료 코드 |
| --- | --- | --- |
| all-nodes-browser.mjs | 통과 | 0 |
| contextual-ui-browser.mjs | 통과 | 0 |
| definition-pairs-browser.mjs | 통과 | 0 |
| font-proof-browser.mjs | 통과 | 0 |
| full-page-pixel-parity-browser.mjs | 통과 | 0 |
| inline-span-browser.mjs | 통과 | 0 |
| layout-browser.mjs | 통과 | 0 |
| list-kind-browser.mjs | 통과 | 0 |
| managed-note-assets-browser.mjs | 실패 — 보류 자산 등록 UI | 1 |
| note-browser.mjs | 통과 | 0 |
| note-dom-browser.mjs | 통과 | 0 |
| note-editing-browser.mjs | 통과 | 0 |
| note-export-parity-browser.mjs | 통과 | 0 |
| note-image-chooser-browser.mjs | 통과 | 0 |
| note-image-dimensions-browser.mjs | 통과 | 0 |
| publication-browser.mjs | 통과 | 0 |
| recovery-browser.mjs | 통과 | 0 |
| section-commands-browser.mjs | 통과 | 0 |
| server-browser.mjs | 통과 | 0 |
| text-format-browser.mjs | 통과 | 0 |
| upstream-dom-browser.mjs | 통과 | 0 |
| upstream-full-document-editor-browser.mjs | 통과 | 0 |
| upstream-full-document-roundtrip-browser.mjs | 통과 | 0 |
| upstream-full-document-visual-browser.mjs | 통과 | 0 |
| upstream-full-page-baseline-browser.mjs | 통과 | 0 |
| upstream-geometry-browser.mjs | 통과 | 0 |
| upstream-newthought-sidenote-browser.mjs | 통과 | 0 |
| upstream-same-content-epigraphs-browser.mjs | 통과 | 0 |
| upstream-same-content-figures-browser.mjs | 통과 | 0 |
| upstream-same-content-final-sections-browser.mjs | 통과 | 0 |
| upstream-same-content-fundamentals-browser.mjs | 통과 | 0 |
| upstream-same-content-getting-started-browser.mjs | 통과 | 0 |
| upstream-same-content-opening-browser.mjs | 통과 | 0 |
| upstream-same-content-sidenotes-browser.mjs | 통과 | 0 |

managed-note-assets는 등록 버튼 부재로 locator.click 5초 TimeoutError 후 exit1이다. 외부60초 파일 timeout으로 종료된 것이 아니다. A0–A8 자산 확대 보류 결정을 유지했으며 이 실패를 삭제/skip/성공 처리하지 않았다.

## 실행 순서와 환경

Node24.19.0, pnpm11.25.0, TypeScript6.0.2, Lexical0.52.0, Playwright1.51.1/Chromium134. frozen 설치가 완료된 같은 lockfile/의존성을 재사용했다. 이번 변경은 추가 의존성이 없다. 고정 원본9개 시각 자산도 이전 byte-size/Git blob SHA 확인본을 재사용했다. 한글 Source Han Serif/Sans 정책은 변경하지 않았다.

성공 build/typecheck/단위 후 각 browser를 독립 실행했고 제품 코드는 browser 실행 중 변경하지 않았다. 전체34파일 최종 실행을 회수한 뒤 audit 변경/tree fixture2곳까지 포함해 pnpm check → pnpm package:check를 다시 실행하여 exit0을 확인했다. syntax 및 git diff --check 통과. Python은 /tmp/tufte-recheck-python/bin/python으로 pytest를 실행했고 HTTP subprocess에도 RECOVERY_PYTHON으로 같은 interpreter를 지정했다.

로컬 상세 로그: /tmp/tufte-parity-check-final.log, /tmp/tufte-parity-package.log, /tmp/tufte-parity-browser-*.log, /tmp/tufte-parity-python.log, /tmp/tufte-parity-http.log. 최종 PNG와 pixel reports는 /tmp/tufte-parity-final-visual에 생성했다. 영속 보고서에는 파일별 판정과6개 pixel report의 전체 수치를 기록했다.

## 체크리스트와 남은 범위

E1의 현행 저장 경계/fixture 회귀, E2의 이번 DOM/React 오류, E3의 공식9섹션 동일 콘텐츠 편집·발행/DOM·시각 대조를 검증했다. 각 노드를 GUI로 생성·수정·삭제하는 모든 P2 도구, 외부 iframe 실제 재생 및 호스트 운영/배포, OS별 한글 fallback 검증은 원래 기능 게이트를 유지한다. 자산 등록 UI1개는 보류다.

E120/E123 해결 범위를 기록하고 E125/M114/M115와 재발 검출을 반영했다. 오래된 미해결 제목을 수정했으며 다음 점검은 다음 P2 기능 작업의 시작/완료 및 P단계 전환 시 수행한다. CI는 생략한다.
