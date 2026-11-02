# 누적 자동 테스트 실행 — 2026-11-03

기준 `e39b8a1`. 지난 검증 이후 추출한 editor-react 패키지와 controlled TufteEditor API를 포함한다. **제품 코드·테스트 기대값 변경 없이 전수 실행에서 통과했다.**

| 검사 | 결과 |
| --- | --- |
| frozen install, audit/lint/inventory/font | 통과 |
| build/typecheck | 통과 |
| 단위 |629개 통과(document58/render72/blog77/editor-ports2/Lexical420), 실패/skip0 |
| packed JS·선언·왕복·SQL/라이선스·CSS |6개 tarball 통과(editor-react 포함) |
| browser |40개 전수 실행,40/40통과 |
| Python |16개 통과 |
| TS→Python HTTP→SQLite |save/read/list/checksum/CAS/access/CSRF/delete 통과 |
| 발행 revision 제안 모델 |12그룹 통과 |
| 공식9섹션/60블록/7노트 |DOM·편집·저장/재열기·발행 통과 |
| pixel |375/759/760/761/1024/1440px, 검증된 iframe1개 mask 밖 차이0 |
| CI |기존 지시대로 미실행 |

## 새 controlled API 검증

`controlled-editor-browser.mjs`에서 실제 React/Lexical 두 인스턴스를 실행했다.

- 최초 import가 onChange를 발생시키지 않고 사용자 변경은 다른 인스턴스를 변경하지 않는다.
- value echo가 중복 알림을 만들지 않으며 metadata-only 변경이 편집 내용/Undo를 초기화하지 않는다.
- 잘못된 외부 문서는 onError로 보고되고 두 편집기의 현재 본문을 보존한다.
- 유효한 외부 문서 교체가 적용되고 Undo가 교체 전 문서를 복원하지 않는다.
- readonly가 contenteditable=false와 도구 숨김으로 적용되며 키 입력이 문서를 바꾸지 않는다.
- unmount/remount 후 각 호스트의 현재 문서가 복구되고 다른 편집기의 내용/알림 상태를 침범하지 않는다.

예제의 기존 자산 등록/호스트 비동기 revision·삭제 회귀, 노트/목록/인용/선택/포커스·DOM 재열기도 모두 통과했다. 전수 실행은 tests/*-browser.mjs를 각각 별도 프로세스240초 제한으로 실행했으며 실패·프로세스 timeout·강제 skip이 없었다.

## 재현·범위

frozen install→pnpm check→node scripts/pack-and-check.mjs의 종료를 확인한 후 browser를 실행했다. 공식 고정 Playwright shell 설치/smoke 및 고정 이미지5개/ET Book4개의 Git blob 검증을 수행했다. pytest와 HTTP는 같은 `/tmp/tufte-nov3-venv/bin/python`을 사용했다. Python의 Starlette/httpx warning1개는 실패가 아니다.

실제 DAM·OS IME·스크린리더·물리 터치/타 브라우저·성능/리스너 누수 계측은 미실행이다. 두 인스턴스의 동작 독립성 검사는 모든 자산 namespace/타이머 조합의 격리를 증명한 것이 아니다. P3.1.e 및 R4–R7의 모든 이관/운영·접근성 gate를 이 결과만으로 완료 처리하지 않는다.

시작/종료에 AGENTS와 최근 E139–E144/M128–M129, 환경/저장/독립 DOM 검증 원칙을 점검했다. 신규 제품 오류 재현 없음. [소스/로그 해시와 파일별 결과](verification/deferred-20261103.json).

## 브라우저 파일별 결과

| 파일 | 결과 |
| --- | --- |
| all-nodes-browser.mjs | 통과 |
| contextual-ui-browser.mjs | 통과 |
| controlled-editor-browser.mjs | 통과 |
| definition-pairs-browser.mjs | 통과 |
| font-proof-browser.mjs | 통과 |
| full-page-pixel-parity-browser.mjs | 통과 |
| host-asset-provider-browser.mjs | 통과 |
| inline-span-browser.mjs | 통과 |
| inline-span-html-browser.mjs | 통과 |
| layout-browser.mjs | 통과 |
| list-kind-browser.mjs | 통과 |
| list-tab-focus-browser.mjs | 통과 |
| managed-note-assets-browser.mjs | 통과 |
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
