# ADR-0013 — 내부 참조와 에셋 Revision: 단일 스키마로 직접 전환

상태: **미래 전환 방침 채택·구현 보류 (2026-10-23)**. 이전의 v1/v2 호환 유지·v3 마이그레이션 계획을 철회한다는 결정 자체는 유지하지만, 편집기 검증이 우선이므로 현재 문서 스키마·fixture·마이그레이션 코드를 지금 변경하지 않는다.

## 결정 근거

이 프로젝트는 미출시이며 기존 사용자 데이터 보존 의무가 없다. 과거 스키마와의 호환성을 위한 레거시 필드, 이중 경로, 마이그레이션 코드를 추가하지 않는다. 현재 코드와 fixture는 새 정본 스키마에 맞추어 **직접 수정**한다. 스키마 버전 번호는 저장 형식 식별을 위한 최소한으로만 사용하며, 다중 버전 동시 지원을 목표로 하지 않는다.

## 정본 데이터 모델

```ts
type HostReference = {
  namespace: string;
  kind: 'document' | 'note' | 'task' | 'asset';
  id: string; // 제목이나 URL이 아닌 호스트의 불변 ID
};
type HostAssetLocator = {
  namespace: string;
  assetId: string; // 호스트의 에셋 ID
  revisionId?: string; // 없으면 floating, 있으면 pinned
};
```

- 내부 링크: `HostReference`를 정본으로 저장한다. 표시 제목은 캐시/텍스트로 취급하며 URL과 혼동하지 않는다.
- 외부 링크: 기존의 안전한 URL 의미를 유지한다. 내부 참조와 외부 URL은 명시적으로 구분한다.
- 이미지·에셋: `HostAssetLocator`와 대체 텍스트, 레이아웃 정보를 저장한다. 미리보기 URL은 `AssetProvider.resolve`로 얻고, 일시적인 서명 URL을 정본으로 저장하지 않는다.
- 호스트 namespace와 opaque ID를 사용하므로 Magnolia 전용 UUID 형식을 강제하지 않는다.
- 새 자산 선택 UI(후속)는 **pinned revision을 기본값**으로 하고, 사용자가 명시적으로 고르면 `revisionId` 없는 floating 참조를 저장한다. floating 데이터 자체를 금지하지 않으며 기존 참조를 자동으로 pinned로 바꾸지 않는다.
- 발행: floating 참조를 서버에서 불변 revision으로 해석해 snapshot manifest에 고정한다. draft를 자동 변경하지 않는다.
- 문서 내부의 임시 에셋 목록과 호스트 에셋 ID를 중복으로 관리하지 않는다. 오프라인/임시 미디어가 필요하면 별도 명시적 staging 모델을 설계한다.

## 착수 시점과 우선순위

당장은 **공식 Tufte CSS 편집기 구현과 기존 브라우저 테스트 15개 실패 원인 분리·수정**에 집중한다. 이미지 자산 참조 중심의 스키마 전환은 후속 자산 기능 재개 때 한 번에 실행한다. 아직 출시하지 않았다는 사실은 기존 테스트와 저장·복구에 대한 회귀 검증을 생략해도 된다는 뜻이 아니다.

`AssetRevision.id` → `revisionId`는 **공개 포트 타입의 명칭 정리**이고 이 ADR의 문서 참조 구조 변경과 구분한다. 두 변경 모두 이번 문서 수정에서 코드로 구현하지 않는다. [AssetProvider 계약](../asset-provider-boundary.md) 참조.

## 구현 방침 (향후 자산 기능 재개 시)

1. **자산 기능 재개 후**, 현재 `packages/document`의 타입·노드 registry·검증기를 **새 정본 스키마에 직접 맞춘다**.
2. Lexical 노드 import/export, 저장·재열기, 렌더러, 발행 경로를 같은 변경 범위로 정렬한다. 일시적으로 혼합 스키마를 허용하지 않는다.
3. 공식 Tufte CSS 예제에 쓰이는 일반 외부 링크·이미지는 그대로 표현할 수 있어야 한다.
4. 구형 문서 fixture와 테스트는 새 스키마에 맞게 교체한다. 과거 데이터의 변환 테스트는 추가하지 않는다.
5. ReferenceProvider/AssetProvider 포트와 FastAPI HTTP 경계는 유지한다. PublicationStore에 검색 책임을 추가하지 않는다.
6. 별도 호스트의 참조를 가져올 때 namespace/ID 재매핑은 필요하지만, 이것은 과거 버전 호환성 문제가 아니라 시스템 간 상호운용성 문제다.

## 체크리스트

- [x] 레거시 호환성 및 v3 마이그레이션 방침 철회
- [x] 단일 정본 스키마와 호스트 참조/에셋 식별자 원칙 확정 (설계 결론, 실제 스키마는 아직 변경되지 않음)
- [x] 현재 작업은 Tufte 편집기 패리티 안정화가 먼저이며 이 ADR의 구현은 보류하기로 결정
- [ ] 재개 시 공개 포트 revision 필드 명칭 통일과 pinned 기본 선택 정책 반영(타입·UX·테스트)
- [ ] 현재 document 타입, schema registry, validator를 새 구조로 직접 개편
- [ ] Lexical import/export와 편집기 노드 정렬
- [ ] renderer 및 공식 Tufte CSS 예제 fixture 정렬
- [ ] Reference/Asset UI, FastAPI 어댑터 연결
- [ ] 발행 시 immutable asset manifest와 권한 검증
- [ ] 새 스키마 저장·재열기·발행 테스트 작성
- [ ] 전환 코드 작성 후 타입 검사·단위·브라우저·발행 검증 (일괄 실행, CI는 보류)

## 변경 기록

기존 ADR-0013의 “v1/v2 유지 후 v3에서 신규 필드 추가” 방침을 폐기했다. ADR-0012의 호스트 중립 포트 설계는 그대로 유지한다.

2026-10-23: **전환을 즉시 실행하는 것으로 오해하지 않도록** 구현 시점을 자산 기능 재개 후로 변경했다. 현재 코드는 그대로 유지하며, 기존 테스트 실패·호환성 문제를 숨기지 않는다.
