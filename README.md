# lexical-tufte-css

Lexical 기반 Tufte CSS 편집기와 블로그 운영용 TypeScript 라이브러리.

현재 단계: P0·P1·P2.1 완료. 노트 편집 prototype을 실행할 수 있습니다. 전체 편집기 및 npm 배포 패키지는 아직 완성되지 않았습니다.

- [구현 계획 및 실행 체크리스트](docs/PLAN.ko.md)
- [2026-10-17 구현 계획 독립 재점검과 남은 게이트](docs/PLAN_AUDIT_2026-10-17.ko.md)
- [작업 규약](AGENTS.md)

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

**주의:** 아래의 통과 결과는 각각 명시된 검증 커밋만을 대상으로 한다. 이후의 블록 메뉴·인라인 span 명령·직접 의존성 수정은 회귀 테스트 코드를 작성했지만 아직 일괄 실행하지 않았다. [진행 기록](docs/PROGRESS.md)의 미검증 상태를 우선 확인한다.


2026-10-17 메뉴 후속(main85ac2c3): **266개 단위·통합 / Python16개 / browser12개 실행 파일 / package4개 / 실제 TS→Python HTTP 왕복** 모두 통과. 코드 수정·새 테스트 실패 없음, CI 생략. [최신 메뉴 검증 보고서](docs/VERIFICATION_MENU_2026-10-17.ko.md).

2026-10-17 컨텍스트 UI 후속 검증: 단위·통합266개, Python16개, 패키지4개 및 실제 우클릭/키보드/선택 toolbar 회귀를 실행했습니다. 우클릭 명령이 이전 선택에 적용되는 오류를 수정했습니다. 최종 결과와 범위는 [UI 검증 보고서](docs/VERIFICATION_CONTEXT_UI_2026-10-17.ko.md)를 따릅니다. CI 생략.

2026-10-17 Recovery HTTP 후속 검증 완료: **단위·통합253개 + Python16개 + 브라우저11개 + 패키지4개** 통과. 실제 TypeScript 클라이언트→Python HTTP→SQLite 왕복도 통과했습니다. CI 생략. [최신 후속 보고서](docs/VERIFICATION_RECOVERY_HTTP_2026-10-17.ko.md)에 수정 사항과 미완료 운영 연결을 기록했습니다.

2026-10-17 최신 main 재검증 완료: **237개 단위·통합 테스트, 브라우저 11개 실행 파일, 패키지 4개 소비 검사 통과**. 타입·상태 선택자·폰트 paint 회귀를 수정했습니다. CI 생략. 아래 날짜별 결과는 당시 기록이며 현재 판정과 미완료 범위는 [최신 보고서](docs/VERIFICATION_2026-10-17.ko.md)를 따릅니다.

2026-10-16: 단위/통합 테스트 140개(실패·skip0), 브라우저 실행 파일 6개 및 고정 lock 설치/타입/빌드 검사 통과. CI는 생략합니다. [검증 보고서와 미완료 범위](docs/VERIFICATION_2026-10-16.ko.md)를 확인하세요. 현재 구현분의 검증이며 전체 제품 완료 선언은 아닙니다.

2026-10-16 R02 후속 완료: 공통33종 registry와 전체 노드 golden, 실제 React 저장/재열기를 검증했습니다. 현재 로컬 전체 검사는 **178개 + 브라우저7개 통과**입니다. [R02 왕복 계약과 갱신 절차](docs/ROUNDTRIP_R02.ko.md)를 따릅니다. HTML 발행/편집 명령의 전체 지원을 뜻하지 않습니다.

R03.d 문서 교체 이력 계약과 검증: [HISTORY_R03.ko.md](docs/HISTORY_R03.ko.md). 최신 로컬 검증은 단위·통합180개 및 브라우저7개 통과, CI 생략.

R11 공개 snapshot 생명주기: [packages/blog](packages/blog), [구현·검증 계약](docs/PUBLICATION_LIFECYCLE_R11.ko.md). 최신 로컬 검증은 단위·통합201개 및 브라우저8개 통과, CI 생략.

R13 폰트·패키지 검증: [정책과 결과](docs/LICENSE_AND_FONTS_R13.ko.md). 최신 로컬 검증은 단위·통합201개·브라우저9개 및 패키지4개 소비 검사 통과. `pnpm package:check`는 로컬 tarball만 검사하며 발행하지 않는다. 본명조/본고딕 WOFF2는 대표 문자 검증용이며 전체 생산 폰트 연결은 P4다.
