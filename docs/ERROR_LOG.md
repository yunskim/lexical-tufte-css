# 에러 기록

## 2026-10-19 full-page baseline 브랜치 검증

대상 `test/upstream-full-page-baseline-20261019`, 기준 `851ceddb7b363beb63a39784848441965960f2e6`. 아래 판정은 이 브랜치에 한정한다. 이전 main 통과 기록은 이번 브랜치의 통과 증거가 아니다. 상세 결과는 [실행 보고서](VERIFICATION_FULL_BASELINE_2026-10-19.ko.md)를 따른다. CI 생략.

## E103 — 발행 노트 테스트가 제거된 wrapper를 조회

- `tests/note-dom-browser.mjs`가 `[data-tufte-note]` 안의 자식을 기대해 현재 label/input/span 형제 구조를 검사하지 못했다.
- checkbox에서 앞 label·뒤 payload를 찾아 부모/인접성/for=id/고유 ID/종류/phrasing을 검사한다. 발행 wrapper 부재, 편집 DOM 분리, JSON 불변성, 모바일 열기·닫기도 확인한다.
- 상태: Chromium 실행 통과. M095.

## E104 — 노트·제목 모델 변경의 타입 및 예제 반영 누락

- renderer는 concrete note와 heading ID를 사용하지만 공개 JsonNode는 기존 `tufte-note`만 선언했다. 제목 override는 superclass의 polymorphic this와 불일치했고 예제는 삭제된 `$createNoteNode`/NoteKind를 import했다. 빌드/타입 검사가 순차 실패했다.
- JsonNode를 현행 schema에 맞추고 updateDOM 인자를 `this`로 수정했다. 예제는 구체적인 노트 생성 함수를 사용한다.
- 상태: 전체 build/typecheck 통과. 저장 포맷 이전 문제 E109는 별도 미해결. M096.

## E105 — 신규 Lexical 테스트의 active editor 및 canonical root 전제 오류

- note DOM export 테스트가 editor.update 밖에서 노드를 생성해 active editor 오류를 냈다. heading fixture는 Lexical root가 내보내지 않는 textFormat/textStyle을 포함하여 strict bridge의 정규화 거부에 걸렸다.
- DOM export는 등록된 headless editor의 discrete update 안에서 실행한다. heading fixture의 비정본 root 필드만 제거하고 strict bridge의 손실 감지는 유지한다.
- 새 figure-marginnote fixture는 이미지 leaf를 element helper로 만들어 children/direction/format/indent의 UNKNOWN_FIELD를 일으켰다. 세 이미지 fixture를 올바른 leaf JSON으로 바꿨고 해당 파일의 6개 테스트가 통과했다.
- 상태: 해당 테스트 통과. M099.

## E106 — 공식 샘플 비교 fixture의 envelope 누락과 들여쓰기 차이

- 신규 비교 3개가 필수 `assets`를 빠뜨려 INVALID_ASSETS로 실패했다. 추가 후 opening/Getting Started는 section 블록 사이 원본 HTML 들여쓰기 Text node에서만 달랐다.
- assets:[]를 추가했다. 두 section 비교는 SECTION 직속 공백-only Text node만 제외하며 inline/pre/code의 공백·속성·계층은 계속 비교한다. assertion에 예외를 명시했다. newthought는 ID namespace 외 DOM을 그대로 비교한다.
- 상태: 세 비교 최종 실행 통과. 페이지 전체 시각 동등성 판정은 아니다. M099.

## E107 — 제목 명령이 미등록 기본 HeadingNode를 생성

- section/contextual UI 브라우저 테스트의 h2 생성이 timeout으로 실패했다. 독립 headless 회귀에서 `Type heading in node HeadingNode does not match registered node TufteHeadingNode`를 재현했다.
- sectionCommands의 등록 확인·생성을 TufteHeadingNode로 통일하고 h2↔h3 변환 시 ID를 보존한다. 클래스·텍스트·ID를 검증하는 회귀를 추가했다.
- publication browser harness에도 같은 기본 heading factory가 남아 있어 교체했다.
- 상태: headless 및 section/contextual UI/publication 브라우저 재실행 통과. M097.

## E108 — 구조 검사기가 변경 전 그림 순서·노트 타입을 유지

- schema는 marginnote→image를 허용하지만 inspector는 image-first를 강제했다. 직접 sidenote 검사는 과거 `tufte-note.kind`를 보고 있었다. 독립 회귀에서 두 오류를 재현했다.
- 이미지 정확히 하나/캡션 최대 하나·이미지 뒤 조건으로 변경하고 concrete sidenote를 진단한다. 노트 앞뒤 허용 및 캡션 역순·직접 sidenote 거부를 검사한다.
- 상태: 신규 회귀 2개 통과. M098.

## E109 — concrete note 전환의 저장 fixture/API 회귀 미이전 (수정 후 재검증 대기)

- 발견: 2026-10-19 Work 전체 검증에서 `tufte-note {kind}` 입력을 현행 validator가 `UNKNOWN_NODE`로 거부했다. Lexical 테스트 10개 파일은 삭제된 `$createNoteNode` import로 실행 전 실패했으며, 이로 인해 서버·브라우저·packed JS consumer도 연쇄 실패했다.
- 원인: 핵심 schema/renderer/editor에서 노드 분리 후, 저장 v1/v2 fixture와 golden·공통 생성기·테스트의 wire type/생성 함수/기대 진단까지 함께 이전하지 않았다. 저장 envelope v1→v2 변환은 구형 내부 노드 의미 변환과 별개다.
- 사용자 결정: 구형 `tufte-note` 문서 호환성이나 자동 마이그레이션은 도입하지 않는다. schema validator의 `UNKNOWN_NODE` 거부를 유지한다. 과거 실행 보고서의 호환성 도입 체크리스트는 이 결정으로 대체한다.
- 처리(현재 브랜치, 후속 실행 전): 서버 v1/v2 fixture, all-nodes golden/생성기, 서버 fixture 생성기, Lexical 테스트 API·노드 등록과 관련 기대값을 concrete note로 이전했다. 문서 검증 테스트는 `kind`의 `UNKNOWN_FIELD` 거부를 확인하게 변경했고, 렌더러의 구형 래퍼 미지원 기대값을 수정했다. v1/v2 데이터에서 주석 ID·링크·이미지를 보존하고 내부 Lexical state가 일치하는지 검사하는 고정 fixture 회귀도 추가했다.
- 상태: 코드/fixture 이전은 진행됐지만 이후 전체 빌드·단위·브라우저·패키지 소비 검증은 **미실행**. 2026-10-19 Work의 85 JS 실패/5 브라우저 실패를 아직 해결 확인한 것으로 집계하지 않는다. 다음 일괄 실행에서 새로 드러나는 실패도 조사한다. M096/M100/M101 참조.

## E110 — 진단 도구의 구문·escape 계층 오류 재발

- 임시 진단의 중첩 append 괄호, 패키지 밖에서의 pnpm 의존성 import, section 공백 정규식의 이중 escape로 진단 자체가 실패했다. encoded-slash GitHub branch 조회와 확인하지 않은 문서 제목의 patch도 실패했다. 커밋 전 대용량 문서 JSON 읽기는 출력 한도로 잘려 분할 읽기로 바꿨다.
- 회귀는 패키지의 독립 테스트 파일과 단계별 지역 변수로 구성한다. 공백 판정은 trim으로 바꾸고 실제 비교 실행을 확인했다. GitHub 조회는 git/ref/heads 경로를 사용하고 patch 문맥을 먼저 읽는다.
- 상태: 진단 실패를 제품 실패의 증거로 사용하지 않음. E067/M060, E102/M094 재점검 및 M100 반영.

2026-10-19 완료 판정: E102 수정 후 check318개/browser16개/package4개/실제HTTP와 Python16개 통과. [실행 보고서](VERIFICATION_DOMPARSER_2026-10-19.ko.md)의 범위에서 검증했다. 전체 원본 fidelity 차이는 해결 처리하지 않는다.

## E102 — 신규 upstream 정규식의 이중 escape 재발

- 2026-10-19 mainaa7cb0a check에서 신규2건 실패. label regex literal의 \\b, article/section의 \\b·\\s, RegExp 문자열의 과도한 escape가 실제 HTML 대신 literal backslash를 찾았다.
- literal은 단일 slash escape, RegExp 생성자 문자열은 문자열 계층을 한 번 더 escape하도록 수정했다. 기존 기대 구조·노트 pairing은 유지한다. E084/M077과 같은 원인 재발이며 M094 참조.

2026-10-18 upstream 후속 판정: E098–E101은 [대조 실행 보고서](VERIFICATION_UPSTREAM_2026-10-18.ko.md)의 최종 check316개/browser15개/package4개 범위에서 검증했다. 기존 원본 전체 fidelity 차이는 해결 처리하지 않는다.

## E100 — span 부재를 부모 오류로 분류

- 새 회귀에서 span 밖 텍스트의 unwrap은 무변경 거부됐지만 INVALID_SPAN_PARENT를 반환해 명시한 INVALID_SPAN_SELECTION 기대와 불일치했다.
- span 부재를 먼저 selection 오류로 분리하고 실제 span 부모/자식 불허는 기존 parent 진단을 유지한다. M092.

## E101 — 목록 note fixture의 타입명·선택 위치 오류

- 중첩/추가 회귀가 실제 tufte-note를 note로 조회해 undefined 접근. annotated listitem.selectEnd는 마지막 note payload로 들어가 목록 명령이 의도대로 거부됐다.
- 실제 노드 타입명과 본문 텍스트 선택을 사용한다. note 내부 거부 정책을 우회하지 않고 note ID·형제/본문 보존 검사를 유지한다. M093.

## E098 — upstream 예제에 없는 확장 요소를 필수로 기대

- 2026-10-18 main02bb314 check의 새 upstream vocabulary 테스트가 figcaption에서 실패했다. 고정 index.html에는 figcaption/table/dl/dt/dd가 없으며 CSS/자체 확장 fixture와 원본 예제를 혼동했다.
- 실제 원본의 figure/img/pre/code/iframe 등을 검사하고 위 다섯 요소의 부재도 명시적으로 고정한다. 확장 렌더 지원은 기존 자체 fixture에서 검사하며 원본 전체 지원의 증거로 대체하지 않는다. M090 참조.

## E099 — marginnote 라벨 glyph 때문에 구조 비교에서 누락

- 새 노트 구조 regex가 빈 label만 허용해 ⊕ marginnote를 놓치고 두 노트 종류 기대값에서 실패했다.
- 실제 라벨 텍스트를 capture하여 sidenote 빈 값/marginnote ⊕를 각각 검증한다. 두 kind의 집합과 인접 input ID=label for도 검사하여 무조건 임의 내용을 허용하지 않는다. M091 참조.

