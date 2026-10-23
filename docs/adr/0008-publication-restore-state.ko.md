# ADR-0008 — Restore 시각과 발행 상태의 의미

상태: **설계 결정 / 구현 일부 반영 / 테스트 미실행** (2026-10-23)

## 구분할 시각

- `PublicationSnapshot.firstPublishedAt`: 문서가 최초로 발행된 시각. 불변.
- `PublicationSnapshot.publishedAt`: **해당 스냅샷이 처음 만들어진 시각**. 불변.
- `PublicationState.publishedAt` (DB `last_published_at`): 기존 API에서 가장 최근 **새 콘텐츠 Publish가 성공한 시각**. Restore 시 변경하지 않는다. **현재 활성 스냅샷의 생성 시각과 같다고 가정하면 안 된다.**
- **Restore가 수행된 시각**: 현재 v1 스키마에는 저장하지 않는다. 공개 활성화 이력이나 감사 기록이 필요하면 별도 event log를 추가한다. 스냅샷 생성 시각을 덮어쓰지 않는다.
- `PostMetadata.publishedAt`: Draft 내부 호환 메타데이터. 공개 상태 및 Restore 시각의 정본이 아니다.

## 상태 전이

| 명령 | head snapshot | generation | last_published_at | published_revision | Draft |
| --- | --- | --- | --- | --- | --- |
| Publish 새 콘텐츠 | 신규 ID | +1 | 새 Publish 시각 | 신규 source draft revision | 그대로 |
| PublishIfChanged 동일 | 그대로 | 그대로 | 그대로 | 그대로 | 그대로 |
| Unpublish | null | +1 | 그대로 | 그대로 | 그대로 |
| Restore 과거 ID | 기존 ID | +1 | 그대로 | 복원 스냅샷의 source revision | 그대로 |
| Restore 이미 활성 ID | 그대로 | 그대로 | 그대로 | 그대로 | 그대로 |

`last_snapshot_id`는 Restore에서 활성화한 ID로 갱신한다. `first_published_at`은 최초 발행 시각으로 유지한다.

## 호환성과 불변 조건

1. `publishedRevision`은 발행 횟수가 아닌 **head가 참조하는 source draft revision**이다. Restore로 감소할 수 있다.
2. 이후 Publish는 현재 Draft의 revision을 검사한다. 과거 공개 Revision으로 Restore했다는 이유만으로 현재 Draft가 롤백되지는 않는다.
3. 공개 상태의 정본은 head의 `snapshot_id`. Draft의 `status`는 독립적이다.
4. Restore 전에 권한 및 에셋 가용성을 확인하고 트랜잭션 안에서 head CAS를 재검증한다. 기존 `assetExists`만으로 에셋 바이트 불변성은 보장되지 않는다.
5. v1에는 Restore 이벤트 시각/이력을 별도로 기록하지 않는다. 나중에 감사 로그를 도입하더라도 스냅샷 페이로드를 수정하지 않는다.
6. 응답 유실 시 재시도는 stale generation 충돌로 끝날 수 있다. readState + readPublic으로 성공 여부를 확인한다. 동일 스냅샷 포인터만으로 다른 행위자의 개입이 없었다고 증명할 수는 없다.

## 보류

- [ ] 별도 `PublicationEvent` / `activatedAt` 도입 필요성 검토
- [ ] Restore 중 권한 철회 및 에셋 변경에 대한 호스트 보안 정책
- [ ] 동시성·timestamp·복원 후 발행 통합 테스트 실행
- [ ] 기존 `last_published_at` 필드의 외부 소비자 영향 조사

테스트와 CI는 실행하지 않았다.
