# K5 목록 기능 통합 수락 — 2026-10-31

기준 `f4ccf6560c0e474fd3973788523f8e096a981dd3` 후속, `fix/main-browser-parity-20261023`. **K5 및 P2.2.b.2 ul/ol의 명시한 지원·거부 범위를 완료했다.** 정의목록 P2.2.b.3, F06 전체와 상위 P2.2.b/P2.2는 미완료다. 제품 소스/JSON schema/golden/원본 CSS를 변경하지 않았다.

## 수락 행렬

| 범위 | 증거 | 판정 |
| --- | --- | --- |
| 삽입·선택 항목 뒤 추가·중간/최종·ul/ol 전환 | list-commands.test / list-kind-browser | 통과 |
| Enter 처음/중간/끝, 최종 빈 항목 종료 | list-keyboard-ownership.test / list-kind-browser | 통과 |
| 빈 첫·중간 nonfinal 항목 Enter | 새 list-acceptance.test, ul/ol·후속 항목/노트 보존 | 통과 |
| nested 빈 항목 한 단계 outdent·앞뒤/혼합 부모 보존 | ownership 및 실제 UI history/저장 | 통과 |
| Backspace 문자 삭제·첫 항목 해제·중간/최종 병합·안전한 nested outdent | list-backspace.test / acceptance / 실제 UI | 통과 |
| Tab19↔20·깊이20·첫/최상위·container·혼합 부모 거부 | list-tab.test / 실제 두 폭 focus | 통과 |
| 혼합 ul/ol canonical 저장/재열기·동일 발행 HTML | 새 acceptance2개 | 통과 |
| 깊이19 노트 포함 JSON 저장/재열기·DOM 재조정 후 JSON·발행 HTML | tab-browser-harness / focus browser 두 폭 | 통과 |
| 노트/다른 블록/IME·범위·수정키·미지원 checklist의 handler 위임 | ownership/list commands 및 note 편집/DOM 전체 회귀 | 통과 |
| 각각 한 Undo/Redo, 실제 저장·재열기 | list-kind-browser1440/375px | 통과 |
| 접근 가능한 구조·앞뒤 focus·toolbar/context menu 탐색 | note-dom / tab-focus / contextual UI | Chromium 범위 통과 |
| 공식9섹션/60블록/7노트의 실제 편집·저장·발행·전체 원본 비교 | 전수 upstream DOM/roundtrip/editor/visual | 통과 |

일반 혼합 부모 outdent, nested payload를 가진 첫 항목의 문단 변환, list-only container 자체 변경 등은 진단·무변경 거부 경계다. 이를 임의 변환 지원으로 확대하지 않는다. 실제 OS IME/다른 브라우저/스크린리더 실기기는 P6다. JSON→HTML 발행과 canonical 재열기를 검증했으며 범용 HTML import 완료를 뜻하지 않는다(P2.4).

## 실행 결과

| 검사 | 결과 |
| --- | --- |
| frozen 설치·build/typecheck·정적 검사 | 통과 |
| 최종 단위 | 483통과, 실패/취소/skip0 |
| 단위 패키지별 | document57/render52/blog77/editor-ports2/Lexical295 |
| packed JS/declaration/왕복/SQL·라이선스 | tarball5개 통과 |
| browser36파일 최종 집계 | 35통과/1실패, 파일timeout·skip0 |
| 공식 전체 페이지 pixel | 375/759/760/761/1024/1440px, 단일 검증 iframe mask 밖 RGBA 차이 모두0 |
| Python·실제 HTTP/SQLite | 16개 및 실제 연동 통과, Starlette/httpx 경고1 |
| CI | 요청대로 미실행 |

처음 pnpm check475개를 통과한 뒤 새 조합8개를 추가해 pnpm test483개를 통과했다. 이후 최종 audit/lint/구문/diff 검사도 통과했다. 제품 소스와 의존성은 변경하지 않아 build/typecheck/pack 산출물은 같은 코드다. 전체36파일 초기34통과/2실패 후 테스트 준비 게이트와 DOM 재조정 assertion을 수정·보강한 두 파일을 독립 재실행해 최종35통과/1실패로 집계했다. 최초 결과와 재실행은 [JSON](verification/list-acceptance-20261031.json)에 구분했다. 파일별60초/종료유예3초 제한을 사용했다.