2026-10-18 최종 판정: E088–E097의 수정/대책은 [실행 보고서](VERIFICATION_2026-10-18.ko.md)의 check297개·browser15개·package4개 범위에서 검증했다. E086/E087 실행 대기도 현행 타입/명령/UI/의존성 검증 근거를 확보했다. 아래 최초 발견/과거 대기 기록은 이력으로 유지한다.

## E095 — 신규 browser snapshot이 접힌 details 내부 role을 조회

- inline-span snapshot이 숨겨진 문서 JSON textbox를 role로 찾다 timeout. list/definition helper에도 같은 패턴이 있었다.
- JSON·HTML 생성 후 details를 명시적으로 연 뒤 접근한다. 입력 데이터와 검사 내용은 유지했다. M088.

## E096 — 기본 RichText Enter가 목록 경계 처리보다 먼저 소비

- 실제 브라우저의 마지막 빈 listitem Enter에서 종료 대신 빈 항목이 추가됐다. 동일 EDITOR 우선순위의 RichText handler가 먼저 소비해 새 경계 핸들러까지 오지 않았다.
- 좁은 Enter/Backspace 경계 핸들러만 HIGH로 등록한다. 노트/IME/일반 텍스트는 false 반환으로 위임을 유지한다. 먼저 등록된 EDITOR handler와 함께 우선순위/일반 텍스트 위임 headless2건 추가 및 browser Enter/Backspace 실행. M089.

## E097 — 누적 목록 fixture에서 마지막 UL을 새 목록으로 오인

- 일반 Enter 분할 검사에서 이전부터 뒤에 있던 목록을 last UL로 골라 AlphaBeta가 아닌 목록을 편집해 timeout.
- 키보드 시나리오별 새 최종 section에 목록을 만든다. 마지막 목록 selector가 검사 대상과 일치하는 상태를 보장하고 실제 분할/병합 검사를 유지한다. M088.

## E092 — floating 메뉴의 일반 레이아웃 margin 잔류

- contextual 브라우저에서 메뉴 y+height가 viewport를 넘어섰다. 기본 block-context-menu margin이 fixed top 계산 밖에서 더해졌다.
- is-floating에 margin:0을 명시했다. 실제 기본/375px 경계 검사 통과. M086 참조.

## E093 — Shift+Tab 검사와 메뉴 밖 이동 계약 불일치

- 구현/M080은 메뉴 컨테이너 밖 이전 tabbable로 이동하지만 테스트는 컨테이너 안 토글을 기대해 실패했다.
- 이전 외부 요소인 editor focus를 검사한다. 닫힘/floating 제거/숨은 항목 focus 방지 검사는 유지했다. 제품 동작 변경 없음. M087.

## E094 — 인라인 browser가 첫 자식을 DOM Text로 가정

- 신규 inline-span 선택 helper가 Lexical span wrapper를 Text로 가정해 실행 전 실패했다.
- TreeWalker SHOW_TEXT로 실제 텍스트를 찾고 동일한 부분 offset 선택을 유지한다. wrapper를 제거하거나 제품을 바꾸지 않는다. M087.

## E090 — 정의 그룹 위로 이동의 insertBefore 수신자 반대

- 단위 테스트 두 건에서 down→up 왕복이 원본과 달라졌다. term.insertBefore(previousFirst)는 이전 그룹 첫 용어를 이동시켜 그룹을 손상했다.
- previousFirst.insertBefore(term/description)으로 선택 그룹 전체를 이전 그룹 앞에 순서대로 이동한다. 단일/다중 용어 그룹·note ID 왕복 테스트로 확인한다. M084 참조.

## E091 — 목록 회귀의 비교 깊이·구조적 들여쓰기 대상 불일치

- 유형 왕복 검사는 inline children 배열과 listitem 객체 배열을 서로 비교했다. Tab 검사는 실제 중첩 대상 대신 Lexical의 최상위 wrapper item 깊이를 기대했다.
- 양쪽 inline children을 비교하고 Tab 뒤 실제 마지막 텍스트의 부모 listitem 깊이를 검사한다. 제품 코드의 구조적 중첩 동작을 바꾸지 않는다. M085 참조.

## E088 — 목록 자식 검증 뒤 타입 좁히기 유실

- 2026-10-18 main0411b03 clean check에서 listCommands.ts의 getDirection/getChildren 등6개 TS2339 발생. some의 거부 조건은 items 배열을 ListItemNode[]로 좁히지 않았다.
- every의 명시적 ListItemNode 타입 술어로 동일한 전체 자식 허용 검증을 유지했다. M083 참조. 최종 실행 결과는 후속 보고서에 기록한다.

## E089 — mutable valid 불리언으로 selection 타입 추론 불가

- E088 수정 후 editor typecheck에서 captureTarget(selection)에 nullable BaseSelection이 전달돼 TS2345 발생. valid 변수의 값은 TypeScript의 range type guard가 아니다.
- captureTarget 호출 직전에 $isRangeSelection을 명시해 런타임/정적 계약을 함께 확인한다. M083 참조. 최종 실행 결과는 후속 보고서에 기록한다.

## E087 — editor example의 직접 import가 manifest·lockfile importer에 누락됨

- `examples/editor/src/main.tsx`가 `@lexical-tufte/document`와 `@lexical/rich-text`를 직접 import했으나 `examples/editor/package.json`에 둘 다 없었다. lockfile의 `examples/editor` importer에도 직접 선언되지 않았다.
- 기존 workspace의 전이 의존성/hoisting 때문에 우연히 해석될 가능성과 clean consumer에서 실패할 위험을 구분했다. 이번 점검에서 **직접 의존성 정합성 결함**을 발견했으며 설치 오류가 실제 발생했다고 주장하지 않는다.
- `c2a8e4a`, `e36382f`에서 두 manifest/lockfile을 동시에 수정했다. `pnpm install --frozen-lockfile`·`pnpm check` 성공 전에는 해결 완료로 처리하지 않는다.
- 상태: 코드·메타데이터 수정 완료, **검증 대기**. M081 참조.


## E086 — 메뉴 진입 경로별 open guard 누락 (코드 점검에서 발견)

- 선택 위치 보존 리팩터링 직후 우클릭 경로에 `menuOpenRef.current=true`가 중복 삽입되고, `Shift+F10/ContextMenu` 경로에는 삽입되지 않은 것을 소스 재조회에서 발견했다. 같은 문자열 치환의 반복 적용이 원인이었다.
- 우클릭 경로의 중복을 제거하고 키보드 경로에도 동일한 open guard를 지정했다 (`20418e9`). 세 진입 경로(우클릭·키보드·버튼)에서 열림 guard 설정을 정적 재점검했다.
- `tests/contextual-ui-browser.mjs`의 키보드 진입/첫 항목 focus 검증 및 실제 명령 실행은 사용자 요청에 따라 **일괄 테스트 대기**다. 정적 수정 사실과 실행 검증 완료를 구분한다.
- 상태: 코드 수정, **검증 대기**. M080 참조.


## E085 — 메뉴 표시와 키보드 focus 도착 시점 혼동

- contextual 검사에서 Shift+F10 후 group 표시만 기다리고 Escape를 보내, requestAnimationFrame의 첫 버튼 focus 이전에 키가 editor로 전달되어 닫힘 검사가 timeout했다.
- 키보드 진입 검사는 명시적으로 첫 버튼 focus를 기다린 뒤 Escape/방향키를 보낸다. focus 전에 입력한 매우 빠른 Escape의 사용자 동작 지원은 이번 범위에서 보장하지 않는다.
- 상태: 검사 readiness 수정. M078.

## E084 — 신규 섹션 브라우저 회귀의 정규식·삽입 위치 가정 오류

- 새 footer/cite 정규식에 이중 escape가 들어가 JS parser가 Invalid regular expression flags로 중단했다. quote의 문자 범위도 이중 escape였다. 실제 mjs literal에 맞춰 수정하고 50개 mjs 파일 node --check 통과.
- 수정 뒤 footer 테스트가 첫 블록 뒤 삽입인데도 섹션 마지막 자식이라고 기대해 실패했다. 실제 현재 블록 뒤 삽입 계약에 맞춰 마지막 문단을 선택한 뒤 footer/quote/epigraph를 검사한다. 제품 명령 위치는 바꾸지 않았다.
- 상태: 구문 검사와 target 브라우저 통과. M060 재발 및 M077 참조.

## E080 — 출처 HTML 테스트가 공백 보존 wrapper를 무시

- main d53d7eb의 check에서 footer/cite 의미 구조는 맞지만 텍스트가 span 없이 직결된다는 신규 assertion이 실패했다.
- footer 범위 안에서 지정된 tufte-pre-wrap span만 벗겨 cite 부모/순서·본문을 정확히 비교한다. 렌더러 동작은 바꾸지 않았다. E049 계열 검사 계약 오류 재발.
- 상태: 수정 후 전체 check 결과는 UI 검증 보고서 참조. M073.

## E081 — 선택 도구막대 추가 후 포맷 버튼 selector 중복

- text-format-browser에서 밑줄 버튼이 주 도구막대/선택 도구막대 두 곳에 있어 strict locator 오류.
- 기존 R10 테스트는 이름 있는 주 도구막대로 한정하고 새 선택 UI는 별도 실제 UI 검사로 검증한다. E074/M068의 영역 구분 원칙을 toolbar에도 적용한다.
- 상태: 수정 후 전체 browser 결과는 UI 검증 보고서 참조. M074.

## E082 — 우클릭 DOM 커서와 Lexical 선택 불일치

- 실제 브라우저에서 두 번째 문단에 커서를 둔 뒤 주석을 포함한 첫 문단 우클릭→h3 실행 시 첫 문단의 거부 대신 이전 두 번째 문단이 변환됐다.
- focus 뒤 DOMRange를 Lexical RangeSelection.applyDOMRange로 변환하고 discrete update에서 $setSelection한다. 주석 내부는 명령 메뉴로 가로채지 않는다.
- 상태: 해당 반례·이전 제목 유지·실제 우클릭 제목 변경·키보드/375px 검증 통과. M075.

## E083 — 브라우저 검증 서버 포트 공유

- 새 contextual 검사와 기존 browser 묶음을 동시에 5174로 실행한 시도에서 기존 서버를 재사용할 수 있어 테스트 격리가 확보되지 않았다. 해당 첫 contextual timeout을 제품 실패 증거로 사용하지 않는다.
- contextual 전용 5177로 분리하고 독립 실행하여 E082를 재현·수정했다. 기존 테스트의 포트 공유 프로세스는 병렬 실행하지 않는다.
- 상태: 검사 절차 수정. M076.

