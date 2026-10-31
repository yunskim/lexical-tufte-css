# 자산 기능 추가 후 누적 테스트 — 2026-10-31

기준 `f8ed41b`와 이번 수정. 이전 `VERIFICATION_FULL_DEFERRED_2026-10-31.ko.md`의 자산 UI 미구현 실패 이후 추가된 Wagtail 참고 로컬 catalog/chooser 및 host provider 기능을 포함한다.

| 검사 | 최종 결과 |
| --- | --- |
| frozen install | lockfile 수정 후 통과 |
| audit/lint/inventory/font, build/typecheck | 통과 |
| 단위 |629개 통과, 실패/skip0 |
| 패키지 JS·선언·왕복·SQL/라이선스 |5개 통과 |
| browser 파일 전수 |39개 실행, 재실행 반영 최종39개 통과 |
| Python |16개 통과 |
| TS→Python HTTP→SQLite |save/read/list/checksum/CAS/access/CSRF/delete 통과 |
| 발행 revision 제안 모델 |12그룹 통과 |
| 공식9섹션/60블록/7노트 |DOM·편집/저장/재열기·발행 검증 통과 |
| pixel |375/759/760/761/1024/1440px, 검증된 iframe1개 mask 밖 차이0 |
| CI |기존 지시대로 미실행 |

## 자산 기능 실행 범위

- 로컬 자산 등록·중복 거부·chooser 대상 이미지 선택/연결·alt/크기·catalog/본문 같은 envelope 저장/복원·검사 JSON/발행·손상본 거부·복구 snapshot.
- mock AssetProvider 검색·revision 선택·resolve·host locator 저장·복원 후 URL 갱신, 실패 상태/복구, 만료60초 전 갱신,5초 초기 backoff, 수동 성공 후 재시도 취소, 만료/재시도 타이머 독립성.
- 실제 노트 이미지2개/revision2개를 구성해 rev1만 실패시키고 자동 재시도가 이미 성공한 rev2를 요청하지 않는지 정확한 resolve 호출 배열로 확인.
- 기존 텍스트·인용·목록·주석·정의목록·키보드/포커스 회귀도 전수 실행.

실제 외부 DAM 서비스·OS IME·스크린리더·물리 터치/타 브라우저를 검증한 것은 아니다. mock provider 계약과 고정 Chromium/CDP 자동화 범위다. 전체 제품/보안/접근성 수락 게이트를 이 결과만으로 닫지 않는다.

## 발견·수정 및 재실행

E139/M128: editor-ports workspace 의존성의 lockfile 누락으로 설치 실패, 상태 선언 전에 effect dependency를 읽는 TS2448/TS2454 build 실패를 수정했다. 성공한 build 결과를 회수한 뒤 browser를 실행했다.

E140/M128: hostAsset만 있고 로컬 catalog가 없는 문서도 관리 envelope에 저장하게 했다. 기존 exporter의 관리 문서 JSON을 검사 패널에 출력해 저장본과 비교한다. 바뀐 저장 실패 메시지와 자산 UI 추가 후의 실제 Tab 다음 대상에 테스트를 맞췄다.

E141/M128: chooser close가 generation을 무효화해 finally에서 loading을 지우지 못하던 문제를 close의 명시적 초기화로 해결했다. 같은 chooser 재열기/두 번째 연결 검사로 확인했다. timer 검사는 page load 후 가상 시계를 정지하고 runFor로만 경계를 진행한다. 선택 재시도 fixture는 실제 노트 내부 삽입·대상 선택·rev1만 실패하는 provider를 사용한다.

최초 browser39개35통과/4실패. 수정 후 전수 재실행은37통과/2실패였다. 새 관리 문서 JSON 이름과 기존 문서 JSON 부분 이름 검색이 충돌한 테스트2개를 exact accessible name으로 이관하고 두 파일 모두 재실행 통과했다. 제품 코드는 이 두 selector 수정 중 바뀌지 않았다. 실패를 skip하거나 내용/HTML/이력 assertion을 제거하지 않았다. 프로세스240초 timeout/강제 skip은 없었다.

같은 venv Python으로 pytest/HTTP를 실행했다. Starlette/httpx deprecation warning1개는 실패가 아니다. 공식 고정 shell 설치·smoke 및 이미지5개/ET Book4개 Git-blob 검증을 수행했다. 최종 환경·소스·파일별 결과·로그 해시는 [기계 판독 결과](verification/assets-deferred-20261031.json)에 기록했다. M004/M113/M123/M124/M127을 시작/종료에 점검했다.

## 브라우저 파일별 최종 결과

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
| note-image-chooser-browser.mjs | selector 수정 후 통과 |
| note-image-dimensions-browser.mjs | selector 수정 후 통과 |
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
