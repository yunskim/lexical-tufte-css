# main 실제 실행 결과 — 2026-10-23

전체 통과가 아니다. 수정 후 `pnpm check`의 단위 테스트 403개, 5개 tarball 소비, Python16개, 실제 HTTP/SQLite 연동은 통과했다. 브라우저 34개를 각각 실행했으며 최종 19통과·15실패다. 실패는 main에 없는 자산 UI와 이관 테스트가 요구하는 schema/renderer 계약 및 visual helper 누락에 집중된다. CI는 생략했다.

대상은 `main`의 `c081546ee4275129b9f41a1a3012e61371d57271`이다. 수정·결과는 `test/main-verification-20261023`에 보존한다. 수정 전 main 자체가 통과했다고 주장하지 않으며, 기존 `test/upstream-full-page-baseline-20261019`의 통과 수와 합치지 않는다.

## 확인한 변경과 수정

- main에 들어온 concrete note·HostLink/HostAsset·editor-ports, publication service/SQLite adapter, restore/CAS 및 선별 이관된 원본 비교 테스트를 확인했다. AGENTS와 오류·대책/브랜치 현황/발행 복원 사전 점검 문서를 읽었다.
- 최초 frozen install은 editor-ports TypeScript importer 누락으로 실패했다. lockfile diff를 editor-ports importer와 lexical의 workspace link로 제한해 확인하고 frozen 재실행을 통과했다.
- 빌드 실패 2곳 수정: InlineImageNode.exportJSON은 한 번 읽은 node로 optional HostAsset 타입을 좁혀 복제한다. SQLite publication commit은 async readState Promise 대신 잠금 내부 동기 head 조회를 사용한다.
- unit 테스트의 구형 note.kind/오류 문자열, host-link active editor 및 exportDOM(editor), undefined를 기본값으로 덮던 부정 fixture를 수정했다. TS parameter property를 strip-only로 읽던 blog 테스트는 compiled JS import로 바꿨다.
- Restore generation0의 입력 거부와 유효한 stale generation을 분리했다. snapshot 불변 trigger의 거부를 먼저 확인한 뒤 일회용 DB에서만 손상을 주입하여 checksum 검사에 도달하도록 고쳤다. 운영 trigger/SQL은 변경하지 않았다.
- editor-ports를 빠뜨린 독립 package 소비 검사를 5개 package로 확대하고 LICENSE/notices/OFL·prepack을 추가했다. 실제 JS·선언·SQL 및 editor 왕복 소비를 확인했다.
- note-dom-browser는 wrapper 대신 input의 label/payload 인접성·부모·ID·고유성·두 종류·모바일 열기/닫기를 검사한다. accessible-name의 과거 기대를 main 공통 값으로 맞춘 note-export-parity는 이후 실제 split-parent 불일치에서 계속 실패했다.

제품 renderer/schema/UI를 작업 브랜치 것으로 통째로 교체하거나 비교 assertion을 완화하지 않았다. 잔여 기능 차이는 아래 실패로 유지한다. E105–E110/M097–M101을 기록했다.

## 환경 및 실행 순서

Node24.19.0, pnpm11.25.0, TypeScript6.0.2, Lexical0.52.0, Playwright1.51.1, Chromium134.0.6998.35, Python3.12. 테스트 venv에는 `apps/recovery-server/test-constraints.txt`를 적용해 editable test 의존성을 설치했다.

