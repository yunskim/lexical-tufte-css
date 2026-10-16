# R14 — CI 없는 로컬 검증 절차

이 프로젝트는 **CI를 사용하지 않는다.** 자동 GitHub Actions/서버 파이프라인을 추가하지 않고 개발자가 명시적으로 로컬 검증을 수행한다.

## 필수 환경

- Node.js >=22, pnpm 11.25.0 (루트 `package.json`의 packageManager)
- 의존성 설치가 가능한 네트워크와 브라우저 테스트 실행 환경
- Playwright 브라우저 설치가 필요한 경우 `pnpm exec playwright install chromium`

## 실행 순서

```sh
node --version
pnpm --version
pnpm install --frozen-lockfile
pnpm check
pnpm test:browser
```

`pnpm check`는 lint, inventory, typecheck, build, 단위 테스트를 포함한다. `pnpm test:browser`는 빌드 후 노트·편집·DOM·레이아웃·서버 브라우저 회귀를 실행한다. 각 명령의 종료 코드와 출력 로그를 보관한다. 하나라도 실패하면 완료 표시를 금지한다.

## 실행 증거 기록 양식

```text
날짜/환경:
git commit SHA:
node / pnpm:
pnpm install --frozen-lockfile: PASS | FAIL | BLOCKED
pnpm check: PASS | FAIL | BLOCKED
pnpm test:browser: PASS | FAIL | BLOCKED
브라우저/OS:
실패 로그 및 오류 ID:
수정 커밋:
재실행 결과:
```

실패는 `docs/ERROR_LOG.md`, 예방책은 `docs/ERROR_PREVENTION.md`에 기록한다. 대책을 적용한 뒤 실패했던 명령과 관련 회귀 테스트를 다시 실행한다.

## 선택적 pre-push

pre-push hook은 사용자 개발 환경에서 **선택적으로만** 설치한다. 저장소에 자동 설치하는 스크립트나 push 강제 차단 정책을 두지 않는다. hook을 사용해도 검증 증거는 실행 기록에 별도로 남긴다.

## 현재 검증 상태 (2026-10-16 통합 재검증)

- Node24.19.0 / pnpm11.25.0 / Chromium134 headless shell 환경에서 실행했다.
- frozen install, pnpm check(140/140, skip0), pnpm test:browser(6개 파일), diff check 모두 PASS.
- 기존 E025 환경 차단은 이전 대화 환경의 이력이며 현재 검증 환경에서는 해소됐다.
- 실제 실패·수정·재실행·남은 제한은 [통합 보고서](VERIFICATION_2026-10-16.ko.md)에 기록했다. 프로젝트 전체 완료를 뜻하지 않는다.
- Lexical golden은 생성·검토·커밋하며 누락 시 항상 테스트 실패로 처리한다. CI는 추가하지 않았다.

## 재개 조건

네트워크·pnpm이 정상인 개발 환경에서 위 순서대로 실행한다. 테스트 실패 시 문제를 수정하고 로그·대책·재실행 결과를 함께 남긴다. CI를 대체하는 검증은 **실제 로컬 실행**이지 문서 작성만으로 충족되지 않는다.
