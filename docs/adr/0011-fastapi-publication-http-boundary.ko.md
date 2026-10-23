# ADR-0011 — FastAPI를 Publication 저장소의 HTTP 경계로 채택

상태: 채택 (2026-10-23). 설계 결정이며 Publication HTTP 구현·검증은 후속.

## 배경과 기존 결정

Recovery HTTP API v1은 이미 TypeScript 브라우저 클라이언트 → Python FastAPI → SQLite로 구현·검증되어 있다. 정본은 `docs/RECOVERY_HTTP_API_V1.ko.md`이고 Python 구현은 `apps/recovery-server`다. 기존 Publication 구현은 TypeScript `PublicationService`와 `SqlitePublicationAdapter`를 포함하지만 이는 FastAPI 경유를 뜻하지 않는다.

## 결정: 소유권과 실행 위치

- **브라우저 / Lexical**: 편집·미리보기·문서 직렬화. SQL·DB 연결 및 publication snapshot 원자적 쓰기를 수행하지 않는다.
- **HTTP 클라이언트(TypeScript)**: 요청·응답 DTO, 네트워크 오류 및 인증 헤더 처리. 브라우저 번들에서 Node SQLite 모듈을 import하지 않는다.
- **FastAPI(Python)**: 인증·인가·CSRF, 발행 요청 검증, publication 상태 전이 및 저장소 트랜잭션의 최종 권위자.
- **문서 검증·렌더링**: TypeScript의 공유 스키마·Tufte renderer를 유지한다. 서버 발행은 신뢰할 수 있는 HTML 생성·검증 경로를 별도로 확정해야 한다. 브라우저가 보낸 HTML을 무검증 공개하지 않는다.
- **SQLite/PostgreSQL 어댑터**: FastAPI 호스트 내부의 저장소 구현. CAS 및 snapshot+head 원자성을 보장한다.
- 기존 `PublicationStore`는 의미론적 계약 및 TypeScript 로컬/테스트용 포트로 보존하되, TypeScript SQLite 어댑터를 웹 발행 경로의 기본값으로 삼지 않는다. Python에서 TypeScript 포트를 직접 호출한다고 가정하지 않는다.

## Publication HTTP v1 초안 (Recovery v1과 독립)

기본 경로는 Recovery와 같은 `/posts/{postId}`를 사용한다. 모든 응답은 `Result<T>` JSON envelope이며 `Cache-Control: no-store`다.

| 메서드 | 경로 | 요청 | 성공 값 |
|---|---|---|---|
| GET | `/posts/{postId}/publication` | 없음 | `PublicationState` |
| GET | `/posts/{postId}/publication/public` | 없음 | `PublishedSnapshot` |
| POST | `/posts/{postId}/publication/publish` | `{expectedRevision,expectedGeneration,publishedAt}` | `PublishedSnapshot` |
| POST | `/posts/{postId}/publication/restore` | `{snapshotId,expectedGeneration}` | `PublicationState` |
| POST | `/posts/{postId}/publication/unpublish` | `{expectedGeneration}` | `PublicationState` |
| GET | `/posts/{postId}/publication/snapshots/{snapshotId}` | 없음 | `PublishedSnapshot` |

`postId`는 기존 식별자 규칙, `snapshotId`는 소문자 SHA-256 64자리 hex를 사용한다. `expectedRevision`은 1 이상, `expectedGeneration`은 0 이상인 안전 정수이며 JSON 문자열/실수/불리언을 허용하지 않는다. Restore·Unpublish는 1 이상 generation을 요구한다.

Publish 요청에 클라이언트가 임의로 생성한 snapshot, HTML, 에셋 존재 확인 결과를 권위 있는 입력으로 받지 않는다. FastAPI 호스트가 저장된 draft revision과 내용, 에셋의 불변 참조, 발행 시간 및 정책을 확인하고 서버에서 검증된 렌더 결과로 snapshot을 생성한다.

## 일관성 및 보안

1. FastAPI는 요청별 인증된 principal과 post ACL을 확인한다. 변경 요청은 Origin/CSRF 검증을 요구한다. 검증 실패는 fail-closed.
2. 발행·복원·비공개는 저장소에서 generation CAS를 원자적으로 시행한다. Publish는 draft revision과 내용도 함께 비교한다.
3. 불변 스냅샷 생성과 공개 head 변경은 같은 트랜잭션으로 확정한다. Restore는 draft를 변경하지 않는다.
4. 호스트 인가·에셋 검사와 커밋 사이의 TOCTOU 문제를 별도 설계로 해결해야 한다. 사전 검사만으로 원자적 인가를 주장하지 않는다.
5. 충돌은 HTTP 409, 검증 오류는 400/422, 접근 거부는 403, 저장소 장애는 503. `PUBLICATION_STORAGE_BUSY`는 503이며 클라이언트가 현재 state를 다시 읽고 재시도 여부를 판단한다. 정확한 오류 매핑은 구현 전 별도 fixture로 고정한다.
6. Recovery HTTP v1 경로·DTO·오류 코드는 변경하지 않는다. 공개 조회에 캐시를 허용할지는 별도 API 정책으로 결정한다.

## 이관 체크리스트

- [x] FastAPI를 Publication의 저장·발행 권위 경계로 결정
- [x] HTTP v1 경로와 요청/응답 초안 정의
- [ ] TypeScript 브라우저용 `PublicationHttpClient` 구현
- [ ] Python Publication API 및 저장소 트랜잭션 구현
- [ ] 서버의 신뢰 가능한 Tufte 문서 검증·렌더링 경로 확정
- [ ] 인증/ACL/CSRF, 에셋 불변성 및 커밋 시 권한 검증 연결
- [ ] TypeScript/Python 공통 fixture와 HTTP 상호운용 테스트 작성
- [ ] TypeScript SQLite 어댑터의 웹 경로 사용 제거 및 호환성 범위 문서화
- [ ] 테스트·빌드·CI 실행 (사용자 요청에 따라 보류)

기존 ADR-0010의 storage-neutral 포트는 폐기하지 않는다. 다만 **웹 배포 아키텍처의 기본 경로는 FastAPI**라는 결정이 우선한다.
