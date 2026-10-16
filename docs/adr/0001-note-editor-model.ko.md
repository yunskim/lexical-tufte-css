# ADR-0001: 주석은 단일 Lexical 상태의 inline container로 편집한다

- 결정일: 2026-10-16
- 상태: 채택 (v1의 phrasing 주석 범위, P1.3)
- 근거 버전: Lexical / @lexical 0.52.0
- 관련 작업: P1.1–P1.3, E007/E009/E010/E011/E012, M006/M008–M011

## 결정

사이드노트와 여백 주석의 작성 모델은 `NoteNode extends ElementNode`인 inline container로 유지한다. 본문과 주석은 한 `EditorState` 안에 있으며, 노트 본문을 별도 nested editor에 보관하지 않는다. `kind`는 sidenote/marginnote를 구분하고 영구 `noteId`는 표시 번호와 분리한다.

편집 DOM과 발행 DOM은 다른 구조를 사용한다. 편집 중의 selection, composition, toolbar UI와 주석 번호 표시가 발행 HTML 구조를 결정하지 않는다. 발행 출력은 JSON을 바꾸지 않는 변환이다.

이 결정은 현재의 인라인 콘텐츠 주석에 대한 것이다. 블록 주석을 나중에 지원한다면 별도 스키마와 렌더링 구조를 설계한다. 현재 span 주석 안에 p/div/table을 넣거나 임의로 평탄화해 지원했다고 보지 않는다. 구체적인 콘텐츠 허용 목록과 거부 진단은 P1.5/P2에서 확정한다.

## 비교 근거

| 관점 | 단일 상태 inline container | nested editor |
| --- | --- | --- |
| 문서 소유권 | 부모 트리에 주석 내용까지 포함 | 별도의 editor state를 owning node/문서 저장과 연결해야 함 |
| 선택·키보드 | 같은 selection에서 본문/주석을 이동. inline 경계 보완 필요 | 별도 selection 사이의 focus·진입·탈출 연결 필요 |
| undo/redo | 같은 history에서 주석·본문 구조 변경을 검증함 | 동일 HistoryState를 명시적으로 연결하면 editor 간 undo 지원. 불가능하다고 판단하지 않음 |
| 복사·이동 | wrapper 추출·복사 ID 재발급·cut ID 보존을 검증함 | owning node와 nested payload의 복제/저장/이동 연결을 추가 설계해야 함 |
| 입력 | native/programmatic/IME 경계의 차이를 실제 발견하고 수정함 | 독립 root 입력을 사용할 수 있으나 모든 IME 문제가 해결된다는 실험 근거는 없음 |
| 플러그인 | 한 편집기에 동작 등록 | NestedComposer만으로 부모 plugin 등록이 모두 전달되지는 않음. 필요한 child 등록과 namespace를 구성해야 함 |
| 발행 HTML | 노트의 phrasing 자식을 span payload로 변환 | nested root의 블록 콘텐츠를 유효한 span 출력으로 변환할 추가 정책 필요 |
| 현재 검증 수준 | P1.1 및 P1.2 Chromium 편집 회귀, P1.3 DOM 검사 | 고정 버전 소스 검토와 headless 상태/history 비교 실험. 완성된 nested UI prototype은 만들지 않음 |

두 방식의 성능을 측정해 순위를 매기지 않았다. 이번 선택의 기준은 이미 요구하는 주석 범위를 충족한 단일 문서 구조와 검증된 편집 흐름이다. 복수 editor 상태를 도입할 만큼의 별도 블록 편집 요구는 현재 없다.

## 직접 확인한 사실과 판단의 구분

