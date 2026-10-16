# P2.3 그림·여백 주석 Work 일괄 검증 인계

> 상태: 미실행. 이 대화에서는 테스트를 실행하지 않고 CI도 구성하지 않는다. 통과 확인 전 F13/F14 및 P2.3 체크를 완료하지 않는다.

## 실행 순서

1. 최신 `main` 체크아웃 후 lockfile 기준 설치, `pnpm check`, `pnpm test:browser`를 실행한다. 실패는 `docs/ERROR_LOG.md`에 재현 조건을 기록하고 `docs/ERROR_PREVENTION.md`에 방지 대책을 연결한다.
2. `packages/lexical/test/figure-commands.test.mjs`의 그림 삽입/메타데이터/너비 변경/여백 주석 삽입·수정·삭제/중복 ID/거부 시 무변경/클립보드 ID 재발급을 검증한다. `dist` 사용 테스트이므로 build 후 실행한다.
3. React 예제에서 figure 선택 후 여백 주석 삽입→내용 수정→삭제를 순서대로 수행한다. 선택이 버튼 `mousedown` 후에도 보존되는지, 캡션과 이미지가 유지되는지, 중복 ID와 잘못된 입력을 거부하는지 확인한다.
4. 각각의 삽입·수정·삭제 직후 Undo/Redo를 수행한다. 노드 종류, noteId, kind, 내용, figure 너비, 캡션, 이미지 assetId·크기를 Lexical JSON으로 비교한다. HISTORY_PUSH_TAG 사용만으로 undo/redo 성공을 추정하지 않는다.
5. 그림 전체 복사→붙여넣기, 잘라내기→붙여넣기, 같은 문서에서 여러 번 붙여넣기를 실행한다. 원본과 사본의 noteId 충돌 여부, 잘라내기 원본 ID 보존, 붙여넣기 데이터의 중복 ID 처리, 선택 종류(Range/Node)를 구분해 검증한다.
6. `exportEditorToDocument`·`validateDocument`·`renderArticle`·저장 후 재열기에서 figure/img/figcaption/marginnote와 자산 참조 무결성을 확인한다. 브라우저에서 body/fullwidth 반응형, 모바일 margin-toggle, 키보드 접근성을 확인한다.
7. 검증 결과와 환경·실패 원인을 `docs/PROGRESS.md`에 기록하고, 확인된 항목만 체크한다.

## 특별 점검

- headless `dispatchCommand` 후 update가 커밋되기 전에 상태를 읽는 테스트는 false negative/positive가 될 수 있으므로 discrete update 및 비동기 flush 경계를 확인한다.
- 노트 내용을 텍스트로 교체하는 명령은 기존 rich phrasing 서식을 지운다. 링크·강조 보존 편집은 별도 요구사항이며 통과로 간주하지 않는다.
- `SELECTION_INSERT_CLIPBOARD_NODES_COMMAND`는 붙여넣기 삽입보다 먼저 ID를 재발급한다. cut 이벤트가 실제 삭제를 완료했는지 확인하지 않고 원본 ID 보존을 주장하지 않는다.
- 문서에 연결된 노드로 만든 클립보드 테스트는 실제 분리된 cut payload와 다르다. 둘을 구분해 테스트한다.
- 실패가 있으면 테스트 수정만으로 숨기지 말고 코드/계약과 대책을 함께 수정한다.
