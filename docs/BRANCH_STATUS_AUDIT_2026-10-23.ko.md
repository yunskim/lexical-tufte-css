# 브랜치별 실제 진행 상태 재점검 — 2026-10-23

## 판정 원칙

GitHub의 **두 브랜치**와 커밋 비교, main의 현재 파일, 작업 브랜치의 실제 문서 및 이전 실행 보고서를 교차 확인했다. 코드를 작성한 사실, 과거 실행 통과, **현재 HEAD 실행 통과**를 구분한다. 이번 점검에서는 테스트·빌드·CI를 실행하지 않았다.

## 브랜치 분기

- `main`: 최근 호스트 참조/에셋 제공자 인터페이스, HostLinkNode, reference picker, 공식 예제 비교 보조 코드/체크리스트.
- `test/upstream-full-page-baseline-20261019`: 공식 예제 9섹션 재구성, Lexical 전체 문서 roundtrip, 실제 편집 UI, 시각/픽셀 대조 테스트, 구체 노트 모델 및 여러 편집 기능.
- GitHub compare 기준: 작업 브랜치는 main보다 **309커밋 ahead, 158커밋 behind** (양방향 분기). 파일 비교는 병합 가능성이나 테스트 성공을 보장하지 않는다.

## 세 번의 교차 확인

1. **파일 존재 확인**: main에서 `tests/helpers/pinned-upstream-article.mjs`, `tests/upstream-full-document-{roundtrip,editor}-browser.mjs`, `docs/UPSTREAM_PAGE_PARITY_MATRIX.ko.md`가 없음을 확인. 작업 브랜치 compare에서는 추가 파일로 확인.
2. **기능/테스트 추적**: 작업 브랜치 대응표에 공식 9섹션/60블록/7노트의 단일 문서 재구성, v1→v2 migration, headless Lexical 저장·재열기·발행, React UI 편집·undo/redo·재로드, 시각 비교가 **코드 작성** 상태로 기재됨. 동일 콘텐츠 섹션별 2/9는 2026-10-19 당시 통과, 나머지 7/9는 실행 대기라고 기록됨.
3. **실행 증거 검토**: `docs/VERIFICATION_FULL_BASELINE_2026-10-19.ko.md`에는 그 당시 빌드·타입·lint 통과, JS unit 65통과/85실패, browser 파일 16통과/5실패, Python 16통과, package consumer 실패로 기록됨. 이후 `docs/CODE_REVIEW_REMEDIATION_2026-10-22.ko.md`는 CR01–CR07 수정 코드를 작성했으나 **일괄 실행하지 않았다**고 명시. 과거 실패를 현재 실패로 단정하지 않되 현재 통과로 간주하지 않는다.

## 기능별 판단

| 기능 | 코드/자료 | 검증 상태 | 다음 조치 |
| --- | --- | --- | --- |
| 공식 9섹션 단일 Lexical 문서 | 작업 브랜치에 존재 | 신규 전체 문서 roundtrip/UI 수락 미실행 | **재사용**, 새 fixture 작성 금지 |
| 9섹션 동일 콘텐츠 DOM 비교 | 섹션별 테스트 및 대응표 존재 | 과거 2/9 통과, 7/9 실행 대기 | 기존 테스트 활용 |
| 전체 페이지 시각/픽셀 비교 | 브라우저 테스트 코드 존재 | 최신 HEAD 수락 미확인 | 일괄 실행 때 판정 |
| 노트/그림·렌더러 개편 | 작업 브랜치에 구현 | 과거 구형 fixture/노드 타입 불일치 보고, 후속 수정 미실행 | schema/serializer/fixture 호환성 검토 |
| 호스트 참조 인터페이스/HostLink | main에 구현 | 신규 테스트 미실행 | 경계 동결, 추가 확장 보류 |
| 블로그 운영·패키징·제품 완성 | 양쪽에 일부 코드/계획 | 전체 완료 증거 없음 | P3–P8 게이트 별도 추적 |

## 중복 및 병합 정책

