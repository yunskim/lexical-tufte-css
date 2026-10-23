# concrete note 이전 후 Work 재검증 — 2026-10-19

최종 로컬 검증은 모두 통과했다. `pnpm verify:batch` 69단계(단위 파일 39개·브라우저 파일 22개 포함), JS 단위 assertion 339개, 별도 Python pytest 16개 모두 실패·skip 0이다. CI는 사용자 지시대로 생략했다. 전체 Tufte 기능 또는 원본 전체 페이지의 시각 동등성 완료 판정은 아니다.

대상: `test/upstream-full-page-baseline-20261019`, 시작 commit `c4f0411039c733331425d349bf7668f49fb22ff2`. 이 보고서와 후속 테스트 수정 코드를 함께 담은 commit이 최종 검증 결과다. 이전 `c0a29b0`의 65/85 단위·16/5 브라우저 결과는 역사 기록이다.

## 검토와 수정

최근 변경으로 concrete 노트 생성기·서버 v1/v2 fixture·all-node golden·기존 테스트 API가 이전됐다. 반복 그림 주석 삽입 순서 수정과 Lexical HTML export의 newthought/sidenote split-parent 처리, 같은 문서의 6가지 노트 HTML 비교 및 독립 일괄 runner가 추가됐다. 이 변경을 포함해 검증했다. 구형 `tufte-note` 호환/migration은 후속 사용자 결정에 따라 도입하지 않았고, 구형 노드 명시적 거부 및 유효한 현행 노드의 저장 envelope v1→v2 검증을 유지했다.

첫 일괄 실행은 69단계 중 68 통과·1 실패였다. render.test.mjs의 28 assertion 중 2개가 제거된 `tufte-pre-wrap` 래퍼를 기대해 실패했다. 일반 텍스트의 래퍼 부재·이스케이프된 본문, 개별 s/u/mark와 조합의 정확한 내용·중첩 순서로 기대값을 고쳤다. inline style 금지 regex의 이중 escape도 바로잡았다. renderer 제품 코드는 수정하지 않았다. 집중 재실행 28/28 통과 후 전체 batch를 다시 실행해 69/69 통과했다.

registry는 현재 34종이므로 browser와 구조 검사 설명의 고정된 33종 문구를 제거했다. 해당 두 파일을 추가 실행해 통과했으며 중복 실행은 아래 합계에 더하지 않았다. 오류 E114–E116 및 대책 M105/M106을 기록했다.

## 실행 환경 및 명령