- 추가: 빌드와 browser를 동시에 실행한 검사에서도 JSON textarea가 비어 파싱이 실패했다. Vite가 참조하는 dist 갱신/HMR 영향을 배제할 수 없어 제품 데이터 유실로 단정하지 않는다. 최종 검증은 build/check/package 종료 후 browser 전체와 target을 직렬 실행한다.

## E079 — F07 검증 환경에서 GitHub DNS 해석 실패 및 checkout 부재

- 2026-10-17 실행 컨테이너에서 `git ls-remote https://github.com/yunskim/lexical-tufte-css.git HEAD`가 `Could not resolve host: github.com`으로 실패했다. `/mnt/data`에 checkout이 없고 pnpm 실행 파일도 없다. Node v22.16.0은 확인했다.
- GitHub 커넥터로 원격 파일 읽기/커밋은 가능하나, 이는 로컬 빌드·실행 검증을 대체하지 못한다. F07 테스트는 미실행이며 제품 결함으로 분류하지 않는다.
- 상태: **open / environment-blocked**. 네트워크와 checkout을 제공하는 실행 환경에서 M072 순서대로 검증한 뒤에만 닫는다. 동일한 DNS 실패를 반복 호출해 해결됐다고 추정하지 않는다.

## E076 — 복구 목록 SQL 인터페이스에 all 누락

- 2026-10-17 main5fb4d20 clean build에서 TS2339. list 구현은 all()을 호출하지만 기존 PublicationDatabase는 get/run만 선언했다.
- RecoveryDatabase를 별도 정의해 all을 요구하고 공개 타입으로 export했다. publication 소비자의 기존 계약은 유지한다.
- 상태: verified (수정 후 check253개 통과). M069 참조.

## E077 — Python editable 설치의 모듈 자동 탐색 실패

- pip install -e apps/recovery-server[test]에서 app/host/security의 여러 최상위 모듈 자동 탐색을 setuptools가 거부했다.
- build backend 및 py-modules를 명시하고 격리 venv에서 설치 성공. 테스트 당시 의존성을 test-constraints.txt로 남겼다.
- 상태: verified (editable 설치 및 pytest16개 통과). M070 참조.

## E078 — stream 소비 후 요청 본문 replay가 빈 본문 전달

- Python 계약 테스트 4건 실패. 정상 PUT도 400이며 RequestValidationError는 body missing을 보고했다. 기존 middleware는 request.stream 소비 뒤 _receive만 교체했다.
- BaseHTTPMiddleware의 소비 상태와 일치하도록 크기 검사 후 _body cache를 채워 downstream 전달을 사용한다. 수동 replay/가짜 disconnect를 제거했다.
- 상태: verified (pytest16개 및 실제 TS client→Python HTTP→SQLite 저장/조회/목록/CAS/권한/CSRF/삭제). FastAPI/Starlette 내부 cache 계약은 고정 실행 환경 범위이며 업그레이드 때 재검증한다. M071 참조.

## E075 — E065 paint 동기화 대책이 최초 폰트 검사에 누락

- 2026-10-17 전체 browser의 font-proof 최초 검사에서 fonts.ready 직후 DejaVu를 관측해 custom glyph assertion 실패. 지연 swap 검사에만 두 frame 대기가 있고 최초 로드에는 없었다.
- 최초 로드에도 같은 두 animation frame 대기를 적용했다. 고정 metrics/custom glyph/지연 swap/차단 검사가 통과했다. M058을 최초 로드에도 확장한다.
- 상태: verified (고정 Chromium134 폰트 회귀). 기본 환경 한국어 시스템 fallback 부재 E064는 유지.

## E072 — 복구본 필터 타입 술어 불일치

- 2026-10-17 main 038e551 clean checkout의 check에서 TS2677/TS18047 발생. truthy 검사를 거친 state 추론 타입보다 넓은 unknown을 filter 술어에 지정했다.
- NonNullable<typeof item>으로 원소 타입을 유지하면서 null만 제거. 수정 후 check237개(실패/skip0) 통과. M066 참조.
- 상태: verified (현재 Node24 타입 검사).

## E073 — 검증 환경의 캐시·브라우저 부재

- offline frozen install은 @floating-ui/core 메타데이터 부재로 중단. 일반 frozen install 성공. 첫 browser 실행은 Chromium 부재로 중단.
- Playwright 설치 중 첫 CDN의 손상 ZIP은 도구의 대체 다운로드로 정상 설치. 의존성/Chromium134 준비 완료와 제품 테스트 성공을 구분한다. M067 참조.
- 상태: mitigated (환경 준비 완료).

## E074 — 자동 저장 상태 추가 후 브라우저 status selector 충돌

- note-editing-browser에서 getByRole('status')가 작업/자동 저장의 두 요소와 일치해 strict mode 실패. 주석 붙여넣기 거부 문구 자체는 정상 출력됐다.
- 작업 상태에 접근 가능한 이름을 부여하고 note-editing/section 명령 테스트를 해당 이름으로 한정했다. M068 참조.
- 상태: 수정 후 전체 브라우저 재검증 결과는 2026-10-17 보고서 참조.

실제 발생한 실패를 기록한다. 재발 방지 대책은 [ERROR_PREVENTION.md](ERROR_PREVENTION.md)에 별도로 관리한다. 실패한 실행을 성공으로 덮어쓰지 않는다. 로그에 토큰·개인정보를 넣지 않는다.

상태: open / investigating / mitigated / verified / reopened. `verified`는 명시한 검증 범위에 한정하며 모든 환경에서 해결됐다는 뜻이 아니다.

## E001 — workspace 밖에서 설치 실행

- 발생: 2026-10-16, P0. Node 24.19.0 / pnpm 11.25.0.
- 증상: `ERR_PNPM_NO_PKG_MANIFEST`, 프로젝트 상위 경로에서 `pnpm install` 실행.
- 원인: 파일 생성 경로와 명령의 workdir가 달랐다.
- 처리: lexical-tufte-work를 workdir로 지정해 설치, frozen install·check 통과.
- 상태: verified. 대책: M001. 증거: docs/PROGRESS.md의 P0 검증.

## E002 — 임시 smoke 코드 문법 오류

- 발생: 2026-10-16, P0 headless smoke.
- 증상: `SyntaxError: Unexpected token ')'`.
- 원인: 즉석 heredoc 코드의 닫는 괄호 중복. 첫 실행은 모듈 import 전에 실패했다.
- 처리: 괄호와 실행 디렉터리 기준 import 경로를 수정, 한글 JSON smoke 통과. 이후 반복 검증을 `packages/lexical/test/note.test.mjs`의 실행 가능한 파일로 옮겼다.
- 상태: verified. 대책: M002. 증거: `pnpm test`의 실제 테스트 2개 통과.

## E003 — 새 export 및 CSS 타입을 소비자가 찾지 못함

- 발생: 2026-10-16, P1.1 첫 `pnpm check`.
- 증상: NoteNode 등 export가 없다는 TS2305, CSS side-effect import TS2882.
- 원인: 소비자가 이전 dist 선언을 읽었고 Vite CSS 타입이 tsconfig에 없었다.
- 처리: 예제 typecheck는 workspace 소스 paths를 사용, `vite/client` types 추가. 브라우저 테스트 명령은 build 후 실행.
- 상태: verified. 대책: M003. 증거: `pnpm check`, `pnpm test:browser` 통과.

## E004 — 브라우저 배포 파일 다운로드 실패

- 발생: 2026-10-16, P1.1 환경 준비.
- 증상: Playwright CDN의 첫 다운로드에서 ZIP central-directory 오류. 런타임 Playwright 1.62.1의 Chromium 151 설치는 실패했다.
- 원인: 수신된 다운로드가 유효한 ZIP이 아니었다. 네트워크/캐시의 구체적 원인은 확인하지 못했다.
- 처리: 별도 검증용 Playwright 1.51.1을 고정. 해당 설치기의 공식 Microsoft 대체 배포 경로에서 Chromium 134와 headless shell 설치 성공.
- 상태: mitigated. 이 환경의 검증 기준 확보이며 최신 브라우저 다운로드 문제가 해결된 것은 아니다.
- 대책: M004. 증거: pnpm-lock.yaml, docs/DEPENDENCIES.md, Chromium 회귀 테스트 결과. 최신 브라우저 검증 확대는 P6.

## E005 — 일반 Chromium 실행 제한

- 발생: 2026-10-16, P1.1 브라우저 테스트.
- 증상: 일반 Chrome binary가 process singleton socket 생성 중 `Operation not permitted`로 종료.
- 원인: 현재 실행 환경에서 해당 OS 기능을 사용할 수 없음. 상세 정책은 확인하지 못했다.
- 처리: Playwright의 기본 headless shell로 실행해 테스트 통과. 시스템 권한은 변경하지 않았다.
- 상태: mitigated. 대책: M004. 증거: tests/note-browser.mjs의 기본 launch 경로 및 통과 결과.

## E006 — 테스트 서버 연결 실패

- 발생: 2026-10-16, P1.1.
- 증상: `ERR_CONNECTION_REFUSED`, 다른 실행에서 시작한 서버 또는 readiness 확인 없이 서버를 사용.
- 원인: 해당 테스트에서 사용할 서버의 접근 가능·준비 완료를 보장하지 않았다. 네트워크 격리 여부는 확정하지 않았다.
- 처리: 테스트가 직접 Vite 서버 시작→HTTP readiness 확인→브라우저 실행→서버 종료를 소유하도록 변경.
- 상태: verified. 대책: M005. 증거: tests/note-browser.mjs 전체 시나리오 통과.

## E007 — 노트 경계 입력이 본문으로 빠짐

- 발생: 2026-10-16, P1.1 실제 Chromium 테스트.
- 증상: Alt+↓로 노트 시작점에 진입한 후 입력한 텍스트가 본문에 들어감. 이후 링크 삽입이 ‘먼저 노트 안으로 이동’ 메시지로 거부됨.
- 확인한 원인: Lexical 0.52의 inline 경계 입력/선택 정규화. canInsertTextBefore/After 변경과 CONTROLLED_TEXT_INSERTION_COMMAND만으로 해결되지 않았다.
- 처리: prototype 편집기에서 일반 insertText의 노트 경계 beforeinput을 Lexical 기본 처리 전에 직접 반영. IME/composition은 이 guard에서 제외.
- 상태: verified (P1.1 일반 insertText 범위). P1.2에서 드러난 별도 경계 문제와 수정은 E009–E011에 연결한다. Chromium 조합·paste·삭제·split/merge 회귀는 추가 통과했으며 OS별 실제 IME는 P6에 남긴다.
- 대책: M006. 증거: tests/note-browser.mjs의 진입 후 입력/노트 payload/본문 복귀 검증 통과. 후속 P1.2/P1.3.

