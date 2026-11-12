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

## 재사용 편집기 브라우저 예제

`pnpm dev:editor`를 실행한 뒤 개발 서버의 기본 주소에서 다음 경로로 접속할 수 있습니다.

- `/controlled.html` — `TufteEditor`의 두 인스턴스, 외부 문서 교체, readonly, 마운트/언마운트
- `/host-assets.html` — 서로 다른 namespace를 가진 두 편집기의 **호스트 이미지 선택기**. 실제 DAM이 아닌 예제 `AssetProvider`를 사용합니다.

신규 호스트 자산 선택기 회귀 코드는 `pnpm test:host-assets-controlled`로, **서명 URL 만료·재시도·해제·두 편집기 격리** 검증은 `pnpm test:host-refresh`로 실행하도록 추가했습니다. 이미지 URL 자동 갱신 컨트롤러는 호스트의 `AssetProvider.resolve()`를 사용하며 별도의 서버 구현이 없습니다. **11월 3일 호스트 자산 검증 보고서에서는 선택기와 URL 자동 갱신까지 포함하여 브라우저 42/42개를 통과했습니다.** 첫 실행 실패 2개는 예제·테스트 fixture 수정 후 재검증했고, 제품 구현과 기존 테스트 기대값은 변경하지 않았습니다. 새 기능의 범위와 미완료 게이트는 [React 편집기 추출 현황](docs/EDITOR_REACT_EXTRACTION.ko.md)에 기록했습니다.

## 오류와 개선 기록

- [에러 기록](docs/ERROR_LOG.md)
- [재발 방지 대책·정기 점검](docs/ERROR_PREVENTION.md)

각 작업 시작·완료와 단계 전환 때 점검하고, 대책을 코드·테스트·작업 절차에 반영합니다.

- [주석 편집 구조 결정 ADR-0001](docs/adr/0001-note-editor-model.ko.md)

- [섹션·그림·표 레이아웃 조합 검증](docs/LAYOUT_PROTOTYPE.ko.md)

- [문서·서버 렌더링 결정 ADR-0002](docs/adr/0002-document-and-rendering.ko.md)
- [문서 정본 v1 / 공유 schema와 렌더 profile](docs/DOCUMENT_SCHEMA_V1.ko.md)

`packages/document`는 문서·메타데이터·자산·33개 노드 계약과 validator를 제공합니다. `packages/render`는 공유 검증 뒤 현재 `p1-v1` 출력 지원 범위를 검사합니다. 두 패키지는 DOM/React/Lexical runtime 없이 실행됩니다. 노드별 편집·발행 구현은 P2.2부터 확장합니다.

## 2026-11-12 노트 구조 명령 공통화 및 실행 검증

`@lexical-tufte/lexical`의 `registerNoteStructureCommands`가 노트 삽입·분리·합치기·앞뒤 이동을 호스트 중립 명령으로 제공합니다. `@lexical-tufte/editor-react`에서도 같은 명령을 export하며, 선택적 `TufteEditor.editorRef`를 사용하면 독립 호스트 툴바에서 실행할 수 있습니다. 기존 프로토타입도 공통 명령을 소비합니다.

추가 회귀: `packages/lexical/test/note-structure-commands.test.mjs` 및 `tests/reusable-note-structure-browser.mjs`. 실행 명령은 `pnpm test:note-structures`입니다. **`d3eae84` 기준 빌드·타입·단위 641개(신규 구조 명령 12개 포함)·패키지 6개·브라우저 46/46·Python 16개 및 HTTP 연동을 실제 실행해 통과했습니다.** 제품 코드와 테스트는 수정하지 않았습니다. 정의목록 클릭 timeout 1건은 동일 소스 단독 재실행에서 통과했지만 원인은 미확정입니다. 신규 기능의 readonly 거부 안내·Undo/Redo·두 편집기 격리·remount 검사도 통과했습니다. [최신 검증 보고서](docs/VERIFICATION_DEFERRED_2026-11-12.ko.md) · [파일별 결과/소스 해시](docs/verification/deferred-20261112.json). 실제 OS/운영·장시간 수명과 전체 제품 게이트는 남아 있습니다.

## 2026-11-11 재사용 편집기 및 클립보드 검증

`@lexical-tufte/editor-react`에 노트 키보드·클립보드·IME 공통 플러그인, 호스트 툴바의 노트 진입·복귀 명령과 `ToolbarButton`을 이관했습니다. 두 제어형 편집기의 노트 알림·readonly/remount·plain-text paste·복사/이동 ID 보존·중첩 노트 거부를 실제 Chromium에서 검증했습니다.

**이전 통합 검증 (2026-11-11):** [검증 보고서](docs/VERIFICATION_DEFERRED_2026-11-11.ko.md) · [최초 실패/수정/최종 실행과 소스 해시](docs/verification/deferred-20261111.json)

- frozen 설치, audit/lint/inventory/font, 전체 빌드·TypeScript 타입 검사 **통과**.
- 단위 테스트 **629/629**, 패키지 소비자 **6개 tarball**, Python **16개**, TS→Python HTTP→SQLite 및 발행 revision 모델 **12그룹** 통과.
- 브라우저는 최초 **42/45** 통과. 노트 paste/clipboard 선택 범위와 Linux 폰트 환경을 보정해 해당 3개를 재검증했고, **최종 파일별 45/45 통과**. 제품 코드, 폰트 기준값, 테스트 기대 불변식은 변경하지 않았습니다.
- 공식 Tufte CSS 예제 **9개 섹션·60개 블록·7개 노트**의 DOM·편집·저장/재열기·발행 비교 통과. 375/759/760/761/1024/1440px의 검증된 iframe 마스크 밖 RGBA 픽셀 차이 **0**.
- 기존 예제 '다음 노트로'·'본문으로' 버튼의 미정의 함수 참조 **E148/M131**은 공통 Lexical 명령으로 수정하고 브라우저에서 수락했습니다. 새 테스트 준비 오류 **E149–E150/M132**와 수정 근거는 별도 기록했습니다.
- **CI는 사용자 방침대로 실행하지 않았습니다.** 실제 OS IME·시스템 클립보드, 스크린리더, Firefox/WebKit, 물리 터치, 실제 DAM·업로드·권한·운영 네트워크, 다중 탭·장시간 리스너/타이머 누수는 미검증입니다.

**검증 기준:** 기준 커밋 `d4d724f`에 보고서에 기록된 **테스트 fixture 3개 수정과 Linux 폰트 설정 파일 1개**를 적용한 상태입니다. 이 변경은 현재 브랜치에서 확인했으며, 이후 제품 코드 변경은 별도 검증이 필요합니다. 이 결과만으로 R2/R3/R4–R7/P3.1.e 전체나 npm/운영 배포를 완료 처리하지 않습니다.

이전의 [2026-11-03 호스트 자산 검증](docs/VERIFICATION_HOST_ASSETS_2026-11-03.ko.md) 및 과거 검증 기록은 [진행 기록](docs/PROGRESS.md)에서 확인할 수 있습니다.
