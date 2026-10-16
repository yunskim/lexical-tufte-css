# R11 — 초안·발행 스냅샷 생명주기 (구현 계약)

## 핵심 원칙

편집 가능한 초안(draft head)과 독자가 읽는 공개 발행본(published snapshot)은 **별도 객체**다. 초안의 저장은 공개 콘텐츠를 변경하지 않는다. 발행은 검증된 문서와 메타데이터의 복사본을 **새로운 불변 revision**으로 기록한 뒤 공개 포인터를 원자적으로 전환한다. 저장·렌더 실패 시 이전 공개 포인터를 유지한다.

## 식별자와 시간

- `createdAt`: 최초 작성 시각. 문서 생명주기 동안 유지.
- `updatedAt`: 초안/메타데이터 마지막 저장 시각. 저장 시각의 순서가 뒤로 가지 않도록 검증.
- `firstPublishedAt`: 최초 성공한 공개 발행 시각. 비공개·재발행해도 변경하지 않는다.
- `publishedAt`: 현재 공개 스냅샷이 발행된 시각. 업데이트 발행 시 변경.
- `revision`: 초안의 단조 증가하는 저장 버전. 낙관적 잠금의 비교 기준.
- `publishedRevision`: 현재 공개 스냅샷의 출처인 초안 revision. 단조 증가하며 draft revision 이하. 공개본과 함께 보존한다.

현재 `PostMetadata` v1에는 `firstPublishedAt`과 `publishedRevision`이 없다. **기존 스키마를 암묵적으로 확장하지 않는다.** 이번 R11 구현은 snapshotVersion 1과 별도 SQL migration으로 두 필드 및 공개 포인터를 도입한다. 현재 `status='draft'`는 `publishedAt`을 허용하지 않으므로, 발행 후 수정 중인 초안을 표현하는 데 단일 status 필드만 사용해서는 안 된다.

## 상태 전이

| 작업 | 초안 | 공개 포인터 | 불변 스냅샷 |
| --- | --- | --- | --- |
| 신규 작성·저장 | 생성/갱신, revision 증가 | 없음 | 없음 |
| 최초 발행 | 그대로 유지 | 새 snapshot을 가리킴 | 신규 생성, firstPublishedAt 설정 |
| 발행 후 초안 수정 | 갱신, revision 증가 | 이전 값 유지 | 이전 본문 유지 |
| 변경 사항 발행 | 그대로 유지 | 새 snapshot으로 원자 교체 | 신규 생성, publishedRevision 갱신 |
| 비공개(unpublish) | 보존 | 공개 접근 차단/제거 | 보존(복구 가능) |
| 재발행 | 보존 | 새 snapshot으로 교체 | 신규 생성, firstPublishedAt 유지 |
| 삭제 | 별도 삭제 정책 | 먼저 공개 차단 | 보존/보관기간 정책에 따름 |

`archived`는 저장 기록의 분류이고 공개 포인터 존재 여부와 동일하지 않다. 공개 여부는 별도의 publication state가 결정한다.

## 원자성 및 동시성

1. 저장소는 예상 `revision`을 비교해 충돌 시 거부한다. 충돌한 편집을 조용히 덮어쓰지 않는다.
2. 발행 전에 문서 검증, 렌더 지원 범위, 참조 자산 존재 및 발행 HTML 생성을 모두 확인한다.
3. 스냅샷은 document JSON, metadata, 렌더 산출물/렌더러 버전, 자산 참조 manifest, source revision을 묶어 저장한다. 내용 해시로 무결성을 검증할 수 있어야 한다.
4. 임시 스냅샷을 완성한 뒤 공개 포인터를 원자적으로 교체한다. 교체 실패 시 임시 파일 정리와 이전 공개본 유지.
5. 발행 중 초안 revision이 변경되면 정책에 따라 충돌로 거부하거나 시작 시 고정한 revision을 명시해 발행한다. 무심코 최신 초안으로 대체하지 않는다.
6. 발행 스냅샷이 참조하는 자산은 비공개/초안 편집만으로 삭제하지 않는다.
7. slug 변경과 공개 URL redirect는 공개 포인터 교체와 일관된 트랜잭션으로 처리한다.

