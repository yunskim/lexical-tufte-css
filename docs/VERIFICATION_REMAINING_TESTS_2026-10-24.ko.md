# 잔여 회귀 테스트 실행 결과 — 2026-10-24

검증 기준: `7636a987b51b8f6585f95c28ba0da05e78db2291`, `fix/main-browser-parity-20261023`. 작업 시작 시 깨끗한 tree였으며 제품 소스·golden·수락 조건은 바꾸지 않았다. 이번 변경은 실행 결과와 오류·대책 문서 갱신이다. 다른 브랜치의 커밋은 이 결과에 포함하지 않는다.

## 결과

| 검증 | 통과 | 실패 | 건너뜀 |
| --- | --- | --- | --- |
| frozen lockfile 설치 | 완료 | 0 | 0 |
| pnpm check: build/typecheck/audit/lint/inventory/font | 완료 | 0 | 0 |
| 단위 테스트 | 425 | 0 | 0 |
| 패키지 소비 검증 | 5개 tarball | 0 | 0 |
| 전체 browser 파일 독립 실행 | 34 | 1 | 0 |
| Python pytest | 16 | 0 | 0 |
| 실제 TypeScript→Python HTTP→SQLite | 통과 | 0 | 0 |
| 발행 revision 제안 모델 | 12 assertion groups | 0 | 0 |
| 공식 전체 페이지 pixel 대조 | 6개 폭 | 0 | 0 |
| CI | — | — | 요청대로 미실행 |

단위 테스트는 document57/render51/blog77/editor-ports2/Lexical238개다. 취소0. browser 각 파일은60초 제한과3초 종료 유예를 두고 순차 실행했으며 파일 시간 초과0이다. 브라우저 내부의5초 locator timeout을 파일 제한 초과와 구분한다. 모델12그룹은 proposal model이며 실제 production publication store 검증으로 계산하지 않는다. Python은 Starlette/httpx deprecation warning1개가 있다.

## 실패 분석

`tests/managed-note-assets-browser.mjs`만 실패했다. `문서 이미지 자산 등록` 버튼을5초 기다리다 실패했으며 현재 편집기에는 해당 관리 UI가 없다. 이는 이미 보류한 A0–A8 자산 기능의 미구현이다. 자산 기능 확대 보류를 유지했고 테스트를 제거·skip하거나 기대값을 완화하지 않았다. 다른34개 파일이 통과했으므로 전체 통과로 보고하지 않는다.

기존 요청의 `tests/note-dom-browser.mjs`는 현재 label + input + span 구조로 통과했다. 노트 편집·이미지 선택/크기·발행 parity 및 인라인 속성 UI/HTML 회귀도 통과했다.

## 공식 Tufte CSS 대조

고정 공식 HTML/CSS와 검증된 ET Book·이미지를 로컬에서 사용했다.9섹션·60블록·7노트의 DOM, v1/v2 저장·재열기, 실제 편집/Undo/Redo, 전체 시각 대조를 실행했다.375/759/760/761/1024/1440px의 단일 검증 iframe 마스크 밖 RGBA 불일치 픽셀은 각각0이다. 원래의 접근성 ID·안전한 iframe 속성·코드 예제 현대화 예외는 유지한다. 외부 영상 재생을 검사한 것은 아니다.

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
| managed-note-assets-browser.mjs | 실패 — 보류된 자산 등록 UI |
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

## 환경 오류와 재발 방지 점검

- **E004 재발:** 공식 설치기의 최초 CDN 응답이 유효한 ZIP이 아니었다. 설치기의 공식 Microsoft 대체 경로로 Chromium/headless shell 설치가 완료됐다. 임의 바이너리나 버전 변경은 없다.
- **E005 재발:** shell 설치 완료 전에 일반 Chromium 경로를 지정해 smoke를 실행했고 singleton socket 생성의 Operation not permitted로 종료했다. M004의 기본 shell 원칙을 적용하지 않은 절차 실수다. 기본 headless shell의 기존 pixel-comparator smoke를 통과한 뒤35개를 실행했다. 시스템 권한은 바꾸지 않았다.
- **M004 보강:** 설치 완료를 먼저 회수하고, 기본 shell을 사용하는 smoke가 성공하기 전에는 전체 브라우저를 시작하지 않는다. 실행 파일 부재를 일반 Chrome 강제 지정으로 우회하지 않는다. 원인 없는 반복 재시도 없이 설치기 fallback과 실행 경로를 분리해 기록한다.
- E124/M113에 따라 같은 `.venv/bin/python`을 pytest와 RECOVERY_PYTHON에 명시해 HTTP까지 통과했다.
- 두 오류 문서 전체의 기록/상태를 점검했다. 이전 환경의 미검증 이력과 현재 브랜치의 실행 결과를 섞지 않고 과거 기록은 유지한다. E110의 main 이력, OS IME/Happy DOM/외부 clipboard 등의 별도 범위까지 해결됐다고 해석하지 않는다.

환경: Node24.19.0, pnpm11.25.0, Playwright1.51.1/Chromium134 shell, Python3.12.14. Python 설치 허용 범위에서 FastAPI0.162.0/Starlette1.9.0/httpx0.28.1/uvicorn0.54.0/pytest9.1.1을 설치했다. JS lockfile은 바꾸지 않았다.

로컬 원본 로그는 `/workspace/scratch/484e46557938/lexical-tufte-verification-20261024`에 있다. [기계 판독 결과](verification/remaining-tests-20261024.json)에 파일별 exit code, 핵심 출력과45개 로그의 SHA-256/크기를 보존한다. 문서 갱신 뒤 diff 검사를 수행하며 제품 코드는 바뀌지 않았으므로 테스트 재실행은 추가하지 않는다.

## 완료 범위와 남은 항목

이번 브랜치의 실행 가능한 자동 검증을 모두 회수했다. 해결되지 않은 자동 테스트는 보류 자산 등록1개다. 실제 OS IME/다른 브라우저·스크린리더와 외부 iframe 재생은 이번 자동 검증 범위 밖이며 기존 P6 등의 미완료 상태를 유지한다. P2.2.b.2 구현이나 A0–A8을 완료 체크하지 않는다. 다음 오류·대책 점검은 P2.2.b.2 시작/완료 또는 브라우저 환경 변경 시다. CI·배포·패키지 발행 없음.
