# 발행 snapshot purge 및 무효 편집 초안 복구 설계

상태: 설계안. 구현·실행 검증 전이며 기존 snapshot 불변 트리거를 우회하거나 제거하지 않는다.

## 확인한 현재 구조

- `packages/blog/sql/001_publications_v1.sql`: snapshot UPDATE/DELETE 금지 트리거, `publication_heads_v1.snapshot_id` 및 `last_snapshot_id` 외래 키.
- `packages/blog/src/publication.ts`: `posts_v2`를 직접 조회하며 `publish`는 `BEGIN IMMEDIATE`에서 generation을 재검사한 뒤 snapshot을 삽입하고 공개 포인터를 갱신한다.
- `packages/document/sql/001_posts_v2.sql`: 유효한 v2 문서만 수용하는 CHECK 제약. 무효 Lexical 작업 상태를 여기에 직접 저장하지 않는다.

## A. 긴급 비공개와 영구 purge를 분리

1. 긴급 비공개는 기존 `unpublish(postId, expectedGeneration)`로 공개 포인터를 즉시 내리는 별도 작업이다. 과거 snapshot 행은 그대로 남는다.
2. 영구 purge는 관리자 인증·권한 검증을 호스트가 완료한 후 **명시적 별도 API**로 수행한다. `postId`, 대상 snapshot 집합, 예상 generation, 사유, 승인자/요청 식별자, 요청 시각을 요구한다. 범위가 모호한 요청은 거부한다.
3. 일반 DB 연결에서는 snapshot 삭제를 계속 금지한다. purge 전용 SQLite 연결/마이그레이션 경로만 트리거를 일시적으로 다루도록 허용하며, 감사 이벤트와 대상 확인·삭제는 하나의 `BEGIN IMMEDIATE` 트랜잭션으로 묶는다. 단, SQLite 스키마 DDL과 감사 로그의 외부 영속성 정책을 실제 SQLite로 검증하기 전에는 구체 SQL을 확정하지 않는다.
4. 트랜잭션 안에서 generation·대상 소유자·snapshot checksum을 재검사한다. 공개 중인 snapshot은 비공개 전환을 요구한다. `snapshot_id`와 `last_snapshot_id` 참조를 먼저 안전하게 해소해야 하며, 필요한 경우 head 행 자체의 삭제·재생성 계약을 명시한다. 단순히 snapshot DELETE만 호출하지 않는다.
5. 삭제 완료 후 공개 HTML 캐시/CDN, 백업, 검색 인덱스, 복제본, 자산 참조를 별도 추적한다. SQLite 행 삭제만으로 완전 삭제를 보장하지 않는다.
6. 감사 이벤트에는 요청 식별자, 대상 snapshot ID의 해시/식별자, 시각, 승인자, 사유, 결과를 기록하되 **삭제 대상 원문·HTML·개인정보를 감사 로그에 복제하지 않는다**. 감사 기록의 보존·접근 통제도 별도 정책으로 정한다.

### purge 불변식과 실패 검증

- 정상 publish/unpublish API로 snapshot UPDATE/DELETE가 여전히 불가능하다.
- 세대 불일치·승인 누락·다른 post 소유 snapshot·부분 삭제 실패에서 원본 행과 포인터가 보존된다.
- purge 후 해당 snapshot의 `readSnapshot`은 찾을 수 없고, 다른 글의 snapshot·현재 공개 포인터는 영향을 받지 않는다.
- 삭제된 글의 백업 복원·재발행·동일 slug 재사용 정책은 별도로 결정한다.

## B. 복구용 무효 Lexical 상태 슬롯

1. 유효한 `PostRecordV2`를 저장하는 `posts_v2`와 **분리된** `editor_recovery_v1` 저장소를 둔다. 이 저장소는 렌더링·발행·정식 문서 import의 입력으로 사용하지 않는다.
2. 키: `postId`, 편집 세션 ID, 복구 revision 또는 순번. 값: 원본 Lexical JSON(크기 제한), 기록 시각, 기반 정식 revision, checksum, 상태. 필수 메타데이터만 검증하며 Lexical 구조의 완전한 유효성은 요구하지 않는다.
3. 자동 저장은 최신 유효 문서 저장과 독립적으로 실패를 표시하고 재시도한다. 복구 데이터는 별도 보관 기간·최대 크기·사용자별 접근 제어·암호화 정책을 갖는다.
4. 복구 시 원본을 임의로 정상화하지 않고, 사용자에게 원본 복구본과 마지막 유효 저장본을 비교할 수 있게 한다. 복구본은 편집기로 격리 로드하고 유효성 검사를 통과해야만 정식 문서로 승격한다.
5. 성공적인 정식 저장 후 복구본 삭제는 명시적 확인 또는 정책에 따른다. 다른 탭·다른 장치의 복구본을 조용히 덮어쓰지 않는다.

### 복구 검증 시나리오

- 무효 중첩 노트·미완성 노드·IME 도중 상태에서도 복구 슬롯 저장은 가능하되 발행은 차단된다.
- 브라우저 강제 종료 후 동일 편집 세션 복구, 여러 탭 충돌, checksum 오류, 저장 실패, quota 초과, 세션 권한 불일치를 검사한다.
- 유효한 `posts_v2` 문서와 기존 공개 snapshot은 복구본 쓰기 실패나 삭제로 변경되지 않는다.

## 구현 순서

- [ ] P0: 현재 SQL 트리거/FK/백업과 운영 위협 모델을 실제 SQLite fixture로 고정.
- [ ] P1: 복구 슬롯의 저장 계약·migration·adapter·충돌/크기 제한 구현 및 테스트.
- [ ] P2: 긴급 비공개와 purge 권한·감사 이벤트 계약을 분리.
- [ ] P3: purge 전용 경로 및 원자성/실패 주입 테스트, 캐시·백업 후속 처리.
- [ ] P4: 호스트 UI의 복구 선택·삭제 승인 절차, 문서 및 Work 검증.
