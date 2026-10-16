# R03.d — 문서 교체와 실행 취소·다시 실행

## 통합 계약

- `HistoryPlugin` 또는 `registerHistory`를 loader 호출 전에 등록한다. 이력 플러그인이 없는 호스트는 자체 이력 초기화 책임을 가진다.
- `loadDocumentIntoEditor`와 `loadMigratedDocumentIntoEditor`의 성공은 문서 경계다. 기존 undo/redo를 비우고 새 문서를 다음 수정의 기준 상태로 등록한다. 같은 문서의 반복 로드도 같은 정책을 따른다.
- migration·schema·parse·무손실 검사에서 거부된 입력은 현재 문서와 undo/redo를 유지한다. 불러오기 실패 뒤 기존 redo도 계속 사용할 수 있다.
- `replaceEditorDocumentState(editor, state)`는 이미 parse/검증한 EditorState를 교체하는 저수준 통합 함수다. editor.update 밖에서 호출한다. 직접 사용하는 호스트가 입력 검증을 책임진다. 예제의 기존 raw JSON localStorage 복원도 이 함수를 사용한다. 이것이 raw 입력에 schema 검증을 추가했다는 뜻은 아니다.
- 단순 `CLEAR_HISTORY_COMMAND`만으로는 새 문서 첫 수정을 되돌릴 수 없다. 상태 설치 → clear 명령 → `HISTORY_MERGE_TAG`로 기준 상태 재설치 순서로 처리한다. 두 번째 설치는 이력 기준을 설정하므로 update listener가 두 번 호출될 수 있다. 호스트는 문서 변경 때 자동 저장 같은 부수 효과를 멱등하게 작성한다.
- 여러 편집기가 같은 history state를 공유하면 clear는 공유 undo/redo 전체에 적용된다. 독립 문서는 history state도 분리한다. 협업/Yjs의 별도 undo manager 초기화는 이 계약의 검증 범위 밖이다.
- 레이아웃 예제 삽입은 현재 문서 편집이므로 HISTORY_PUSH_TAG를 유지한다. 외부 문서를 불러오는 교체와 구분한다.

## 실행 증거

`packages/lexical/test/document-bridge.test.mjs`는 두 loader 모두 실제 `registerHistory`로 A 편집/undo → 실패 로드 후 redo → B 교체 → 과거 undo/redo 차단 → B 첫 수정/undo/redo → 반복 교체를 확인한다. 기존 schema/parse/무손실 실패 원자성 검사도 유지한다.

`tests/all-nodes-browser.mjs`는 실제 React UI에서 이전 문서 수정 후 33종 golden 로드, undo/redo 차단, 새 문서 첫 수정 취소, 잘못된 JSON 복원 실패 후 redo 유지, 반복 로드, 저장·재열기를 확인한다.

2026-10-16 최종 검증: `pnpm check` 180/180(document47·lexical106·render27), 실패·skip0. `pnpm test:browser` 7개 실행 파일 통과. `git diff --check` 통과. CI는 추가하거나 실행하지 않았다.
