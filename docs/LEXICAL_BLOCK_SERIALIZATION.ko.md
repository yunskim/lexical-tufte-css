# 블록 노드 등록과 저장 경계

## 계약

저장 문서의 `paragraph`·`quote`·`heading` 및 선택 필드 `tufteClass`·`cite`·`id`는 변경하지 않는다. schemaVersion/editorFormat 버전 및 기존 golden도 변경하지 않는다.

Lexical 0.52의 registry는 type당 하나의 생성자만 허용한다. 동일 type의 base와 subclass를 replacement로 함께 등록하면 생성자 불일치와 replacement 해석 순환이 발생한다(E117). 메타데이터가 없는 블록은 기본 ParagraphNode/QuoteNode/HeadingNode를 사용하고, 메타데이터 블록은 고유 내부 type을 사용한다. 전역 prototype이나 node_modules는 수정하지 않는다.

| 저장 type | 메타데이터 | 내부 type |
| --- | --- | --- |
| paragraph | tufteClass | tufte-paragraph |
| quote | cite | tufte-quote |
| heading | id | tufte-heading |

## 호스트 통합

- 저장/복구/JSON 검사에는 `exportCanonicalEditorState(editor.getEditorState())`를 사용한다. 결과는 detached JSON이며 JSON에 존재할 수 없는 own undefined 속성은 포함하지 않는다.
- canonical 상태를 직접 열 때 `parseCanonicalEditorState(editor, state)`를 사용한다. 이 함수는 파서이지 문서 스키마 validator가 아니다. 외부 문서는 먼저 validator 또는 `loadDocumentIntoEditor`/`loadMigratedDocumentIntoEditor`를 사용한다.
- 문서 envelope에는 기존 `loadDocumentIntoEditor`, `exportEditorToDocument`, v2 함수들을 사용한다. 내부 변환은 children의 노드 위치에만 적용하며 HostAsset/HostLink payload 등 임의 객체의 type 필드를 재작성하지 않는다.
- 원시 `EditorState.toJSON()`은 **내부 runtime snapshot**이다. 메타데이터 블록이 있으면 저장 문서로 직접 사용하지 않는다. 기존 메타데이터 없는 JSON도 그대로 로드한다.
- JSON 손실 비교는 내부↔canonical type의 명시적 변환 후 모든 필드를 비교한다. 알려지지 않은 필드는 삭제하지 않고 기존 fail-closed validator를 유지한다.
- schema 기반 부모/자식 검사·메뉴 상태에는 `canonicalBlockType(node.getType())`를 사용한다. 기본 노드에 대한 사용자 transform이 메타데이터 하위 클래스에도 자동 전파된다고 가정하지 않는다. 필요하면 해당 Tufte 클래스도 등록한다.

## 검증

`block-registration.test.mjs`는 기본 factory 세 종류와 transform 등록, 고유 내부 type, 기존 canonical type/메타데이터, detached export, 두 편집기 왕복, 잘못된 metadata의 원자적 거부를 검사한다. 기존 golden은 재생성하지 않는다. 예제 편집기의 저장/복구/JSON 경로도 같은 경계를 사용한다.
