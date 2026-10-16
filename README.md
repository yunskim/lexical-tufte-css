# lexical-tufte

Lexical 기반 Tufte CSS 편집기와 블로그 운영용 TypeScript 라이브러리.

현재 단계: P0 및 P1.1–P1.4 완료. 노트 편집 prototype을 실행할 수 있습니다. 전체 편집기 및 npm 배포 패키지는 아직 완성되지 않았습니다.

- [구현 계획 및 실행 체크리스트](docs/PLAN.ko.md)
- [작업 규약](AGENTS.md)

저장소: https://github.com/yunskim/lexical-tufte

라이선스: 저장소의 GPL-3.0 LICENSE를 따릅니다. 패키지 이름은 구현 착수 시 확정합니다.

## 로컬 검증

Node >=22, pnpm 11.25.0 기준입니다.

```sh
pnpm install --frozen-lockfile
pnpm check
```

`check`는 workspace 정책 검사, upstream CSS 목록 검사, TypeScript 검사, 빌드를 순서대로 실행합니다. CI는 생략합니다.

- [진행 기록](docs/PROGRESS.md)
- [의존성 기준](docs/DEPENDENCIES.md)
- [외부 저작물 고지](THIRD_PARTY_NOTICES.md)

## 노트 편집 prototype

```sh
pnpm install --frozen-lockfile
pnpm dev:editor
```

Vite가 표시하는 로컬 URL을 엽니다. Alt+↓로 다음 노트에 들어가고 Escape로 본문에 복귀합니다. 링크·이미지 버튼은 prototype용 고정 샘플을 삽입합니다.

브라우저 검증은 별도로 실행합니다. CI는 사용하지 않습니다.

```sh
pnpm exec playwright install chromium
pnpm test:browser
```

브라우저 테스트는 개발 서버를 자동으로 시작합니다. `EDITOR_URL`로 실행 중인 별도 서버를 지정할 수 있습니다. 노트 복사·삭제·분할·병합·이동·undo/redo와 Chromium 한글 조합 이벤트는 P1.2에서 검증했습니다. 실제 OS별 IME 및 다른 브라우저는 후속 검증 대상입니다.

## 오류와 개선 기록

- [에러 기록](docs/ERROR_LOG.md)
- [재발 방지 대책·정기 점검](docs/ERROR_PREVENTION.md)

각 작업 시작·완료와 단계 전환 때 점검하고, 대책을 코드·테스트·작업 절차에 반영합니다.

- [주석 편집 구조 결정 ADR-0001](docs/adr/0001-note-editor-model.ko.md)

- [섹션·그림·표 레이아웃 조합 검증](docs/LAYOUT_PROTOTYPE.ko.md)