Node 24.19.0, pnpm 11.25.0, TypeScript 6.0.2, Lexical 0.52.0, Playwright 1.51.1, Chromium 134.0.6998.35, Python 3.12. frozen install로 lockfile 변경 없음. Python은 별도 venv에 `apps/recovery-server/test-constraints.txt`를 적용해 `apps/recovery-server[test]`를 editable 설치했다.

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
# 준비한 Python venv 실행 파일을 지정한다.
RECOVERY_PYTHON=<test-venv>/bin/python pnpm verify:batch
<test-venv>/bin/python -m pytest apps/recovery-server/tests -q
```

Chromium/FFMPEG의 첫 CDN ZIP 오류는 설치기 공식 fallback으로 해결됐고 설치 최종 exit 0을 확인했다. Vite의 >500kB chunk 경고와 Python Starlette TestClient의 httpx 지원 deprecation 경고 1개는 남는다. 경고를 실패나 skip으로 집계하지 않았다.

## 최종 결과

| 검사 | 통과 | 실패 | 건너뜀/차단 |
|---|---:|---:|---|
| frozen install / lint / inventory / font / build / typecheck | 6단계 | 0 | 0 |
| document 단위 (10파일) | 49 | 0 | 0 |
| render 단위 (5파일) | 45 | 0 | 0 |
| blog 단위 (7파일) | 34 | 0 | 0 |
| lexical 단위 (17파일) | 211 | 0 | 0 |
| JS 단위 합계 (39파일) | 339 | 0 | 0 |
| browser (아래 22파일) | 22 | 0 | 0 |
| package:check | 통과 | 0 | 0 |
| 실제 TypeScript→Python HTTP→SQLite | 통과 | 0 | 0 |
| 별도 Python pytest | 16 | 0 | 0 |
| CI | — | — | 지시대로 생략 |

69는 assertion 수가 아니라 `6선행 + 39단위파일 + 22브라우저파일 + package + HTTP`의 합이다. Python pytest 16개는 batch 바깥에서 실행했다. node:test import 실패·취소·todo·skip는 없다. package 검사는 4개 tarball의 LICENSE/notices/OFL, JS 실제 소비, 선언 타입 소비, editor 왕복·renderer/blog·SQL exports까지 도달해 통과했다. 브라우저 파일 안의 시나리오와 단위 assertion을 합쳐 하나의 테스트 수로 부풀리지 않는다.

파일별 단계 결과 및 단위 집계는 [기계 판독 결과](verification/note-parity-20261019.json)에 기록했다. 각 테스트 파일을 독립 실행했으며 build/typecheck를 회수한 뒤 브라우저를 순차 실행했다. 브라우저 실행 중 rebuild하지 않았다.

## 브라우저별 결과

| tests/ 파일 (.mjs) | 결과 | 주요 범위 |
|---|---|---|
| all-nodes-browser | 통과 | 현행 golden, 편집·history·저장/재개 |
| contextual-ui-browser | 통과 | 선택·블록 메뉴·focus·undo·375px |
| definition-pairs-browser | 통과 | 정의 쌍 이동/삭제·거부·저장/재개 |
| font-proof-browser | 통과 | proof subset·실제 glyph·지연 교체·fallback |
| inline-span-browser | 통과 | span 서식·undo/redo·왕복 |
| layout-browser | 통과 | 캡션·표·직접 자식 발행·5개 폭 |
| list-kind-browser | 통과 | 목록 변환·indent/outdent·history·저장 |
| note-browser | 통과 | 실제 노트 존재와 제어 구조 검사 포함 |
| note-dom-browser | 통과 | 양 종류 label/input/span·모바일 toggle 왕복 |
| note-editing-browser | 통과 | 17개 실제 편집 시나리오 |
| note-export-parity-browser | 통과 | 같은 문서의 Lexical HTML/발행 노트 6가지 비교 |
| publication-browser | 통과 | 실제 편집·순수 발행·CSP·5개 폭 |
| recovery-browser | 통과 | 저장·복구 회귀 |
| section-commands-browser | 통과 | 섹션·h2/h3·undo/redo·재개 |
| server-browser | 통과 | 현행 서버 fixture 및 editor/publication |
| text-format-browser | 통과 | 실제 서식 선택·발행·왕복 |
| upstream-dom-browser | 통과 | 원본 inventory와 별도 발행 구조 대조 |
| upstream-full-page-baseline-browser | 통과 | 원본 전체 inventory·6개 폭 |
| upstream-geometry-browser | 통과 | 자체 reference fixture와 geometry 대조 |
| upstream-newthought-sidenote-browser | 통과 | 고정 원본 split-parent DOM, ID namespace 제외 |
| upstream-same-content-getting-started-browser | 통과 | 동일 콘텐츠 heading ID/link/code/pre·DOM |
| upstream-same-content-opening-browser | 통과 | 동일 콘텐츠 text/link·DOM |

## 해결 판정 및 남은 범위

- E109: 현행 fixture·golden·삭제된 API 호출 이전은 전체 회귀에서 검증됐다. 이전에 막혔던 Lexical 10개 파일, 서버·전체 노드·서식·upstream DOM/geometry, packed 소비 검사도 통과했다. 구형 내부 노드를 지원한다는 뜻은 아니다.
- E111: 노트 존재를 먼저 강제하는 selector 수정이 실제 browser에서 통과했다.
- E112: concrete API·버전 오류·replace 자식 보존 및 반복 before/after-image 삽입 순서가 단위·브라우저 회귀에서 통과했다.
- E113: 풍부한 sidenote, ordinary marginnote, figure marginnote, 인접 newthought/sidenote, 중간 텍스트가 있는 비결합, newthought/marginnote의 6개 HTML 비교가 통과했다. 생성 ID namespace를 제외하고 검사한 필드는 일치한다.
- E114: 두 오래된 wrapper 기대를 수정한 뒤 render 45개·전체 batch가 통과했다.

원본 full-page baseline은 1440/1024/761/760/759/375px에서 section9/note7/epigraph3/fullwidth figure2 등을 확인한다. 원본 전체를 Lexical로 재구성해 이미지·폰트까지 로딩한 전체 스크린샷/pixel 비교는 아니다. same-content DOM 검증은 opening/Getting Started와 별도 newthought 샘플에 한정된다. SECTION 직속 공백-only 들여쓰기 및 명시한 ID namespace 예외를 유지한다.

새 note-export-parity 검사는 노트 순서/종류/개수, label class·glyph·부모, checkbox와 ID 참조/인접성, figure 위치, text, strong 존재, 링크 href/text, 이미지 src/alt를 비교한다. 이 필드 추출 비교가 모든 하위 요소·속성·스타일의 완전한 DOM 동일성을 입증하는 것은 아니다. 6개 노트의 선택된 의미 필드 및 제어 구조 검증으로 범위를 한정한다.

font-proof는 원본 OTF 직접 비교 옵션 없이 고정 metrics를 사용했다. 기본 환경에는 한글 시스템 fallback이 없어 실제 fallback이 DejaVu로 보고됐다. 이 실행으로 production 전체 한글 coverage, 배포 OS별 fallback 가독성, native OS IME 또는 Firefox/WebKit 검증을 완료하지 않는다. 제품 P2–P8/F표 전체 완료로 확대하지 않는다.

## 체크리스트

- [x] 최신 브랜치 및 변경·오류/대책 문서 검토.
- [x] 의존성·Chromium·Python 설치와 수정 mjs 구문 검사.
- [x] 첫 batch 전수 실행, 2개 실패 원인 확인.
- [x] 기대 계약과 진단 문구 수정 및 집중 재실행.
- [x] 최종 batch 69/69·단위339·browser22·package/HTTP 통과 확인.
- [x] 별도 Python16 통과 확인.
- [x] 오류·대책 완료 점검과 최신 진행 기록 갱신.
- [ ] 전체 upstream 콘텐츠의 Lexical 재구성·편집 후 발행·시각 parity와 남은 제품 기능 검증은 별도 계획대로 진행.
