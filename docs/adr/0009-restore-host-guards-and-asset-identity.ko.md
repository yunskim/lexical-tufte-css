# ADR-0009 — Restore 호스트 보안 경계와 에셋 동일성

상태: 부분 구현 / 추가 통합 필요 / 테스트 미실행 (2026-10-23)

## 책임

- **Host/CMS**: 사용자 식별·인가·권한 철회 정책·에셋 저장소·불변 에셋 버전 또는 digest 보장·감사 로그.
- **Workflow**: Restore 요청, 대상 snapshot ID, expectedGeneration, 사전 권한/에셋 확인 및 재시도 정책.
- **Publication persistence**: 스냅샷 무결성 확인, 문서 소유 확인, head CAS, 원자적 포인터 교체, 실패 시 롤백.

## 검증 단계

1. `authorize()` (비동기): 호스트 정책의 사전 인가.
2. `assetExists(src)` (비동기): 참조된 URL의 현재 가용성 검사. 바이트 동일성 증명은 **아니다**.
3. `BEGIN IMMEDIATE` 및 head generation 재확인.
4. 선택적 `verifyAtCommit()` (동기): SQLite 트랜잭션 안에서 권한 세대/보안 플래그 등 **같은 SQLite 일관성 경계 안에 있는 값**을 최종 검증. Promise 반환 시 실패로 처리. false는 거부, throw/잘못된 반환값은 guard 오류로 롤백.
5. head 포인터 변경 및 COMMIT.

**중요:** `verifyAtCommit`이 임의 외부 인증 서버의 권한 철회와 원자적이라는 뜻은 아니다. 호스트가 권한 세대를 같은 SQLite 트랜잭션 경계로 연결하지 못한다면 원자성은 보장되지 않는다. 선택적 guard가 없으면 기존 API의 preflight-only 보안 수준을 유지한다.

## 에셋 정책

- 현재 스냅샷의 `assetSources`는 URL 문자열 목록이며 digest manifest가 아니다.
- `assetExists`가 true여도 같은 URL의 바이트가 바뀔 수 있다.
- 정확한 역사적 복원이 필요한 호스트는 content-addressed URL, versioned object key 또는 immutable asset manifest를 사용해야 한다.
- 불변 manifest의 저장·검증·schema version 추가는 별도 후속 작업이다. 현재 v1 스냅샷 형식을 소급 변경하지 않는다.
- 권한과 에셋이 원격 서비스에만 존재하는 경우 동기 commit guard로 해결했다고 주장하지 않는다.

## 후속 체크리스트

- [x] Restore 동기 최종 guard를 opt-in으로 제공
- [x] guard 거부·비동기 반환 실패 계약 테스트 작성
- [ ] 실제 호스트의 동일 DB 권한 세대 저장/조회 어댑터
- [ ] content-addressed 에셋 저장/manifest 계약
- [ ] rollback·권한 철회 경쟁 통합 테스트 실행
- [ ] 빌드·전체 테스트·CI 실행 (현재 사용자 지시에 따라 보류)
