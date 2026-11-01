# lexical-tufte-css

Lexical 기반 Tufte CSS 편집기와 블로그 운영용 TypeScript 라이브러리.

현재 단계: 공식 Tufte CSS 예제의 DOM·편집·저장/재열기·발행 및 지정 화면 너비 시각 대조까지 자동 검증했습니다. 다만 전체 제품·운영 배포·접근성 수락과 npm 배포 완료를 뜻하지 않습니다. 상세 범위는 아래 최신 검증 보고서를 확인하세요.

- [구현 계획 및 실행 체크리스트](docs/PLAN.ko.md)
- [2026-10-17 구현 계획 독립 재점검과 남은 게이트](docs/PLAN_AUDIT_2026-10-17.ko.md)
- [작업 규약](AGENTS.md)
- [Lexical 블록 등록 및 canonical 저장 경계](docs/LEXICAL_BLOCK_SERIALIZATION.ko.md): 메타데이터 블록의 저장/복구에는 canonical export/parse 또는 문서 bridge를 사용합니다. 원시 EditorState.toJSON은 내부 snapshot입니다.

저장소: https://github.com/yunskim/lexical-tufte-css

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

- [문서·서버 렌더링 결정 ADR-0002](docs/adr/0002-document-and-rendering.ko.md)
- [문서 정본 v1 / 공유 schema와 렌더 profile](docs/DOCUMENT_SCHEMA_V1.ko.md)

`packages/document`는 문서·메타데이터·자산·33개 노드 계약과 validator를 제공합니다. `packages/render`는 공유 검증 뒤 현재 `p1-v1` 출력 지원 범위를 검사합니다. 두 패키지는 DOM/React/Lexical runtime 없이 실행됩니다. 노드별 편집·발행 구현은 P2.2부터 확장합니다.

## 최신 통합 실행 검증

**2026-11-01 검증 보고서**: [누적 자동 테스트 실행](docs/VERIFICATION_DEFERRED_2026-11-01.ko.md) · [검증 로그·해시](docs/verification/deferred-20261101.json)

- 단위 테스트 629개, 브라우저 테스트 파일 39개, Python 테스트 16개 통과.
- 빌드·타입 검사, 패키지 검사 5개, TS→Python HTTP→SQLite 왕복, 발행 revision 모델 검증 통과.
- 공식 Tufte CSS 예제 9개 섹션·60개 블록·7개 노트의 DOM·편집·저장/재열기·발행 대조 통과.
- 375/759/760/761/1024/1440px 시각 비교에서 검증된 iframe 마스크 밖 차이 0.
- 호스트 자산 URL 자동 갱신 중복 방지·수동 갱신 우선·revision 교체·이미지 삭제 경계에 대한 회귀 검증 포함.
- **CI는 실행하지 않았습니다.** 실제 DAM 연동, OS별 실제 IME, 스크린리더, 물리 터치, 타 브라우저 검증도 아직 수행하지 않았습니다.

이 수치는 위 보고서에 기록된 검증 대상 코드의 결과입니다. 이후 변경 사항에는 자동으로 적용되지 않습니다. 과거 실행 내역은 [진행 기록](docs/PROGRESS.md)과 `docs/VERIFICATION_*.ko.md`에서 확인할 수 있습니다.
