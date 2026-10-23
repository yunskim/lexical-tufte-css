# P2.2.b.1 인라인 속성 구현·검증 — 2026-10-23

기준 `7d517909cfb38b10d55d4feda918f3ac6bcd7db5` 후속, `fix/main-browser-parity-20261023`. **P2.2.b.1의 명시된 지원/거부 범위를 완료했다.** P2.2.b/P2.2/F03/F05 전체와 P2.4/P6는 미완료 게이트를 유지한다. 자산 확대 보류·CI 생략.

## 변경과 이유

TufteSpanNode는 JSON에서 네 kind를 보존했지만 HTML 복원 converter가 없었다. 새 브라우저 왕복에서는 native HTML export의 정렬도 소실돼 expected format:right/actual 빈 값으로 실패했다(E126). importDOM에서 kind/dir/안전한 alignment를 복원하고 native export에도 publisher와 같은 scoped 정렬 class를 추가했다. 기존 JSON/schema/golden/renderer는 변경하지 않았다.

인식된 Tufte span의 복수 kind·unknown class/attribute·잘못된 dir·임의/중복/important CSS·정렬 충돌은 오류로 거부한다. CSSOM이 먼저 버리는 잘못된 style도 raw 문자열 검사로 거부한다. 테스트 harness는 기존 문서를 유지한 상태에서 모든 변환을 끝낸 뒤 교체하고,12개 거부 사례에서 기존 상태 보존을 검사한다. 범용 HTML 보안/위치 있는 진단 importer를 구현했다는 의미는 아니다.

자세한 명령별 성공/거부 조건과 HTML fragment 범위는 [지원 계약](INLINE_SPAN_P22B1.ko.md)에 있다. wrap은 같은 일반 TextNode 하나의 부분 선택, 링크 내 텍스트를 지원한다. 여러 노드/부모·노트 내부·이미 감싼 텍스트는 명시적 거부다. 기존 span kind 변경과 전체 wrapper 해제의 내용/선택 보존·history 경계를 검증했다.

## 최종 결과

| 범위 | 결과 | 실패/취소/건너뜀 |
| --- | --- | --- |
| pnpm check | build/typecheck/static 및 unit425 통과 | 0/0/0 |
| unit 패키지별 | document57/render51/blog77/editor-ports2/Lexical238 | 모두 통과 |
| inline-commands | 15개 통과 | 0/0/0 |
| package:check | 5개 tarball JS·선언·strict 왕복·SQL·라이선스 소비 통과 | 없음 |
| browser35파일 | 34통과 | 보류 자산1실패, 파일timeout·skip0 |
| Python pytest·실제 HTTP/SQLite | 16개 및 왕복 통과 | pytest 경고1, 실패·skip0 |
| 공식9섹션·6폭 pixel | DOM/실제 편집·저장 및 mask 밖 exact RGBA 유지 | 외부 iframe 재생은 제외 |

기존423개에 composition guard1개·4kind rich wrap 회귀1개가 추가됐다. 새 HTML browser1개로 파일 수는35가 됐다. browser 내부36개 성공 import와12개 거부 case를 전체 unit/browser 파일 수에 더하지 않는다.

## 인라인 수락 증거

- **선택/내용:**15개 unit은 정·역방향 partial selection, rich bold/italic,4kind, 링크 URL·인접 note ID, 기존 span 내부/cross-text/cross-parent/note 거부, caret·선택 유지·잘못된 kind 거부를 검사한다. 공개 $setCompositionKey 경로로 wrap/kind/unwrap 세 명령의 조합 중 무변경 거부도 실행했다.
- **HTML:**4kind×3형태(default/class alignment/단일 CSS alignment)의12입력에서 처음 import→native HTML 재import→publisher HTML 재import를 검증했다(성공36회). kind·bold/code·text·URL·rtl·alignment와 canonical JSON이 같았다.12가지 malformed 속성은 기존 문서를 보존하며 오류로 거부했다.
- **실제 UI:**1440/375px에서 실제 DOM 선택→wrap→Undo/Redo→저장/재열기→kind3종 변경/Undo/Redo→unwrap/Undo/Redo를 실행했다.375px은 wrap/unwrap 버튼에 포커스를 주고 Space로 활성화했다.
- **IME:**두 폭에서 CDP 한글 composition 중 unwrap 거부, 취소 후 원래 canonical JSON 보존을 확인했다. 실제 OS별 IME/스크린리더 실기기 검증은 P6다.
- **회귀:**전체35 browser에서 새 실패 없음. 공식9섹션6폭의 unmaskedMismatchPixels는 모두0, 원래의 단일 검증 iframe mask 및 코드 예제 현대화 예외는 그대로다. 원본 HTML/CSS와 golden 변경 없음.

