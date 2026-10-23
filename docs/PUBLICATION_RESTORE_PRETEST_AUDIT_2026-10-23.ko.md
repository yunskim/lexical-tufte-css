# Publication / Restore 사전 정합성 점검

상태: 정적 검토만 수행. **빌드·테스트·CI 미실행**.

## 확인한 경계

- `publish()`는 기존 동작 유지. `publishIfChanged()`만 자산이 없는 동일 문서에 대해 no-op을 허용한다.
- `publishIfChanged()`는 Draft revision, publication generation을 잠금 트랜잭션에서 재검사한다.
- `restorePublishedSnapshot()`은 기존 스냅샷을 수정하지 않고 head만 변경한다.
- Restore의 `authorize()`, `assetExists()`는 잠금 **전** 비동기 검사다. generation CAS로 publication head 변경은 탐지하지만, 권한 철회/에셋 바이트 변경을 트랜잭션과 원자적으로 보장하지는 않는다.
- `last_published_at`은 신규 콘텐츠 Publish 시각을 보존한다. Restore 활성화 시각이 아니다(ADR-0008).
- Restore 성공 직후의 `readState()`는 별도 읽기이므로 동시 작성자가 있다면 반환값이 자신의 변경 직후 상태와 다를 수 있다. 엄격한 응답 스냅샷은 향후 트랜잭션 내 반환값을 구성하도록 개선한다.

## 실행 전 검증 체크리스트

- [ ] TypeScript 빌드: `packages/blog/src/publication.ts` export 및 타입 검증
- [ ] SQLite: 변경 없는 PublishIfChanged, Draft CAS 변경, 자산 포함 보수적 발행
- [ ] SQLite: Restore 후 신규 Publish, Unpublish 후 Restore, 반복 Restore
- [ ] SQLite: Restore 비동기 자산 검사 도중 head 변경, Draft 식별자 변경
- [ ] SQLite: 권한 거부, 에셋 누락, 타 문서 스냅샷, 체크섬 손상
- [ ] SQLite: Restore 트랜잭션 실패 시 원복, stale generation 재시도
- [ ] 기존 `publication.test.mjs`와 회귀 호환성 확인
- [ ] 테스트 실행 결과 및 오류 기록 문서 반영

## 발견한 추가 위험

1. **복원 권한의 원자성**: 호스트 인증/인가 정책이 변경되는 환경에서는 `authorize()` 사전 검사만으로 충분하지 않다. 인증 세대/토큰 검증 또는 호스트 트랜잭션 경계가 필요하다.
2. **에셋 불변성**: `assetExists`는 존재만 확인한다. 원본 URL이 가변적이면 과거 HTML을 복원해도 과거 바이트를 복원했다고 보장할 수 없다. 불변 digest manifest가 필요하다.
3. **오류 분류**: DB/콜백 예외는 현재 `PUBLICATION_STORAGE_ERROR`로 묶인다. 호스트 오류와 저장소 오류를 구분하는 후속 계약이 필요하다.
4. **테스트 확정 전**: 작성한 테스트가 실제로 통과했다고 보고하지 않는다.

기존 스키마 변경이나 CI 실행 없이 추가 테스트를 작성했다.