- 최근 main의 `UPSTREAM_FULL_DOCUMENT` 선택적 테스트 경로와 새 parity 체크리스트는 **기존 작업 브랜치 전체 페이지 테스트보다 범위가 좁고 중복**된다. 이를 정본으로 확대하지 않는다.
- 정본 후보: `tests/helpers/pinned-upstream-article.mjs`, `tests/upstream-full-document-roundtrip-browser.mjs`, `tests/upstream-full-document-editor-browser.mjs`, `tests/upstream-full-document-visual-browser.mjs`, `tests/upstream-full-page-baseline-browser.mjs`, `docs/UPSTREAM_PAGE_PARITY_MATRIX.ko.md`.
- 브랜치 전체 병합 금지: 두 브랜치에서 document schema, Lexical node registry, renderer, fixture가 서로 변경됐다. **기존 파일을 선별 재사용**하고 현재 main 계약과 비교한 뒤 필요한 어댑터만 수정한다.
- 작업 순서: (1) 작업 브랜치 전체 페이지 핵심 코드의 import/API 의존성 확인 → (2) main의 schema·노트·렌더러와 호환성 표 작성 → (3) 선별 이관 또는 충돌 최소 수정 → (4) 중복 계측 정리 → (5) 사용자 지시 시 일괄 검증. 통과 전 체크 완료 금지.
- Magnolia Works 기능 추가 금지. 호스트 인터페이스 경계만 유지.

## 통합 착수 — 2026-10-23

- [x] 작업 브랜치의 **standalone** `tests/helpers/pinned-upstream-article.mjs`를 내용 변경 없이 main으로 이관. DOMParser 기반 재구성 함수는 브라우저 `page.evaluate` 내부에서 실행되며 패키지 API를 직접 import하지 않는다.
- [x] 작업 브랜치의 `tests/upstream-full-page-baseline-browser.mjs`를 내용 변경 없이 main으로 이관. 고정 원본 HTML/CSS와 Playwright만 참조하므로 최신 document/lexical/renderer 인터페이스 변경에 영향받지 않는다.
- [ ] `tests/upstream-full-document-roundtrip-browser.mjs`는 작업 브랜치의 `migrateStoredDocument`, `validateDocumentV2`, `loadMigratedDocumentIntoEditor`, `exportEditorToDocumentV2` API를 import한다. main에서 제공 여부·계약을 확인하기 전 **그대로 복사하지 않는다**.
- [ ] 실제 editor UI·visual 테스트는 그 다음에 종속성/fixture 계약을 확인하여 선별 이관한다.
- [ ] 신규 이관 파일의 실제 실행 수락. 사용자의 일괄 검증 지시로 실행하지 않았다.
- [ ] main에 임시 추가한 중복 비교 경로 정리. 기존 전체 페이지 오라클과 동등한 커버리지 확보 전 제거하지 않는다.

## 전체 문서 roundtrip 이관 전 인터페이스 대조 — 2026-10-23

두 브랜치의 **실제 소스**(`packages/document/src/{index,schema}.ts`, `packages/lexical/src/{index,nodes}.ts`, `packages/render/src/index.ts`)와 기존 테스트 import를 재확인했다.

| 계약 | main | 기존 테스트 브랜치 | 이관 판정 |
| --- | --- | --- | --- |
| `validateDocument`, `migrateStoredDocument`, `validateDocumentV2` | 모두 export | 모두 export | API 이름 호환, 의미론은 별도 확인 |
| `createHeadlessEditor`, `TUFTE_NODES`, `loadMigratedDocumentIntoEditor`, `exportEditorToDocumentV2` | 모두 export | 모두 export | API 이름 호환, node registry는 **비호환** |
| note wire type | `tufte-note` | `tufte-sidenote` / `tufte-marginnote` | **직접 이관 차단** |
| paragraph/quote 확장 | 기존 타입 | `tufteClass` / `cite` 확장 | 원본 문서 재구성의 속성 보존 확인 필요 |
| 발행 렌더러 | generic `tufte-note` | concrete note, `titleId`, `tufteClass` 지원 | DOM 동일 콘텐츠 비교 전에 조정 필요 |
| `ReferenceProvider` / HostLink | main에 있음 | 기존 브랜치에는 없음 | 유지하되 공식 예제 재현과 분리 |

