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

## v1 → v2 변환 규칙 초안 (R03.b)

| 입력 | 처리 | 이유 |
| --- | --- | --- |
| 유효한 v1 문서, 검증된 legacy Lexical JSON | `schemaVersion=2`, `editorFormat={engine:'lexical',formatVersion:1}`로 감싼 새 객체 생성 | 명시적 출처를 부여하고 원본은 보존 |
| `id`, `locale`, `title`, `subtitle`, `assets` | 값과 배열 순서를 변경하지 않고 복제 | 문서·자산 식별자 안정성 |
| `lexicalState` 및 모든 노드 | 검증된 호환 형식이면 **그대로 복제** | 편집 의미와 노드 속성 무손실 |
| 지원되지 않는 노드 `type` 또는 `version` | 실패 진단, 노드 삭제·대체 금지 | 조용한 손실 방지 |
| 미확인 JSON 필드 또는 기본값 차이 | 실패 진단, 추정한 필드 삽입·삭제 금지 | Lexical 기본값 변화와 의미 변화 구별 |
| v2 formatVersion=1 | 검증 후 원본과 참조가 다른 복제 반환 | idempotent 경계 |
| v2 formatVersion>1 / 다른 engine | `UNSUPPORTED_EDITOR_FORMAT` | 미래 포맷을 현행으로 오인하지 않음 |
| schemaVersion 미지원 | `UNSUPPORTED_DOCUMENT_VERSION` | 명시적 버전 협상 |

**중요:** 위의 첫 번째 행은 모든 v1을 자동 승격한다는 의미가 아니다. 현재 `validateDocument`는 문서 구조만 확인하며 **Lexical 런타임 직렬화 호환성은 확인하지 않는다**. 따라서 v1 legacy JSON이 v2 formatVersion=1과 무손실 호환되는지 골든과 실제 `parseEditorState`로 검증되기 전에는 성공을 반환해서는 안 된다.

### API 분리

- `inspectStoredDocument(input)`: 구조·버전 식별만 수행. 지원되지 않는 버전을 진단하며 어떠한 변환도 하지 않는다.
- `migrateStoredDocument(input)`: **검증된 버전 쌍**에 한해서만 새 문서를 반환한다. 원본 불변, 부작용 없음.
- `loadMigratedDocumentIntoEditor(editor,input)`: migration 성공 → parse/무손실 검사 → editor 설치. 실패 시 설치 호출 금지.
- `exportEditorToDocument`는 당분간 v1 전용으로 유지한다. v2 출력 지원은 validator·canonical serializer·render profile·storage adapter가 v2를 명시적으로 이해한 이후에 활성화한다.

### 저장 및 롤백

- migration은 메모리에서만 수행하며 읽기 작업 중 저장소를 자동 갱신하지 않는다.
- 승격 저장은 사용자의 명시적 저장 동작에서 revision 충돌 검사를 거치고, 기존 원본을 백업한 후 원자적으로 교체한다(P5).
- 변환 실패 시 원본 문서를 그대로 읽을 수 있게 유지하며 오류 경로와 코드만 전달한다. **실패했다고 빈 새 문서를 덮어쓰지 않는다.**
- 같은 문서의 저장/재열기에서도 검증된 formatVersion을 보존한다. npm 의존성 업그레이드만으로 저장 버전을 변경하지 않는다.

### 코드 적용 전 필수 확인

1. `TufteDocumentV2`와 v2 validator를 별도로 정의하고, v1 validator의 strict unknown-field 정책을 유지한다.
2. `editorFormat`은 engine, formatVersion만 허용하고 중복·알 수 없는 필드를 진단한다.
3. 지원 포맷 테이블을 한곳에 두고 Lexical 의존성 업그레이드 시 명시적으로 재검증한다.
4. render·storage·canonical consumers의 v2 지원 범위를 먼저 정한다. v1만 받는 소비자에게 v2를 전달하여 암묵적으로 처리하게 하지 않는다.

## 부분 구현 상태 (2026-10-16)

- `packages/document/src/inspectStoredDocument.ts`에서 버전 식별만 구현했다. v1은 현재 strict validator로 검사하고 `legacy-v1`로 식별한다.
- v2는 `editorFormat` descriptor의 형태와 버전만 검사한다. **v2 문서 전체의 유효성이나 Lexical 런타임 호환성은 보장하지 않는다.**
- migration, v2 validator, editor load 통합은 아직 구현되지 않았다. 실행 테스트 미확인.

## v2 validator 구현 (2026-10-16)

- `packages/document/src/validateV2.ts`에 `validateDocumentV2` 추가. v2 envelope와 editorFormat을 엄격히 검사하고, v1 content validator로 본문·자산을 재검증한다.
- `inspectStoredDocument`도 v2 전체 검증을 통과해야 v2 formatVersion=1을 식별한다. 이전의 descriptor-only 식별 설명은 이 구현으로 대체한다.
- v1→v2 migration, editor 로드 통합, 버전별 런타임 골든은 미구현이며 타입·테스트 실행은 아직 확인되지 않았다.

## Envelope migration 구현 (2026-10-16)

- `migrateStoredDocument`는 strict v1 검증 → 깊은 복제 → v2 `editorFormat` 추가 → strict v2 재검증을 수행한다. v2 입력은 재검증 후 복제한다.
- **성공은 문서 외피 변환 성공만 의미한다.** 실제 Lexical parse/serialize 무손실 호환성을 증명하지 않으며, 이 결과만으로 저장된 원본을 덮어쓰거나 editor에 설치해서는 안 된다.
- 이후 Lexical bridge에서 migration 결과를 parse/serialize 비교한 다음에만 editor state를 교체해야 한다. HistoryPlugin 이력 초기화는 별도 미완.
