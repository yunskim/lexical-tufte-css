# 누적 자동 테스트 실행 — 2026-11-01

후속 editor-react/controlled API 추가 이후 검증은 [2026-11-03 보고서](VERIFICATION_DEFERRED_2026-11-03.ko.md)를 따른다. 아래는 당시 기준 이력이다.

기준 `e0efb2c`와 이번 수정. 전일 자산 검증 이후 추가된 pending resolve 중 revision 교체/삭제, host identity·독립 이미지 보존, 자동 중복 갱신 coalescing과 수동 supersession을 포함한다.

| 검사 | 최종 결과 |
| --- | --- |
| frozen install, audit/lint/inventory/font | 통과 |
| build/typecheck | 통과 |
| unit |629개 통과(document58/render72/blog77/editor-ports2/Lexical420), 실패/skip0 |
| package JS·선언·왕복·SQL/라이선스 |5개 통과 |
| browser |39개 전수 실행, 최종39/39통과 |
| Python |16개 통과 |
| TS→Python HTTP→SQLite |save/read/list/checksum/CAS/access/CSRF/delete 통과 |
| 발행 revision 제안 모델 |12그룹 통과 |
| 공식9섹션/60블록/7노트 |DOM·편집·저장/재열기·발행 통과 |
| pixel |375/759/760/761/1024/1440px, 검증된 iframe1개 mask 밖 차이0 |
| CI |기존 지시대로 미실행 |

## 발견·수정

- E142: pending 동안 refresh 버튼이 disabled/다른 이름으로 바뀌어 실제 수동 supersession이 막혔다. 안정된 버튼 이름과 활성 상태를 유지하고 aria-busy로 진행 상태를 표시한다. 자동 coalescing과 generation guard는 유지한다.
- E143: overwrite 확인창을 승인하지 않아 revision 검사에서 옛 저장본을 읽었다. 테스트가 confirm을 명시 승인하며 교체 전 이미지를 checkpoint한다. 대상은 실제 이전 revision과 다른 값으로 바꾸고 다른 이미지 전체 JSON·host namespace/assetId 보존을 비교한다. 한 이미지만 바꿨는데 고정된 두 revision 배열을 기대하던 오류도 before/after 비교로 수정했다.
- E144: note image click이 Lexical NodeSelection을 설정하지 않아 Backspace가 삭제하지 못했다. 노트 내부 InlineImageNode 클릭에만 선택과 editor focus를 연결해 기본 RichText 삭제 경로를 사용한다. DOM뿐 아니라 저장 JSON의 이미지 개수 감소 및 늦은 URL 응답이 삭제 이미지를 복원하지 않는지 검사한다. fixture의 남은 유효 요청은 정상 응답시켜 완료 상태까지 확인한다.

집중 host 테스트는 수동 버튼·revision checkpoint·삭제 경계에서 순차 실패를 재현했다. 수정 뒤 집중 검사를 통과했고 **그 최종 코드로 check/package와 browser39개를 전부 실행해 모두 통과했다.** 최종 전수 실행에는 timeout/강제 종료/skip이 없었다. 내용을 바꾸거나 검사를 제거해 성공 처리하지 않았다.

검증 명령은 frozen install→pnpm check→node scripts/pack-and-check.mjs, tests/*-browser.mjs 각각 별도 프로세스240초 제한, 같은 venv의 pytest/RECOVERY_PYTHON HTTP, publish-revision-model.mjs다. 고정 Playwright shell 설치/smoke 및 upstream 이미지5개/ET Book4개의 Git blob 검증 후 실행했다. Python Starlette/httpx warning1개는 실패가 아니다.

실제 DAM 서비스·OS IME·스크린리더·물리 터치/타 브라우저는 미실행이다. mock provider와 고정 Chromium/CDP 자동화 범위이며 운영·전체 접근성 수락으로 확대하지 않는다. M004/M113/M123/M124/M127/M128을 시작/종료에 점검하고 E142–E144/M129에 근거를 연결했다. [소스/로그 해시와 전 파일 결과](verification/deferred-20261101.json).

## 브라우저 파일별 결과

| 파일 | 결과 |
| --- | --- |
| all-nodes-browser.mjs | 통과 |
| contextual-ui-browser.mjs | 통과 |
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
