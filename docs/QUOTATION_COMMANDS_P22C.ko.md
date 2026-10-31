# P2.2.c 인용문·출처·epigraph 명령 계약

2026-10-31, 기준 `339a7b3`. P2.2.c.1의 **지원/거부 범위 설계**다. C1.a/b 명령은 아래 후속 보고서 범위에서 구현했다. 이 문서는 P2.2.c/P2.2.c.2 완료 증거가 아니다.

## 현재 구현

`packages/lexical/src/quotationCommands.ts`, `QuotationNodes.ts`, `SectionFooterNode.ts`, `blockSerialization.ts`와 `packages/document/src/schema.ts`, `packages/render/src/index.ts`를 대조했다. 예제 React UI에는 생성·출처 추가·URL 수정/해제·삭제·epigraph 항목 추가/이동 버튼이 있다. 일반 텍스트 입력 가능 여부와 구조 편집 전용 명령 지원을 구분한다.

| 대상 | 기존 명령/동작 | 후속 구현 범위 |
| --- | --- | --- |
| F07 구분선 | 섹션 블록 뒤 삽입 | 선택한 구분선만 삭제, 앞뒤 블록 보존 |
| F07 섹션 출처 | section-footer 생성, cite 1개 추가 | cite 삭제, footer 전체 삭제; 텍스트 수정은 기존 입력 경로 검증 |
| F08 인용문 | quote 생성, attribution 1개 추가 | cite URL 설정/해제, attribution 삭제, quote 전체 삭제 |
| F08 인용 출처 | attribution 안에 텍스트와 cite 생성 | 저자·문헌 텍스트는 기존 입력 경로 검증; 출처 삭제는 자식 전체를 명시적으로 삭제 |
| F09 epigraph | quote 1개를 가진 epigraph 생성 | 같은 epigraph 내부 quote 추가·이동·삭제, epigraph 전체 삭제 |

`quote.cite`는 blockquote의 URL 속성이다. `tufte-attribution`은 footer, `tufte-cite`는 문헌 이름의 의미 요소다. 세 값을 서로 변환하지 않는다. URL 수정은 기존 문서 URL validator 정책을 재사용하며 빈 값은 속성 삭제로 정의한다. runtime의 metadata quote alias는 canonical 저장 경계를 사용한다.

공식 원본 대응은 `UPSTREAM_DOM_PARITY_P22E.ko.md`의 `div.epigraph > blockquote > p + footer > cite` 행과 고정 fixture의 epigraph 구조다. 현재 발행은 render/index.ts의 div.epigraph/blockquote/footer/cite를 따른다. 구분선·section footer는 공식 예제 등장 여부와 별개로 스키마의 확장 지원 범위를 검사한다. 오래된 대응표의 note wrapper 설명을 현재 구현의 근거로 사용하지 않는다.

## 구조 변경의 공통 계약

- 최상위 root의 section 안에서 collapsed RangeSelection으로 대상을 정한다. 구분선은 텍스트 caret이 없는 decorator이므로 단일 HorizontalRuleNode의 NodeSelection도 삭제에 허용한다. note 내부·범위 선택·composition·대상 없음·잘못된 부모/자식 구조는 `INVALID_QUOTATION_SELECTION` 진단과 무변경으로 거부한다. 기존 생성 명령의 현재 지원 범위를 이 신규 계약만으로 축소하지 않는다.
- epigraph 항목은 직접 자식 quote 하나와 그 안의 본문·출처·노트 전체다. 추가는 선택 항목 뒤, 이동은 인접 항목과 순서를 교환한다. 처음/끝을 넘는 이동은 진단·무변경이다. 항목 삭제 후 빈 epigraph를 남기지 않고 마지막 항목이면 wrapper도 삭제한다.
- attribution 삭제는 quote 본문을 보존한다. cite 삭제는 소속 footer/attribution의 나머지 텍스트를 보존한다. quote 삭제는 소속 epigraph가 비는 경우 wrapper까지 제거한다. footer/epigraph 전체 삭제는 명시적인 별도 동작이다. 문단으로 해제하거나 내용을 다른 섹션으로 옮기는 동작은 이번 범위에 넣지 않는다.
- 삭제 후 선택은 다음 형제 시작, 없으면 이전 형제 끝으로 복귀한다. section의 마지막 블록을 지우면 빈 paragraph 하나를 두어 편집 위치를 보장한다. 다른 section의 내용·선택을 임의로 변경하지 않는다.
- 모든 유효 구조 변경은 한 Undo/Redo 단위다. 무효 명령은 내용·선택·이력을 바꾸지 않는다. 이동은 기존 노드 identity·노트 ID·서식·링크·방향·자식 순서를 유지한다. URL 등 미지원 속성을 조용히 지우지 않는다.
- 생성/수정/삭제 버튼은 명령과 동일한 지원 경계를 적용한다. 일반 Backspace/Delete의 모든 구조 동작을 이 계약으로 지원했다고 주장하지 않는다.