## E008 — 접힌 검사 패널의 textarea 접근 실패

- 발생: 2026-10-16, P1.1 브라우저 테스트.
- 증상: role=문서 JSON locator가 30초 timeout.
- 원인: details가 접혀 있어 접근성 role 검색 대상에서 textarea가 숨겨짐. JSON 생성 오류는 아니었다.
- 처리: UI의 summary를 열고 값을 검사. 기본 테스트 timeout은 5초로 제한.
- 상태: verified. 대책: M007. 증거: JSON 저장→재로드→복원 비교 통과.

## 새 기록 양식

- ID / 날짜 / 작업 ID / 환경·버전:
- 재현 조건·명령 / 실제 증상 / 기대 결과:
- 확인한 원인 (미확인 사항은 따로 기재):
- 수정·우회 / 영향 범위 / 상태:
- 대책 ID / 회귀 검증 / 코드·문서·이슈 링크:
- 재발 시 이전 ID 연결·재발 횟수·기존 대책이 실패한 이유:

## E009 — 복사·붙여넣기 후 노트 구조가 재생성되지 않음

- 발생: 2026-10-16 P1.2 첫 Chromium 회귀 검사.
- 증상: 노트 전체 선택→Ctrl+C→본문 끝 Ctrl+V 이후 note 개수가 2개가 되지 않아 5초 timeout.
- 확인한 원인: NoteNode의 inherited extractWithChild=false로 노트 wrapper 없이 payload 텍스트만 복사됐다. 실제 본문에 plain text가 붙은 DOM을 확인했다.
- 처리: 노트 wrapper 추출을 보존하고 clipboard import에서 copy ID 재발급·같은 문서 내 cut 이동 ID 보존·중첩 note 붙여넣기 거부를 적용했다.
- 상태: verified (동일 namespace의 내부 rich clipboard와 plain text). 대책 M008: native clipboard 테스트에서 실제 MIME payload·붙여넣기 결과를 확인하고, 복제 ID와 내용 보존을 함께 검사한다.

## E010 — 노트 시작점의 한글 조합 입력 이탈

- 발생: 2026-10-16 P1.2 Chromium CDP composition 검사. E007의 미검증 범위를 확장한 결과다.
- 증상: `ㅎ→하→한` 조합 후 commit해도 note payload가 원문 그대로여서 `^한` 검사 실패.
- 확인한 원인: P1.1 일반 insertText guard가 composition을 제외했고, Lexical의 composition 시작 경계 heuristic이 본문 쪽으로 삽입했다.
- 처리: COMPOSITION_START_COMMAND에서 경계에 Lexical이 정리하는 임시 위치 표식을 제공한 뒤 기본 composition 처리로 넘긴다. 조합을 별도 editor로 이관하거나 직접 확정하지 않는다.
- 상태: verified (Chromium CDP 조합 시작/확정/취소/undo/redo 및 표식 제거 범위). OS별 실제 IME는 미검증. 대책 M009: 조합 시작/갱신/확정/취소를 실제 Chromium 입력 경로로 검사하고 중간 조합 상태를 문서 정본과 분리할지 검토한다. OS별 실제 IME 검증과 CDP 시뮬레이션을 구분한다.

## E011 — rich note 분할·병합 회귀 검사 실패

- 발생: 2026-10-16 P1.2 확장 Chromium 검사.
- 증상: 분할·병합·undo/redo 시나리오에서 기대 개수 1에 실제 0으로 실패. 다른 9개 시나리오는 통과.
- 확인한 원인: 노트 시작점에서 프로그램 방식 insertNodes가 링크를 본문으로 내보냈다. 이어 이미지 삽입은 노트 밖 선택으로 거부됐다. 분할·병합 자체의 유실은 아니었으며 P1.1이 일반 텍스트를 먼저 입력하는 시나리오여서 놓친 경계 변형이다.
- 처리: 경계의 phrasing 삽입을 전용 helper로 처리하고 toolbar·paste에 적용했다. split 후 merge에서 경계의 동일 속성 LinkNode를 다시 합쳐 wrapper 분할도 복원한다.
- 검증: 노트 시작점 링크/이미지 삽입, rich clipboard, 링크 내부 분할/병합과 undo/redo 통과.
- 상태: verified (prototype 지원 경로). 대책 M010: 실제 삽입 위치와 링크·이미지·노트 ID·내용을 단계별로 검사하고 명확한 assertion 위치를 기록한다.

## E012 — 이미지 발행 HTML에 편집 전용 속성 유출

- 발생: 2026-10-16 P1.3 DOM 분리 Chromium 검사.
- 증상: 발행 HTML의 img에 `contenteditable="false"`가 남아 편집 전용 속성 배제 assertion 실패.
- 확인한 원인: InlineImageNode.exportDOM이 편집용 createDOM을 그대로 재사용했다.
- 처리: 의미적 이미지 속성(src/alt) 생성만 공유하고 편집 전용 contentEditable 속성은 createDOM에서만 설정하도록 분리했다.
- 검증: tests/note-dom-browser.mjs에서 두 note 종류의 편집 속성 배제·마크업·export JSON 불변성·모바일 CSS 토글 및 전체 P1.1/P1.2 회귀 통과.
- 상태: verified (현재 주석·이미지 DOM export 범위). 대책 M011: 편집 DOM과 발행 DOM을 별도로 검사하고 발행 결과의 편집 class/data/contenteditable 유출을 회귀 테스트로 차단한다.

## E013 — table export의 DOM 반환 타입 불일치

- 발생: 2026-10-16 P1.4 타입 검사. 첫 build 결과를 회수하기 전에 두 번째 검사 묶음을 시작해 같은 타입 오류를 재확인했다.
- 증상: TS2322, exportDOM.after에서 querySelector의 Element를 반환하여 HTMLElement 계약과 불일치.
- 확인한 원인: table 선택 결과의 구체적 DOM 타입을 지정하지 않았다.
- 처리: querySelector<HTMLTableElement>로 구체화하고 타입 검사 후 후속 검증을 실행한다.
- 상태: verified (타입·빌드·후속 브라우저 검사 통과). 대책 M012: DOM export 반환 타입을 확인하고 선행 빌드가 끝나고 통과하기 전에는 의존 검증을 시작하지 않는다.

## E014 — 실패한 빌드 뒤 브라우저 검증을 실행함

- 발생: 2026-10-16 P1.4. E003/M003의 선행 build 규약을 ad-hoc 실행 묶음에 일관되게 적용하지 못했다.
- 증상: 선행 pnpm check가 실패했는데 다음 줄의 브라우저 검증이 실행되어 .editor 5초 timeout.
- 확인한 원인: shell 실행 묶음이 실패 시 중단하지 않아 새 export를 빌드하지 못한 상태로 UI를 실행했다. UI timeout만 별도 제품 오류로 해석하면 안 된다.
- 처리: 의존 검증 실행은 set -e 또는 &&로 fail-fast하고 기존 test:browser의 build 선행 조건을 유지한다.
- 상태: verified (타입·빌드·후속 브라우저 검사 통과). 대책 M012: 실행 묶음의 실패 전파와 선행 결과 회수도 점검한다.

## E015 — 스크롤 검증 fixture에 줄바꿈 가능한 문자열 사용

- 발생: 2026-10-16 P1.4 Chromium 레이아웃 검사. 타입·빌드·단위 6개는 통과했다.
- 증상: 실제/기준 CSS 비교는 일치했지만 scroll wrapper의 overflows가 false여서 강제 스크롤 조건 assertion 실패.
- 확인한 조건: 길게 반복한 fixture 문자열에 하이픈이 포함되어 줄바꿈 기회가 있었다. 긴 문자열이라는 이유만으로 min-content 폭 초과를 가정했다.
- 처리: 줄바꿈 기회 없는 연속 문자열로 실제/수동 기준 fixture를 수정하고 viewport·측정값을 assertion에 포함한다.
- 상태: verified (5개 viewport에서 실제 overflow와 문서 넘침 격리 확인). 대책 M013: overflow fixture는 길이뿐 아니라 줄바꿈 가능성과 scrollWidth/clientWidth를 확인하고, 기준 HTML 일치와 제품 요구 조건을 별도로 검사한다.

## W001 — 편집기 prototype 번들 크기 경고

- 발생: 2026-10-16 P1.4. Vite가 minified chunk 500kB 기준 경고를 출력했다. 빌드는 성공했다.
- 관측: 편집기 JS 약 511.80kB, gzip 160.49kB. TablePlugin을 포함한 개발 예제의 값이다.
- 상태: open (경고). 기준을 올려 숨기지 않는다. P3/P6에서 lazy loading/분할 및 성능 예산을 검토한다. 독자용 페이지에 편집기 번들을 넣지 않는 기존 경계를 유지한다.
- 대책 M014: 작성/독자 번들 경계와 실제 번들 크기를 P3/P6에서 확인하고 변경 전후 측정 결과를 기록한다.

## E016 — JSON fixture와 undefined 속성 있는 JS 객체를 직접 비교

- 발생: 2026-10-16 P1.5 headless 비교 실험.
- 증상: JSON roundtrip 비교에서 textFormat/colWidths 등의 `undefined` 속성이 actual에만 존재해 deepStrictEqual 실패.
- 확인한 원인: Lexical toJSON()의 JS 객체와 파일에서 읽은 JSON을 동일한 계층으로 비교했다. JSON.stringify는 undefined 속성을 생략하므로 저장 데이터 유실과 다르다.
- 처리: 저장/재읽기 계약은 JSON.parse(JSON.stringify(...))로 정규화한 JSON 값을 비교한다. 별도의 export 전후 메모리 상태 불변성 비교는 그대로 유지한다.
- 상태: verified. 대책 M015: JS 내부 객체·JSON 저장 값·발행 HTML의 비교 경계를 테스트마다 명시한다.

## E017 — 서버 DOM adapter에서 전역 HTMLElement 참조 실패

- 발생: 2026-10-16 P1.5 withDOM + headless HTML export 실험.
- 증상: NoteNode.after에서 `ReferenceError: HTMLElement is not defined`.
- 확인한 원인: custom export가 전역 constructor 기반 instanceof를 사용했지만 withDOM은 document/window 등을 제공하고 HTMLElement 전역은 설치하지 않는다. 브라우저 한 realm 검사로는 놓친 차이다.
- 처리: NoteNode/LayoutNodes의 검사에 Lexical isHTMLElement를 사용하여 전역 DOM constructor 의존을 제거한다.
- 상태: verified (전역 constructor 의존 제거; 전체 DOM export 제한은 E018로 분리). 대책 M016: Node 무DOM·withDOM·실제 브라우저 경로를 모두 회귀 검증하고 DOM node 판별에 전역 constructor를 가정하지 않는다.

