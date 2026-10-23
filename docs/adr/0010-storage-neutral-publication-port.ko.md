# ADR-0010 — SQL과 무관한 Publication 저장소 포트

상태: 채택 — 인터페이스 도입, 어댑터 분리는 후속 단계 (2026-10-23)

## 결정

`lexical-tufte-css`의 문서 편집·렌더링·발행 의미론은 SQLite, PostgreSQL, SQL 트랜잭션 또는 특정 호스트의 저장 구조를 알지 않는다. 저장소 경계는 `packages/blog/src/publicationStore.ts`의 `PublicationStore` 포트다.

`PublicationStore`는 `beginTransaction`, `commit`, `rollback`, SQL 쿼리, 연결 객체를 노출하지 않는다. 대신 `commitPublication`, `restorePublication`, `unpublishPublication`을 **원자적 조건부 상태 전이**로 정의한다.

## 책임

- **Editor / Document / Renderer**: Lexical 데이터, 문서 유효성, Tufte CSS 출력. 저장소 없이 독립 사용 가능.
- **Publication Service (향후 분리)**: Draft·Snapshot·Revision 의미론, 발행 검증, 자산 참조 수집, 공개 정책.
- **PublicationStore 포트**: 상태 조회 및 조건부 원자적 발행·복원·비공개 계약.
- **Adapter**: SQLite, PostgreSQL, 파일+락, 원격 조정 서비스 등. 원자성 구현은 어댑터가 책임진다.
- **Host**: 사용자 인증/인가, 권한 철회 정책, 에셋의 불변 바이트/버전 관리, 감사 로그.

## 불변 조건

1. `commitPublication`은 Draft revision **및 동일 Draft 내용**, publication generation을 비교하고 불변 스냅샷 저장과 공개 포인터 교체를 함께 확정한다. 일부만 성공할 수 없다.
2. `restorePublication`은 소유 문서와 존재하는 불변 스냅샷을 검증하고 generation CAS로 포인터를 변경한다. Draft는 변경하지 않는다.
3. `unpublishPublication`은 generation CAS로 포인터만 비공개로 전환한다.
4. CAS를 원자적으로 구현할 수 없는 저장소는 조정 계층을 추가하거나 쓰기를 거부해야 한다. 원격 객체 저장소에 단순히 순차 PUT 하는 것은 이 계약을 충족하지 않는다.
5. 에셋 존재 검사만으로 불변성을 보장하지 않는다. 호스트가 불변 객체 키/해시를 제공해야 한다.
6. `PublicationStore`는 보안 주체를 직접 해석하지 않는다. 호스트가 정책을 적용하고 필요한 경우 동일 일관성 경계의 권한 세대를 commit 조건으로 확장해야 한다.

## 호환성

현재 `SqlitePublicationStore`는 **레거시 일체형 구현**으로 유지한다. 새 포트를 구현했다고 주장하지 않는다. 기존 API를 갑자기 변경하지 않으며 어댑터 전환은 별도 커밋으로 진행한다. SQLite 구현을 버리는 것이 아니라 저장소 독립 계약의 첫 번째 어댑터로 이관한다.

Magnolia Works는 자체 Task/Asset/Revision과 저장소를 유지한다. Lexical 문서 편집만 사용할 수 있고, Publication이 필요할 때만 호스트 어댑터를 제공한다. Magnolia의 Asset revision과 이 라이브러리의 Publication snapshot revision을 동일한 것으로 가정하지 않는다.

## 단계별 마이그레이션 체크리스트

- [x] SQL 독립 포트와 원자성 계약 추가
- [x] SQLite 직접 제어 코드를 당장 제거하지 않고 레거시로 격리
- [x] `PublicationService`에 Publish·Restore·Unpublish 오케스트레이션 추가 (레거시 코드 제거는 후속)
- [x] `SqlitePublicationAdapter implements PublicationStore` 작성 (Restore·Unpublish 트랜잭션 독립 구현, 조회는 레거시 위임)
- [ ] 공통 포트 계약 테스트를 SQLite 어댑터에 적용
- [x] 중립 서비스 Restore·Unpublish 계약 테스트 작성 (미실행)
- [ ] SQLite 전용 테스트와 기존 공개 API 회귀 확인
- [ ] Host 인가·에셋 manifest 확장 포인트 정의
- [ ] Magnolia Works 통합용 저장소 비의존 예제 작성
- [ ] 기존 구현 deprecated 처리 여부 결정 (호환성 검토 후)
- [ ] 빌드·타입 검사·테스트 일괄 실행 (사용자 지시에 따라 보류)

## 2026-10-23 후속 검토

Restore와 Unpublish는 이제 중립 서비스로 호출 가능하다. 다만 호스트의 비동기 인가 및 에셋 존재 확인과 저장소 commit 사이의 철회·변경 경쟁은 해결되지 않았다. 동일 일관성 경계의 권한 검증 및 불변 에셋 참조 계약은 후속 작업이다. 중립 서비스의 사전 검증만으로 원자적 보안을 보장한다고 표현하지 않는다.

## 2026-10-23 SQLite 어댑터 이관

- Restore·Unpublish의 원자적 포인터 변경을 SQLite 어댑터가 직접 구현한다.
- Restore는 스냅샷 해시 검증을 트랜잭션 이전에 수행하고, 트랜잭션 내부에서 generation 및 Draft 식별 정보를 다시 확인한다.
- SQLite 쓰기 트랜잭션 안에서는 await를 사용하지 않는다.
- 상태·스냅샷·공개 문서 조회는 아직 레거시 SqlitePublicationStore에 위임한다. 완전한 의존성 제거는 미완료다.
- 외부 권한 철회와 에셋 변경은 원자화되지 않았다. 호스트의 별도 일관성 계약이 필요하다.
- 신규 어댑터 경로의 타입 검사 및 테스트는 실행하지 않았다.