**결론:** roundtrip 테스트의 import 경로 자체는 대체로 유지되지만, 재구성기가 만드는 JSON node type과 main의 schema/registry/renderer가 맞지 않는다. 테스트 파일을 그대로 복사하면 검증 실패가 예상되며, 원인을 감추는 호환성 shim을 새로 만들지 않는다. 기존 브랜치의 concrete note 모델과 관련 renderer/schema 변경을 main의 HostLink 계약과 충돌 없이 선별 이관할지 먼저 결정한다. 이전에 이관한 standalone baseline과 fixture builder는 유지한다.

## 확정 결정: 노드 타입으로 주석 구별

사용자 결정에 따라 **기존 작업 브랜치의 concrete node 모델을 정본으로 채택**한다.

- 저장 wire type: `tufte-sidenote`, `tufte-marginnote` 두 가지. `tufte-note + kind` 모델은 최종 정본이 아니다.
- Lexical: 공통 추상 `NoteNode`를 구현 재사용에만 사용하고 `SidenoteNode`, `MarginnoteNode`를 등록한다. 기존 브랜치의 세 파일을 우선 재사용한다.
- 문서 계약: schema/types/validator, 노드 registry, renderer profile/switch, editor bridge, golden fixture를 **동일 변경 단위**에서 일치시킨다. 호스트 참조 노드와 `ReferenceProvider`는 유지한다.
- 기존 `tufte-note` 저장 문서의 이전 정책은 명시적으로 결정·테스트한다. 기존 자료를 묵시적으로 버리거나 손실 변환하지 않는다.
- `tufte-sidenote` ↔ `tufte-marginnote` 전환 기능은 이번 결정에 포함되지 않는다.
- 현재 main은 여전히 generic note 코드이므로 **결정 확정 ≠ 구현 완료**. 구조 이전·테스트 수락은 미완료다.

## Concrete note 코드 이관 1단계 — 원본 보존

- [x] 작업 브랜치의 `NoteNode.ts`, `SidenoteNode.ts`, `MarginnoteNode.ts`를 **원문 그대로** `integration/concrete-notes/`에 보존했다.
- [ ] 실제 패키지 `packages/lexical/src/` 등록 및 호출 경로 교체. 현재 main의 `noteOperations.ts`는 `$createNoteNode(id,kind)`와 `getKind()`를 사용하므로 구형 API를 먼저 대체해야 한다.
- [ ] schema/validator/renderer/fixture와 저장 이전을 함께 전환한다.
- [ ] 실행 수락. 이관 원본은 현재 런타임에 등록되지 않았으며 **기능 통합 완료가 아니다**.
- 기존 노드 소스를 변경하지 않았고 테스트/빌드/CI도 실행하지 않았다.

## 테스트 통합 — 2026-10-23

- [x] 기존 작업 브랜치의 전체 문서 roundtrip / 실제 editor / visual / pixel parity 테스트 및 pixel helper를 **내용 변경 없이** main에 복원했다.
- [x] `package.json`에 명시적 배치 명령 `pnpm test:upstream-full-page`를 추가했다. 일반 `test`/CI에는 자동 포함하지 않았다.
- [ ] **실행 가능성 확인 필요:** 기존 전체 문서 오라클은 concrete note schema 및 renderer를 전제로 하며 현재 main 런타임은 generic note를 사용한다. 코드 존재·스크립트 등록은 통과를 뜻하지 않는다.
- [ ] 기존 브랜치의 나머지 section-level / note edit 회귀 테스트 목록 대조 및 누락 이관.
- [ ] concrete note 런타임 전환 및 그에 따른 회귀 테스트 업데이트.
- [ ] 배치 실행, 실패 수정 및 재실행. 사용자 지시에 따라 아직 실행하지 않았다.

## 추가 테스트 복원 및 실행 명령