## browser 파일별 결과

| 파일 | 결과 |
| --- | --- |
| all-nodes-browser.mjs | 통과 |
| contextual-ui-browser.mjs | 통과 |
| definition-pairs-browser.mjs | 통과 |
| font-proof-browser.mjs | 통과 |
| full-page-pixel-parity-browser.mjs | 통과 |
| inline-span-browser.mjs | 통과 |
| inline-span-html-browser.mjs | 통과 |
| layout-browser.mjs | 통과 |
| list-kind-browser.mjs | 통과 |
| managed-note-assets-browser.mjs | 실패 — 보류 자산 등록 |
| note-browser.mjs | 통과 |
| note-dom-browser.mjs | 통과 |
| note-editing-browser.mjs | 통과 |
| note-export-parity-browser.mjs | 통과 |
| note-image-chooser-browser.mjs | 통과 |
| note-image-dimensions-browser.mjs | 통과 |
| publication-browser.mjs | 통과 |
| recovery-browser.mjs | 통과 |
| section-commands-browser.mjs | 통과 |
| server-browser.mjs | 통과 |
| text-format-browser.mjs | 통과 |
| upstream-dom-browser.mjs | 통과 |
| upstream-full-document-editor-browser.mjs | 통과 |
| upstream-full-document-roundtrip-browser.mjs | 통과 |
| upstream-full-document-visual-browser.mjs | 통과 |
| upstream-full-page-baseline-browser.mjs | 통과 |
| upstream-geometry-browser.mjs | 통과 |
| upstream-newthought-sidenote-browser.mjs | 통과 |
| upstream-same-content-epigraphs-browser.mjs | 통과 |
| upstream-same-content-figures-browser.mjs | 통과 |
| upstream-same-content-final-sections-browser.mjs | 통과 |
| upstream-same-content-fundamentals-browser.mjs | 통과 |
| upstream-same-content-getting-started-browser.mjs | 통과 |
| upstream-same-content-opening-browser.mjs | 통과 |
| upstream-same-content-sidenotes-browser.mjs | 통과 |

유일한 실패는 문서 이미지 자산 등록 버튼 부재로 발생한 기존 locator TimeoutError다. A0–A8 보류 결정을 유지했고 테스트를 skip/제거하지 않았다.

## 실행과 산출물

Node24.19.0, pnpm11.25.0, TypeScript6.0.2, Lexical0.52.0, Playwright1.51.1/Chromium134. 같은 frozen lockfile의 설치 환경을 재사용했으며 의존성 추가는 없다.

성공 build 후 집중 unit/inline UI/HTML을 실행하고, pnpm check → pnpm package:check →35개 browser 파일 독립 실행을 순서대로 회수했다. 그 뒤 테스트 harness의 기존 상태 보존 assertion과375px keyboard assertion을 강화해 해당 두 파일을 독립 재실행했다. 제품 소스는 전체 browser 실행 중 변경하지 않았다. audit183파일, lint, node --check 및 git diff --check 통과. pnpm test:inline-span과 test:browser에도 새 HTML 파일을 연결했다.

로컬 로그: /tmp/tufte-inline-check-final.log, /tmp/tufte-inline-package-final.log, /tmp/tufte-inline-regression-*.log, /tmp/tufte-inline-html-final.log, /tmp/tufte-inline-ui-final.log, /tmp/tufte-inline-python.log, /tmp/tufte-inline-http.log. 최종6폭 pixel 수치와 파일별 결과는 [JSON](verification/inline-span-20261023.json)에 보존한다.

P2.2.b.1만 체크했다. 다음 첫 미완료 항목은 P2.2.b.2 목록/키보드 경계다. E126/M116을 기록하고 시작·완료 시 오류 대책을 점검했으며 다음 점검도 그 단계에서 수행한다. CI·배포·패키지 발행은 실행하지 않았다.
