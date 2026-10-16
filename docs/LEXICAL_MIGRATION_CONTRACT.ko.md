# R03 — Lexical 직렬화 호환성 및 migration 계약 (설계안)

상태: 설계 초안. 코드·실행 검증 전이며 R03/P2.5 완료를 의미하지 않는다.

## 버전 경계

- `schemaVersion: 1`은 TufteDocument의 **의미적 문서 계약**이다. Lexical 패키지 버전이나 JSON wire format 버전이 아니다.
- `lexicalState.root.version` 및 각 노드의 `version`은 개별 노드 직렬화 버전이다. 문서 전체의 Lexical wire format을 판별하는 용도로 재사용하지 않는다.
- 기존 v1 정본에는 `lexicalFormatVersion` 필드가 없으며 현재 validator는 알 수 없는 최상위 필드를 거부한다. 따라서 **지금 이 필드를 추가하면 기존 정본과 충돌한다**.
- 권장: `schemaVersion: 2`에 `editorFormat: {engine:'lexical', formatVersion:1}`을 필수로 도입한다. `formatVersion`은 npm의 Lexical 버전 문자열이 아니라 우리가 관리하는 **직렬화 계약 버전**이다. 해당 계약에 대해 검증한 Lexical 패키지 버전(현재 0.52.0)은 별도 호환성 표에 기록한다.
- v1 입력은 **명시적 legacy 경로**로만 읽는다. 필드가 없다는 이유만으로 모든 미래 버전의 JSON을 현재 형식이라고 가정하지 않는다. legacy v1 → v2 승격에는 지원 가능한 구조/필드 검사와 버전별 fixture가 필요하다.

## 경계 함수 초안

```ts
type MigrationFailure = {
  ok: false;
  diagnostics: {code: string; path: string; message: string}[];
};
type MigrationSuccess = {
  ok: true;
  document: TufteDocumentV2;
  from: {schemaVersion: number; formatVersion: number | 'legacy-v1'};
  to: {schemaVersion: 2; formatVersion: 1};
  diagnostics: [];
};
function migrateStoredDocument(input: unknown): MigrationFailure | MigrationSuccess;
```

실제 함수/타입은 P2.5에서 도입한다. 이 문서는 API 구현이 아니다.

## 로드 절차와 불변식

1. 저장 입력을 plain JSON object로 제한하고 크기·깊이 상한을 검사한다.
2. `schemaVersion`과 `editorFormat`의 조합을 **명시적으로 분기**한다. 알 수 없는 버전은 `UNSUPPORTED_DOCUMENT_VERSION` 또는 `UNSUPPORTED_EDITOR_FORMAT`으로 실패한다.
3. 지원하는 legacy 버전에는 등록된 migration만 적용한다. 임의의 필드 추가·삭제, 기본값 추측, 알 수 없는 노드 제거는 금지한다.
4. 변환 결과를 현재 문서 validator로 검증하고, 성공 시 새 객체로 복제한다. 저장된 원본은 자동 덮어쓰지 않는다.
5. 그 후 Lexical `parseEditorState`와 현행 직렬화 비교를 실행한다. **migration 후에도** 예상 밖 변형은 `LEXICAL_IMPORT_LOSSY`로 거부한다.
6. 성공한 상태만 `setEditorState`로 설치한다. migration/parse/검증 실패 시 기존 editor state는 변경하지 않는다.

Migration은 입력을 변경하지 않는 순수 함수여야 하며, 동일 입력의 결과는 결정적이어야 한다. 무손실을 증명하지 못한 변환은 성공으로 반환하지 않는다. 기존 `loadDocumentIntoEditor`는 이 절차가 구현될 때까지 v1 엄격 로드만 제공한다.

## Undo/redo 정책

문서 **교체 로드**와 동일 문서의 **편집 중 상태 변경**을 구분한다. 교체 로드는 이전 문서의 undo 이력이 새 문서에 섞이지 않아야 한다. Lexical HistoryPlugin의 실제 history state 초기화 방식과 시점은 사용하는 패키지 버전에서 확인한 뒤 editor integration 계층에 명시한다. `setEditorState`만 호출했다고 이력이 초기화되었다고 가정하지 않는다.

## 필수 fixture와 판정

- 현행 v1 샘플, legacy v1 골든, v2 formatVersion=1 골든, 지원되지 않는 formatVersion=2, 알 수 없는 schemaVersion, 중첩 노드 버전 불일치, unknown field, 변경된 기본 필드 fixture.
- v1 → v2 성공 시 노드 순서·text format·noteId·assetId·이미지 치수 및 자산 참조 보존을 비교한다.
- migration 입력 참조 불변, 반복 실행 결정성, 실패 시 편집기 무변경, 재직렬화 동등성 검증.
- `pnpm check`, 관련 document/lexical 테스트, 브라우저 history 시나리오를 실제 실행하고 결과를 `docs/PROGRESS.md`에 남긴 후 체크한다.

## 결정 대기

1. schemaVersion 2를 도입할 시점(P2.5)과 기존 v1 문서의 별도 백업·승격 절차.
2. Lexical 0.52.0의 기본 직렬화 필드 집합과 버전별 차이를 실제 골든으로 확정.
3. HistoryPlugin 초기화 API 및 브라우저 undo/redo 동작 검증.