- [x] 기존 브랜치의 **신규 파일로 분류된** 섹션별/geometry/newthought 테스트 9개와 note asset 관련 테스트 4개를 main으로 복원.
- [x] 명시적 명령 `pnpm test:upstream-sections`, `pnpm test:note-assets` 등록. 기존 일반 테스트/CI에는 자동 추가하지 않음.
- [ ] 기존 브랜치에서 **수정된** 기존 테스트 파일(예: `note-browser`, `note-editing-browser`, `publication-browser`, `upstream-dom-browser`)의 변경점은 아직 선별 병합되지 않았다.
- [ ] 현재 main의 generic note 런타임과 복원된 concrete note 기대치 불일치 해결.
- [ ] 빌드·테스트·CI 미실행. 파일 복원과 스크립트 등록만 완료.

## 기존 테스트 수정본 대조 및 보존

기존 브랜치에서 수정된 브라우저 테스트 8개(`note-browser`, `note-dom-browser`, `note-editing-browser`, `publication-browser`, `upstream-dom-browser`, `all-nodes-browser`, `server-browser`, `text-format-browser`)를 main과 파일별 비교하고 **`integration/legacy-tests/`에 원본 보존**했다. 실제 `tests/`의 현재 버전은 덮어쓰지 않았다.

| 테스트 | 주요 판단 |
| --- | --- |
| note-editing, all-nodes, text-format | 기존 브랜치는 concrete note wire type 사용. main의 generic note 계약 전환 이후 선별 병합 |
| note-dom, note-browser | label/input/span 구조 및 노트 동작 회귀를 기존 main 기대치와 대조 필요 |
| publication, server | renderer/document 차이 때문에 소스 단순 교체 금지 |
| upstream-dom | main의 `UPSTREAM_FULL_DOCUMENT` 경로를 기존 브랜치 버전으로 덮어쓰면 기능 회귀 가능 |

- [x] **신규 테스트 파일 복원** 및 기존 수정 테스트 원본 보존.
- [ ] 실제 기존 테스트 파일에 유효한 변경을 선별 병합하고 불필요한 중복을 제거.
- [ ] concrete note schema/renderer/runtime 통합.
- [ ] 검증 실행. 테스트·빌드·CI 미실행.

## Concrete note 계약 이관 준비

기존 브랜치의 `packages/document/src/schema.ts`, `types.ts`, `validate.ts`, `packages/render/src/index.ts`를 각각 `integration/concrete-notes/reference/`에 원문 그대로 확보했다. main 현행 코드와 크기 및 note wire type 차이를 확인했다. 현행 런타임 파일은 **아직 변경하지 않았다**.

이후 원자적으로 반영할 사항:
1. document schema/type/validator에서 concrete note wire type 수용, 기존 저장본 이전 규칙 확정
2. Lexical abstract NoteNode + 두 concrete node 등록, noteOperations/commands의 `getKind()` / `$createNoteNode()` 호출 교체
3. renderer의 label/input/span, 접근성, ID 계약 맞춤
4. 기존 테스트 수정본 선별 반영 및 회귀 실행

원본 파일 보존은 런타임 연결이나 테스트 통과를 의미하지 않는다.

## 문서 계약 실제 전환 착수

- [x] `packages/document/src/schema.ts`: concrete `tufte-sidenote` / `tufte-marginnote` 등록, figure 직접 자식은 marginnote만 허용.
- [x] `packages/document/src/types.ts`: `kind` 없는 두 wire type으로 교체.
- [x] `packages/document/src/validate.ts`: 중첩 노트/중복 ID 검사와 figure 제약을 concrete type 기준으로 변경.
- [ ] Lexical registry/operations/editor, renderer, 저장 문서 이전 정책은 **아직 구형 모델**이므로 main은 현재 과도기적 불일치 상태다. 빌드·테스트 통과를 주장하지 않는다.
- [ ] 기존 저장 `tufte-note + kind` 문서의 안전한 이전 처리.
- [ ] 테스트/빌드/CI는 실행하지 않았다.

## 유의사항

이 문서는 GitHub 원격 코드/기록을 근거로 한 **정적 감사**다. 테스트 실행 결과를 새로 생성하지 않았으며, 기록된 2026-10-19 실행 결과는 현재 브랜치 HEAD의 상태가 아니다.
