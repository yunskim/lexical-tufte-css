# AssetProvider — 호스트 중립 간접 참조 인터페이스

상태: **인터페이스 타입 구현, 추가 자산 연동 보류** (2026-10-23). 에셋 브라우저·이미지 노드 연동·발행 manifest는 미구현이다. 현재 우선순위는 공식 Tufte CSS 편집기 구조·렌더링·브라우저 검증이다.
구현 정본: `packages/editor-ports/src/index.ts`. 관련 결정: [ADR-0012](adr/0012-host-reference-asset-provider-layers.ko.md), [ADR-0013](adr/0013-document-reference-revision-serialization.ko.md).

## 범위

`lexical-tufte-css`는 에셋을 **소유하지 않는다**. UI가 외부 호스트에 목록 검색, revision 조회, 임시 접근 위치 해석만 요청한다. 저장·변경·동기화·삭제·ACL·실제 파일 바이트·공개본 스냅샷은 호스트가 소유한다.

```text
Lexical UI / future asset chooser
    | EditorCapabilities.assets (optional)
    v
AssetProvider [host-neutral TypeScript contract]
    | search / revisions / resolve
    +-- standalone blog adapter (future)
    +-- Magnolia Works local IPC / application adapter (future)
    +-- optional HTTP adapter (future)

Document: { namespace, assetId, revisionId? } [logical identity]
Preview:  { namespace, assetId, revisionId, url, mediaType } [transient]
Publish: host-owned immutable asset manifest [future; separate boundary]
```

새 에셋 저장소, Wagtail/Bynder 의존성, Magnolia 구현, HTTP 프로토콜, 새로운 revision 엔진은 추가하지 않는다. `EditorCapabilities.assets`가 없으면 편집기는 호스트 자산 선택 기능을 제공하지 않아도 된다.

## 공개 타입과 의미론

- `AssetIdentity = {namespace, assetId}`: 전역 URL이 아닌 호스트-범위 논리적 ID. 두 문자열 모두 호스트가 의미를 결정한다. 경로/파일명/제목/UUID 형식을 강제하지 않는다.
- `AssetLocator = AssetIdentity & {revisionId?}`: 저장할 참조. revision 생략 = floating(열람·발행 시점의 최신 revision을 호스트가 결정), 지정 = pinned(지정된 불변 revision).
- **후속 chooser UX 정책(아직 미구현): 신규 이미지 선택은 기본적으로 명시적인 `revisionId`에 고정한다.** floating은 별도 표시와 명시적 사용자 선택으로만 저장한다. 기존 floating 참조를 불러올 때 임의로 고정하거나 최신 참조를 조용히 바꾸지 않는다. resolve 및 발행 시점의 권한·실제 revision 확인은 호스트의 책임이다.
- `AssetSummary`: 검색 결과, `namespace` 포함. `title`/`currentRevision`은 조회 시점의 표시·메타데이터에 불과하다.
- `AssetRevision`: revision 목록 결과. **현재 구현 필드는 `id`**이며 해당 `namespace + assetId` 안에서의 불변 revision 식별자다. **후속 타입 정리 시 `revisionId`로 명칭 통일(미적용)**할 계획이다. `AssetLocator.revisionId` / `ResolvedAsset.revisionId`와 동일한 호스트 revision을 가리켜야 한다.
- `ResolvedAsset`: `resolve(locator)`가 돌려준 **임시 URL**과 실제 `revisionId`. floating 조회도 구체 revision을 반환해야 한다. 호출자는 응답의 namespace/assetId 및 pinned revision이 요청과 일치하는지 검증한다.
- `search(query, signal?)`/`revisions(identity, query?, signal?)`: cursor 페이지. 호스트는 ACL 적용 결과만 반환해야 하며, 목록 응답은 이후 접근 권한의 증거가 아니다.
- `resolve(locator, signal?)`: 존재하지 않거나 공개해선 안 되는 대상은 `null`. 네트워크·오프라인·일시 장애는 실패로 구분하고 거부된 요청은 `AbortSignal`을 따른다. 구체적인 내부 권한 오류 정보가 UI에서 비인가 자산의 존재를 드러내지 않게 한다.

표현 예시 (문서 정본에 URL을 넣지 않음):

```ts
import type {AssetLocator, EditorCapabilities} from '@lexical-tufte/editor-ports';

const floating: AssetLocator = {namespace: 'workspace', assetId: 'opaque-asset-id'};
const pinned: AssetLocator = {...floating, revisionId: 'opaque-revision-id'};

// capabilities는 실제 호스트에서 주입한다.
// lexical-tufte-css는 저장 구현이나 Magnolia 타입을 import하지 않는다.
declare const hostAssets: EditorCapabilities['assets'];
const capabilities: EditorCapabilities = {assets: hostAssets};
```

`AssetLocator`는 `packages/document`의 `HostAssetLocator`와 **구조적으로 동일**하게 유지한다. 향후 노드/JSON 경계에서도 단일 논리 참조만 남겨야 한다.

## 미리보기와 발행의 분리