## 실패 분석과 제한

- **보류 자산1개:** managed-note-assets-browser의 문서 이미지 자산 등록 버튼 부재/locator5초 timeout. A0–A8 보류를 유지하고 원래 테스트를 제거·skip하거나 기대값을 완화하지 않았다. 이 실패가 해결됐거나 저장소 전체가 green이라고 보고하지 않는다.
- **E131/M121:** upstream 전체 문서 editor의 초기 page.goto가 load10초를 넘었다. 실제 editor 검사 전이며 지연 리소스의 정확한 원인은 미확정이다. 최초 탐색/재로드를 domcontentloaded로 하고 기존 editor readiness·복원·편집·Undo/Redo·저장·발행 assertion을 유지했다. 독립 재실행 전체 통과. visual의 font/image readiness 게이트는 바꾸지 않았다.
- 기존 E127–E130/M117–M120의 지원·거부 경계를 재검토하고 노트·범위·DOM selection·기본 focus와 깊은 JSON의 DOM 재조정 이후 보존을 확인했다. 새 제품 오류는 관찰하지 않았다.
- 다음 오류·대책 점검은 P2.2.b.3 시작/완료다. 자산 확대·실기기 접근성 검증은 각각 기존 보류/P6 게이트를 유지한다.

## browser 파일별 최종 결과

| 파일 | exit code |
| --- | --- |
| list-tab-focus-browser.mjs | 0 |
| all-nodes-browser.mjs | 0 |
| contextual-ui-browser.mjs | 0 |
| definition-pairs-browser.mjs | 0 |
| font-proof-browser.mjs | 0 |
| full-page-pixel-parity-browser.mjs | 0 |
| inline-span-browser.mjs | 0 |
| inline-span-html-browser.mjs | 0 |
| layout-browser.mjs | 0 |
| list-kind-browser.mjs | 0 |
| managed-note-assets-browser.mjs | 1 |
| note-browser.mjs | 0 |
| note-dom-browser.mjs | 0 |
| note-editing-browser.mjs | 0 |
| note-export-parity-browser.mjs | 0 |
| note-image-chooser-browser.mjs | 0 |
| note-image-dimensions-browser.mjs | 0 |
| publication-browser.mjs | 0 |
| recovery-browser.mjs | 0 |
| section-commands-browser.mjs | 0 |
| server-browser.mjs | 0 |
| text-format-browser.mjs | 0 |
| upstream-dom-browser.mjs | 0 |
| upstream-full-document-editor-browser.mjs | 0 |
| upstream-full-document-roundtrip-browser.mjs | 0 |
| upstream-full-document-visual-browser.mjs | 0 |
| upstream-full-page-baseline-browser.mjs | 0 |
| upstream-geometry-browser.mjs | 0 |
| upstream-newthought-sidenote-browser.mjs | 0 |
| upstream-same-content-epigraphs-browser.mjs | 0 |
| upstream-same-content-figures-browser.mjs | 0 |
| upstream-same-content-final-sections-browser.mjs | 0 |
| upstream-same-content-fundamentals-browser.mjs | 0 |
| upstream-same-content-getting-started-browser.mjs | 0 |
| upstream-same-content-opening-browser.mjs | 0 |
| upstream-same-content-sidenotes-browser.mjs | 0 |

Node24.22.1/pnpm11.25.0/Playwright1.51.1 Chromium134 shell. pytest와 HTTP child는 같은 venv Python을 지정했다. 로컬 원본 로그/시각 산출물은 `/workspace/scratch/484e46557938/lexical-tufte-k5-20261031`이며 JSON에 source/log hash와6폭 pixel 수치를 보존했다. CI·배포·패키지 발행 없음.