## E018 — 고정 Happy DOM의 자기 자신 replaceWith에서 표 제거

- 발생: 2026-10-16 P1.5 withDOM export, TableLayout의 자식 table 누락.
- 확인: 독립 재현 `parent.append(table); table.replaceWith(table)` 후 parent가 비었다. Lexical HTML export는 after가 같은 element를 반환해도 replaceWith를 호출한다. 단순 :scope 문제라는 추정은 폐기했다.
- 처리: upstream/전역 prototype을 임시 패치하지 않는다. 고정 adapter의 실패와 finally 전역 복원을 회귀 테스트하고, 발행은 DOM 의존 없는 순수 renderer를 선택했다. DOM export 성공으로 보고하지 않는다.
- 상태: mitigated. adapter 경로는 미지원; P2.4에서 버전 갱신/명시적 adapter 도입 시 재검증. 대책 M017.

## E019 — package export 경로를 파일 경로처럼 import

- 발생: E018 최소 재현에서 node_modules 아래 `/dom` 파일 경로 import가 ERR_MODULE_NOT_FOUND.
- 처리: package cwd에서 공개 specifier `@lexical/headless/dom`으로 실행해 재현 성공.
- 상태: verified. M018: package exports는 공개 specifier로 해석하며 즉석 검증은 해당 package cwd에서 수행한다.

## E020 — JSON import 테스트에서 fixture 함수 호출 누락

- 발생: P1.5 추가 테스트가 객체 대신 fixture 함수 자체를 stringify해 정상 입력 assertion 실패.
- 처리: `const doc=fixture()`를 명시하고 정상 입력/미래 버전 입력을 같은 문서로 검사한다.
- 상태: verified (단위 15개와 전체 브라우저 회귀 통과). M019: fixture 생성 함수의 결과를 지역 변수에 고정하고 검증 대상을 명시한다.

## E021 — 대형 Git 변경 목록 출력 잘림을 JSON으로 파싱

- 발생: P1.5 GitHub 업로드 준비. 파일 내용을 모은 실행 결과가 출력 한도로 잘렸고 JSON.parse가 실패했다. 원본 파일은 변경되지 않았다.
- 처리: 충분한 출력 한도로 다시 읽고 head/tail·완전한 JSON 파싱을 확인한 뒤 tree 항목으로 사용한다. 중단된 결과를 업로드하지 않는다.
- 상태: verified (20개 파일의 완전한 JSON 파싱 확인). M020: 대형 도구 결과는 출력 예산/완결성을 확인하고 파싱 성공 이후에만 의존 mutation을 실행한다.

## E022 — 로컬 hard reset 자동 승인 거부

- 발생: P1 업로드 후 origin 동기화 명령의 reset --hard가 로컬 미커밋 작업 유실 가능성으로 자동 승인 검토에서 거부됐다. 명령은 실행되지 않았다.
- 처리: 기존 디렉터리를 보존하고 fetch 후 별도 worktree(work-p2)를 생성해 검증된 P1 커밋에서 재개했다.
- 상태: mitigated. M021: 동기화 시 미커밋 작업을 버리는 명령을 기본으로 쓰지 않고 독립 worktree/commit 등 보존 가능한 방법을 사용한다.

## E023 — 재귀 generic intersection type의 순환 alias 오류

- 발생: P2.1 document 최초 build, TS2456 JsonNode circularly references itself.
- 원인: generic Element alias가 intersection과 JsonNode children을 통해 순환했다.
- 처리: children을 interface ElementBase로 분리해 재귀 구조의 명시적 경계를 둔다. 선행 build 실패로 render typecheck는 실행되지 않았다.
- 상태: verified (공유 build·소비자 typecheck·단위 26개 통과). M022: 재귀 노드 계약은 interface 경계를 사용하고 소비자 타입 검사까지 통과 후 완료 처리한다.

## E024 — beforeinput 취소 시점과 Lexical update 경계

- 발견: 2026-10-16 R04 공통 noteEdgeTyping 추출 코드 검토. 비동기/지연 update 콜백 내부에서 native beforeinput의 preventDefault를 호출하면 브라우저 기본 입력 취소가 이미 늦을 수 있다.
- 처리: discrete Lexical update에서 처리 여부를 동기적으로 수집하고 이벤트 핸들러에서 preventDefault/stopImmediatePropagation을 수행하도록 변경했다.
- 상태: 코드 수정, 브라우저 검증 대기. 실제 IME·브라우저별 cancelable 이벤트와 Lexical update 동기성은 확인하지 않았다. M023 참조.

## E025 — R04 실행 검증 환경 차단

- 발생: 2026-10-16 R04 테스트 실행 준비. Node.js v22.16.0은 사용 가능하나 pnpm 실행 파일이 없고, git ls-remote에서 github.com DNS 조회 실패.
- 영향: 의존성 설치 및 pnpm check/test:browser를 실행할 수 없었다. 기존 커밋의 테스트 성공을 주장하지 않는다.
- 처리: 테스트 코드 보강만 GitHub에 반영하고 실행 검증은 보류한다. CI를 새로 추가하지 않는다.
- 상태: 환경 차단, 미해결. M024 참조.

## E026 — R06 충돌 회귀 테스트의 잘못된 반례

- 발견: 2026-10-16 P2.2 안정화 재점검. 기존 테스트의 prefix=a-b/noteId=c와 prefix=a/noteId=b-c는 예전 `prefix-note-noteId` 규칙에서도 충돌하지 않았다. 따라서 이전 구현의 결함을 실제로 잡는 회귀 테스트가 아니었다.
- 처리: prefix=a-note-b/noteId=c 및 prefix=a/noteId=b-note-c로 교체. 이전 방식에서는 둘 다 `a-note-b-note-c`이며, 길이 접두어를 붙인 새 방식에서는 서로 다른 ID가 된다.
- 상태: 테스트 코드 수정, 실제 실행 미검증(E025). M025 참조.

## E027 — Corepack pnpm 부트스트랩 네트워크 실패

- 발견: 2026-10-16 R14 재점검. `corepack pnpm --version` 명령이 registry.npmjs.org DNS EAI_AGAIN으로 실패. Node v22.16.0은 정상.
- 처리: 테스트 통과로 기록하지 않고 환경 차단을 유지한다. M024에 따라 네트워크 정상 환경에서 재시도한다.
- 상태: 환경 차단, 미해결.

## E028 — 그림 왕복 fixture의 자산 참조 누락

- 발견: 2026-10-16 R02 정적 코드 점검. 그림 테스트가 assetId=chart-1을 포함하지만 document.assets에 해당 자산을 추가하지 않아 MISSING_ASSET 진단이 발생하는 입력이었다.
- 처리: 테스트 문서의 assets에 chart-1 URL, MIME, 크기를 명시해 검증 조건을 충족시켰다.
- 상태: 코드 수정, 실행 검증 대기(E025/E027). M026 참조.

## E029 — 골든 버전 확인의 package exports 가정

- 발견: 2026-10-16 R02 검토. `require('lexical/package.json')`는 패키지의 exports 설정에 따라 ERR_PACKAGE_PATH_NOT_EXPORTED를 낼 수 있어 버전 확인 방법으로 불안정하다.
- 처리: 공개 엔트리 `require.resolve('lexical')`의 실제 설치 위치에서 상위 package.json을 탐색하고 name=lexical인 manifest의 version을 검사하도록 수정.
- 상태: 코드 수정, 의존성 설치 후 실제 검증 대기(E025/E027). M027 참조.

## E030 — 가져오기 성공 결과의 호출자 객체 alias

- 발견: 2026-10-16 R11 코드 점검. `loadDocumentIntoEditor()`가 검증 성공 후 `input as TufteDocument`를 그대로 반환하여 호출자 수정이 성공 결과를 바꾸는 alias가 있었다.
- 처리: editor 상태 적용 전 구조화 복제본을 만들고 성공 결과로 반환. 호출자 title 및 lexicalState 변경 후 결과 불변성을 검사하는 회귀 테스트 추가.
- 상태: 코드/테스트 반영, 실행 검증 대기(E025/E027). M028 참조.

## E031 — 내보내기 성공 결과의 편집기 상태 alias

- 발견: 2026-10-16 R11 점검. `editorJSONToDocument()`가 validateDocument 결과를 그대로 반환하므로 lexicalState가 호출자/편집기 소유의 mutable state를 참조할 수 있었다.
- 처리: 성공 시 문서 전체를 structuredClone하여 반환. editor state와 base metadata를 사후 변경하는 회귀 추가.
- 상태: 코드·테스트 반영, 실행 검증 대기(E025/E027). M028 확대 적용.

## E032 — R03 테스트 fixture의 빈 섹션 생성

- 발견: 2026-10-16 테스트 자체 검토. 배열 순서 검사를 무조건 수행하도록 변경하면서 synthetic section의 children을 비웠으나 schema는 빈 tufte-section을 거부한다.
- 수정: 유효한 원본 section을 복제하고 기존 자식 하나를 추가해 유효하고 서로 다른 두 섹션을 구성한다.
- 검증: 코드 검토 완료, 실행 테스트 미확인.

## E033 — R03 synthetic section의 중복 note ID 위험

- 발견: 2026-10-16 테스트 fixture 재점검. 원본 section의 자식을 복제하면 기존 sidenote/marginnote의 noteId까지 중복될 수 있어 schema가 거부한다.
- 처리: 두 번째 section은 주석을 포함하지 않는 고유 text paragraph로 구성하여 순서 차이만 검증.
- 상태: 코드 수정, 실행 검증 대기.

## E034 — 외부 전체 검증에서 발견된 세 가지 테스트 실패 (2026-10-16)

- `packages/render/test/render.test.mjs`의 테이블 정규식 이스케이프 오류로 테스트 파일 구문 분석 실패.
- `packages/lexical/test/note.test.mjs`의 이미지 오류 메시지 기대값이 검증 함수 통합 이후 변경된 메시지와 불일치.
- `packages/lexical/test/document-bridge.test.mjs`의 R11 alias 테스트는 빈 assets fixture를 사용하면서 비어 있지 않음을 단언.
- 조치: 각각 정규식 수정, 메시지 허용 범위 수정, 실제 asset fixture 추가. 외부 보고에서 임시 수정 후 render 17/17, document 20/20, lexical 2건 실패를 확인했다고 전달받음. 저장소 수정 후 재실행은 아직 확인되지 않음.

