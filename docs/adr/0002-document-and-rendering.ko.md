# ADR-0002 — 문서 정본과 서버 렌더링 경계

상태: 채택. 2026-10-16, P1.5. 적용 기준 Lexical 0.52.0 / render profile `p1-v1`.

> P2.1 후속: 정본 타입·registry·validator는 packages/document로 이동했다. render는 공유 검증 뒤 별도 p1-v1 capability를 검사한다. 아래 실험 결과는 P1 시점의 기록이다.

## 결정

문서 정본은 `schemaVersion: 1` envelope와 Lexical JSON이다. 발행은 `@lexical-tufte/render`의 순수 JSON→HTML 함수로 수행한다. 이 패키지는 React·Lexical·DOM runtime dependency가 없다. 편집 상태 생성/복원에는 Lexical을 사용한다. 발행 HTML은 읽기 결과이며 편집 정본을 대체하지 않는다.

`parseDocument(string)`은 JSON 파싱 후 검증하고, `validateDocument(unknown)`은 경로가 있는 진단을 반환한다. `renderArticle(unknown, {idPrefix?})`는 검증 성공 시 article HTML, 실패 시 `html: null`과 진단을 반환한다. 부분 HTML이나 알 수 없는 노드의 평탄화는 허용하지 않는다. 정본과 API 상세는 [문서 계약](../DOCUMENT_SCHEMA_V1.ko.md)에 둔다.

외부 HTML import는 별도 명시적 변환 API(P2.4), migration은 버전별 명시적 단계(P2.5)로 구현한다. JSON parse가 실패했다고 HTML로 재시도하지 않는다. HTML import에는 의미 구조 검사·지원 범위·손실 진단이 필요하며 이 prototype에는 구현하지 않았다.

## 비교 근거

| 경로 | 실험 결과 | 채택 범위 |
| --- | --- | --- |
| headless JSON parse/set/toJSON | DOM 없이 fixture의 저장 JSON 복원 일치 | 편집 상태 검증/복원 |
| headless HTML export, DOM 없음 | 공식 API가 명시적으로 DOM 요구 오류 반환 | 발행에 사용하지 않음 |
| 공식 `withDOM` 동기 callback | 전역 document 복원은 동작. 전역 HTMLElement 미설치 문제는 custom node 판별 수정. 고정 Happy DOM의 자기 자신 replaceWith가 table을 제거해 전체 export 실패 | 현재 발행 adapter로 미지원, E017/E018 기록 |
| 순수 JSON renderer | Node 무DOM 실행·입력 불변성·출력 결정성, 브라우저 export와 의미 구조/텍스트/geometry 일치 | 발행 기본 경로 |

`withDOM` 자체가 불가능하거나 nested editor가 불가능하다는 결론은 아니다. 현재 버전/fixture로 관측한 제한이다. adapter는 동기 callback에 한정되므로 비동기 작업을 callback에 섞지 않는다. 전역 prototype 임시 패치로 실패를 숨기지 않는다.

## 노트 콘텐츠

단일 EditorState inline container를 유지한다(ADR-0001). 노트는 text(강조/기울임/코드 등 format), linebreak, link, inline image만 허용한다. link에는 text/linebreak/image만 허용한다. p/div/figure/table 등 block, 중첩 노트, 중복 noteId는 진단하고 발행을 차단한다. 화면의 번호는 CSS counter이고 영구 noteId와 분리한다. 여러 article은 호출자가 서로 다른 idPrefix를 제공하고 article별 counter를 reset한다.

## 검증과 후속

`server-document.json`은 양 노트 종류, 서식/링크/그림, caption, body/fullwidth figure 및 body/fullwidth/scroll table을 함께 포함한다. headless JSON 복원 후 실제 편집기에서 export한 HTML과 순수 렌더러 결과를 1440/761/760/759/375px에서 비교했다. JavaScript 비활성 페이지의 모바일 label→checkbox 토글과 article 간 ID 격리를 확인했다. 단위 15개와 기존 브라우저 회귀도 통과했다.

장점은 독자 runtime 분리·검증 가능한 고정 출력이다. 비용은 Lexical export와 별도 serializer를 유지하는 점이며 새 노드는 차등 테스트와 미지원 입력 진단을 함께 추가한다. P1 profile은 전체 Tufte 기능 지원 선언이 아니다. P2.1에서 공유 document 패키지/완전한 노드 registry와 metadata 계약으로 확장하고 P2.4에서 DOM adapter/import를 재검토한다. OS IME·다른 브라우저·접근성·font binary 검증은 기존 계획대로 후속 단계에 남긴다. 성능 비교는 측정하지 않았다.

근거: 설치된 공식 `@lexical/html/src/index.ts`, `@lexical/headless/src/dom.ts`, `@lexical/table/src/LexicalTableNode.ts`; 저장소의 server-comparison.test.mjs / render.test.mjs / tests/server-browser.mjs. 고정 의존성은 pnpm-lock.yaml에 기록한다.
