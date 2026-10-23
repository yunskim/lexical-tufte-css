# 브라우저 보완 브랜치 재검증 — 2026-10-23

## 판정

**전체 통과 아님.** 기준 `383d25cff185c7a56a21a856d042780ccc78bf30`, 브랜치 `fix/main-browser-parity-20261023`. main과 과거 검증 브랜치는 변경하지 않는다. CI·배포·패키지 발행은 실행하지 않았다. 아래는 기준 코드에 이 보고서의 수정 사항을 적용한 실행 결과다.

| 범위 | 통과 | 실패/제한 | 건너뜀 |
| --- | --- | --- | --- |
| frozen 설치, static audit/lint/inventory/font, build/typecheck | 통과 | 최초 TS18046 수정 후 통과 | 없음 |
| document/render/blog/editor-ports | 185 | 0 | 0 |
| Lexical 파일별 node:test runner | 62 | 77실패 + 2취소(파일 timeout) | 0 |
| 브라우저 파일 | 12 | 20실패 + 2시간초과 | 0 |
| Python pytest | 16 | 0 (deprecation warning1) | 0 |
| 실제 TS→Python HTTP→SQLite | 통과 | 0 | 없음 |
| tarball 소비 | 라이선스 검사 단계까지 진행 | packed JS 15초 timeout, 선언 검사 미도달 | 후속 미도달 |
| 공식 시각 자산 | 9개 무결성 확인 | 0 | 없음 |
| 공식 전체 페이지 pixel parity | 미통과 | iframe/snippet 사전 검증 실패로 pixel 미도달 | 후속 미도달 |

집계 정정: 중간 안내의 browser13/19는 수동 합산 오류이며, 파일별 결과를 재계산한 **12/20/2**가 최종 정본이다. 테스트 파일 수와 내부 assertion 수를 합산하지 않는다. 두 시간 초과 단위 파일에 선언된 전체 테스트가 실행됐다고 주장하지 않는다. 과거403 unit/19 browser 통과는 다른 tree의 결과다.

## 검토 및 수정

- 최근 E1 titleId bridge/heading anchor 보완, paragraph/quote subclass 교체, label+input+span/split-parent renderer 및 UI 초안을 검토했다.
- `tests/note-dom-browser.mjs`는 이미 wrapper 가정이 제거돼 있다. 이번에는 .editor 대기에서 실패하여 DOM assertion에 도달하지 못했다. 재수정/통과 처리하지 않았다.
- `validate.ts`: unknown 객체의 titleId를 closure 밖 상수로 캡처해 TS18046 수정. 전체 build/typecheck와 document57 통과. E115 duplicate-heading/title-conflict 회귀 포함.
- fundamentals/sidenotes의 세 접근성 기대값을 기존 공통 계약 `Toggle marginnote`에 맞추고 두 browser 파일 재실행 통과. DOM/mobile/이름 수락 조건 유지.
- packed consumer에 JS15초/tsc30초 제한을 추가. 재실행에서 JS ETIMEDOUT을 확인했으며 근본 기능 수정으로 해석하지 않는다.

## 미해결 원인과 다음 순서

1. **E117 등록 충돌**: paragraph/quote subclass와 기본 klass가 같은 getType을 쓰고 trailing replacement가 registry를 덮어쓴다. heading-id 단위 테스트에서 기본 문단 factory 생성 시 klass mismatch를 재현했다. 소스 검토상 withKlass 해석의 자기 순환 가능성도 있지만 모든 timeout의 직접 스택 증거는 없다.
2. 기본 factory/transform/JSON wire 호환성을 보존하는 등록 설계를 수정하고 기본 문단 생성→command→v1/v2 왕복→React mount부터 검증해야 한다. schema를 임의 변경하거나 strict assertion/node_modules를 우회하지 않았다. E114 titleId bridge 파일은 timeout으로 미검증.
3. **E120 iframe 차이**: renderer의 figure.tufte-embed+svg가 공식 계약의 figure.iframe-wrapper+단일 iframe과 다르다. Figures는 svg 금지 assertion, 전체 visual은 `Modernized published iframe/snippet changed`에서 실패. 픽셀 차이 수치는 생성되지 않았다.
4. 자산 UI 테스트도 실행했지만 편집기 초기화 선행 실패로 자산 기능을 검증하지 못했다. 자산 확대 A0–A8은 우선순위 문서에 따라 보류 유지. 누락 기능을 skip/삭제하지 않는다.
5. E117 수정 후 전체34 browser/package 재실행, 그 다음 E120 수정/정확한 전체 페이지 geometry·pixel 검증. E1/E2/E3 완료 게이트는 열리지 않았다.

## 재현 환경과 절차

Node24.19.0, pnpm11.25.0, TypeScript6.0.2, Lexical0.52.0, Playwright1.51.1/Chromium134. frozen 설치로 lockfile 변경 없음. Python은 별도 venv와 저장소 constraints의 editable install 사용.

