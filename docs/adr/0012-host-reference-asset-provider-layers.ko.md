# ADR-0012 — 편집기 Reference·Asset 포트와 호스트 어댑터

상태: 채택(설계, 2026-10-23). 구현 및 테스트는 후속. ADR-0010 Publication 저장소 포트, ADR-0011 FastAPI HTTP 경계와 병행한다.

## 목적과 경계

Lexical/Tufte 편집기는 링크 검색, 내부 참조 자동완성, 에셋 탐색, 버전 선택, 역참조를 제공하지만 SQLite·Magnolia Works·FastAPI·호스트별 ACL 구현을 알지 않는다. PublicationStore에 검색 책임을 추가하지 않는다.

```text
Editor UI (Lexical commands, [[ autocomplete, asset picker)
  -> EditorCapabilities { references, assets }  [TypeScript 인터페이스]
      -> HttpReferenceProvider / HttpAssetProvider [선택적 브라우저 HTTP 어댑터]
          -> FastAPI [인증/ACL, 검색, URL 발급]
              -> HostReferenceIndex / HostAssetCatalog [Python 호스트 포트]
                  -> SQLite / PostgreSQL / Magnolia / 기타 호스트
      -> MagnoliaLocalReferenceProvider / MagnoliaLocalAssetProvider [로컬 호스트 어댑터]
  -> PublicationHttpClient [별도 발행 기능]
```

브라우저의 HTTP 경로는 기본 배포 선택이지 편집기 API의 필수 조건이 아니다. Magnolia Works처럼 로컬 호스트가 저장소를 직접 소유하면 같은 TypeScript 포트를 로컬 IPC/호스트 브리지로 구현할 수 있다. Python 포트와 TypeScript 포트는 서로 다른 런타임 계약이며 동일 객체를 공유하지 않는다.

## TypeScript 포트 (설계 계약)

```ts
type ReferenceKind = 'document' | 'note' | 'task' | 'asset' | 'external';
type Reference = {
  id: string; kind: ReferenceKind; title: string;
  description?: string; // 표시용이며 정본 식별자가 아님
};
type SearchPage<T> = {items: T[]; nextCursor: string | null};
type ReferenceQuery = {text: string; kinds?: ReferenceKind[]; limit?: number; cursor?: string};
interface ReferenceProvider {
  search(query: ReferenceQuery, signal?: AbortSignal): Promise<SearchPage<Reference>>;
  resolve(id: string, signal?: AbortSignal): Promise<Reference | null>;
  backlinks(id: string, query?: {limit?: number; cursor?: string}, signal?: AbortSignal): Promise<SearchPage<Reference>>;
}
type AssetSummary = {
  id: string; title: string; mediaType: string; size?: number;
  currentRevision?: string;
};
type AssetRevision = {id: string; assetId: string; createdAt?: string; checksum?: string};
type AssetLocator = {assetId: string; revisionId?: string};
type ResolvedAsset = {
  assetId: string; revisionId: string; mediaType: string;
  url: string; expiresAt?: string; // 호스트가 발급한 권한 제한 URL
};
interface AssetProvider {
  search(query: {text: string; mediaTypes?: string[]; limit?: number; cursor?: string}, signal?: AbortSignal): Promise<SearchPage<AssetSummary>>;
  revisions(assetId: string, query?: {limit?: number; cursor?: string}, signal?: AbortSignal): Promise<SearchPage<AssetRevision>>;
  resolve(locator: AssetLocator, signal?: AbortSignal): Promise<ResolvedAsset | null>;
}
type EditorCapabilities = {references?: ReferenceProvider; assets?: AssetProvider};
```

실제 패키지 공개 타입과 함수명은 구현 시 별도 커밋에서 확정한다. 비동기 요청 취소와 cursor 페이지네이션은 대규모 저장소 및 입력 중 검색을 고려한 기본 요구다. UI는 제공되지 않은 capability를 숨기거나 비활성화한다.

## 식별자와 문서 직렬화

- `[[제목]]`은 검색 입력 문법이며, 사용자가 후보를 선택한 뒤 문서에는 **호스트에서 유효한 불변 식별자**와 `kind`를 기록한다. 표시 제목은 캐시일 뿐 정본이 아니다.
- 호스트 식별자는 반드시 UUID일 필요가 없다. Magnolia의 UUID를 포함하여 opaque string으로 다룬다. 동일한 ID 문자열이 다른 호스트에 존재할 수 있으므로 **문서 소유 호스트의 namespace**를 기준으로 해석한다. 호스트 간 이동 시 명시적 매핑이 필요하다.
- 에셋 참조는 `assetId`와 선택적 `revisionId`를 별도로 보관한다. Revision을 생략하면 최신 추적(floating), 명시하면 고정(pinned)이라는 의미를 가진다. 게시 시에는 참조한 불변 바이트/해시를 스냅샷 manifest에 고정한다.
- 외부 링크는 내부 ID와 구분하며 기존 URL 안전성 검사를 유지한다.
- 현행 문서 스키마의 노드·마이그레이션 정책과 충돌하지 않도록 기존 link/figure 노드 계약을 먼저 조사한다. 새 필드를 임의로 주입하지 않는다. 직렬화 스키마 변경은 별도 ADR/버전 이전이 필요하다.

