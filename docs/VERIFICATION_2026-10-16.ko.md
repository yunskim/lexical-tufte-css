# 다른 대화 반영분 통합 실행 검증 — 2026-10-16

**판정: 현재 구현분의 전체 로컬 검증 PASS. 프로젝트 전체 완료는 아님. CI 미사용.**

대상: yunskim/lexical-tufte main의 `d78f4559826e13bfcccbdfec4a238613ce096011` 및 이 보고서와 함께 반영한 수정. 다른 대화에서 누적된 migration/저장·백업/노드/렌더러의 정적 반영을 실제 실행으로 확인했다. 이 대화의 기존 P2.2 미반영 작업은 다른 worktree에 보존했으며 이 검증에 섞지 않았다.

## 환경과 결과

Node 24.19.0, pnpm 11.25.0, TypeScript 6.0.2, Lexical 0.52.0, Playwright 1.51.1 / Chromium headless shell 134.0.6998.35. Linux 실행 환경 기준이다. Node 22 및 다른 브라우저의 호환성 통과를 주장하지 않는다.

| 명령/범위 | 최종 결과 |
| --- | --- |
| pnpm install --frozen-lockfile | PASS; lockfile 변경 없음 |
| pnpm check | PASS; 정책 lint·CSS inventory 72규칙/2 media·typecheck·build·모든 단위/통합 테스트 |
| document 테스트 | 47/47 PASS; 실제 SQLite·CAS 경쟁/충돌·백업 원자 쓰기/복원 실패 주입 포함 |
| lexical 테스트 | 67/67 PASS; 실제 headless JSON 왕복·snapshot 소유권·v1/v2 로드/History reset·신규 노드 입력 계약 |
| render 테스트 | 26/26 PASS; typed serializer·escape·namespace·표 header·코드/이미지/embed·fail-closed |
| 단위/통합 합계 | **140/140 PASS, 실패0·skip0·todo0**; 17개 test 파일 |
| pnpm test:browser | **6개 실행 파일 전체 PASS**; 아래 범위 |
| git diff --check | PASS |
| CI | 실행/추가 없음 |

브라우저 실행 파일은 공식 고정 버전 설치기로 별도 설치했다. 첫 CDN의 잘못된 ZIP은 설치기의 공식 대체 경로로 복구됐다. 최초 launch 실패와 설치 성공을 제품 동작 검증과 구분한다(E045, 기존 E004).

## 실제 브라우저 검증

1. note-browser: 주석 삽입·진입/탈출·텍스트 서식/링크/그림·JSON 저장/복원.
2. note-editing-browser: 복사/잘라내기/ID·노트 삭제·분할/병합/이동·undo/redo·경계 키 입력·Chromium 한글 composition 확정/취소/되돌리기 15개 시나리오.
3. note-dom-browser: 편집 전용 DOM 미유출, label/input/payload 인접성, sidenote/marginnote 모바일 native 토글.
4. layout-browser: 실제 caption/cell 편집·JSON 복원, 독립 기준 HTML과 1440/761/760/759/375px의 직계 구조/폭/overflow 비교.
5. server-browser: 서버 렌더러와 Lexical export의 5개 폭 의미·geometry 비교, JS 없는 모바일 토글 및 여러 article의 namespace 격리. 실제 발행 CSS 포함.
6. publication-browser(신규): 실제 정의목록 term/출처 cite 편집 후 strict 문서 export. fullwidth/code/ImageQuilt/embed를 검증. 정상 로드한 자체 SVG의 natural size, pre>code 공백/tab/newline과 direction/alignment, 5가지 embed 비율(0.1/1/4:3/16:9/10)을 5개 폭에서 검사. **script-src none, style-src self인 실제 CSP HTTP 응답**과 외부 CSS만으로 통과. 인라인 style/script·편집 속성·문서 가로 넘침 없음.

publication 브라우저 harness는 별도 test editor에 신규 노드를 등록한다. 기본 examples/editor UI가 모든 새 노드를 이미 등록·작성할 수 있다는 뜻이 아니다. iframe 원격 네트워크는 차단하여 provider 재생과 로컬 비율/보안 속성 검증을 분리했다.

## 발견 및 수정