## E035 — migration adapter의 불필요한 타입 강제 변환

- 발견: 2026-10-16 R03 정적 점검. v2→v1 편집기 어댑터가 `Record<string,unknown>`에서 `TufteDocument`로 이중 캐스팅한 뒤 schemaVersion을 덮어쓰고 있었다.
- 영향: v2 계약 변경 시 projection 누락 또는 잔존 필드가 컴파일러에 드러나지 않을 위험.
- 처리: v1 필드를 명시적으로 구성하는 타입 검사 가능한 projection으로 교체하고 hostile v2 envelope 회귀 테스트 추가.
- 상태: 코드/테스트 반영, 실제 타입 검사·테스트 미실행. M032 참조.

## E036 — 저장 문서 버전 판별 전 접근자 실행 위험

- 발견: 2026-10-16 R03 정적 점검. `inspectStoredDocument`가 `isRecord`만 확인한 뒤 `input.schemaVersion`을 읽어, plain prototype을 가진 getter 객체가 검사 중 코드를 실행할 수 있었다.
- 처리: 버전 필드 접근 전에 자체 속성 descriptor와 symbol을 검사해 접근자 포함 객체를 거부한다. getter 미실행 및 실패 진단 경로 회귀 테스트 추가.
- 상태: 코드·테스트 반영, 실행 검증 대기. M033 참조.

## E037 — SQLite adapter에 문자 그대로 삽입된 `\\n`으로 TypeScript 구문 손상

- 발견: 2026-10-16 후속 코드 점검. `sqliteRevisionStore.ts`를 문자열 치환으로 수정하는 과정에서 실제 줄바꿈 대신 역슬래시+n이 소스에 남았다.
- 영향: TypeScript 파서가 해당 파일을 읽지 못해 빌드 차단.
- 조치: literal `\\n`을 실제 줄바꿈으로 교체. 실행 검증 대기. M034 참조.

## E038 — SQLite adapter 파일 전체의 중복 코드 오염

- 발견: 2026-10-16 저장소 원문 재조회. `sqliteRevisionStore.ts`에서 이전 문자열 치환이 메서드 일부를 여러 위치에 중복 삽입하여 TypeScript 파일이 손상됨. E037의 단순 escape 수정으로 해결되지 않았음.
- 조치: 파일을 완전한 단일 구현으로 재작성하고 원격 저장소에 반영. 테스트/타입검사 실행 미확인.
- 예방: M035 참조.

## E039 — 신규 Lexical 노드와 문서 스키마의 정적 계약 불일치

- 발견: 2026-10-16, F17/F18/F19 구현 이후 소스 대조.
- 증상(정적 검토): EmbedNode.aspectRatio는 문자열인데 validator는 유한 숫자 0.1..10을 요구함; 코드 언어 정규식에 점 허용 여부 불일치; ImageQuilt 생성 시 필수 원본 크기를 생략 가능.
- 원인: 신규 노드 구현 시 `packages/document/src/validate.ts`의 실제 제약을 동시에 대조하지 않음.
- 처리: 비율 숫자화, 언어 허용 문자 일치, ImageQuilt 필수 크기 검증, 관련 테스트 fixture 수정.
- 상태: mitigated (소스 수정 확인, 빌드/실행 테스트 미실행). 대책 M036. CI 없음.

## E040 — Embed 제목 길이와 ImageQuilt TypeScript 직렬화 계약 불일치

- 발견: 2026-10-16, F17/F18/F19 정적 계약 재점검.
- 증상: EmbedNode는 제목 최대 500자를 요구하지만 문서 validator는 1000자까지 허용. ImageQuilt는 필수 width/height를 런타임에 검증하지만 직렬화 TypeScript 타입은 선택 속성으로 선언.
- 처리: 제목 길이 1000자로 통일하고 직렬화 타입의 width/height를 필수화. 유효·무효 직렬화 계약 회귀 테스트 추가.
- 상태: mitigated (코드 수정; 실제 실행 검증 미완료). M036 재적용.

## E041 — ImageQuilt 직렬화 필수 속성 및 Embed HTML 내보내기 정책 불일치

- 발견: 2026-10-16, 문서 모델 → 편집기 → 발행 렌더러 정적 계약 재검토.
- 증상: SerializedImageQuilt.width/height는 필수인데 exportJSON()은 선택적으로만 출력하여 TypeScript 정적 타입과 모순. EmbedNode.exportDOM()은 발행 renderer와 달리 sandbox 및 크기 속성을 출력하지 않음.
- 조치: ImageQuilt 필수 필드 무조건 출력, Embed DOM export의 sandbox/referrer/iframe 크기 및 wrapper class 정렬.
- 검증 상태: GitHub 코드 변경 완료, 빌드·실행 테스트 미실행. M036의 node/serializer/render 계약 점검 적용.

## E042 — 최신 main 전체 검증에서 저장 형식 판별 함수 구문 손상

- 발생: 2026-10-16 통합 재검증, d78f455 기준 pnpm check.
- 증상: inspectStoredDocument.ts의 미종결 문자열·중복 함수 본문으로 TS1002/TS1005/TS1128. 선행 빌드 실패로 단위/브라우저 검사는 실행하지 않았다.
- 처리: descriptor 검사와 v1/v2 분기 계약에 맞춰 파일을 단일 구현으로 재구성했다. 접근자를 읽기 전에 거부하는 동작을 보존한다.
- 상태: verified (통합 check/브라우저 전체 통과). M037: 정적 원격 반영과 실제 파싱·타입·테스트 성공을 구분하고 전체 로컬 검증을 완료 증거로 남긴다.

### 오류 ID 중복 정리 (통합 재검증)

이전 기록에 E026/E027/E028 및 M026이 중복 사용됐다. 기존 최초 ID는 유지하고 후반의 신규 노드 계약 기록을 E039/E040/E041, M036으로 재배정했다. 과거 PROGRESS의 해당 제목별 참조는 이 대응표로 읽는다. 기록은 삭제하지 않았다.

## E043 — v2 unknown-field 입력의 진단 기대값 불일치

- 발생: E042 복구 후 전체 check의 document 테스트 47개 중 1개 실패.
- 원인: editorFormat.extra 입력은 UNKNOWN_FIELD가 올바른 계약인데 모든 부정 입력을 UNSUPPORTED_*로 묶어 단언했다.
- 처리: 각 입력과 정확한 오류 코드를 짝지어 버전/engine/unknown field 거부를 구분한다. validator를 약화시키지 않는다.
- 상태: verified (document47/47 통과). M038: 부정 테스트는 실패 여부뿐 아니라 잘못된 입력의 종류와 안정적인 진단 코드를 함께 확인한다.

## E044 — 저장 golden과 메모리 toJSON 객체 직접 비교 재발

- 발생: 전체 check의 Lexical 테스트에서 v2 golden 왕복 assertion 실패. JSON 파일에 없는 undefined optional 속성이 메모리 toJSON 객체에 존재했다(E016 동일 계열).
- 처리: 저장 계약 assertion은 JSON으로 직렬화·재읽기한 값끼리 비교한다. 구조 변형/미지원 속성의 fail-closed 검사와 객체 소유권 회귀는 유지한다.
- 추가 발견: 설치된 Lexical에서 생성한 golden 파일이 없어 1개 테스트가 skip됐다. 명시적 생성 모드로 만들고 내용을 검토한 뒤 커밋하며, 전체 확인은 REQUIRE_LEXICAL_GOLDEN=1로 실행한다.
- 상태: verified (Lexical67/67, golden 필수·skip0). M015/M039.

## E045 — 통합 브라우저 검증의 고정 실행 파일 부재

- 발생: 전체 check 통과 후 test:browser 시작. Playwright 1.51.1의 chromium_headless_shell-1161 실행 파일이 현재 환경에 없어 launch 실패.
- 처리: 고정 버전 공식 Playwright 설치기로 headless shell을 설치한 뒤 재실행한다. 이 실패를 제품 동작 실패나 브라우저 통과로 해석하지 않는다.
- 상태: verified (고정 shell 설치 및 브라우저6개 파일 통과; 이 환경에 한정). M004/M024 적용.

## E046 — 충돌 방지 note namespace 변경 뒤 브라우저 selector 미갱신

- 발생: 기존 브라우저 회귀 5개 중 server-browser의 오래된 ID selector timeout. 앞선 노트/IME/DOM/레이아웃과 5개 폭 서버 비교는 통과했다.
- 원인: R06에서 `tufte-{prefix.length}-{prefix}-{noteId}`로 출력 계약을 바꾸었지만 테스트는 예전 ID를 고정했다. 새 CSS를 포함하지 않은 상태도 발견했다.
- 처리: article/note의 의미 selector로 input을 찾고, 길이 접두사와 두 article ID 비동등성을 명시적으로 검사한다. 발행 CSS를 실제 호스트처럼 포함한다.
- 상태: verified (서버5폭/여러 article 토글 통과). M040: 출력 계약 변경 시 브라우저 소비자·CSS·기능 회귀를 함께 갱신하고 테스트 성공을 확인한다.

## E047 — 신규 브라우저 harness 동적 import 도중 Vite 재탐색 reload

- 발생: 신규 publication-browser가 첫 테스트 모듈을 import하는 동안 Execution context was destroyed.
- 원인: 기존 UI에 없는 의존성을 동적으로 처음 발견하면서 Vite가 dependency 최적화 후 페이지를 reload했다. 제품 입력 오류와 구분한다.
- 처리: 테스트 전용 Vite config에 UI와 harness를 optimizeDeps entry로 지정하여 mount 전 의존성을 탐색한다. 실패를 timeout 증가나 무한 재시도로 숨기지 않는다.
- 상태: verified (test entry 사전 탐색 후 전체 브라우저 통과). M041.

## E048 — iframe 반응형 비율이 실제 브라우저에서 보존되지 않음

- 발생: 신규 publication 브라우저 검사, 1440px에서 16:9/4:3 iframe 모두 폭1260/높이150(비율8.4). unit의 HTML width/height 속성 검사는 통과했었다.
- 원인: iframe은 CSS height:auto와 aspect-ratio:auto만으로 HTML 속성 비율을 반응형으로 계산하지 않는다. max-width:100%도 Tufte의 body/fullwidth 폭을 덮어썼다.
- 처리: 안전한 수치로 만든 aria-hidden SVG spacer가 비율을 제공하고 iframe은 wrapper를 채운다. 외부 CSS만 사용하며 body55%/fullwidth90%/모바일90% 경계를 적용한다. Lexical export도 같은 구조로 맞춘다.
- 테스트 fixture 보완: ImageQuilt는 실제 자체 SVG(120×48)를 정상 로드하고 자연 크기를 확인한다. 실패 이미지를 정상 비율의 증거로 삼지 않는다.
- 상태: verified (실제 CSP/5개 비율×5폭 통과). M042: iframe 속성뿐 아니라 실제 geometry와 정상 이미지 로드를 여러 폭에서 확인한다.

