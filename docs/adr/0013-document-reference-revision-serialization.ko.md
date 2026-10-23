# ADR-0013 — 내부 참조 및 에셋 revision 직렬화

상태: 채택(설계, 2026-10-23). **현재 v1/v2 문서 검증기를 변경하지 않는다.** 신규 필드의 실제 저장은 다음 스키마 버전과 편집기 노드 지원이 준비된 뒤에만 활성화한다.

## 확인한 기존 제약

- `packages/document/src/types.ts`: `link`는 `url`, `target`, `rel`, `title`만 가진다. `tufte-inline-image`/`tufte-imagequilt`는 `src`, `alt`, 선택적 `assetId`와 크기를 가진다. `AssetRef`에는 `id`, `src`, `mimeType`, `sha256` 등이 있으나 revision 필드가 없다.
- `schema.ts`의 `NODE_SCHEMA`는 허용 필드를 고정한다. `validate.ts`는 알 수 없는 필드를 거부하고 링크 URL 안전성, 이미지의 `assetId` 존재 및 `src`/치수 일치를 검사한다.
- `validateV2.ts`는 v2 envelope를 검사한 후 v1 콘텐츠 검증기를 재사용한다. 따라서 v2라고 해서 새 링크 필드를 추가할 수 없다.
- 기존 `assetId`는 **문서 내부 `assets[]`의 ID**이며 Magnolia의 호스트 Asset ID와 같다고 가정해서는 안 된다.

## 결정: 다음 스키마 버전(v3 후보)

내부 참조와 외부 URL 링크를 명시적으로 구분한다. 새 노드 종류를 무조건 추가하지 않고 기존 link/image 노드의 표현 확장을 먼저 검토하되, 레거시 HTML 출력과 Lexical import/export가 동일한 정보를 보존해야 한다.

```ts
type HostReference = {
  namespace: string;   // 문서 소유 호스트의 안정적인 namespace
  kind: 'document'|'note'|'task'|'asset';
  id: string;          // opaque host ID, 제목 아님
};
type HostAssetLocator = {
  namespace: string;
  assetId: string;     // 호스트의 Asset ID; 문서 assets[].id와 구분
  revisionId?: string; // 생략하면 floating, 있으면 pinned
};
```

- 링크: 외부 링크는 현재 `url` 의미를 유지한다. 내부 링크는 `HostReference`를 권위 있는 대상으로 저장하고 `title`은 표시 캐시로만 취급한다. URL을 정본 식별자로 쓰지 않는다. v3 노드의 URL 필드와 내부 참조 필드의 상호배타성은 구현 시 검증한다.
- 이미지: 현행 `src`와 문서 로컬 `assetId`는 레거시 호환성을 위해 유지한다. v3의 `HostAssetLocator`는 별도 필드로 추가하고, 호스트의 권한 있는 `AssetProvider.resolve`로 표시용 URL을 얻는다. 일시적인 서명 URL은 정본 직렬화에 저장하지 않는다.
- 문서 저장과 재열기: 참조 식별자·namespace·revisionId가 보존되어야 한다. 표시 제목 변경, 임시 URL 만료, 재검색 결과 순서에 영향받지 않아야 한다.
- 발행: 서버가 floating 에셋을 현재 불변 revision으로 확정한 후 snapshot manifest에 고정한다. draft는 자동 변경하지 않는다. 대상 없음·권한 거부·버전 소실 시 발행 실패 또는 명시적 대체 정책을 적용한다.
- 기존 v1/v2 문서는 그대로 읽고 렌더링한다. 마이그레이션은 v3 envelope/노드 규칙/검증기/렌더러/에디터 JSON round-trip이 모두 준비된 후 명시적으로 수행한다. 기존 URL 링크를 근거 없이 내부 참조로 변환하지 않는다.

## 호스트 독립성

`namespace`는 Magnolia 전용 문자열이나 URL 규칙을 강제하지 않는다. 다른 호스트로 문서를 이전할 때는 namespace와 ID를 명시적으로 재매핑하거나 미해결 참조로 유지한다. 문서 로컬 `assets[]`는 이식 가능한 미디어 manifest이고, 호스트 카탈로그 ID는 별도 관계다. 호스트별 접근권은 조회·다운로드·발행 때 재검증한다.

## 구현 순서 및 체크리스트

- [x] 현재 link/asset node, strict validator, v2 envelope의 제약 확인
- [x] 내부 참조/호스트 에셋 ID/버전 구분과 v3 후보 표현 결정
- [ ] v3 상세 JSON 스키마 및 검증기 (URL과 내부 참조 상호배타)
- [ ] v3↔Lexical JSON 직렬화 및 저장·재열기 회귀 fixture
- [ ] 링크 자동완성 선택 시 HostReference 삽입, 대상 이름 변경/삭제 처리
- [ ] AssetProvider 선택 시 pinned/floating 정책 UI
- [ ] v3 renderer와 서버 발행 manifest의 불변 asset 처리
- [ ] v1/v2→v3 명시적 마이그레이션 및 실패·롤백 테스트
- [ ] 테스트·빌드·CI 실행 (사용자 지시에 따라 보류)

기존 스키마를 임의로 확장하지 않는 것이 이 단계의 호환성 보장이다.
