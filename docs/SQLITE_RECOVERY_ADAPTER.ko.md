# SQLite 복구 저장소 연결 계약

상태: 설계 및 API 준비. 브라우저 연결과 실행 검증 전.

## 책임 경계

- 브라우저 예제의 localStorage 복구본은 임시 비상 사본이다. SQLite 정식 글 저장소와 동일한 정본으로 간주하지 않는다.
- `SqliteEditorRecoveryStore`는 호스트의 서버/Node 측에서만 사용한다. SQLite DB 연결이나 SQL을 브라우저 번들에 넣지 않는다.
- `posts_v2`는 검증된 정식 문서, `editor_recovery_v1`는 미완성 Lexical JSON이다. 복구 슬롯을 발행 입력으로 직접 사용하지 않는다.
- 호스트는 매 요청마다 인증, 글 접근 권한, CSRF 방어 및 요청 크기 제한을 수행한다. 라이브러리의 postId 검증은 권한 검사가 아니다.

## 호스트 API 계약 (초안)

- `GET /posts/:postId/recoveries`: 권한 확인 후 `store.list(postId)`. payload 제외.
- `GET /posts/:postId/recoveries/:sessionId`: 권한 확인 후 `store.read(postId,sessionId)`. checksum 실패 시 복구를 중단하고 원문 교체 금지.
- `PUT /posts/:postId/recoveries/:sessionId`: `save(input,expectedSequence)`. 세션별 CAS; 충돌 시 클라이언트는 다른 탭의 데이터를 덮어쓰지 않고 목록을 다시 읽는다.
- `DELETE /posts/:postId/recoveries/:sessionId`: 사용자의 명시적 승인 후 `remove(postId,sessionId,expectedSequence)`. stale 삭제 거부.
- 위 경로는 호스트 예시일 뿐 현재 HTTP 서버 구현을 의미하지 않는다.

## 클라이언트 연결 순서

1. localStorage의 현재 탭 복구를 유지하면서 원격 저장소의 복구 목록을 조회한다.
2. 사용자가 선택한 복구본의 출처(local/SQLite), 저장 시각, 세션 ID, 기반 revision을 표시한다.
3. 선택 후 원문을 읽고 checksum/파싱 오류를 표시한다. 현재 편집 문서 교체 전 확인을 받는다.
4. 정식 저장은 별도 `expectedRevision` CAS를 사용한다. 복구 슬롯 sequence와 정식 문서 revision을 혼동하지 않는다.
5. SQLite 쓰기 실패 시 로컬 사본을 자동 삭제하지 않는다. 반대로 로컬 저장 성공만으로 SQLite 저장 성공을 표시하지 않는다.

## 일괄 검증 대기

- [ ] SQLite 목록 조회 순서·글 격리·원문 비노출 테스트 실행
- [ ] SQLite CAS 동시 수정/삭제·checksum 오류·quota/권한 실패 테스트 실행
- [ ] 호스트 인증/권한/CSRF 및 브라우저 연결 구현 후 실제 다중 탭 검증
- [ ] localStorage legacy 이관/원본 내보내기/삭제 확인 회귀
- [ ] pnpm check, 브라우저 테스트, 패키지 소비 검사 일괄 실행

사용자 요청에 따라 현재 테스트 실행 및 CI를 생략한다. 실행 전 완료 표시하지 않는다.

## 구현 현황 (실행 검증 전)

- `packages/blog/src/recoveryHost.ts`에 `AuthorizedRecoveryService` 구현. `RecoveryAuthorizer` 콜백을 list/read/save/remove 전에 호출한다.
- `packages/blog/src/index.ts`에서 서버 측 어댑터 API를 공개한다.
- 권한 콜백은 호스트의 인증 결과와 사용자별 글 소유권을 확인해야 한다. 서비스 자체는 HTTP 인증, CSRF 토큰, 사용자 세션을 제공하지 않는다.
- 실패한 권한 검사에서는 저장소 접근을 진행하지 않는다. 이 동작과 타입 검사는 일괄 테스트 대기다.
- 다음: 권한 거부·예외·세션 간 접근 제어 테스트 코드 및 실제 HTTP 호스트 연결. CI 생략.