## E049 — 코드 노드 exportDOM의 pre>code 의미 구조 누락

- 발견: 신규 브라우저 검증 경로 정적 대조. 기본 ElementNode export에 맡겨 pre만 생성하고 code wrapper가 없었다.
- 처리: 편집용 createDOM과 별도 exportDOM에서 pre>code 및 정확한 text/tab/newline을 내보낸다. 순수 렌더러의 code direction/alignment 속성도 유지한다.
- 상태: verified (코드 DOM/정확한 공백·방향·정렬 검사 통과). M042에 의미 구조와 원문 공백 비교 포함.

## 2026-10-16 통합 완료 전 오류 전수 점검

E001–E049/M001–M042를 검토했다. E024의 경계 입력은 실제 Chromium 회귀, E026의 충돌 반례는 render 검사, E028–E041의 fixture·소유권·migration·SQLite·신규 노드 계약은 현재 check로 확인했다. 과거 ‘실행 대기’ 서술은 그 당시 이력이며 현재 판정은 통합 보고서를 따른다. E025/E027의 이전 환경은 변경하지 않았고 현재 별도 검증 환경에서 설치·실행에 성공했다. E018 DOM adapter 제한, E004/E005의 다른 환경/브라우저 범위, W001 경고 및 OS 실제 IME 미검증은 유지한다. 기능 확장/복구 UX/폰트/접근성 미구현을 오류 해결로 대신 표시하지 않는다.

## E050 — 공식 code-highlight import가 명시적 null을 생략해 strict 왕복 실패

- 발견: R02 추가 경계 점검. 유효 문서의 highlightType:null을 공식 Lexical에 넣으면 setter가 undefined로 바꿔 export에서 필드가 사라지고 LEXICAL_IMPORT_LOSSY가 반환됐다.
- 원인: null은 저장된 값이며 undefined optional 속성과 달리 JSON에서도 유지되어야 한다. non-null token만 있는 golden은 이 차이를 검출하지 못했다.
- 처리: 공식 편집 동작을 재사용하는 TufteCodeHighlightNode가 null을 보존하도록 setter/import를 구현하고 registry에 단일 클래스로 등록한다. null token을 전체 golden/실제 브라우저 재열기 검사에 추가한다.
- 상태: verified (null 포함 golden 및 React 재열기, 전체178개/브라우저7개 통과). M043: 타입 목록뿐 아니라 nullable 값·기본값·부재의 의미 차이를 실제 런타임 왕복으로 검사한다.

## E051 — public code package가 직렬화 타입을 재노출하지 않음

- 발생: R02 nullable token adapter 첫 build, @lexical/code에서 SerializedCodeHighlightNode를 import해 TS2724.
- 원인: 설치 소스에 존재하는 타입을 facade package가 public export한다고 가정했다.
- 처리: 공개 Lexical SerializedTextNode와 스키마의 명시적 highlightType 계약으로 타입을 정의한다. 추가 내부 경로나 node_modules 패치는 쓰지 않는다.
- 상태: verified (타입/빌드 및 전체 회귀 통과). M044: runtime 클래스 export와 type re-export를 구분하고 실제 소비자 typecheck/build로 확인한다. 선행 build 실패로 후속 테스트는 실행하지 않았다.

## E052 — 같은 wire type을 가진 클래스에 공식 replacement 적용 실패

- 발생: R02 nullable token 수정 후 generator에서 Type code-highlight ... does not match registered node CodeHighlightNode.
- 원인: 공식 replacement descriptor가 동일 type의 registry entry를 원본 클래스로 덮어쓴다. 서로 다른 type을 쓰는 replacement 예제를 동일 wire type에 적용한 것이 잘못이었다.
- 처리: registry에는 null 보존 클래스 하나만 등록하고 $createTufteCodeHighlightNode를 명시적 factory로 제공한다. 공식 CodeHighlightNode/factory와 같은 registry에서 혼용하지 않는다. native syntax highlighting plugin 연동은 지원했다고 주장하지 않는다.
- 상태: verified (단일 클래스 registry로 전체 회귀 통과). M045: wire type별 등록 클래스는 하나로 유지하며 공식 plugin과의 호환성을 별도 검증한다.

## E053 — 문서 로드 뒤 clear만 수행하면 첫 수정의 undo 기준이 사라짐

- 발견: R03.d 실제 registerHistory 회귀에서 B 로드 → B1 수정 → undo 결과가 B1로 남았다.
- 원인: CLEAR_HISTORY_COMMAND가 current도 null로 만든다. stack 길이만 확인했던 기존 테스트는 첫 편집의 기준 소실을 검출하지 못했다.
- 처리: 상태 설치 후 clear하고 HISTORY_MERGE_TAG로 새 문서를 기준으로 재설치한다. clear와 set을 하나의 editor.update에 넣는 시도도 실제 테스트에서 undoStack 1이 남아 채택하지 않았다. 공개 API를 쓰는 명시적 순서로 고정했다.
- 검증: 두 loader의 실제 history 흐름과 React UI 회귀. verified: 전체180개·브라우저7개 통과. M046 참조.

## E054 — 통합 계약 변경 후 성공 경로 테스트 double 누락

- 발견: R03.d 검사에서 fake editor의 dispatchCommand 누락으로 성공 기대 테스트가 실패했다. 초기 일괄 update 구현 때는 update도 누락됐다.
- 원인: parse/set만 가진 최소 fake가 새 history 통합 경계를 모사하지 못했다.
- 처리: 성공 경로 double에 dispatchCommand를 추가하고 기준 재설치 횟수를 반영한다. 실제 registerHistory/React 흐름으로 제품 동작을 별도 검증한다. production에 fake 호환 분기를 추가하지 않는다.
- 상태: verified (전체180개·브라우저7개 통과). M047 참조.

## E055 — R05 비파괴 검사에서 저장 JSON과 메모리 객체 비교 재발

- 발견: R05 전체 검사에서 33종 문서의 undefined optional 필드 때문에 deepStrictEqual 실패. E016/E044와 같은 비교 경계 실수다.
- 원인: 검사 전후 메모리 불변성 검증과 저장 JSON 동등성을 하나의 assertion으로 혼합했다. 기존 대책을 새 테스트 작성에 일관되게 적용하지 못했다.
- 처리: 검사 전 메모리 snapshot과 검사 후 snapshot을 직접 비교하고, 별도 JSON 직렬화 값으로 저장 fixture와 비교한다. null은 그대로 보존한다.
- 상태: verified (전체187개·브라우저7개). M048 참조.

## E056 — R05 브라우저 fixture의 섹션 위치 가정

- 발견: 첫 섹션에 figure가 있다고 가정한 테스트 입력 변경기가 undefined.children으로 실패했다. 실제 golden은 그림/표가 두 번째 섹션에 있다.
- 처리: 전체 트리에서 type으로 fixture 대상을 찾는다. 제품 오류와 테스트 준비 오류를 구분한다.
- 상태: verified (React 3종 구조 복구와 전체187개·브라우저7개). M049 참조.

## E057 — R10 링크 전체 텍스트 교체와 내부 수정의 기대값 혼동

- 발견: 포맷 토글은 링크 URL을 보존했으나 링크 전체 텍스트 선택 후 입력으로 교체하면 Lexical이 링크 컨테이너를 제거해 URL 유지 assertion이 실패했다.
- 처리: 포맷 토글 후 URL 보존을 별도 확인하고, 내부 caret 입력의 포맷·링크 유지 회귀를 추가한다. 전체 링크를 지우고 새 텍스트를 넣는 기본 동작을 내부 텍스트 수정과 혼동하지 않는다. 링크 전체 교체 UX 정책은 P2 편집 기능에서 별도 다룬다.
- 상태: verified (포맷/내부 수정의 URL 보존과 전체189개·브라우저8개). M050 참조. 링크 전체 교체 동작 자체를 수정했다고 주장하지 않는다.

## E058 — 주석 전체 payload에 붙여넣을 때 주석 컨테이너 유실

- 발견: R10 clipboard 실제 입력에서 여백 주석의 전체 텍스트를 선택해 붙여넣으면 note가 제거되어 noteId를 찾을 수 없었다.
- 원인: 기본 RangeSelection.insertNodes가 선택한 inline container까지 교체한다. 기존 helper는 collapsed edge만 처리했다.
- 처리: 같은 주석의 처음부터 끝까지 선택한 payload 교체는 NoteNode를 유지한 채 자식만 바꾼다. forward/backward 단위 회귀와 실제 clipboard로 noteId/kind/format 보존을 검사한다.
- 상태: verified (실제 clipboard 및 양방향 회귀, 전체189개·브라우저8개). M051 참조.

## E059 — 주석 교체 수정에서 일시적 빈 컨테이너와 선택 유실

- 발견: E058 첫 수정의 note.clear() 후 append가 실제 단위 테스트에서 selection lost를 발생시켰다.
- 원인: NoteNode.canBeEmpty=false이므로 자식을 먼저 모두 지우면 컨테이너가 제거된다. 최종 상태만 생각하고 중간 상태의 Lexical 불변식을 놓쳤다.
- 처리: 새 payload를 먼저 append한 후 이전 자식을 제거하고 새 끝으로 선택을 이동한다. 빈 중간 상태를 만들지 않는다.
- 상태: verified (양방향 선택과 clipboard 및 전체 회귀). M052 참조.

## E060 — R11 CAS의 시간 불변식 추가 후 SQL bind 계약 테스트 미갱신

- 발견: 실제 SQLite 검사는 통과했지만 기존 conditional UPDATE 단위 검사에서 bind 배열 기대값이 새 createdAt/updatedAt 조건을 포함하지 않아 실패했다.
- 처리: 조건과 bind 순서를 함께 갱신하고 실제 SQLite의 createdAt 변경·updatedAt 역행 거부 회귀로 의미를 확인한다. SQL 비교 조건을 제거해 옛 테스트에 맞추지 않는다.
- 상태: verified (실제 SQLite/메모리 시간 불변식 및 전체201개·브라우저8개). M053 참조.

## E061 — 폰트 실제 로드 검사에서 Chromium family 표시 문자열 가정

