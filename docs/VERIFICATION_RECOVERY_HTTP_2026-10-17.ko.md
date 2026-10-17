# Recovery HTTP 추가 작업 검증 — 2026-10-17

대상: main `5fb4d2081e5a1e4184796ece535d9c53e31c37ae` 및 이 보고서의 수정. 이전 `24828d2` 검증 이후의 TypeScript 복구 목록/권한 service/HTTP dispatcher/Fetch adapter/브라우저 client와 Python FastAPI 서버·호스트 보안 조립·공통 fixture를 확인했다. 기존 폴더를 보존한 별도 worktree, Python 격리 venv에서 실행했다. CI는 추가·실행하지 않았다.

## 종료 체크리스트

- [x] 최신 코드·작업 규약·오류/재발 방지·HTTP v1 계약 대조.
- [x] frozen install 성공, pnpm-lock 변경 없음.
- [x] `pnpm check` 성공: lint/inventory/font/typecheck/build 및 단위·통합 **253개** (document47/render28/lexical144/blog34), 실패·skip0.
- [x] `pnpm test:browser` **11개 실행 파일** 전체 성공. 기존 편집/발행/폰트/섹션/복구 UI 회귀 포함.
- [x] `pnpm package:check` **4개** tarball 소비·타입·고지·SQL 검사 성공. npm 발행 없음.
- [x] Python editable 설치 및 `python -m pytest -q` **16개** 성공. CAS/체크섬/메타데이터/엄격한 입력/경로/본문 상한/스트리밍/인증 우선/보안 조립/공통 fixture 포함.
- [x] `RECOVERY_PYTHON=... pnpm test:recovery-python` 실제 TS client→Python HTTP→SQLite 왕복 성공: 저장·단일 조회·payload 없는 목록·checksum·CAS 충돌·접근 거부·변경 CSRF 거부·삭제·부재 조회.
- [x] E076–E078 수정과 M069–M071 반영, 문서의 실행 대기 상태 갱신, diff 검사.

## 발견 및 수정

1. 복구 목록이 사용하는 `all()`이 SQL 인터페이스에 없어서 clean build 실패. recovery 전용 `RecoveryDatabase`를 공개하고 요구 연산을 명시했다.
2. Python 패키지의 여러 최상위 모듈 자동 탐색으로 editable 설치 실패. build backend와 app/host/security 모듈 목록을 명시했다.
3. Python 정상 저장 4건이 400으로 실패. request.stream 소비 뒤 _receive 교체가 downstream에 빈 본문을 전달했다. Starlette middleware의 body cache를 채우도록 수정하고 수동 replay를 제거했다. 모든 Python 회귀 및 실제 HTTP 저장·조회가 통과했다.

Node24.19.0/pnpm11.25.0/Lexical0.52.0/Playwright1.51.1/Chromium134, Python3.12.14/FastAPI0.143.3/Starlette1.8.0/Pydantic2.14.1/HTTPX0.28.1/pytest9.1.1/Uvicorn0.54.0. Python 전체 검증 버전은 `apps/recovery-server/test-constraints.txt`에 기록했다. HTTPX TestClient 지원 중단 예고 warning 1건이 있으며 이번 실행 실패는 아니다. 이 constraints는 이번 환경의 재현 기준이며 전체 지원 버전 표는 아니다.

## 종료 범위

이번 추가 구현분의 로컬 검증 작업은 완료한다. 실제 운영 로그인·세션/게시글 ACL·Origin/CSRF 제공자, 배포 진입점, 편집기 원격 복구 UI 연결과 로컬→서버 이관·보존 정책은 아직 미완료다. 실제 HTTP 테스트는 localhost 임시 서버와 테스트 전용 헤더를 사용하며 운영 인증이 구현됐다는 뜻이 아니다.

Python 본문 cache는 Starlette 내부 계약을 사용하므로 constraints 밖 버전 업그레이드 때 E078 회귀를 반드시 다시 실행한다. Python3.11/다른 OS/다른 브라우저·실제 IME/스크린리더/전체 figure UI gate는 이번 완료 범위가 아니다. 기존 E064 한국어 시스템 fallback 및 W001 bundle 경고도 유지한다. P2–P7 단계 이슈는 남은 gate가 있어 닫지 않는다.
