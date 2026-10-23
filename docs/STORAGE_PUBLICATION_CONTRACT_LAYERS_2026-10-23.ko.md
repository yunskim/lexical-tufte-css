# 저장·발행 계약의 계층과 책임 (2026-10-23)

상태: **설계 기준안 / 구현 전 검토 필요**. ADR-0004(공통 CAS), ADR-0005(작업 상태), ADR-0006(Publish=공개 Revision), ADR-0003(CMS 호스트)를 한곳에서 정렬한다. 기존 코드를 이미 이 계약대로 구현했다고 주장하지 않는다.

## 1. 계약 계층

```text
[Host / CMS / Application]                    권한·문서 목록·에셋 소유권·공개 URL·UI
             | host services
[Document workflow]                           Save / Recover / Publish / Unpublish / Restore
             | domain ports
[Domain policies]                             Draft validation / Recovery / Publication
             | persistence ports
[Storage primitives]                          read / create / compareAndSwap (+ optional delete, query)
             | adapter
[SQLite / D1 / host storage]                   원자성·트랜잭션·지속성
```

별도 횡단 계약:
- **Editor (Lexical)**: 문서 편집 상태를 읽고 쓰는 UI 경계. DB, 인증, Publish 트랜잭션을 직접 호출하지 않는다.
- **Document schema / validation**: 문서 형식·유효성. 스토리지 및 CMS와 독립.
- **Render**: 검증된 문서 + 준비된 참조/에셋만 입력받는 순수 동기 변환. 저장과 공개 여부를 결정하지 않는다.
- **Reference/asset resolution**: 호스트가 제공하는 비동기 사전 준비 단계. Render 내부 네트워크 호출 금지.

## 2. 각 레이어의 권한과 금지 사항

| 계층 | 소유 계약 | 해야 할 일 | 해서는 안 될 일 |
| --- | --- | --- | --- |
| Editor | `EditorDocumentPort` | 현재 Lexical 상태 제공·수정·사용자 명령 표시 | SQL·공개 상태 결정·Revision 발급 |
| Host | `HostContext`, `Authorizer`, `AssetResolver` | 인증·인가, namespace, 자산·URL·공개 경로 | Draft 버전이나 공개 Revision을 임의 발급 |
| Workflow | `DocumentWorkflow` | Save/Recover/Publish/Unpublish/Restore 순서와 실패 처리 | 원자적 CAS를 UI 코드로 구현 |
| Domain | `DraftService`, `RecoveryService`, `PublicationService` | 문서 유효성, session 검증, 불변 스냅샷, 공개 상태 전이 | 서로 다른 버전 번호를 혼용 |
| Persistence | `VersionedStore<K,V>`, `SnapshotStore`, `PublicationHeadStore` | CAS, immutable insert, head 전환, 조회 | publish 여부·사용자 권한·문서 의미 결정 |
| Adapter | SQLite/D1/host adapter | DB 특화 원자성·무결성·트랜잭션 | 새 도메인 규칙 정의 |

## 3. 네 종류의 상태와 버전

| 값 | 소유자 | 증가하는 때 | 증가하지 않는 때 |
| --- | --- | --- | --- |
| `draftVersion` (현재 `metadata.revision`) | Draft | 정식 Draft 저장 CAS 성공 | recovery autosave, Publish, Unpublish |
| `recoverySequence` | Recovery(session) | 세션별 복구 상태 저장 | Draft CAS, Publish |
| `publicationGeneration` (현재 `generation`) | Publication head | 실제 공개 포인터 변경(새 Publish, Unpublish, Restore) | Draft 저장, 변경 없는 Publish |
| `publicRevisionNumber` (선택, 신규) | Publication history | 새 불변 공개 콘텐츠 Revision 확정 | Draft 저장, Unpublish, 기존 스냅샷 Restore |

**정본:** 공개 여부는 `publicationHead.activeSnapshotId != null`로만 판단. `PostMetadata.status`는 기존 호환 필드이며 공개 권한의 정본이 아니다. `publishedRevision`은 과거 API의 source draft revision이고 공개 Revision 번호가 아니다.

## 4. 경계별 논리 계약 (제안; 현행 TS API 아님)

```ts
type Result<T> = {ok:true; value:T; diagnostics:[]} |
                 {ok:false; diagnostics:Diagnostic[]};
type DocumentId = string;
type SnapshotId = string;
type SessionId = string;

// Storage primitive: logical contract, NOT a required shared SQL driver.
interface VersionedStore<K,V> {
  read(key:K):Promise<Result<{value:V;version:number}|null>>;
  create(key:K,value:V):Promise<Result<{value:V;version:number}>>;
  compareAndSwap(key:K,expectedVersion:number,next:V):
    Promise<Result<{value:V;version:number}>>;
}
// Optional capabilities: ConditionalDelete<K>, QueryIndex<K,V>.
// Immutable snapshot insert and head CAS must share one transaction
// in publication; generic VersionedStore alone cannot guarantee that.

interface DraftPort {
  read(id:DocumentId):Promise<Result<{record:PostRecordV2;draftVersion:number}|null>>;
  save(id:DocumentId,next:PostRecordV2,expectedDraftVersion:number):
    Promise<Result<{record:PostRecordV2;draftVersion:number}>>;
}
interface RecoveryPort {
  read(id:DocumentId,sessionId:SessionId):Promise<Result<RecoverySlot|null>>;
  save(input:RecoverySlotInput,expectedSequence:number):Promise<Result<RecoverySlot>>;
  remove(id:DocumentId,sessionId:SessionId,expectedSequence:number):
    Promise<Result<boolean>>;
}
interface PublicationPort {
  readState(id:DocumentId):Promise<Result<PublicationState>>;
  readPublic(id:DocumentId):Promise<Result<PublishedSnapshot>>;
  readSnapshot(snapshotId:SnapshotId):Promise<Result<PublishedSnapshot>>;
  publish(id:DocumentId,expectedDraftVersion:number,expectedGeneration:number):
    Promise<Result<PublishedSnapshot>>;
  unpublish(id:DocumentId,expectedGeneration:number):
    Promise<Result<PublicationState>>;
  restore(id:DocumentId,snapshotId:SnapshotId,expectedGeneration:number):
    Promise<Result<PublicationState>>;
}
```

