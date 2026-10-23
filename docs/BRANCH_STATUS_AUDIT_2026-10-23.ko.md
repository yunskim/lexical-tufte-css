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

## 유의사항

이 문서는 GitHub 원격 코드/기록을 근거로 한 **정적 감사**다. 테스트 실행 결과를 새로 생성하지 않았으며, 기록된 2026-10-19 실행 결과는 현재 브랜치 HEAD의 상태가 아니다.