## FastAPI HTTP API 초안 (v1 후보)

기존 `/posts/{postId}/publication` 및 `/posts/{postId}/recoveries` 경로와 분리한다.

| 메서드 | 경로 | 의미 |
|---|---|---|
| GET | `/editor/references?text=...&kind=...&limit=...&cursor=...` | ACL 적용 참조 검색 |
| GET | `/editor/references/{id}` | ID로 현재 메타데이터 해결 |
| GET | `/editor/references/{id}/backlinks?limit=...&cursor=...` | 접근 가능한 역참조 |
| GET | `/editor/assets?text=...&mediaType=...&limit=...&cursor=...` | ACL 적용 에셋 검색 |
| GET | `/editor/assets/{id}/revisions?limit=...&cursor=...` | 접근 가능한 버전 목록 |
| GET | `/editor/assets/{id}/resolve?revisionId=...` | 접근 가능한 다운로드/미리보기 URL 발급 |

성공은 기존 `Result<T>` JSON envelope, 실패는 진단 코드와 HTTP 상태를 사용한다. API는 URL에 인증 비밀을 직접 넣지 않으며, 서명 URL은 짧은 유효기간과 최소 권한을 적용한다. 접근권 없는 항목의 검색 결과·개수·역참조를 노출하지 않는다. 응답은 기본 `Cache-Control: no-store`; 대량 검색·서버 부하·rate limit은 호스트 정책이다. URI/ID 인코딩과 URL 안전성 검사는 HTTP 어댑터가 수행한다.

## 책임 분리

| 레이어 | 책임 | 하지 않는 일 |
|---|---|---|
| Lexical UI | 검색 입력, 후보 선택, 삽입 명령, 로딩/취소 | SQL, 권한 판정 |
| ReferenceProvider | 검색/해결/역참조 계약 | 저장소 스키마 강제 |
| AssetProvider | 검색/버전 목록/참조 해결 계약 | 파일 영구 URL 소유 |
| HTTP Adapter | DTO/오류/인증 헤더/취소/페이지네이션 | 데이터베이스 쿼리 |
| FastAPI | 사용자 인증/ACL, 검색 요청 제한, URL 발급 | Lexical 노드 내부 상태 조작 |
| Host Adapter | 호스트별 검색 인덱스, 에셋 메타데이터/버전 | 편집기 UI |
| Publication | 불변 스냅샷/공개 상태 원자적 전이 | 자동완성 검색 |

## 주요 불변 조건

1. 검색 결과는 편의 기능이며 참조 저장·조회·다운로드·발행 시 권한을 다시 검사한다. UI 캐시를 권위로 삼지 않는다.
2. Resolve 실패는 not found / denied / temporarily unavailable을 내부적으로 구분하되, API가 비인가 대상의 존재를 누설하지 않도록 응답 정책을 정한다.
3. 역참조는 호스트의 참조 인덱스에 의존한다. 문서 저장 시 참조 추출 및 색인 갱신의 일관성 정책이 필요하다.
4. 삭제·이동·이름 변경 뒤에도 ID 참조를 유지하고, 대상이 없으면 broken link 상태를 표현한다. 자동으로 다른 항목에 재연결하지 않는다.
5. 발행 시 floating 에셋은 서버가 불변 revision으로 해석·고정하며 TOCTOU 검사를 통과해야 한다. 브라우저가 제공한 URL/해시를 신뢰하지 않는다.
6. Magnolia Asset revision, 문서 draft revision, Publication snapshot revision은 별개의 수명주기다.
7. 다른 호스트의 ID와 참조를 가져올 때는 namespace·ID 매핑·권한 정책을 명시적으로 처리한다.

## 단계별 체크리스트

- [x] Reference/Asset/Publication 책임과 HTTP·로컬 호스트 경계 결정
- [x] 포트 DTO, 검색·해결·역참조·버전 조회 의미론 설계
- [x] HTTP 경로 후보와 보안·일관성 불변 조건 문서화
- [ ] 현행 문서 link/asset 노드 스키마 및 저장/재열기 호환성 조사
- [ ] TypeScript `ReferenceProvider`/`AssetProvider` 포트 타입 추가
- [ ] 편집기 capabilities 주입과 후보 UI 연결
- [ ] TypeScript HTTP 어댑터 및 FastAPI 라우터 구현
- [ ] Python 호스트 포트 및 SQLite 참조 인덱스/에셋 카탈로그 어댑터
- [ ] Magnolia 로컬 브리지 예제 (별도 저장소 변경 없이)
- [ ] 스키마 버전 이전·floating/pinned·broken link 회귀 테스트
- [ ] 접근권, 인덱스 일관성, 에셋 URL 만료, 경쟁 상태 테스트
- [ ] 테스트·빌드·CI 실행 (사용자 지시에 따라 보류)