## 후속 체크리스트

- [x] C1.a URL 설정/해제 및 attribution/cite/구분선/footer/quote/epigraph 삭제 명령과 public export, 예제 UI 연결.
- [x] C1.b 같은 epigraph 내부 항목 추가/인접 이동/삭제, 첫·중간·끝·마지막 항목 및 잘못된 구조 거부.
- [x] C2.a 각 명령의 내용·선택·노트 ID 보존/거부 원자성 및 한 Undo/Redo.
- [x] C2.b canonical JSON 저장·재열기와 순수 renderer의 blockquote/URL/footer/cite/epigraph 자식 순서·개수 검사.
- [ ] C2.c 실제 1440/375px UI에서 키보드 접근·포커스 복귀·텍스트 수정과 다른 섹션 불변성 검사. 실제 OS IME·스크린리더 검증은 P6 증거와 연결한다.

## 이번 검증

frozen install과 workspace build 통과. `node --test packages/lexical/test/quotation-commands.test.mjs`: 기존 13개와 신규 18개, 총 31개 통과(실패/skip 0). 신규 검사는 기존 6개 명령/payload의 범위 선택·composition·note 내부 거부에 대한 전체 JSON 및 선택 보존, 진단 1회를 검사한다. append 명령의 range/composition fixture에는 실제 quote/footer 대상을 만든다. note fixture는 스키마가 허용하는 별도 paragraph 안에 둔다.

이 결과는 기존 생성 명령의 guard 증거다. 신규 수정·삭제 명령, 실제 OS IME, 브라우저 접근성, 전체 회귀는 이번에 검증하지 않았다. CI 생략. E132/M122의 경계 공유·canonical 타입 원칙과 M117–M121의 실제 저장/발행·검증 범위를 시작/종료에 점검했다. 다음은 C1.a 구현이다.

## C1.a 구현 — 2026-10-31

- `SET_TUFTE_QUOTE_CITE_COMMAND`: string URL 설정, null/빈 문자열 해제. 문서의 isSafeURL(link) 정책을 그대로 사용한다. wrapper의 방향·정렬·indent·textFormat/textStyle과 자식·노트 identity·caret을 보존한다. 같은 값은 내용·이력을 바꾸지 않는다.
- `REMOVE_TUFTE_QUOTATION_COMMAND`: quote/epigraph/section-footer/attribution/cite/horizontalrule의 명시적 대상 삭제. 전체 선택 블록의 부모/자식 구조와 root-level section 소속을 확인한다. quote 삭제로 마지막 epigraph가 비면 wrapper도 제거한다. section의 마지막 블록 삭제는 paragraph를 남기고, quote의 마지막 attribution 삭제도 빈 paragraph로 편집 위치를 유지한다.
- cite 삭제의 history 보존은 E133/M123을 따른다. 이동 명령과 달리 삭제 후 attribution/footer wrapper key는 갱신될 수 있다. 남은 자식·노트 ID·metadata는 유지한다.
- 예제 toolbar에 URL 수정/해제와 6종 삭제 버튼을 연결했다. `pnpm test:quotation-editing`으로 집중 UI 검사를 실행하며 test:browser에도 포함했다.
- C1.b 항목 추가/이동과 P2.2.c.2의 전체 노드/거부 행렬·실제 OS IME·스크린리더 수락은 남아 있다. 최종 실행 결과는 PROGRESS의 C1.a 항목을 따른다.

최종 C1.a 검증: pnpm check551개(실패/skip0), quotation 관련63개(기존31+신규32), 실제 UI1440/375px, package5개 통과. 전체 브라우저/공식pixel/Python 및 CI는 재실행하지 않았다. C1.b와 C2 전체 체크는 유지한다.

## C1.b epigraph 항목 관리 — 2026-10-31

`APPEND_TUFTE_EPIGRAPH_ITEM_COMMAND`는 선택한 quote 바로 뒤에 새 quote를 추가한다. `MOVE_TUFTE_EPIGRAPH_ITEM_COMMAND`의 up/down은 같은 epigraph의 인접 quote와 순서를 바꾼다. epigraph element 자체·다른 블록·범위·composition·note 내부·malformed 구조와 첫/끝 경계는 진단·무변경이다. 이동 시 기존 노드를 재사용해 quote URL·본문·출처·노트 ID·서식과 caret을 보존한다. 예제 UI에 추가·위로·아래로 버튼을 연결했다.