1. `LexicalNestedComposer.tsx`의 props 문서와 구현을 읽었다. 별도 editor를 받고, parent/theme/node/namespace/editable 연결을 다루며 plugin 등록은 별도로 고려해야 한다.
2. `@lexical/history`의 `HistoryState`와 `registerHistory`, undo 구현을 읽었다. HistoryStateEntry에는 editor가 포함되고 여러 editor가 명시적으로 history를 공유할 수 있다.
3. `nested-comparison.test.mjs`에서 child 쓰기가 부모 JSON·update listener·selection을 변경하지 않는 것을 확인했다. 저장 정합성에는 별도 연결이 필요하다는 판단의 근거이며, nested 구현이 불가능하다는 주장은 아니다.
4. 같은 실험에서 공유 history를 등록한 후 부모에서 실행한 undo가 child의 최신 변경을 되돌리는 것을 확인했다.
5. inline의 P1.2 15개 시나리오와 이번 DOM 회귀가 통과했다. 다만 Chromium protocol 조합 검증이 OS별 실제 IME 검증을 대신하지는 않는다.

## DOM 계약

편집 DOM 예시:

```html
<span class="tufte-note-editor" data-note-id="n1" data-kind="sidenote">
  <!-- Lexical이 소유하는 phrasing 자식 -->
</span>
```

발행 DOM 예시:

```html
<span data-tufte-note="n1">
  <label for="prototype-n1" class="margin-toggle sidenote-number"></label>
  <input id="prototype-n1" type="checkbox" class="margin-toggle">
  <span class="sidenote">주석 내용</span>
</span>
```

- label → input → span payload는 같은 부모의 직계 형제로 순서를 유지한다. CSS의 `:checked + .sidenote/.marginnote`가 작동해야 한다.
- marginnote는 payload class를 바꾸고 label에 ⊕를 표시하며 sidenote-number를 붙이지 않는다.
- 편집용 class, data-lexical-* 및 contenteditable은 발행 HTML에 포함하지 않는다. 이미지의 src/alt처럼 의미적인 속성만 공유한다.
- export 전후 canonical JSON은 같아야 한다. 체크박스의 기본 상태는 unchecked다.
- 현재 `prototype-` ID prefix는 개발용이다. 복수 article namespace와 결정적 export 옵션은 P4.1/F22에서 구현·검증한다. 이번 단계에서 여러 글 ID 격리가 완료됐다고 보지 않는다.
- upstream CSS의 375px 토글 동작을 실제 Chromium에서 확인했다. 전체 반응형·폰트·접근성 gate는 P4/P6에 남아 있다.

## 비용과 후속 조건

채택으로 인해 E007/E010/E011의 경계 보완 코드를 유지해야 한다. 신규 입력·clipboard 경로를 추가할 때 기존 텍스트 입력 검사만 재사용하지 말고 해당 경로의 회귀를 추가한다. 현재 React 예제에 있는 등록 코드는 P2/P3에서 재사용 plugin 계층으로 옮기고 정책을 한 곳에서 유지한다.

다음 조건이면 이 ADR을 재검토한다.

- 필수 콘텐츠가 phrasing 범위를 벗어나 별도 편집 root가 필요해질 때.
- 실제 OS IME 또는 Firefox/WebKit에서 단일 상태 모델의 중요한 결함이 해결되지 않을 때.
- 여러 root의 selection/history/persistence를 일관되게 처리하는 검증된 연결 구조가 생기고 이점이 입증될 때.

재검토는 기존 JSON을 조용히 바꾸지 않는다. schema migration·회귀 fixture·발행 동등성 검증을 함께 준비한다.

## 검증과 출처

- `pnpm check`: strict 타입·빌드·headless 검사에 nested 비교 실험 포함.
- `pnpm test:browser`: P1.1, P1.2, P1.3 DOM 회귀.
- [NestedComposer 0.52.0 소스](https://github.com/facebook/lexical/blob/v0.52.0/packages/lexical-react/src/LexicalNestedComposer.tsx)
- [history 0.52.0 소스](https://github.com/facebook/lexical/blob/v0.52.0/packages/lexical-history/src/index.ts)
- 설치한 동일 버전 패키지의 `src/LexicalNestedComposer.tsx`, `@lexical/history/src/index.ts`와 위 원격 소스를 확인했다.
- 구현: packages/lexical/src/NoteNode.ts, InlineImageNode.ts, noteOperations.ts, examples/editor/src/main.tsx.
- 비교 실험: packages/lexical/test/nested-comparison.test.mjs.
- DOM 검증: tests/note-dom-browser.mjs. Tufte 기준 CSS는 fixtures/tufte/upstream/tufte.css.
