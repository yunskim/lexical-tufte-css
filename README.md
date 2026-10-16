# lexical-tufte

Lexical 기반 Tufte CSS 편집기와 블로그 운영용 TypeScript 라이브러리.

현재 단계: P0 기반 구성 완료. 실행 가능한 편집기와 npm 배포 패키지는 아직 구현되지 않았습니다.

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