이 인터페이스는 **설명용 논리 계약**이다. 기존 `SqlitePublicationStore.publish`의 `publishedAt`·`assetExists` 인수, 기존 `Result<T>` 정의, 동기 SQLite API를 없애자는 뜻이 아니다. 실제 API를 변경할 때에는 호스트의 시간/에셋 확인을 어떻게 주입할지 먼저 명세하고 버전 호환성을 확인한다.

## 5. Publish 트랜잭션 경계

1. Host에서 인증/인가. 편집기는 Publish 의사만 전달.
2. Workflow가 현재 Draft와 publication head를 읽고 요청의 expectedDraftVersion/expectedGeneration 확인.
3. Domain에서 문서·링크·에셋 검증; 비동기 resolve/preflight; Render가 HTML 생성.
4. 기존 공개 스냅샷과 **의미적으로 동일**하고 활성 상태이면 no-op (타임스탬프·generation·Revision 변경 없음). 의미 동일성의 범위는 별도 검증 필요.
5. 새 Revision이면 **하나의 DB 트랜잭션**에서 Draft와 head를 다시 확인, 불변 snapshot INSERT, head CAS, commit. 이 트랜잭션이 성공하기 전 외부에 새 Revision 공개 금지.
6. 오류면 기존 공개 포인터 유지. 응답 유실이면 head/snapshot read-back으로 결과 재확인.

**주의:** 스냅샷 저장과 head 전환은 공통 `VersionedStore` 호출 두 개로 쪼개면 안 된다. 둘을 원자적으로 묶는 `PublicationTransaction`이 필요하다. 또한 현재 `assetExists(src)`는 에셋 바이트 불변성을 보장하지 않는다.

## 6. Restore / Unpublish 계약

- Unpublish: expectedGeneration CAS로 활성 포인터만 비움. 불변 스냅샷 삭제 금지. 공개 generation 증가.
- Restore: 기존 스냅샷의 동일 문서 소유권, 호스트 권한, 현재 공개 generation, 에셋 재사용 가능성을 검사. 이전 스냅샷 포인터로 전환. **새 공개 콘텐츠 Revision 번호는 만들지 않음**; generation은 증가.
- 복구 슬롯 Restore와 발행 Revision Restore는 별개 명령. 명칭 충돌을 피하려면 UI에서는 '임시 저장 복구'와 '이전 공개 버전 복원'으로 구분.
- 이전 버전을 공개하면서 Draft도 되돌릴지 여부는 별도 명시적 작업으로 분리. 기본 Restore는 Draft를 덮어쓰지 않는다.

## 7. 기존 패키지 배치와 구현 계획

| 현재 코드 | 목표 역할 | 변경 방식 |
| --- | --- | --- |
| `packages/lexical` | Editor | UI 명령·데이터 변환만 |
| `packages/document` | schema, validation, draft CAS 정책 | `metadata.revision` 유지, 저장 추상화는 후순위 |
| `packages/blog/src/recovery*` | Recovery domain/service/adapter | session sequence·checksum 유지 |
| `packages/blog/src/publication.ts` | Publication domain + SQLite adapter가 결합된 현재 구현 | 우선 기존 트랜잭션 유지; 안정화 후 분리 |
| `packages/render` | Pure render | 변경 최소화 |
| CMS host | 권한, catalog, asset resolver, public delivery | 선택적 통합; 라이브러리에서 Magnolia 의존 금지 |

**순서**
- [x] 레이어와 데이터 소유권, 버전 의미, 트랜잭션 경계 명세
- [x] 실제 SQLite 기반 현재 동작 characterization test 작성 (미실행)
- [ ] 새 공개 Revision 동일성(no-op) 기준 확정
- [ ] publish/unpublish/restore 경계 실패·동시성 계약 테스트 작성 및 일괄 실행
- [ ] 최소 additive API + migration 설계
- [ ] 구현, 일괄 테스트, 문서 갱신

## 8. 독립 검토 결과

1. **책임 중복 검토:** Editor가 저장소를 직접 소유하거나 Host가 revision을 발급하면 이중 권위가 생긴다. 경계에서 차단.
2. **원자성 검토:** Generic CAS는 단일 값 갱신에는 충분하지만 immutable snapshot + head 전환에는 불충분. PublicationTransaction 필요.
3. **버전 혼용 검토:** Draft revision, recovery sequence, head generation, 공개 콘텐츠 Revision은 다른 차원이다. 이름과 증가 규칙을 고정.
4. **호환성 검토:** 기존 API는 `publishedRevision`과 `generation` 의미를 유지한다. 신규 public ordinal은 선택·버전 확장.
5. **불필요한 추상화 검토:** 논리 레이어는 명확히 하되, 실제 코드 파일·클래스를 무조건 1:1 분리하지 않는다. 공통 CAS 리팩터링이 Publish 기능의 선행 조건이 아니다.

이 문서는 설계 기준안이며 구현/실행 검증을 통과했다는 뜻은 아니다.