## 수락 조건과 검증 시나리오

- 초안 저장 중에도 공개 HTML이 변하지 않는다.
- 동시 저장 충돌을 검출한다.
- 렌더/자산 누락/파일 쓰기 실패 시 공개 포인터가 이전 스냅샷을 유지한다.
- 첫 발행 시각이 수정 발행·비공개·재발행을 거쳐도 유지된다.
- 비공개 후 초안과 이전 발행본을 복구할 수 있다.
- 재발행 후 공개 revision과 스냅샷 source revision이 일치한다.
- 정적 사이트 생성 시 mutable draft를 읽지 않고 공개 포인터가 지정한 snapshot만 사용한다.

## 실제 구현과 저장 모델

`packages/blog`의 SqlitePublicationStore와 SQL migration을 추가했다. 기존 v2 post/document/metadata는 변경하지 않고 `publication_snapshots_v1`(snapshotVersion 1)과 `publication_heads_v1`을 분리했다. draft metadata.status는 공개 여부 판정에 사용하지 않는다. 공개 독자는 `readPublic`의 snapshot HTML만 읽는다.

스냅샷에는 document/metadata 복사본, publishedRevision, 발행 generation, firstPublishedAt/publishedAt, renderer profile, HTML, 자산 metadata와 이미지 source manifest를 묶는다. 저장 bytes의 SHA-256을 ID로 쓰고 읽기 때 다시 확인한다. DB를 장악한 공격자에 대한 서명/인증 장치는 아니다.

발행은 고정 revision 읽기 → 정본 renderer → 실제 자산 검사 callback → 짧은 BEGIN IMMEDIATE → draft 전체/발행 generation 재검사 → snapshot INSERT/공개 pointer 전환 → COMMIT이다. transaction 안에는 await가 없다. 분리된 SQLite 연결 두 개의 경쟁도 같은 generation CAS로 검출한다. SQLite 동기 연결용이며 D1 지원이라고 주장하지 않는다.

최초/갱신 발행 뒤 초안 변경은 공개 HTML을 바꾸지 않는다. 비공개는 pointer만 비우고 firstPublishedAt 및 마지막 발행 revision/snapshot을 유지한다. 재발행은 같은 draft revision도 허용하되 publication generation과 발행 시각이 증가해야 한다. 공개 포인터가 없는 상태의 publishedRevision은 마지막 발행 기록을 뜻한다. 과거 자산 manifest도 남으므로 호스트가 해당 자산을 삭제하지 않아야 한다.

slug 변경은 기존 공개 기록과 다르면 SLUG_RENAME_REQUIRED로 거부한다. redirect 원자 처리는 P5에서 구현한다. immutable snapshot UPDATE/DELETE는 SQL trigger로 차단한다. snapshot/document와 caller 사이의 alias를 허용하지 않는다.

## 검증 범위와 후속

실제 SQLite의 전체 생명주기, render/자산 오류 및 insert/pointer 실패 rollback, draft preflight 중 변경, 동시 publisher, 두 연결 CAS, 닫기/재열기 영속성 및 checksum 손상 차단을 검사한다. SQL migrations를 package export/files에 포함한다.

트랜잭션은 전용 연결에서 호출하고 호스트 transaction 내부에 중첩하지 않는다. COMMIT 응답을 확신할 수 없는 연결/저장 장치 오류는 상태를 재조회해 재시도 여부를 판단한다. 시작된 readPublic은 단일 SELECT 시점의 일관된 snapshot을 반환할 수 있다.

R11은 이 생명주기 저장 경계의 구현/검증이다. filesystem repository·SSG/feed·slug redirect·인증·실제 자산 저장/GC·배포는 P5에 남고 해당 항목을 완료로 표시하지 않는다. 2026-10-16 최종 실행: check201/201(document47·lexical114·render28·blog12), 실패/skip0, browser8, frozen offline install, diff check 통과. CI 생략.

초안 CAS도 createdAt 문자열 보존과 updatedAt 역행 거부를 적용한다. 메모리 preflight는 명시적 진단, SQLite는 단일 conditional UPDATE의 조건으로 강제해 충돌 진단을 반환한다. 첫 발행 이후에는 이전 snapshot의 createdAt과도 비교한다.