`quotation-editing.test.mjs`는 추가/양방향 이동의 한 Undo/Redo·canonical 재열기·발행 및 거부 행렬을 검사한다. `quotation-editing-browser.mjs`는1440/375px에서 실제 추가·이동 순서와 한 Undo/Redo·기존 삭제 경로를 검사한다. 전체 P2.2.c.2 수락, 실제 OS IME·스크린리더는 미완료다. 최종 수치는 PROGRESS의 C1.b 기록을 따른다.

## C2 통합 검증 보강 — 2026-10-31

삭제6종 × range/composition/note 18개를 추가했다. horizontalrule은 텍스트 RangeSelection을 허용하지 않는 거부 경계이며 단일 NodeSelection의 성공 경로는 기존 테스트다. 내용·선택 의미·진단1회·빈 undoStack을 확인한다. 신규 전용45개+거부18개=63개, 기존 생성31개와 합쳐94개다.

실제 UI에서 생성·추가·이동한 epigraph2항목을 DOM editor에서 canonical export→JSON 직렬화→새 DOM editor로 재열기한다. 문서 전체 동일성과 native HTML2경로/순수 renderer의 epigraph 직접 자식 blockquote 순서·본문·cite URL을 비교한다. 1440/375px 모두 통과했다. 보조 harness는 document.body를 교체하므로 독립 탭에서 실행한다(E134/M124).

이 검증은 C2.a/b의 지원 경계를 보강한다. 각 생성 명령의 history 전수, 속성 조합 전체와 C2.c 키보드 전용 조작/포커스·실제 텍스트 수정 전체는 아직 미완료이므로 상위 P2.2.c.2/P2.2.c를 체크하지 않는다. 실제 OS IME/스크린리더도 P6에 남는다.

## C2 이력·키보드 실행 검증 — 2026-10-31

생성/추가6개 command/payload(quote/epigraph/section-footer/hr/attribution/section-cite)에 각각 한 Undo/Redo와 인접 section 불변성6개를 추가했다. 기존 생성31+6=37개, 편집/거부63개와 합계100개다. 전체 unit588개(Lexical400) 통과, 실패/skip0.

1440/375px UI에서 버튼 focus→Enter 또는 Space로 인용 생성·출처 추가·문헌 삭제·출처 삭제·quote 삭제·epigraph 생성/추가/양방향 이동·section-footer 생성/삭제·hr 생성/삭제·URL 해제를 실행하고 주 editor가 activeElement를 포함하는지 검사한다. 본문·문헌·section-footer에 실제 키보드 텍스트 입력도 검사한다. URL 설정의 prompt 경로와 DOM 재열기/발행 순서 비교는 기존 검사를 유지했다.

직접 button.focus를 쓰므로 **Tab만으로 모든 버튼에 도달하는 경로 전체**를 검증한 것은 아니다. C2.c는 Tab 순서·읽기 순서 검사와 실제 OS IME/스크린리더(P6) 연결을 남겨 체크하지 않는다. C2.a/b는 명시된 자동화 범위에서 체크한다. 상위 P2.2.c.2/P2.2.c는 미완료다. 제품 코드/build/typecheck/package/full browser/pixel/Python/CI 변경·재실행은 없다. 시작/종료에 E133/M123·E134/M124의 history/선택 의미·독립 harness 탭 원칙을 적용했고 새 오류는 없었다.

## Tab·DOM 읽기 순서 자동화 완료

[2026-10-31 실행 범위](VERIFICATION_QUOTATION_ACCESS_2026-10-31.ko.md): 실제 Tab/Shift+Tab으로 인용 버튼17개 정/역순 도달, 편집 문서의 blockquote→footer→cite DOM 텍스트 순서,1440/375px 통과. C2.c의 자동화 부분을 확인했으며 실제 스크린리더 낭독은 P6.2/P6.6 수동 체크로 남긴다. C2.c와 상위 인용 수락 체크는 유지한다.

## Work 일괄 검증 절차 — 추가 테스트 미실행

이 절은 이후 작성된 회귀 테스트의 **실행 안내**다. 아래 명령의 성공 여부를 아직 확인하지 않았으며, 위에 적힌 과거 통과 기록과 구별한다.

프로젝트 루트에서 의존성을 설치한 환경(Node.js 22 이상, pnpm 11.25.0, Playwright Chromium 설치)에서 다음 순서로 실행한다.