- `pnpm install --frozen-lockfile`, Chromium 설치, `node scripts/sync-upstream-visual-assets.mjs` 실행.
- 원본 commit `b5d7b7bbe5ce9c4c50fcfad4f19ee3646cfd7ae1`의 PNG5/ET Book WOFF4를 byte-size/Git blob SHA로 검증. gitignored 바이너리만 준비, 원본 fixture 변조 없음.
- 최초 `pnpm check` build 실패 수정 후 다시 실행: 모든 정적 검사/build/typecheck 및 비-Lexical185개 완료. Lexical 정체로 중단(exit130). **root check 완료 통과 아님.**
- `timeout 15s node --test packages/lexical/test/<file>`로 16파일 독립 회수. 두 파일 timeout.
- `tests/*-browser.mjs` 34파일을 순차 독립 실행. 장시간 대기 발견 후 남은 파일에는 `timeout -k 3s 40s` 적용. 두 구형 이름 수정 파일은 다시 실행. 빌드 중 browser 병행 없음.
- `pnpm package:check`의 build는 통과했지만 consumer 정체로 중단. timeout guard 추가 후 `node scripts/pack-and-check.mjs` 재실행은 ETIMEDOUT(exit1).
- Python pytest16 통과(Starlette/httpx deprecation 경고1), `node tests/recovery-python-http.mjs` 실제 HTTP/SQLite save/read/list/checksum/CAS/access/CSRF/delete 통과.
- syntax 검사 통과. 한글 폰트 기본 proof는 통과하지만 별도 원본 OTF/한국어 시스템 fallback 환경 재검증을 했다는 의미는 아니다.

로컬 상세 로그: `/tmp/tufte-recheck-*.log`. 핵심 실패 원문/판정은 E116–E120에 보존하며 파일별 기계 판독 결과는 [JSON](verification/browser-remediation-20261023.json). 스크린샷은 `/tmp/tufte-recheck-visual`의 진단 산출물이며 parity 증명이 아니다.

## 브라우저 파일별 최종 결과

| 파일 | 판정 | 종료 코드 |
| --- | --- | --- |
| all-nodes-browser.mjs | 실패 | 1 |
| contextual-ui-browser.mjs | 실패 | 1 |
| definition-pairs-browser.mjs | 실패 | 1 |
| font-proof-browser.mjs | 통과 | 0 |
| full-page-pixel-parity-browser.mjs | 통과 | 0 |
| inline-span-browser.mjs | 실패 | 1 |
| layout-browser.mjs | 실패 | 1 |
| list-kind-browser.mjs | 실패 | 1 |
| managed-note-assets-browser.mjs | 실패 | 1 |
| note-browser.mjs | 실패 | 1 |
| note-dom-browser.mjs | 실패 | 1 |
| note-editing-browser.mjs | 실패 | 1 |
| note-export-parity-browser.mjs | 시간 초과 | 124 |
| note-image-chooser-browser.mjs | 실패 | 1 |
| note-image-dimensions-browser.mjs | 실패 | 1 |
| publication-browser.mjs | 실패 | 1 |
| recovery-browser.mjs | 실패 | 1 |
| section-commands-browser.mjs | 실패 | 1 |
| server-browser.mjs | 실패 | 1 |
| text-format-browser.mjs | 실패 | 1 |
| upstream-dom-browser.mjs | 통과 | 0 |
| upstream-full-document-editor-browser.mjs | 실패 | 1 |
| upstream-full-document-roundtrip-browser.mjs | 시간 초과 | 137 |
| upstream-full-document-visual-browser.mjs | 실패 | 1 |
| upstream-full-page-baseline-browser.mjs | 통과 | 0 |
| upstream-geometry-browser.mjs | 통과 | 0 |
| upstream-newthought-sidenote-browser.mjs | 통과 | 0 |
| upstream-same-content-epigraphs-browser.mjs | 통과 | 0 |
| upstream-same-content-figures-browser.mjs | 실패 | 1 |
| upstream-same-content-final-sections-browser.mjs | 통과 | 0 |
| upstream-same-content-fundamentals-browser.mjs | 통과 | 0 (수정 후 재실행) |
| upstream-same-content-getting-started-browser.mjs | 통과 | 0 |
| upstream-same-content-opening-browser.mjs | 통과 | 0 |
| upstream-same-content-sidenotes-browser.mjs | 통과 | 0 (수정 후 재실행) |

exit124는40초 timeout, exit137은 종료 유예 후 강제 종료다. full-page-pixel-parity는 비교기 자체 검사이고 공식 전체 페이지 성공이 아니다. upstream-dom은 독립 fixture smoke이지 동일 콘텐츠 전체 parity가 아니다.

## Lexical 단위 파일별 결과

| 파일 | 통과 | 실패 | 취소 |
| --- | --- | --- | --- |
| all-nodes.test.mjs | 0 | 0 | 1 |
| definition-commands.test.mjs | 0 | 10 | 0 |
| document-bridge.test.mjs | 0 | 0 | 1 |
| document-contract.test.mjs | 1 | 0 | 0 |
| figure-commands.test.mjs | 6 | 3 | 0 |
| heading-id.test.mjs | 2 | 1 | 0 |
| hostLink.test.mjs | 5 | 15 | 0 |
| inline-commands.test.mjs | 9 | 4 | 0 |
| layout.test.mjs | 2 | 0 | 0 |
| list-commands.test.mjs | 15 | 15 | 0 |
| nested-comparison.test.mjs | 2 | 0 | 0 |
| note.test.mjs | 15 | 0 | 0 |
| quotation-commands.test.mjs | 0 | 13 | 0 |
| section-commands.test.mjs | 0 | 13 | 0 |
| server-comparison.test.mjs | 2 | 0 | 0 |
| structure-recovery.test.mjs | 3 | 3 | 0 |

all-nodes/document-bridge는15초 timeout(exit124)이며 runner가 파일 항목1개씩 취소로 보고했다. 나머지14파일은 완료했고, 그중5파일 통과·9파일 실패. 총 runner141항목(62통과/77실패/2취소)이 모든 선언 assertion의 완료를 의미하지 않는다.

## 오류/대책 점검

E116/M107 해결, E119/M100/M110 재검증 통과. E117/M108과 E120/M110 미해결. E118/M109는 대기 제한 조치만 반영. 기존 E114/E115와 기록을 대조하고 E115만 실행 검증으로 갱신했다. 다음 정기 점검 시점은 등록 설계 수정 직후다. CI는 계속 생략한다.
