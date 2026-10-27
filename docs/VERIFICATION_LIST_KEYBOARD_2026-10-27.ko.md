# 목록 키보드 구현·실행 결과 — 2026-10-27

기준 `1c2365810c12699e68484ed88d0bdf76e8234bf4` 후속 작업, `fix/main-browser-parity-20261023`. 아래 결과는 이번 변경을 포함한 작업 tree에서 실행했다. 최종 소스6파일 SHA-256과 원본 pixel 수치는 [JSON](verification/list-keyboard-20261027.json)에 보존한다. CI·배포·패키지 발행 없음.

## 완료 범위

- **K1 완료:** 실제 registerRichText 앞/뒤 등록과 ul/ol에서 Enter 처음/중간/끝의 소유권을 검증했다. 좁은 경계는 Tufte HIGH, 일반 분할은 RichText EDITOR가 소유한다. section 밖 Tab·미지원 체크리스트·note·실제 editor composition·범위/수정키는 자체 변경 없이 위임한다. ListPlugin을 추가하지 않았다.
- **K2 완료:** 최종 빈 top-level 항목 Enter 종료와 nested 빈 항목의 한 단계 outdent를 구현했다. 혼합 부모의 텍스트/노트, 앞뒤 형제, 목록 메타데이터를 보존한다. native 분할/최종 종료/nested outdent의 각각 한 Undo/Redo, 실제 저장/재열기 및 중첩 JSON 발행을1440/375px에서 검증했다. [지원 계약](LIST_KEYBOARD_P22B2.ko.md).
- **K3 일부:** 시작 Backspace가 혼합 부모와 그 노트를 지우는 실제 RichText 경로를 재현하고 진단·무변경 거부로 차단했다. K3 전체 키보드/history 행렬 완료는 아니다.
- **K4 일부:** Tab을 root-level Tufte section의 목록에만 한정하고 혼합 부모 outdent는 기본 포커스 탐색으로 위임한다. 전체 깊이/포커스 수락은 남았다.
- K3/K4/K5, P2.2.b.2 전체, P2.2.b.3 및 상위 기능 항목은 미완료 상태를 유지한다.

## 결과

| 검사 | 결과 |
| --- | --- |
| frozen install | 통과, lockfile 변경 없음 |
| 최종 pnpm check | build/typecheck/static·단위458통과, 실패/취소/skip0 |
| 단위 패키지별 | document57/render52/blog77/editor-ports2/Lexical270 |
| 목록 집중 단위 | 기존30 + 새 소유권/보존32 =62개, 전체 단위에 포함 |
| 최종 package:check | 5 tarball JS·declaration·왕복·SQL·라이선스 소비 통과 |
| 최종 목록 browser | 1440/375px 모두 통과 |
| 전체 browser35파일 | 34통과/1실패, 파일timeout·skip0 |
| 공식 전체 원본 | 9섹션/60블록/7노트, 6폭 mask 밖 exact RGBA 차이0 |
| Python | 이번 변경에서는 미실행; Python 변경 없음 |
| CI | 요청대로 미실행 |

전체35파일은 혼합 부모 Backspace 수정 후 실행했다. 마지막으로 **미지원 체크리스트를 그 guard에서 제외하는 조건1개와 회귀1개**를 추가했고, 최종 check458개·package5개·목록 UI 두 폭을 재실행했다. 그 뒤 다른34개 browser 파일 전체는 반복하지 않았다. 전체 browser 결과를 마지막 조건 이후의 별도 전수 실행으로 표현하지 않는다.

유일한 전체 browser 실패는 기존 `managed-note-assets-browser.mjs`의 문서 이미지 자산 등록 버튼 대기5초 초과다. A0–A8 보류를 유지했고 skip/제거/기대 완화나 자산 기능 확대를 하지 않았다. 파일 시간 제한60초와 종료 유예3초를 사용했으며 해당 locator 실패를 파일 timeout과 구분한다.

## 발견 오류와 수정

- **E127/M117:** setIndent의 wrapper 제거 가정 때문에 혼합 부모 텍스트/노트가 사라졌다. 빈 Enter는 앞뒤 목록을 명시적으로 보존해 이동하고 일반 outdent는 진단 거부한다. 기본 RichText Backspace의 간접 outdent도 같은 부모 손실을 일으켜 시작 경계에서 진단·무변경 거부한다. 항목 내부 문자 삭제는 기본 처리로 위임한다.
- **E128/M118:** 실제 nested listitem.indent:1이 발행기에서 거부됐다. 실제 목록 깊이와 일치하는 nonzero listitem.indent만 허용한다. 다른 임의 들여쓰기·불일치 값은 계속 발행 차단한다. 저장 JSON/golden을 삭제하거나 변환하지 않았다.
- **테스트 오류:** 동적인 last UL이 내부 목록을 가리킨 E097 재발은 section 직접 자식 UL로 수정했다. BR의 innerText 줄바꿈은 textContent로 검사한다. 자식이 없어진 순수 wrapper는 제거되는 기대와 혼합 부모 보존 기대를 구분했다.
- **환경:** 고정 공식 shell 설치의 CDN ZIP 오류는 설치기 fallback으로 완화했고 설치 완료→기본 shell smoke 순서를 적용했다. 일반 Chromium 강제 경로나 권한 변경은 없다.

E096/M089·E091/M085·E004/E005/M004·E124/M113을 시작 시 검토하고 두 오류 문서 전체 기록/상태를 종료 시 다시 점검했다. 최초 실패와 해결된 실행 범위는 ERROR_LOG/ERROR_PREVENTION에 연결했다. 다음 점검은 K3 일반 Backspace 및 K4의 남은 깊이/포커스 행렬 시작·완료다.

## 전체 browser 파일별 결과

| 파일 | exit code |
| --- | --- |
| list-kind-browser.mjs | 0 |
| all-nodes-browser.mjs | 0 |
| contextual-ui-browser.mjs | 0 |
| definition-pairs-browser.mjs | 0 |
| font-proof-browser.mjs | 0 |
| full-page-pixel-parity-browser.mjs | 0 |
| inline-span-browser.mjs | 0 |
| inline-span-html-browser.mjs | 0 |
| layout-browser.mjs | 0 |
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

원본6폭은375/759/760/761/1024/1440px이며 단일 검증 외부 iframe 마스크 밖 차이0이다. 실제 OS IME, 다른 브라우저/스크린리더, 외부 영상 재생은 이 결과에 포함하지 않는다. Node24.22.1/pnpm11.25.0/Lexical0.52.0/Playwright1.51.1 Chromium134 shell. 로컬 원본 로그/시각 산출물은 `/workspace/scratch/484e46557938/lexical-tufte-list-20261027`에 있다.