- 발견: R13 CDP 결과가 실제 custom font를 보고했지만 familyName 뒤에 '(Fontations)'를 붙여 문자열 동일성 assertion이 실패했다.
- 처리: 생성된 font의 고정 PostScript name을 manifest에 기록하고 CDP isCustomFont/postScriptName/glyphCount를 함께 확인한다. 플랫폼 표시용 family 문자열의 장식을 데이터 유실로 오인하지 않는다.
- 상태: verified (custom PostScript/glyph 및 원본 비교, 전체 회귀). M054 참조.

## E062 — hmtx advance 합을 브라우저 폭과 동일하다고 가정

- 발견: R13에서 hmtx 합×font-size 기대값 834.624px와 실제 Fontations 폭 828px가 달라 assertion 실패. subset의 hmtx 자체는 원본과 일치했다.
- 확인: 동일 CSS·브라우저에서 고정 Adobe 원본 OTF와 WOFF2를 직접 비교했으며 8개 샘플의 실제 폭/높이가 일치했다. 따라서 이 실패는 subset 데이터 유실의 증거가 아니다. shaping/렌더 backend 세부 원인은 단정하지 않는다.
- 처리: 테이블 메트릭 보존과 실제 브라우저 원본 비교를 분리한다. 원본 직접 비교로 metric fixture를 명시적으로 생성하고 일반 회귀에서는 필수 fixture를 사용한다.
- 상태: verified (8개 샘플+6개 의미 위치 원본 비교 및 필수 metric fixture 회귀). M055 참조.

## E063 — 혼합 문자 폰트 비교의 원본/서브셋 fallback 정책 불일치

- 발견: R13 노트·캡션·표의 원본 비교에서 폭 차이 발생. 원본 @font-face가 ASCII 공백까지 덮고, subset 쪽은 비라틴 범위만 적용해 서로 다른 Latin/fallback을 비교했다.
- 처리: 원본 비교에도 동일한 unicode-range 및 serif/sans fallback을 적용했다. 같은 브라우저·내용·CSS 정책에서 8개 문자 샘플과 6개 의미 위치의 폭/높이가 일치함을 확인했다.
- 상태: verified (원본 비교와 재생성 byte 일치). M056 참조.

## E064 — 폰트 실패 시 DOM 가시성만으로 한글 가독성을 추정할 위험

- 발견: R13 검토에서 기본 환경에 한국어 시스템 폰트가 없고 fc-match :lang=ko가 DejaVu를 반환했다. 글자 박스가 보인다는 검사만으로 한글 글리프 가독성을 보장할 수 없다.
- 처리: CDP의 실제 fallback font를 결과에 포함한다. 전역 환경을 바꾸지 않고 별도 fontconfig를 쓰는 검증에서 Adobe 한글 폰트를 제공한 뒤, webfont 차단 시 SourceHanSansKR-Regular의 실제 시스템 glyph 사용을 확인했다.
- 상태: 기본 환경의 한국어 fallback 부재는 제한으로 유지. 별도 한글 폰트 환경의 실패 fallback은 verified. P4/P6에서 실제 배포 OS별 가독성·font loading 실패를 검증한다. M057 참조.

## E065 — fonts.ready와 실제 교체 paint를 같은 시점으로 가정

- 발견: 별도 한국어 fallback 환경의 150ms 지연 검사에서 fonts.ready 직후 CDP가 이전 fallback을 보고해 custom font assertion이 실패했다.
- 처리: 폰트 전달을 해제하고 fonts.ready 후 두 animation frame을 기다린 다음 실제 glyph 사용을 검사한다. 지연 전 fallback → 지연 후 custom font 전환을 확인했다.
- 상태: verified (기본 환경과 별도 한글 fallback 환경 모두 통과). M058 참조.


## E066 — 외부 검색 서비스의 GitHub 페이지 fetch 차단

- 발견: 폰트 공식 GitHub tree 페이지 open이 DisabledError로 실패했다.
- 처리: 동일 요청 반복 대신 연결된 GitHub API로 공식 repository/ref/파일 목록/라이선스를 읽고 고정 raw URL에서 원본 OTF를 확보했다. commit/blob와 SHA-256을 확인했다.
- 상태: 자료 확보 경로 verified. 검색 서비스 차단 자체를 해제했다고 주장하지 않는다. 제품 테스트와 분리한다. M059 참조.

## E067 — P2.2.a 테스트 fixture의 중첩 생성 괄호 오류

- 발견: 신규 section command 테스트 파일의 한 fixture에 닫는 괄호가 하나 더 있어 Node parser가 실패했다. 제품 명령 실행 전 실패다.
- 처리: note/paragraph/section을 지역 변수로 분리하고 node --check로 먼저 구문을 검사한다. E002의 복잡한 즉석 중첩 구성 실수가 테스트 파일에서도 재발했다.
- 상태: verified (구문 검사 및 전체214개·browser10개). M060 참조.

## E068 — 진단 상태 확인 전에 검사 버튼이 상태를 갱신

- 발견: P2.2.a UI의 거부 원자성 검증은 통과했지만 snapshot helper가 JSON·HTML 버튼을 눌러 status를 바꾼 뒤 이전 주석 진단을 기대해 실패했다.
- 처리: 거부 직후 상태 문구를 확인하고 그 다음 snapshot으로 내용 불변성을 검사한다. 제품 거부 로직과 검사 도구의 부수 효과를 구분한다.
- 상태: verified (실제 UI 진단/원자성 및 전체 회귀). M061 참조.

## E069 — 그림 주석 ID 재발급 테스트가 동일 ID를 반복 생성

- 발견: 연결된 그림 두 개의 중복 noteId를 재발급하는 신규 테스트가 고정 ID 생성기 `()=> 'renewed-copy'`를 사용했다. 두 번째 호출은 첫 번째가 점유한 ID와 충돌해 100회 제한 후 예외가 발생할 수 있었다.
- 처리: 호출마다 고유 ID를 생성하도록 fixture를 수정하고 두 결과의 고유성을 각각 확인한다. 연결된 노드와 실제 분리된 clipboard payload를 구분한다.
- 상태: 코드 수정, Work 실행 검증 대기. M062 참조.

## E070 — 그림 주석 수정에서 E059의 빈 NoteNode 중간 상태 재도입

- 발견: UPDATE_TUFTE_FIGURE_MARGINNOTE_COMMAND가 `note.clear()` 후 새 텍스트를 추가하여, 빈 컨테이너 불허·selection 유실 위험을 다시 도입했다.
- 처리: 새 텍스트 append → 새 텍스트 끝 선택 → 이전 자식 제거로 순서를 변경하고 선택 유지 회귀를 추가했다.
- 상태: 코드 수정, Work 실행 검증 대기. E059/M052 및 M063 참조.

## E071 — cut 이후 copy에서 이전 주석 ID 출처 상태 잔류

- 발견: 예제 편집기의 cutIds는 cut 또는 paste 때만 초기화되어 cut→copy→paste에서 오래된 cut ID를 새 클립보드 내용에 적용할 수 있었다.
- 처리: COPY_COMMAND에 초기화 핸들러를 추가하고 Work 검증에 cut→copy→paste 시나리오를 등록했다.
- 상태: 코드 수정, Work 실행 검증 대기. 외부 앱의 clipboard 변경과 취소된 cut/copy는 미해결. M064 참조.

## E111 — 구형 래퍼 selector의 빈 배열 검사로 브라우저 테스트가 허위 통과

- 발견: `tests/note-browser.mjs`에서 `querySelectorAll('[data-tufte-note]')` 결과에 바로 `.every(...)`를 호출한다. 발행 DOM이 래퍼 없는 `label + input + span` 구조로 변경된 이후 대상이 0개여도 true를 반환한다. 이전 Work의 해당 browser 파일 통과는 노트 발행 HTML 인접성의 독립적 증거가 아니었다.
- 처리: `span.sidenote` 2개 존재를 먼저 강제하고, 각 note의 이전 형제 `input.margin-toggle` 및 `label`, 체크박스·for/id·번호 class·요소 인접성, 구형 래퍼 부재를 검사한다.
- 상태: 코드 수정, 후속 Work 일괄 재실행 전. M102 참조.

## E112 — 구체 노트 타입 전환에 남은 API 기대와 반복 그림 삽입의 역순

- 발견: `figure-commands.test.mjs`에서 삭제된 `getKind()`를 호출하고, `note.test.mjs`는 future-version import가 기존 `Unsupported` 오류를 던질 것으로 기대했다. 새 `SidenoteNode.importJSON()`은 `Invalid sidenote`를 반환한다. 그림의 기본 `after-image` 삽입은 매번 이미지 바로 뒤에 붙여 연속 주석의 순서가 역전됐다.
- 처리: 테스트는 실제 구체 타입 및 버전 거부 메시지를 확인한다. 그림 노트 삽입은 이미지 뒤에 연속된 `MarginnoteNode` 중 마지막 뒤에 넣어 기존 순서를 유지한다. before/after 위치에 각각 두 번 삽입한 순서와 캡션 보존을 확인하는 단위 회귀를 추가했다. 타입 변경 테스트는 Lexical 공식 `replace(replacement, true)`로 자식 트리를 옮겨 일시적 빈 주석을 만들지 않게 수정했다.
- 상태: 수정 코드와 회귀 추가, 빌드·테스트 실행은 대기. M103 및 E059/M052 참조.

## E113 — Lexical HTML export와 발행 렌더러의 newthought 레이블 부모 불일치

- 발견: P2 노트 모델을 구체 타입으로 이전한 뒤 새 실제 HTML 비교 시나리오를 설계하면서, 발행 렌더러는 연속된 `newthought / sidenote`에 대해 레이블을 `span.newthought` 내부에 넣지만 `NoteNode.exportDOM()`은 모든 레이블을 체크박스와 같은 부모의 형제로 출력한다는 차이를 확인했다. JSON 논리 모델은 형제 관계가 맞다.
- 처리: Lexical HTML 내보내기에서만 직전 논리 형제가 `TufteSpanNode(kind='newthought')`이며 부모가 paragraph인 경우 앞서 출력된 `span.newthought`에 레이블을 추가한다. `input + span.sidenote`은 paragraph 형제로 유지한다. 중간 일반 텍스트, 다른 종류의 노트, 다른 부모는 결합하지 않는다. 실제 `$generateHtmlFromNodes`와 `renderArticle`가 같은 문서의 6개 주석(풍부한 payload/그림/직접 인접/텍스트 간섭/여백 노트)을 동일한 구조로 출력하는 브라우저 회귀를 추가했다.
- 상태: 코드 및 테스트 커밋 완료, **Work 재실행 전**. DOM/소비자 검사 실제 결과를 받기 전에는 verified나 phase 완료로 표시하지 않는다. M104 참조.
