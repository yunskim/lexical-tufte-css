# 전체 회귀 재실행 — 2026-10-25

검증 기준 `25d899540dabe36c6aa5dd164ce09b73424a195b`, `fix/main-browser-parity-20261023`. 이전 검증 이후 이 브랜치에 코드 변경은 없었다. 다른 작업 브랜치 변경은 포함하지 않았다. CI·배포·패키지 발행은 실행하지 않았다.

| 범위 | 결과 |
| --- | --- |
| frozen 설치·build/typecheck·정적 검사 | 통과 |
| 단위 | 425통과, 실패/취소/skip0 |
| 패키지 소비 | tarball5개 통과 |
| Python / 실제 HTTP·SQLite | 16통과 및 HTTP 통과, deprecation 경고1 |
| 발행 revision 제안 모델 | 12그룹 통과; production store 검증은 아님 |
| browser35파일 | 34통과/1실패, 파일timeout·skip0 |
| 공식 전체 페이지 | 9섹션/60블록/7노트, 6폭 pixel 통과 |

375/759/760/761/1024/1440px의 단일 검증 iframe mask 밖 RGBA 차이는 모두0이다. 고정 원본·golden·기대값 변경 없음. note-dom의 label + input + span 구조, 인라인 UI/HTML 및 전체 편집·저장/복구·발행 회귀가 통과했다.

유일한 실패는 `managed-note-assets-browser.mjs`의 `문서 이미지 자산 등록` 버튼 대기5초 초과다. 보류된 A0–A8 미구현이 원인이며 테스트를 제거·skip하거나 기능을 임의 확대하지 않았다. 전체 통과 상태는 아니다.

## 파일별 browser 결과

| 파일 | exit code |
| --- | --- |
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

## 오류·대책 점검

E004/E005/M004, E124/M113 및 두 문서의 전체 기록·상태를 점검했다. 캐시 부재는 공식 고정 설치기의 `pnpm exec playwright install chromium --only-shell`로 복원했다. 최초 CDN의 ZIP 오류(E004)는 공식 Microsoft fallback으로 설치 완료했다. 설치 결과 회수→기본 shell smoke→전체 회귀 순서를 지켜 E005 일반 Chrome socket 오류는 재발하지 않았다. pytest와 HTTP 모두 같은 venv Python을 사용했다. 이전의 환경·OS IME·다른 브라우저·스크린리더·외부 영상 재생 제한은 그대로다.

Node24.22.1/pnpm11.25.0, Playwright1.51.1/Chromium134 shell, Python 의존성은 현재 프로젝트 허용 범위를 사용했다. 성공한 check/package 종료를 회수한 뒤 browser를 실행했고35파일을 각각60초 제한/3초 종료 유예로 순차 실행했다. 제품 코드 변경이 없어 문서 갱신 뒤에는 diff/JSON 검사만 한다.

[파일별 결과·6폭 원본 pixel 수치·로그 해시](verification/retest-20261025.json). 로컬 로그와 시각 산출물은 `/workspace/scratch/484e46557938/lexical-tufte-verification-20261025`에 있다. 보류 자산1실패를 미해결로 유지하며 P2.2.b.2는 구현 완료 처리하지 않는다. 다음 점검은 다음 기능 작업 시작/완료 및 환경 변경 시다.
