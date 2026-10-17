# Python Recovery Server (FastAPI)

정본: [Recovery HTTP API v1](../../docs/RECOVERY_HTTP_API_V1.ko.md).

`app.py`의 `create_app(db_file, authorize)`는 **인증 콜백을 필수**로 받는다. 운영 호스트가 인증 사용자, 게시글 접근권, PUT/DELETE Origin·CSRF를 확인해야 한다. `authorize=lambda ...: True`는 테스트 환경에서만 허용한다.

SQLite 마이그레이션은 `../../packages/blog/sql/002_editor_recovery_v1.sql`을 기존 DB에 적용한다. 공개 글 정본과 복구본은 분리한다.

현재 단계는 초기 구현이며 서버 구동 엔트리, 실제 인증·CSRF 통합, Pydantic 오류 envelope 통일, 타임스탬프 검증, 요청 크기 제한, Python/TypeScript 계약 회귀 검증이 남았다. 사용자 지시로 테스트/CI는 실행하지 않았다.