1. **선택**: 목록에서 선택한 ID로 다시 `resolve`하여 최신 접근 권한 및 대상 동일성을 확인한다. 검색 결과의 `title`, URL, revision 표시는 정본이 아니다.
2. **편집/미리보기**: `ResolvedAsset.url`은 렌더링에만 사용한다. 만료되면 다시 `resolve`한다. URL, 인증 토큰, 서명 파라미터를 문서 JSON, 로그, 캐시 가능한 HTML에 영구 저장하지 않는다. URL은 안전한 스킴·허용 출처·자격 증명·CSP 정책에 따라 검사한다. 서버 측 파일 다운로드에는 SSRF 방어가 별도로 필요하다.
3. **실패**: 연결 끊김은 다시 시도 가능한 placeholder, 대상 없음/권한 없음은 존재를 노출하지 않는 공통 placeholder로 처리한다. 원본 locator를 보존하고 임의의 다른 자산으로 재연결하지 않는다.
4. **발행**: 편집기의 `resolve` URL을 발행 정본으로 사용하지 않는다. 발행 호스트가 접근권한을 검증하고 floating을 구체 불변 revision 및 바이트 digest/object key로 고정한 뒤 manifest를 스냅샷에 포함한다. 고정 검증에 실패하면 발행을 거부한다. 이미 발행된 스냅샷은 원본 갱신에 따라 바뀌지 않는다.
5. **호스트 이전**: `namespace + assetId`는 해당 호스트 안에서만 의미가 있다. 외부 호스트로 문서를 이동할 때는 명시적으로 namespace/ID를 재매핑하거나 unresolved를 표시한다.

## 현재 코드의 제약 — 인터페이스 완료 ≠ 전체 연동 완료

- `packages/document/src/types.ts`에는 이미 `HostAssetLocator`가 있고 이미지 노드에 선택적인 `hostAsset` 필드가 있다.
- **하지만 현재 이미지 노드는 `src` 문자열을 필수로 요구**하며 `packages/lexical/src/InlineImageNode.ts`, `packages/render/src/index.ts`가 이를 직접 사용한다. 현재대로라면 만료 URL을 저장하게 될 위험이 있으므로 AssetProvider를 이미지 삽입·발행에 곧바로 연결하면 안 된다.
- `TufteDocument.assets[]`에도 기존 `id/src` 구조가 남아 있다. host-owned locator와의 관계 및 유효성 검사를 문서/노드/렌더러/발행 경계에서 **하나의 변경 단위로** 정렬해야 한다. 출시 전 데이터 호환성 정책은 [ADR-0013](adr/0013-document-reference-revision-serialization.ko.md)을 따른다.
- 현재 외부 URL 이미지/공식 Tufte CSS 샘플은 변경하지 않는다. 화면 렌더링에서 자산 미해결 시 대응을 추가할 때도 기존 공식 예제 DOM parity를 유지한다.
- `AssetProvider`는 preview/discovery 계약이고 공개 snapshot manifest를 만들거나 장기 보관하지 않는다.

## 현재 작업 우선순위와 재개 조건

**편집기 우선:** 공식 Tufte CSS 전체 예제의 DOM/시각 차이, Lexical import/export, 노트·newthought, 제목·인용 등 편집기 고유 동작과 브라우저 실패를 먼저 해결한다. AssetProvider 추가 구현과 관련 자산 관리 UI/저장소/발행 스키마 전환은 의도적으로 보류한다. 기존 자산 UI 프로토타입 코드는 삭제하지 않되 새로운 기능 확장의 근거로 삼지 않는다.

**재개 조건:** 편집기 관련 회귀 결과와 남은 실패가 기록되고, 자산 관리 확장이 별도 우선순위로 선택된 뒤 아래 항목을 진행한다. `fix/main-browser-parity-20261023`의 [이미지 자산 계획](https://github.com/yunskim/lexical-tufte-css/blob/fix/main-browser-parity-20261023/docs/ASSET_CHOOSER_MIGRATION_PLAN_2026-10-23.ko.md) 역시 이 보류 결정을 우선한다.

## 후속 체크리스트 (보류 — 재개 시 순서대로 진행)

- [x] 호스트 중립 `AssetProvider` 공개 타입 유지 및 namespace·revision 식별자 일치
- [x] floating/pinned, resolve 만료, 권한 경계, 발행 소유권 명시
- [ ] **소규모 인터페이스 정리**: `AssetRevision.id` → `revisionId` 명칭 통일. TypeScript 타입·소비 예제·문서·모의 adapter를 같은 변경에서 정렬(현재 코드 수정하지 않음).
- [ ] **선택 정책**: 새 chooser에서 pinned 기본값 / floating 명시적 선택 / pinned revision 불변 / 결과 정체성 재검증 테스트 확정.
- [ ] UI용 썸네일은 장기 URL이 아닌 선택적/단기 preview 요청으로 제공하도록 계약 보강(필요할 때 설계).
- [ ] 타입 소비 예제 및 compile-time 계약 테스트
- [ ] `HostAssetLocator` 정본을 사용하는 이미지 노드·document schema 개편(만료 `src` 영구 저장 금지)
- [ ] 호스트 주입형 asset chooser/selection controller, stale result 취소 및 placeholder UI
- [ ] 별도 렌더링 시 자산 해석 파이프라인과 URL 검사/만료 재조회
- [ ] host-owned immutable publication manifest, 권한/TOCTOU/복원 검증
- [ ] standalone blog 호스트 어댑터
- [ ] Magnolia Works 어댑터(별도 요청 시, 마지막 단계)
- [ ] 타입 검사·빌드·단위·브라우저·공식 Tufte 비교 검증(일괄 실행 시, CI는 실행하지 않음)

> 위 두 체크는 설계·타입 작성 사실만 나타낸다. 런타임 통합이나 테스트 통과를 뜻하지 않는다. 새 정책은 **계획에만 반영**되었고 `packages/editor-ports/src/index.ts`는 이번에 변경하지 않았다.
