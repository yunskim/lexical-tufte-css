# 노드 등록 충돌 수정 검증 — 2026-10-23

## 판정

기준 `be2317da4e8a4ef4dfa7df99e8a0c5f36cda64fd` 후속 변경, `fix/main-browser-parity-20261023`. **등록 충돌은 수정했고 전체 브라우저/원본 parity는 미완료**다. main·과거 검증 브랜치는 변경하지 않는다. CI·배포·패키지 발행 없음.

| 범위 | 최종 결과 | 실패/취소/건너뜀 |
| --- | --- | --- |
| pnpm check | build/typecheck/static 및 unit418 통과 | 0/0/0 |
| document/render/blog/editor-ports/Lexical | 57/49/77/2/233 통과 | 0/0/0 |
| pnpm package:check | tarball5개 LICENSE/notices/OFL·JS·선언·strict 왕복·SQL 소비 통과 | 없음 |
| 브라우저 파일34개 | 29통과 | 5실패, timeout·skip0 |
| Python pytest | 16통과 | 실패·skip0, deprecation 경고1 |
| TS→Python HTTP→SQLite | 통과 | 시스템 Python 실패 후 올바른 venv로 재실행 |

이전 보고서의12통과/20실패/2timeout 및 단위62/77/2는 이전 tree의 이력이다. 이번 단위418개에는 새 block-registration3개가 포함되며, 내부 assertion과 browser 파일 수를 합산하지 않는다.

## 구현

- E117의 같은 type replacement를 제거했다. 메타데이터 없는 paragraph/quote/heading은 기본 factory를 유지한다. metadata subclass는 고유 runtime type을 사용하며 등록 클래스 type 중복이 없다.
- [canonical 저장 경계](LEXICAL_BLOCK_SERIALIZATION.ko.md)의 export/parse는 기존 paragraph/quote/heading, tufteClass/cite/id와 v1/v2 문서 계약을 보존한다. schema·format 버전·checked-in golden·원본 HTML/CSS를 변경하지 않았다.
- strict bridge·예제 저장/복구/JSON 출력, schema 기반 command/구조 검사/메뉴 상태를 경계에 연결했다. raw runtime JSON은 내부 snapshot이며 canonical 저장 API와 다르다는 점을 README에 명시했다.
- 기존 저장 테스트는 raw runtime 이름이 아닌 canonical 문서를 비교하도록 변경했다. 전체 필드·자산·ID·입력 불변성·거부 원자성 assertions와 golden 비교는 유지한다.
- 새 회귀는 core factory/transform 등록, runtime type 고유성, 세 metadata 보존, v1/v2 저장 왕복, detached export, 잘못된 metadata의 무변경 거부를 검사한다.
- 노트 DOM/노트 발행 parity와 실제 기본 편집·목록·섹션·복구·발행 browser가 통과했다. E114 titleId v1→v2→JSON 저장→재열기 회귀도 실제 실행 통과했다.

## 재실행 과정의 오류

1. 경계의 parser 입력 타입을 너무 좁게 선언해 validated 문서/unknown 복구 입력에서 TS2345가 발생했다. unknown root 검사 후 파싱하도록 수정하고 최종 build/typecheck 통과. 실패 build의 산출물로 browser를 시작하지 않았다.
2. persisted JSON에는 없는 own undefined 속성이 deep equality에 나타났다. canonical export를 JSON snapshot으로 정의해 disk와 같은 표현을 사용했다. 알 수 없는 정의된 필드를 삭제하는 처리는 하지 않았다.
3. dimensions의 부분일치 불러오기 selector를 exact로 수정하고 실제 변경·저장·복구까지 재실행 통과.
4. 공식 helper가 HTML에서 읽지 않은 root 기본 textFormat0/textStyle 빈 값을 추가해 Lexical0.52의 생략 표현과 충돌했다. helper의 인위적 두 기본값만 제거했다. **일반 입력에서 Lexical이 정규화하는 필드를 무조건 허용하는 것으로 strict bridge를 완화하지 않았다.** 모든9섹션/60블록/7노트 콘텐츠와 metadata 검사는 유지.
5. 전체 React 테스트는 닫힌 details를 열고 JSON을 읽도록 수정했다. boolean open 속성은 빈 문자열 truthiness가 아니라 존재 여부를 사용한다.
6. HTTP subprocess는 기본 시스템 Python의 uvicorn 부재로 실패했다. RECOVERY_PYTHON을 pytest와 동일한 기존 venv로 지정해 재실행 통과했다. 전역 설치/의존성 변경 없음.
7. 초안 patch의 잘못된 헤더/상대 경로는 미적용 거부됐으며 실제 컨텍스트/절대 경로 확인 후 적용했다.

## 남은5개와 다음 순서

