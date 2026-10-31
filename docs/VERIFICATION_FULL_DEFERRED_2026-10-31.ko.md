# 누적 자동 테스트 전체 실행 — 2026-10-31

기준 원격 `79d7553` + 미반영 ol value1 reset 수정. 다른 대화에서 추가된 테스트를 포함하기 위해 별도 `test/full-deferred-20261031` 브랜치에서 실행했다. 기존 작업 브랜치의 후속 변경을 덮지 않는다.

| 검사 | 최종 결과 |
| --- | --- |
| frozen install, static audit/lint/inventory/font, build/typecheck | 통과 |
| 단위 | 629개 통과, 실패/skip0 |
| 패키지 | tarball5개 JS·선언·왕복·SQL/라이선스 통과 |
| browser 파일 전수 |38개 모두 실행, 최종37통과/1실패 |
| 공식 원본 |9섹션/60블록/7노트 DOM·편집/저장/재열기 및6폭 pixel 비교 통과 |
| pixel |375/759/760/761/1024/1440px, 검증된 iframe1개 mask 밖 차이0 |
| Python |16개 통과 |
| TS→Python HTTP→SQLite |save/read/list/checksum/CAS/access/CSRF/delete 통과 |
| 발행 revision 모델 |12그룹 통과(제안 모델이며 운영 저장소 아님) |
| 추가375px 목록/정의목록 |통과 |
| CI |기존 지시대로 미실행 |

## 남은 실패

`managed-note-assets-browser.mjs`: 실제 `문서 이미지 자산 등록` 버튼을 찾지 못한다. 자산 등록 UI가 아직 없어 실패하며 테스트를 skip하거나 성공으로 바꾸지 않았다. 따라서 전체 테스트가 모두 통과한 상태는 아니다. 이 UI의 구현은 별도 기능 작업이다.

실제 OS IME·스크린리더·타 브라우저/물리 터치는 자동 실행 환경 밖이며 이번에 검증하지 않았다. CDP composition 자동화 결과와 구분한다.

## 수정과 최초/재실행

- 새 renderer 테스트의 regex 이중 escaping과 루트에 없는 headless 의존성 경로 수정.
- hand-built fixture를 실제 factory/export로 대체하고 등록 시점에 맞는 HistoryState 초기값으로 이력 테스트를 보완. 손실 거부/내용/HTML assertion은 유지.
- ul의 정상 파생 순번은 허용하고 임의 value와 비기본 start는 진단 거부. ol의 명시 value1 reset은 생략하지 않음.
- 노트 삽입을 HISTORY_PUSH_TAG/discrete commit으로 분리해 Undo/Redo·note ID 보존 확인.
- DOM caret을 paragraph text로 고정하고 무효 명령의 버튼 focus 유지와 성공 명령의 editor focus 복귀를 구분.

최초 browser38개33통과/5실패. 수정·고정 자산 다운로드 후 전수 재실행에서36통과/2실패였으며, all-nodes의 복구 panel locator5초 timeout은 독립 재실행에서 통과했다. 이 일시 지연의 정확한 원인은 미확정이며 최종37통과 집계에 독립 성공을 명시한다. managed asset은 계속 실패다. 프로세스180초 timeout/강제 skip은 없었다.

Playwright1.51.1의 고정 headless shell을 공식 설치기로 설치하고 smoke 후 실행했다. CDN ZIP 오류는 공식 fallback으로 복구했다. 공식 이미지5개/ET Book4개는 고정 Git blob 검증 후 사용했다. pytest와 HTTP는 같은 `/tmp/tufte-full-venv/bin/python`을 사용했다. Python의 Starlette/httpx deprecation warning1개는 실패가 아니다.

시작/종료에 M004/M113/M118/M123–M125를 점검했고 E137/E138·M127에 수정과 재발 방지를 기록했다. [모든 파일 결과·최초/최종·소스/로그 해시](verification/full-deferred-20261031.json).

## 브라우저 파일별 최종 결과

| 파일 | 결과 |
| --- | --- |
| all-nodes-browser.mjs | 통과(독립 재실행) |
| contextual-ui-browser.mjs | 통과 |
| definition-pairs-browser.mjs | 통과 |
| font-proof-browser.mjs | 통과 |
| full-page-pixel-parity-browser.mjs | 통과 |
| inline-span-browser.mjs | 통과 |
| inline-span-html-browser.mjs | 통과 |
| layout-browser.mjs | 통과 |
| list-kind-browser.mjs | 통과 |
| list-tab-focus-browser.mjs | 통과 |
| managed-note-assets-browser.mjs | 실패: 자산 등록 UI 부재 |
| note-browser.mjs | 통과 |
| note-dom-browser.mjs | 통과 |
| note-editing-browser.mjs | 통과 |
| note-export-parity-browser.mjs | 통과 |
| note-image-chooser-browser.mjs | 통과 |
| note-image-dimensions-browser.mjs | 통과 |
| p22d2-semantic-dom-browser.mjs | 통과 |
| publication-browser.mjs | 통과 |
| quotation-editing-browser.mjs | 통과 |
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
