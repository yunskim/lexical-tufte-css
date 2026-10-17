# Python Recovery Server (FastAPI)

정본: [Recovery HTTP API v1](../../docs/RECOVERY_HTTP_API_V1.ko.md).

`app.py`의 `create_app(db_file, authorize)`는 **인증 콜백을 필수**로 받는다. 운영 호스트가 인증 사용자, 게시글 접근권, PUT/DELETE Origin·CSRF를 확인해야 한다. `authorize=lambda ...: True`는 테스트 환경에서만 허용한다.

SQLite 마이그레이션은 `../../packages/blog/sql/002_editor_recovery_v1.sql`을 기존 DB에 적용한다. 공개 글 정본과 복구본은 분리한다.

오류 envelope·타임스탬프·본문 상한·엄격한 숫자·인증 우선순위·ASGI 본문 전달은 Python16개 테스트로 검증했다. TypeScript 클라이언트→실제 Python HTTP→SQLite 왕복도 통과했다. 운영 서버 구동 엔트리, 실제 인증·CSRF 제공자와 편집기 UI 연결은 미완료다. CI는 생략했다.

## 로컬 검증

저장소 루트에서 다음과 같이 실행한다. `test-constraints.txt`는 이번 Python3.12 환경에서 검증한 의존성 버전이며 모든 OS 지원을 보장하지 않는다.

```sh
python -m venv .venv
.venv/bin/pip install -c apps/recovery-server/test-constraints.txt -e './apps/recovery-server[test]'
(cd apps/recovery-server && ../../.venv/bin/python -m pytest -q)
pnpm build
RECOVERY_PYTHON="$PWD/.venv/bin/python" pnpm test:recovery-python
```

HTTP 왕복 검사는 localhost 임시 서버/임시 SQLite/테스트 전용 헤더를 사용하고 종료 시 제거한다. 운영 인증 구현을 제공하지 않는다. [후속 검증 보고서](../../docs/VERIFICATION_RECOVERY_HTTP_2026-10-17.ko.md) 참조.

## 인증 정책 연결

`security.py`의 `RecoverySecurity`는 인증된 principal 조회, principal별 게시글 접근권 검사, PUT/DELETE의 Origin·CSRF 검사 콜백을 요구한다. 호스트는 다음처럼 앱 생성 시 연결한다.

```python
from app import create_app
from security import RecoverySecurity

policy = RecoverySecurity(
    authenticated_principal=host_authenticated_principal,
    can_access_post=host_can_access_post,
    verify_mutation=host_verify_origin_and_csrf,
)
app = create_app('recovery.sqlite', policy.authorize)
```

위 `host_*` 함수는 예시 이름이며 실제 운영 호스트가 구현해야 한다. `RecoverySecurity` 자체가 로그인 세션이나 CSRF 토큰을 발급하지 않는다. 인증/인가 콜백 예외는 거부 처리한다. 운영용 호스트 구현과 통합 테스트는 아직 미완료다.

## 운영 호스트 조립

`host.py`의 `RecoveryHostConfig`와 `build_recovery_app(config)`를 사용해 세 가지 보안 콜백과 SQLite 경로를 명시적으로 제공한다. 콜백이나 DB 경로가 빠지면 앱 생성을 거부한다. 실제 호스트의 세션/ACL/Origin·CSRF 제공자가 준비되기 전에는 운영 서버 진입점을 만들지 않는다.

`tests/test_host.py`의 누락된 보안 설정 거부 및 명시적 구성 경로는 이번 pytest 실행에 포함해 통과했다. 실제 호스트 세션/ACL/Origin·CSRF 제공자 연결은 후속이다.
