# Recovery HTTP API v1 — 고정 계약

상태: **v1 계약 고정(2026-10-17)**. 이 문서가 HTTP 경계의 정본이다. 서버 구현은 Python/FastAPI로 전환하며 TypeScript 브라우저 클라이언트는 이 계약을 따른다. 기존 TypeScript 서버 코드는 이관 완료 전까지 비교 대상으로만 유지한다.

## 경로와 메서드

| 메서드 | 경로 | 요청 본문 | 성공 응답 |
|---|---|---|---|
| GET | `/posts/{postId}/recoveries` | 없음 | `Result<RecoveryMetadata[]>` |
| GET | `/posts/{postId}/recoveries/{sessionId}` | 없음 | `Result<RecoverySlot|null>` |
| PUT | `/posts/{postId}/recoveries/{sessionId}` | `RecoverySave` | `Result<RecoverySlot>` |
| DELETE | `/posts/{postId}/recoveries/{sessionId}` | `{"expectedSequence":N}` | `Result<boolean>` |

모든 응답은 JSON이며 `Cache-Control: no-store`를 포함한다. 요청 경로의 식별자는 `^[A-Za-z0-9][A-Za-z0-9_-]*$` 규칙을 따른다. GET 목록은 payload를 반환하지 않는다. GET 단일 조회에서 부재는 HTTP 200 + `value:null`이다.

## DTO

`RecoverySlot`: `{postId:string,sessionId:string,sequence:number,baseRevision:number,savedAt:string,payload:string,checksum:string}`.

`RecoveryMetadata`: `RecoverySlot`에서 `payload` 제외.

`RecoverySave`: `RecoverySlot`에서 `checksum` 제외 + `expectedSequence:number`. 본문 postId/sessionId는 경로와 일치해야 한다. checksum은 서버에서 payload UTF-8 바이트의 SHA-256 소문자 64자리 hex로 계산한다.

`sequence`는 1 이상 안전 정수, `baseRevision`은 0 이상 안전 정수, `expectedSequence`는 0 이상 안전 정수다. 저장 시 `sequence=expectedSequence+1`이어야 한다. payload는 유효한 JSON **문자열**이고 UTF-8 2,000,000바이트 이하이다. 저장 시 CAS는 SQLite `BEGIN IMMEDIATE` 트랜잭션에서 검사한다. 삭제는 `expectedSequence>=1`이고 현재 시퀀스와 일치해야 한다.

## 응답 envelope

성공: `{"ok":true,"value":...,"diagnostics":[]}`

실패: `{"ok":false,"diagnostics":[{"code":"...","path":"$.recovery","message":"..."}]}`

오류 코드/상태: `INVALID_RECOVERY_INPUT` 400, `INVALID_RECOVERY_JSON` 400, `RECOVERY_ACCESS_DENIED` 403, `RECOVERY_REQUEST_DENIED` 403, `RECOVERY_CONFLICT` 409, `RECOVERY_INTEGRITY_ERROR` 422, `RECOVERY_STORAGE_ERROR` 503. HTTP 계층은 404 경로 없음, 405 메서드 오류, 413 본문 상한, 415 미지원 Content-Type을 사용한다. 모든 오류 응답도 동일한 실패 envelope를 반환한다.

## 인증 및 안전

운영 호스트는 모든 요청에서 인증된 사용자와 해당 post의 소유권/접근권을 확인한다. PUT/DELETE는 Origin 및 CSRF 정책을 추가 적용한다. 인증 실패는 fail-closed이며 쿠키 인증은 SameSite/Secure/HttpOnly 정책을 호스트에서 설정한다. 원격 복구본은 발행용 정본이 아니며, 복구 UI는 사용자가 선택·확인하기 전 문서를 덮어쓰지 않는다. 서버 성공 응답 전 로컬 복구본을 삭제하지 않는다.

## 버전 관리와 이관

v1의 필드명·경로·CAS·체크섬·진단 코드 변경은 breaking change로 간주하고 v2에서만 수행한다. TypeScript 클라이언트와 Python 구현은 동일한 계약 fixture 및 상호운용 테스트로 검증한다. 현재는 **계약 문서 고정** 단계이며 Python 구현 및 교차 언어 테스트는 아직 검증되지 않았다. CI는 사용자 지시에 따라 생략한다.
