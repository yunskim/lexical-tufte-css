# 2026-11-11 재사용 노트 상호작용 분리 — 정적 검토 기록

범위: `test/full-deferred-20261031` 브랜치의 `TufteNoteInteractionPlugin`, `ToolbarButton`, `TufteEditingSurface`, `TufteEditor`, 예제 소비자 및 관련 회귀 테스트.

## 코드·검사 범위

- 예제의 노트 키보드·클립보드·IME 등록을 공통 `TufteNoteInteractionPlugin`으로 이동했다. 접근성 이름과 단축키를 갖는 `ToolbarButton`을 새로 추가했다.
- **E148 정적 오류 발견:** 예제의 '다음 노트로'·'본문으로' 버튼이 이미 이동된 `enterNote()/leaveNote()` 함수를 참조하고 있었다. 공통 `ENTER_TUFTE_NOTE_COMMAND`·`LEAVE_TUFTE_NOTE_COMMAND`를 정의·등록·해제하고 버튼·패키지 export에서 이를 사용하도록 수정했다.
- `tests/note-browser.mjs`에 두 버튼의 실제 노트 진입·복귀 검사를 추가했다. `tests/reusable-note-interactions-browser.mjs`에는 두 편집기의 키보드·메시지·readonly 격리 경로를 작성했다.
- packed consumer smoke test에 `ToolbarButton`·노트 플러그인과 두 공개 명령의 JS/타입 계약을 추가했다.

## 검증 결과 (증거 범위 엄격 구분)

| 게이트 | 상태 | 근거/제한 |
| --- | --- | --- |
| GitHub 최신 소스의 정적 계약 검사 | **25/25 통과** | 남은 미정의 함수 호출·명령 등록/cleanup·readonly·두 편집기 알림·공개 export·test script·오류/대책 기록을 소스 문자열로 대조 |
| 실제 frozen 설치 | 미실행 | 로컬 환경에 프로젝트 checkout·pnpm이 없고 GitHub DNS 해석 실패 |
| `pnpm check` (빌드·타입·unit) | 미실행 | 의존성 확보 불가 |
| `pnpm package:check` | 미실행 | tarball build/dependency 불가 |
| `pnpm test:note-interactions` | **작성만 완료, 미실행** | Chromium + Vite 실행 환경 확보 전 |
| 전체 `pnpm test:browser` | 미실행 | 기존 11월 3일 결과는 이 변경 전 소스에 한정 |
| GitHub Actions/CI | 미실행 | 사용자·프로젝트 방침에 따라 실행하지 않음 |

**중요:** 이 문서의 25/25는 실제 TypeScript 타입 검사나 Playwright 테스트가 아니다. 특히 E148은 정적 검사로 **원인과 호출 경로를 찾아 코드 수정까지 완료**했지만, 실제 빌드 성공이나 런타임 수정 검증이 이루어졌다는 뜻이 아니다.

## 실제 환경에서 실행할 순서

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm package:check
pnpm test:note-interactions
pnpm test:browser
```

하나라도 실패하면 실패 로그/원인과 재실행 결과를 구분해 기록한다. 임의의 timeout 완화·테스트 기대값 축소나 과거 검증 수치 재사용으로 완료 처리하지 않는다.

## 남은 단계

1. 위 검증 게이트를 **실제 실행하여 E148/M131을 수락**한다.
2. 기존 예제에 남은 노트 삽입·분리·합치기·이동 명령을 호스트 독립 공개 API로 분류하고 순서대로 공통화한다.
3. 실제 OS IME, 스크린리더, 타 브라우저 및 장시간 리스너·클립보드 수명 문제를 별도 수락한다.

관련 오류/대책: [E148](ERROR_LOG.md), [M131](ERROR_PREVENTION.md). 기존 실행 검증: [호스트 자산 42/42 보고서](VERIFICATION_HOST_ASSETS_2026-11-03.ko.md).
