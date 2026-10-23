# Lexical 저장 포맷 업그레이드·호환성 승인 절차

기준: `lexical@0.52.0`, 문서 저장 envelope `schemaVersion:1/2`,
Lexical JSON format `editorFormat:{engine:'lexical',formatVersion:1}`.
계약: `packages/document/src/validate.ts`,
`packages/document/src/migrateStoredDocument.ts`,
`packages/lexical/src/documentBridge.ts`.

## 원칙

1. 기존 문서 JSON은 사용자 데이터의 정본이다. Lexical이 읽을 수 없다는 이유로
   unknown field나 node를 삭제/평탄화하거나 호환되는 것으로 가장하지 않는다.
2. `schemaVersion`은 공개 문서 envelope 버전, `editorFormat.formatVersion`은
   프로젝트가 지원한다고 명시한 Lexical wire 계약 버전이다. Lexical npm 패키지
   버전과 동일한 숫자가 아니다.
3. 현재 `migrateStoredDocument`는 v1→v2 **envelope만 이전**한다.
   Lexical 내부 노드/속성 의미를 업그레이드하는 migration은 구현하지 않았다.
   미래 런타임의 변경은 golden diff 분석·명시적 migration 없이는 채택하지 않는다.
4. 지원하는 기존 문서의 인코딩/노드 버전/속성 차이는 `LEXICAL_IMPORT_LOSSY`로
   중단하는 것이 현재 안전한 동작이다. 반대로 표현 변화가 의도적이고 손실이 없으면
   이를 명시적으로 이전하는 함수를 작성하고 원본 백업·rollback 경로를 보존한다.
5. `@lexical/extension`으로 전환된 horizontalrule을 포함해 모든 node type이
   현재 golden과 같은 JSON을 내보내야 한다. React 없는 구현이라도 저장 호환성과
   실제 명령·사용자 입력·브라우저 HTML export의 수락 조건을 생략하지 않는다.
6. 전체 단독 섹션 오라클과 통합 정본 문서, JS 없음 발행 렌더러 DOM parity를
   함께 검증해 저장 호환만으로 기능 parity가 완료됐다고 주장하지 않는다.

## 업그레이드 시 차단 기준

- `TESTED_LEXICAL_VERSION`, `packages/lexical/package.json`, `pnpm-lock.yaml`,
  `golden/lexical-<version>-all-nodes.json`을 같은 리뷰에서 갱신한다.
- 과거 golden은 삭제하거나 자동 덮어쓰지 않고, 과거 버전별 fixtures를 유지한다.
  실제 앱에서 오래된 문서를 새 parser가 열 수 있는지, 정본을 재내보낼 때
  바뀐 속성·순서·텍스트·ID/selection/history가 없는지 확인한다.
- 변경이 필요하면 구버전 정본 → 별도 migration → 새 validator →
  Lexical parse → 새 JSON → 순수 renderer 순서로 기록한다. 실패 시에는
  원본 유지·무수정·사용자에게 진단 및 재시도/rollback 가능성을 제공한다.
- 각 upgrade commit에서 frozen install, TypeScript build/type, JS golden/unit,
  실제 editor load/save/undo, 공식 upstream same-content/browser, 발행/블로그
  roundtrip, packed consumer를 독립 실행한다.
- CI는 사용자 방침대로 실행하지 않는다. OS/브라우저 별 미검증 사항은 성공으로
  기록하지 않는다.

## 연동되는 현재 회귀

- `packages/lexical/test/all-nodes.test.mjs`: 34개 wire type과 golden.
- `packages/lexical/test/document-bridge.test.mjs`: fail-closed import/export.
- `packages/lexical/test/upgrade-compatibility.test.mjs`: manifest/golden/version
  정합성, v1→v2 왕복, 미래 format/unknown-field 거부.
- `packages/lexical/test/react-free-horizontal-rule.test.mjs`: headless HR
  직렬화·HTML 계약.

## 수락 체크리스트

- [ ] 변경 대상 버전·노드/속성 diff와 영향받는 저장 문서 범위를 기록했다.
- [ ] 이전 golden 및 저장된 이용자 문서를 지우지 않고 백업·복원 경로를 확인했다.
- [ ] 명시적 migration(또는 변환 불필요 증명)을 구현했고 모호한 입력은 중단한다.
- [ ] editor JSON/HTML·순수 발행 DOM·actual UI 동작이 이전 계약과 대응됨을 검사했다.
- [ ] frozen install/빌드·타입·단위·브라우저·packed 결과와 실패/skip을 기록했다.
- [ ] 문서 format 범위와 릴리스 호환 표를 갱신하고 승인 전 사용을 막았다.