- **E123 React 전체 문서 restore:** 실제 JSON 비교에서 sn-in-his-later-books sidenote에 textFormat2가 추가된다. 콘텐츠 삭제가 확인된 것은 아니지만 정확한 저장 동등성 실패다. headless 저장 왕복과 구분하여 최소 React 재현으로 최초 쓰기 지점을 찾아야 한다. 현재 테스트는 첫 restore 비교에서 실패해 해당 전체 문서의 뒤쪽 Undo/Redo/저장/재로드 assertions에는 도달하지 못한다.
- **E120 iframe:** 전체 headless9섹션 load→v2 export→저장→재열기는 통과한 뒤 발행 iframe-wrapper 검사에서 실패한다. renderer는 figure.tufte-embed+svg, 수락은 figure.iframe-wrapper+단일 iframe이다. Figures와 visual도 동일한 구조 차이로 실패. full visual pixel/geometry 비교는 사전 구조 gate 이후 단계라 통과 수치가 없다.
- **자산 등록:** 문서 이미지 자산 등록 버튼이 없어 실패한다. A0–A8 확장은 보류 결정을 유지했고 기능을 추가하거나 테스트를 skip하지 않았다.
- 다음 순서: E123 최소 재현·상태 보존 수정 → E120 구조·responsive·안전 iframe 속성 정리 → 세 전체 문서/시각 및 전체34파일 재검증. E1/E2/E3 전체 완료로 표시하지 않는다.

## 브라우저 파일별 최종 판정

| 파일 | 판정 | 설명 |
| --- | --- | --- |
| all-nodes-browser.mjs | 통과 |  |
| contextual-ui-browser.mjs | 통과 |  |
| definition-pairs-browser.mjs | 통과 |  |
| font-proof-browser.mjs | 통과 |  |
| full-page-pixel-parity-browser.mjs | 통과 |  |
| inline-span-browser.mjs | 통과 |  |
| layout-browser.mjs | 통과 |  |
| list-kind-browser.mjs | 통과 |  |
| managed-note-assets-browser.mjs | 실패 | 문서 이미지 자산 등록 버튼 미구현(확장 보류) |
| note-browser.mjs | 통과 |  |
| note-dom-browser.mjs | 통과 |  |
| note-editing-browser.mjs | 통과 |  |
| note-export-parity-browser.mjs | 통과 |  |
| note-image-chooser-browser.mjs | 통과 |  |
| note-image-dimensions-browser.mjs | 통과 | exact selector 수정 후 재실행 통과 |
| publication-browser.mjs | 통과 |  |
| recovery-browser.mjs | 통과 |  |
| section-commands-browser.mjs | 통과 |  |
| server-browser.mjs | 통과 |  |
| text-format-browser.mjs | 통과 |  |
| upstream-dom-browser.mjs | 통과 |  |
| upstream-full-document-editor-browser.mjs | 실패 | React restore 후 sn-in-his-later-books에 textFormat:2 추가(E123) |
| upstream-full-document-roundtrip-browser.mjs | 실패 | v1/v2 저장·재열기 통과 후 iframe-wrapper 개수0(E120) |
| upstream-full-document-visual-browser.mjs | 실패 | Modernized published iframe/snippet changed; pixel 미도달(E120) |
| upstream-full-page-baseline-browser.mjs | 통과 |  |
| upstream-geometry-browser.mjs | 통과 |  |
| upstream-newthought-sidenote-browser.mjs | 통과 |  |
| upstream-same-content-epigraphs-browser.mjs | 통과 |  |
| upstream-same-content-figures-browser.mjs | 실패 | 발행 보조 svg가 공식 구조 수락과 불일치(E120) |
| upstream-same-content-final-sections-browser.mjs | 통과 |  |
| upstream-same-content-fundamentals-browser.mjs | 통과 |  |
| upstream-same-content-getting-started-browser.mjs | 통과 |  |
| upstream-same-content-opening-browser.mjs | 통과 |  |
| upstream-same-content-sidenotes-browser.mjs | 통과 |  |

모든 파일 독립 실행. 진단용 외부 제한60초와 종료 유예3초를 두었지만 최종 timeout은 없다. dimensions는 selector 수정 후, 전체3파일은 fixture/details 보완 후 다시 실행했다. pixel 비교기 self-test의 통과는 공식 전체 페이지 pixel parity 통과가 아니다.

## 환경과 명령

Node24.19.0, pnpm11.25.0, TypeScript6.0.2, Lexical0.52.0, Playwright1.51.1/Chromium134. 이전 frozen 설치/무결성 확인된 원본9개 시각 자산을 재사용했고 lockfile·바이너리 자산·폰트 정책 변경 없음.

최종 pnpm check → pnpm package:check를 순차 실행해 모두 exit0 회수했다. 성공 build 후34개 browser를 실행했으며 product 소스는 browser 실행 중 변경하지 않았다. 후속 최종 check/package는 동일 제품 코드에 추가된 회귀 assertion까지 포함해 다시 통과했다. 마지막 테스트 변경 파일의 node --check와 git diff --check도 통과.

Python: /tmp/tufte-recheck-python/bin/python -m pytest -q apps/recovery-server/tests. HTTP: RECOVERY_PYTHON=/tmp/tufte-recheck-python/bin/python node tests/recovery-python-http.mjs.

상세 로컬 로그: /tmp/tufte-registry-check-final.log, /tmp/tufte-registry-package.log, /tmp/tufte-registry-browser-*.log, /tmp/tufte-registry-rerun-*.log, /tmp/tufte-registry-editor-final.log, /tmp/tufte-registry-dimensions-final.log, /tmp/tufte-registry-python.log, /tmp/tufte-registry-http-final.log. 파일별 [JSON 결과](verification/node-registry-20261023.json)를 함께 보존한다.

## 오류·체크리스트 점검

E117/E114/E118의 해결 범위를 갱신하고 E121–E124/M111–M113을 기록했다. E120/E123 및 자산 미완료는 유지한다. 다음 점검은 E123 최소 재현 또는 iframe DOM 수정 시작/종료 시점. CI는 계속 생략한다.
