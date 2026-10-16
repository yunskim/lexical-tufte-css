# R02 — 전체 노드의 저장 왕복 계약

2026-10-16 완료. Lexical 0.52.0 / document schema v1·v2의 현행 editorFormat1 기준이다. CI는 사용하지 않는다.

## 공통 등록 목록

`@lexical-tufte/lexical`은 `TUFTE_NODES`, `TUFTE_NODE_CLASSES`, `TUFTE_NODE_TYPES`, `TESTED_LEXICAL_VERSION`을 제공한다. 등록 목록은 동결된 class 배열이며 Node 타입 목록은 Lexical 기본5종(root/paragraph/text/linebreak/tab)과 추가28종을 합친 33종이다. document의 NODE_SCHEMA와 정확히 일치해야 한다. 예제 React 편집기와 단위/브라우저 하네스는 같은 목록을 쓴다.

```ts
import {createHeadlessEditor,TUFTE_NODES,loadDocumentIntoEditor,exportEditorToDocument} from '@lexical-tufte/lexical';
const editor=createHeadlessEditor({namespace:'my-editor',nodes:TUFTE_NODES,onError(error){throw error;}});
const loaded=loadDocumentIntoEditor(editor,document);
if(loaded.ok){
  const exported=exportEditorToDocument(editor,loaded.value);
  // exported.ok를 확인하고 저장한다. 실패 시 diagnostics를 처리한다.
}
```

등록은 데이터 지원이다. 삽입 명령·속성 패널·키보드 동작 또는 모든 HTML 발행 capability의 완료를 뜻하지 않는다. 기존 strict bridge의 알 수 없는 필드/버전 거부와 import 손실 검사도 유지한다.

## 실제 런타임 golden

경로: `packages/lexical/test/golden/lexical-0.52.0-all-nodes.json`.

- 실제 고정 버전 Lexical에서 생성한 전체 document envelope다. 모든 schema 타입33종이 존재하는지 검사한다.
- h2/h3, 네 가지 Tufte span, 여러 text format, 링크와 managed image, 양쪽 note kind, 복수 section, 중첩 ol/ul, 정의목록, 인용/epigraph/출처/cite/footer, hr, 두 figure 폭과 caption/그림 marginnote, fullwidth, code/tab/br/highlight, ImageQuilt, 양 provider/wrapper/폭, 표 세 layout과 header를 포함한다.
- 자산 ID/URL/크기와 문서 전체 note ID 유일성을 검사한다. representative variant를 포함하며 모든 속성 조합의 Cartesian coverage를 주장하지 않는다.
- golden과 런타임 생성 결과를 byte 단위 JSON으로 비교한다. 저장 JSON과 메모리 undefined optional 속성은 구분하며 실제 null·배열 순서·필드는 지우지 않는다.
- golden 파일 누락은 실패다. 일반 테스트는 파일을 수정하지 않는다.

의도적인 갱신은 설치 버전 확인 후 명시적으로 수행한다.

```sh
pnpm build
UPDATE_ALL_NODES_GOLDEN=1 OVERWRITE_ALL_NODES_GOLDEN=1 node packages/lexical/test/update-all-nodes-golden.mjs
git diff -- packages/lexical/test/golden/lexical-0.52.0-all-nodes.json
pnpm check
pnpm test:browser
```

처음 생성할 때는 OVERWRITE flag가 필요 없고, 기존 파일을 바꿀 때는 두 flag가 필요하다. generator는 공개 package entry에서 manifest를 찾아 설치 버전이 TESTED_LEXICAL_VERSION인지 확인한다. 다른 버전 출력을 현재 이름에 덮어쓰지 않는다.

## code-highlight의 null 보존

공식 CodeHighlightNode는 highlightType:null을 import할 때 undefined로 바꾸었다. v1 스키마에서 null은 유효한 저장 값이므로 이를 생략하면 strict bridge가 LEXICAL_IMPORT_LOSSY를 반환한다(E050).

`TufteCodeHighlightNode` 및 `$createTufteCodeHighlightNode(text, highlightType)`가 그 값을 보존한다. 기본 highlightType은 null이다. 공통 registry에는 이 클래스만 등록한다. **같은 wire type의 공식 CodeHighlightNode/factory를 혼용하지 않는다.** 동일 type에 공식 replacement descriptor를 겹쳐 쓰면 registry 클래스가 충돌한다(E052).

이 변경은 저장 계약의 null을 보존하며 validator/bridge의 무손실 검사를 약화시키지 않는다. 실제 React 저장·재열기 검사에도 null/keyword/number 토큰을 포함했다. 공식 syntax highlighting plugin 연동이나 syntax metadata HTML 발행을 지원했다고 주장하지 않는다. 해당 발행 경로는 현재 profile에서 차단한다.

## 검증 결과

- `pnpm check`: **178/178 PASS, fail/skip/todo0**. document47 + lexical104 + render27.
- 타입별33개 검사에서 알 수 없는 필드와 미래 node version을 각각 주입해 정확한 진단 및 기존 editor state 불변성을 확인했다.
- 전체 document는 실제 editor에서 두 번 왕복하고 v1→v2 envelope migration 후에도 저장 값을 비교한다. 반환 snapshot과 note/asset의 입력 객체 참조 분리도 검사한다.
- `pnpm test:browser`: 기존6개 + 새 all-nodes-browser, **7개 실행 파일 모두 PASS**. 실제 예제 React 편집기가 전체 golden을 로드하고 정의 term을 수정해 저장/재열기하면서33종·null token·note ID·구조를 보존한다.
- 전체 golden은 데이터상 유효해도 현재 HTML renderer가 미지원 속성/메타데이터에 대해 html:null을 반환하는 별도 회귀를 포함한다.
- frozen install 및 diff check PASS. editor JS557.00kB(gzip171.59kB), W001 유지. 브라우저는 Chromium134 headless shell이며 OS IME/다른 브라우저 통과를 주장하지 않는다.

새 오류: E050(null 소실), E051(facade type 미노출), E052(같은 type replacement 충돌). M043–M045를 적용하고 전체 회귀를 통과한 범위에서 해결 처리했다.

다음 항목은 R03.d의 실제 UI 문서 교체와 undo/redo 이력 초기화다. R05 복구 UX, P2.2/P2.3 편집 명령·속성 패널, 폰트/P4·접근성/P6 등은 남아 있다. F표를 완료 처리하지 않는다.