| 오류 | 실제 문제와 조치 |
| --- | --- |
| E042 | inspectStoredDocument의 미종결 문자열/중복 본문으로 빌드 실패 → descriptor guard와 버전 분기를 단일 함수로 복구 |
| E043 | unknown field를 unsupported version과 같은 코드로 기대한 테스트 → 입력별 정확한 진단 코드 검사 |
| E044 | 저장 JSON과 undefined optional 속성 있는 JS toJSON 객체 직접 비교, golden 누락 skip → JSON 저장 값 비교 및 실제 0.52.0 golden 생성/검토. 이후 누락은 항상 실패 |
| E045 | Playwright 실행 파일 부재 → 공식 headless shell 설치 후 실제 검증 |
| E046 | R06 namespace 변경 후 옛 ID selector/CSS 사용 → 의미 selector와 길이 접두사·고유 ID·실제 CSS 검사 |
| E047 | 새 test entry import 중 Vite 재탐색 reload → 전용 optimizeDeps entry |
| E048 | iframe 실제 비율8.4로 고정, body/fullwidth 폭 정책 무시 → CSP 안전 SVG spacer·외부 CSS로 비율 및 Tufte 폭 유지. Lexical export도 정렬 |
| E049 | 코드 DOM export가 pre만 생성 → pre>code와 정확한 원문·direction/alignment 보존 |

Lexical golden은 간단한 paragraph/ordered list의 실제 고정 런타임 출력이다. 기존 v2 envelope golden은 실제 import/export를 JSON 저장 값 기준으로 검사했다. 이로써 임의의 과거/미래 Lexical npm 버전 migration이 검증된 것은 아니다. 실제 등록 클래스에서 coverage 목록을 만들도록 오래된 테스트 목록도 수정했다.

오류/대책의 중복 ID는 이력을 삭제하지 않고 재배정했다: 후반 신규 노드 계약의 E026/E027/E028 → E039/E040/E041, 후반 M026 → M036. [ERROR_LOG](ERROR_LOG.md), [ERROR_PREVENTION](ERROR_PREVENTION.md) 참조.

## 완료 경계와 남은 작업

현재 범위에서 R01, R04, R06–R09, R12, R14의 구현/계약 검증을 확인했다. R04는 Chromium protocol 조합 및 현재 noteId/일반 링크 정책 범위이며 OS별 실제 IME 검증은 P6에 남는다. R03.a/b/c는 현행 format1 및 legacy envelope의 실행 증거를 확보했다. R03.d의 headless History reset은 통과했지만 React UI의 문서 교체→키보드 history 전체 경로는 후속이다.

다음 항목은 완료 처리하지 않는다.

- R02의 모든 노드별 golden/완전한 editor registry: 현재 왕복 하네스 등록은 33개 schema 중 32개, code-highlight 제외. 기본 편집 UI의 신규 노드 등록·작성 명령/속성 패널은 별도다.
- R05 무효 section/figure/table-layout 복구 UX/transform, R10 편집기 생성·수정·재열기·format 조합의 전체 입력 검증.
- R11 immutable 공개 snapshot·firstPublishedAt/publishedRevision 생명주기의 실제 blog 어댑터 구현. 이번 CAS/백업 테스트 통과가 전체 블로그 발행 완성을 뜻하지 않는다.
- R13 폰트 subset/자산 연결 및 배포 정책. 한글 본명조/본고딕 지정은 유지하며 실제 웹폰트 검증은 P4.
- 코드 language/highlight 메타데이터, managed inline image, figure 직접 marginnote, 표의 명시적 크기/고급 속성 등 현재 profile이 명시적으로 차단하는 발행 경로.
- P2.4 외부 HTML import 및 고정 DOM adapter 제한(E018), 다른 Lexical 버전 지원, P3–P7 및 F01–F22의 전체 제품 검증.
- 다른 브라우저·OS 실제 IME·스크린리더/접근성·provider iframe 재생·실제 폰트 로딩·npm 소비자 설치/운영 리허설.

W001 번들 경고는 남는다: editor JS 516.28kB, gzip161.82kB. 기준을 올리지 않았으며 P3/P6 분할·성능 검토 대상이다. 모든 기존 체크리스트와 F표를 통과로 바꾸지 않는다.