```sh
pnpm build
node --test packages/lexical/test/quotation-editing.test.mjs
node --test packages/lexical/test/quotation-commands.test.mjs
node tests/quotation-editing-browser.mjs
pnpm test
pnpm test:browser
```

`pnpm test:quotation-editing`은 `pnpm build` 후 브라우저 테스트를 실행하는 단축 명령이다. `pnpm test:browser`에는 동일한 quotation 브라우저 테스트가 이미 포함되어 있으므로 집중 실행 뒤 전체 실행하면 **의도적으로 중복 실행**된다. 실패 재현 단계에서는 집중 실행을 먼저 사용하고, 전체 회귀 확인 단계에서 전체 스크립트를 사용한다. CI는 사용자가 별도로 요청하기 전까지 실행하지 않는다.

### 확인 항목

- 단위: 첫·중간·마지막 항목 추가/삭제/이동, 잘못된 이동 방향과 malformed sibling 거부, 문서·선택 불변성, 한 Undo/Redo 단위, canonical JSON 재열기와 발행.
- 브라우저(1440px/375px): Enter/Space 버튼 활성화, Tab/Shift+Tab 순서, 편집기로 포커스 복귀, 이동 직후 텍스트 입력, 이동 경계의 무변경, 삭제 후 Undo/Redo, 발행 HTML 읽기 순서.
- 브라우저 테스트의 `snapshot()`은 JSON 검사 버튼을 클릭해 **DOM 포커스를 옮긴다**. 포커스 복원 여부는 `snapshot()` 호출 전에 키보드 입력과 DOM 검증으로 확인한다.
- 브라우저 테스트는 하나의 페이지에서 여러 편집 동작을 이어 수행한다. 실패 시 assertion의 작업명·화면 너비를 확인하고 해당 단계의 직전 상태를 재현한다. 현재 테스트를 독립 fixture로 완전히 분리했다고 주장하지 않는다.
- 브라우저 자동화 성공은 실제 OS IME 조합 입력과 스크린리더 낭독의 통과 증거가 아니다. 해당 수동 검증은 P6에서 별도로 처리한다.

### 실패 시 기록

실패 명령, 화면 너비, assertion 메시지, 최초 실패 단계, 기대 JSON과 실제 JSON 차이, 편집기 DOM 포커스 상태, 재현에 사용한 커밋 SHA를 함께 남긴다. 첫 실패를 수정한 뒤 집중 테스트를 다시 실행하고, 마지막에 전체 회귀를 확인한다. 실패 결과를 실행하지 않은 테스트의 성공으로 기록하지 않는다.

## P2.2.c.2 자동화 수락 경계 — 신규 회귀 실행 대기

최근 추가된 단위·브라우저 회귀는 다음 항목을 명시적으로 확인하도록 작성했다. **실행 전이므로 P2.2.c.2 및 상위 P2.2.c 체크는 유지한다.**

| 수락 조건 | 작성된 검증 | 아직 남은 증거 |
| --- | --- | --- |
| 인용 항목 추가·중간 삭제·순서 이동 | quotation-editing.test.mjs: 3항목 순서·중간 삽입/삭제·경계·반복 이동 | 신규 회귀 실행 결과 |
| 내용·노트·출처·선택 보존 | quote subtree 동등성, caret 및 잘못된 선택의 원자적 거부 | 신규 회귀 실행 결과 |
| Undo/Redo 한 단계 | append/move/remove의 이전·이후 JSON 비교 | 신규 회귀 실행 결과 |
| 저장·재열기·발행 | canonical 재열기와 순수 renderer 비교 | 신규 회귀 실행 결과 |
| 브라우저 키보드·포커스 | 1440/375px Enter/Space, 이동 후 직접 입력, 경계·삭제 이력 | 신규 브라우저 회귀 실행 결과 |
| 실제 보조기기 | DOM 읽기 순서 자동화는 기존에 검증됨 | OS별 IME·실제 스크린리더 수동 확인(P6) |

**단계 완료 판정:** 새 테스트를 Work에서 실행해 실패를 해결하고, 기존 실행 기록과 새 커밋을 구분한 증거를 남긴 뒤 P2.2.c.2의 자동화 범위를 판정한다. 실제 스크린리더/OS IME가 P6에 남는 한 전체 접근성 완료라고 표시하지 않는다. 그다음 계획 순서인 P2.2.d.1의 F01–F09 capability 전수 대조로 진행한다. P2.3이나 자산 UI를 앞당기지 않는다.