설치 뒤 audit/lint/inventory/font/build/typecheck를 수행했다. 빌드 실패를 수정하고 성공을 회수한 뒤 브라우저를 실행했다. 패키지별 테스트와 모든 `tests/*-browser.mjs`를 독립 실행해 첫 실패 뒤 파일도 확인했다. 브라우저 실행 중 dist rebuild는 하지 않았다. 수정한 테스트는 다시 실행하고 마지막에 `pnpm check && pnpm package:check`를 실행했다.

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm check
# 각 browser 파일을 독립 실행하며 exit code를 수집한다.
for file in tests/*-browser.mjs; do node "$file"; done
pnpm package:check
<test-venv>/bin/python -m pytest apps/recovery-server/tests -q
RECOVERY_PYTHON=<test-venv>/bin/python pnpm test:recovery-python
```

## 최종 결과

| 검사 | 통과 | 실패 | 건너뜀/차단 |
|---|---:|---:|---|
| frozen install (수정 후) | 통과 | 0 | 0 |
| audit:notes | active173파일 통과 | 0 | 0 |
| lint / CSS inventory / font proof 검사 | 통과 | 0 | 0 |
| build / typecheck / pnpm check | 통과 | 0 | 0 |
| document unit | 56 | 0 | 0 |
| render unit | 44 | 0 | 0 |
| blog unit | 77 | 0 | 0 |
| lexical unit | 224 | 0 | 0 |
| editor-ports unit | 2 | 0 | 0 |
| unit 합계 | 403 | 0 | 0 |
| browser 파일 | 19 | 15 | 파일 skip0; 실패 뒤 assertion은 차단될 수 있음 |
| package 소비 | 5개 tarball 통과 | 0 | 선언 소비까지 실행 |
| Python pytest | 16 | 0 | 0 |
| TypeScript→Python HTTP→SQLite | 통과 | 0 | 0 |
| CI | — | — | 사용자 지시로 생략 |

기계 판독 가능한 파일별 판정은 [실행 결과 JSON](verification/main-20261023.json)에 보존한다. 단위 수·브라우저 파일 수·브라우저 내부 시나리오 수를 합쳐 하나의 테스트 수로 보고하지 않는다. 최초 import 실패한 blog 2개 파일도 compiled JS로 바꾼 뒤 내부 테스트 전체가 실행됐다. 최종 unit import 실패/skip/cancel/todo는 0이다.

경고: Vite chunk >500kB, Starlette TestClient의 httpx 지원 deprecation 1개. proof font 실행은 고정 metrics·기본 환경 fallback 검사이며 Adobe 원본 직접 비교 옵션/배포 OS의 한글 fallback 가독성 전체를 검증하지 않았다.

## 브라우저별 판정

| 파일 (tests/, .mjs) | 결과 | 확인 내용/실패 원인 |
|---|---|---|
| all-nodes-browser | 통과 | HostLink 포함 현행 golden·편집/저장/재개 |
| contextual-ui-browser | 통과 | 선택·메뉴·focus·모바일 bounds |
| definition-pairs-browser | 통과 | 정의 쌍 명령·history |
| font-proof-browser | 통과 | 고정 proof glyph/지연 교체/fallback |
| full-page-pixel-parity-browser | 통과 | 단색 pixel 비교기의 자체 회귀 |
| inline-span-browser | 통과 | 인라인 span 왕복 |
| layout-browser | 통과 | 5개 폭의 자체 reference geometry |
| list-kind-browser | 통과 | 목록 변환·indent/history |
| managed-note-assets-browser | 실패 | 문서 이미지 자산 등록 버튼이 main에 없음 |
| note-browser | 통과 | 실제 노트 편집·서식·왕복 |
| note-dom-browser | 통과 | 수정 후 형제 구조·모바일 toggle 왕복 |
| note-editing-browser | 통과 | 실제 편집 시나리오 |
| note-export-parity-browser | 실패 | publication에 newthought split-parent 배치 없음 |
| note-image-chooser-browser | 실패 | 노트 이미지 선택 UI 없음 |
| note-image-dimensions-browser | 실패 | 노트 이미지 크기 수정 UI 없음 |
| publication-browser | 통과 | 현재 발행 profile·CSP·자체 fixture |
| recovery-browser | 통과 | 복구 회귀 |
| section-commands-browser | 통과 | 섹션·제목·history |
| server-browser | 통과 | 현재 서버 fixture·발행 |
| text-format-browser | 통과 | 서식·왕복 |
| upstream-dom-browser | 통과 | 기본 원본 inventory/별도 fixture 구조 smoke |
| upstream-full-document-editor-browser | 실패 | 재구성 fixture를 불러온 완료 상태에 도달 못함 |
| upstream-full-document-roundtrip-browser | 실패 | titleId/heading.id/quote.cite/tufteClass, figure 순서, 상대 이미지 URL 거부 |
| upstream-full-document-visual-browser | 실패 | 필수 visual asset helper import 누락 |
| upstream-full-page-baseline-browser | 통과 | 원본 inventory 및 6개 폭 |
| upstream-geometry-browser | 통과 | 별도 reference fixture geometry |
| upstream-newthought-sidenote-browser | 실패 | 발행 결과의 직접 checkbox/split-parent 위치 불일치 |
| upstream-same-content-epigraphs-browser | 실패 | heading.id 미지원 |
| upstream-same-content-figures-browser | 실패 | heading.id/figure image-first/상대 이미지 URL |
| upstream-same-content-final-sections-browser | 실패 | heading.id/상대 이미지 URL |
| upstream-same-content-fundamentals-browser | 실패 | heading.id/quote.cite/tufteClass 미지원 |
| upstream-same-content-getting-started-browser | 실패 | heading.id 미지원 |
| upstream-same-content-opening-browser | 실패 | 추가 tufte-pre-wrap span 때문에 실제 DOM 다름 |
| upstream-same-content-sidenotes-browser | 실패 | heading.id 미지원 |

첫 browser 실행은 18통과/16실패였다. note-dom의 구형 selector를 고쳐 재실행 통과했으므로 최종 19/15다. note-export-parity는 accessible-name 기대를 고친 뒤 별도 실행에서도 제품 구조 차이로 실패했다. 나머지 실패 파일은 입력/API/helper가 바뀌지 않았으므로 의미 없는 반복 재시도는 하지 않았다.

## 미해결 문제와 다음 체크리스트

main과 작업 브랜치는 양방향 분기돼 있다. 특히 `titleId`, heading ID·quote cite·paragraph class 보존, 상대 자산 URL 정책, figure note 순서, wrapper 없는 원본 지향 발행 및 자산 UI는 함께 정합성을 맞춰야 한다. 실패를 숨기기 위해 validator를 완화하거나 테스트 버튼을 mock으로 만들지 않았다. 테스트 파일을 복원한 사실만으로 런타임 통합 완료로 판정할 수 없다.

visual 검사는 `scripts/upstream-visual-assets.mjs`가 main에 없어 import에서 종료됐다. 고정 manifest·무결성 검사·명시적 acquisition 경로도 함께 이관/검토하고 자산을 준비해야 한다. pixel comparator 자체 검사와 원본 inventory의 통과는 공식 원본 전체 시각/pixel 동등성 통과가 아니다. `UPSTREAM_FULL_DOCUMENT`의 선택적 외부 문서 입력 경로는 이번 기본 실행에서 사용하지 않았다.

- [x] main 최신 SHA·작업 규약·이관 현황 확인.
- [x] 설치 및 빌드 장애 수정, frozen/typecheck 재실행.
- [x] 모든 package unit 및 browser 파일을 독립 실행.
- [x] 의미가 확인된 테스트/소비 환경 오류 수정 후 재실행.
- [x] 최종 check403, package5, Python16 및 HTTP 통과 확인.
- [x] browser15개 실패와 차단 범위, 오류·재발 방지 대책 기록.
- [ ] HostLink/HostAsset 계약을 보존하며 원본 재구성 필드·figure 순서·URL 정책을 schema/registry/bridge/renderer에 선별 반영.
- [ ] 일반 텍스트·노트/newthought 발행 구조를 원본 및 실제 Lexical HTML과 맞춘 뒤 엄격한 DOM 비교 재실행.
- [ ] 관리 자산 등록·이미지 선택·크기 수정 UI와 persistence 경로의 필요한 구현을 선별 이관.
- [ ] visual helper/manifest/고정 자산 acquisition을 갖춘 뒤 전체 문서 편집/왕복/시각 비교 실행.
- [ ] 15개 실패 파일과 이후 드러나는 assertion을 해결한 뒤 전체 재검증.

현재 단계는 **기본 빌드·unit·배포 package 소비 수리 및 전체 테스트 결과 확보**까지다. 공식 예제 전체 수락, 전체 기능·P2–P8 완료 또는 배포 가능 상태로 확대하지 않는다.
