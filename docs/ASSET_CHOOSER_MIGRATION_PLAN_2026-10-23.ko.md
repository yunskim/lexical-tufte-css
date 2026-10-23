# 이미지 자산 관리 이행·구현 계획 및 작업 체크리스트

- 작성: 2026-10-23
- 대상 저장소: `yunskim/lexical-tufte-css`
- 작업 기준 브랜치: `fix/main-browser-parity-20261023` (계획 작성 직전 `58c30df`)
- 성격: **재실행 가능한 이행 계획**. 실행/검증 보고서와 분리해서 지속적으로 갱신한다.
- 관련 문서: [브라우저 패리티 보완](MAIN_BROWSER_PARITY_REMEDIATION_2026-10-23.ko.md), [실행 기준/실패 결과](VERIFICATION_MAIN_2026-10-23.ko.md), [오류 기록](ERROR_LOG.md), [재발 방지](ERROR_PREVENTION.md).
- 참고 구현: [Wagtail 이미지 chooser](https://docs.wagtail.org/en/stable/topics/images.html), [torchbox/wagtail-bynder](https://github.com/torchbox/wagtail-bynder), 특히 `views/image.py`, `views/mixins.py`, `models.py`, `management/commands/base.py`.

## 2026-10-23 우선순위 변경 — 편집기 먼저, 자산 기능 보류

**최신 실행 업데이트:** E120/E123 해결. check423개·package5개 소비·Python16/HTTP 통과, browser33통과/1실패(timeout·skip0). 유일한 실패는 보류 자산 등록 UI다. 공식9섹션의 실제 편집/저장·DOM·6폭 pixel 대조는 명시된 예외 범위에서 통과했다. [최신 보고서](VERIFICATION_UPSTREAM_PARITY_2026-10-23.ko.md). A0–A8 보류 유지, 아래 수치는 과거 tree의 이력이다.

**최신 실행 업데이트:** E117 등록 충돌 및 E114 회귀 검증 완료. check418개·package5개 소비·Python16/HTTP 통과, browser29통과/5실패(timeout·skip0). E123 React note 서식 drift와 E120 iframe 차이가 남아 E1/E2/E3 전체 완료는 아니다. A0–A8 보류 유지. [최신 보고서](VERIFICATION_NODE_REGISTRY_2026-10-23.ko.md). 바로 아래 수치는 이전 tree의 실행 이력이다.

**실행 업데이트:** `383d25c` 재검증에서 build/typecheck·비-Lexical185개·Python16/HTTP 통과, Lexical62통과/77실패/2취소, browser12통과/20실패/2시간초과. E117 교체 registry 충돌과 E120 iframe 원본 구조 차이 미해결. E114 bridge는 파일 timeout으로 미검증, E115 문서 회귀는 통과. E1/E2/E3 완료로 체크하지 않는다. [재검증 보고서](VERIFICATION_BROWSER_REMEDIATION_2026-10-23.ko.md) 참조. A0–A8 보류는 변경하지 않는다.

**이 결정이 아래 과거 A0~A8 단계의 우선순위·착수 지시보다 우선한다.** AssetProvider는 호스트 중립 **인터페이스만 유지**하고, 현재 브랜치에서 자산 관리 기능을 더 확장하지 않는다. 이전에 작성된 노트 이미지 chooser·imageCatalog 초안은 삭제하지 않되, 구현 완료 또는 검증 통과로 해석하지 않는다. 새로운 작업은 공식 Tufte CSS 편집기·발행 구조 완성과 미해결 브라우저 테스트를 우선한다.

| 순서 | 현재 실제 작업 | 상태 |
| --- | --- | --- |
| E1 | 현행 브랜치 정적 코드 검토: Lexical 입력·저장·재열기, 발행 DOM, 실제 공식 Tufte CSS fixture와 테스트 계약 대조 | 현재 저장 경계/fixture 회귀 검증 완료 — titleId/앵커/registry 수정 포함 |
| E2 | 노트·newthought·heading·figure·quote 등 **편집기 고유** 기능의 미검증 수정 점검 및 실제 DOM/HTML 불일치 수정 | 이번4개 실패 해결·재검증 완료; 전체 GUI 생성/편집 도구는 원래 P2 게이트 유지 |
| E3 | 공식 Tufte CSS **9개 섹션 전체**의 동일 콘텐츠 저장→열기→발행→DOM·시각/픽셀 패리티 확보 | 검증 완료 — 실제 React 편집/저장·전체 DOM·6폭 pixel, 예외는 실행 보고서 명시 |
| E4 | 기존 작업 브랜치의 빌드·타입 검사·단위·브라우저 테스트를 한 번에 실행해 결과 보고, 실패 원인 수정·재검증 | 실행 완료 — browser33/34, 보류 자산1실패 명시; CI 미실행 |
| A0~A5 | 문서 전체 자산 카탈로그, 이미지 등록·재사용·발행, canonical 저장·복구, Wagtail식 chooser 확대 | **보류** |
| A6~A7 | AssetProvider 어댑터, Bynder식 외부 DAM, Magnolia Works 연결 | **후순위 보류** |
| A8 자산 범위 | 자산 기능 확장 이후 별도 통합 검증·이관 | **보류** |

**E1 세부 체크리스트 (수정 코드 작성, 실행은 모아서 진행)**

- [x] `packages/document/src/editorBoundary.ts`, `validateV2.ts`, `migrateStoredDocument.ts`, `packages/lexical/src/documentBridge.ts`의 v1/v2 저장·재열기 투영을 대조.
- [x] `documentBridge.ts`: 선택적 `titleId`가 v2 export 시 누락되는 부분 수정 및 v1→v2→JSON→재열기 회귀 테스트 추가(E114).
- [x] `validate.ts`: 섹션 간 중복된 heading ID를 거부하고 title ID 충돌 계약을 보존하는 검사·테스트 추가(E115).
- [x] `packages/blog/src` publication/recovery, `packages/document/src` canonical/backup/revision/SQLite 경계의 제목 필드 수작업 투영 여부 **정적 표본 점검**. 새로운 필드 누락 수정 사항은 위 bridge 1곳만 발견.
- [x] 공식9개 섹션 fixture의 실제 Lexical 파서 호환성, 저장/재열기 및 `h1#tufte-css` 실행 통과. 최신 보고서 참조.
- [x] 고유 runtime 노드 등록과 React 실제 편집 경로 오류(E117/E123) 수정 및 재검증 통과.
- [x] 파일별 결과와6폭 pixel 수치를 최신 보고서/JSON에 기록. 자산 등록 실패는 보류 기능으로 유지.

**분리 원칙:** 기존 19/34 browser 통과·15실패는 이전 검증 브랜치의 수치이며 이후 코드의 재검증 결과가 아니다. 자산 기능 미구현으로 실패하는 테스트는 **알려진 미완료 기능**으로 유지한다. 테스트를 제거·무력화·skip하여 전체 통과로 보고하지 않는다. 편집기 패리티를 검증할 때는 실패를 “편집기 오류 / 자산 확장 미구현 / 환경·시각 helper”로 분류한다.

**향후 자산 기능 재개를 위한 작은 설계 정리(코드 미수정)**

- [ ] `packages/editor-ports/src/index.ts`의 `AssetRevision.id`를 `revisionId`로 명칭 통일. `AssetLocator.revisionId` / `ResolvedAsset.revisionId`와 동일 의미로 문서·타입 소비·계약 테스트를 같이 정렬.
- [ ] **새 자산 선택 UI는 특정 revision 고정을 기본값**, 최신 버전 추적(floating)은 사용자가 별도로 명시적으로 선택하도록 설계. 기존 floating 값은 자동 변환 금지.
- [ ] 잠정 썸네일은 검색 결과의 영구 URL이 아니라 선택적 임시 preview 기능으로 제공하는 방안을 구현 전에 확인.
- [ ] `src` 필수인 현행 이미지 노드와 `TufteDocument.assets`를 재설계할 때, 외부 resolve URL을 문서 JSON에 영구 저장하지 않는 정본 계약을 별도 변경에서 적용.
- [ ] `design/host-asset-provider-20261023` 설계 브랜치의 변경은 현행 `fix/main-browser-parity-20261023`와 분기되어 있으므로 **무조건 merge하지 않고 필요한 타입·문서 수정만 검토 후 선별 이관**.
- [ ] 자산 관리 작업 재개를 결정했을 때만 아래 A0부터 체크리스트를 다시 순차 진행. 실제 수행 전 당시 최신 브랜치 기준으로 위험·테스트·데이터 계약 재점검.

관련 설계: [AssetProvider 경계](https://github.com/yunskim/lexical-tufte-css/blob/design/host-asset-provider-20261023/docs/asset-provider-boundary.md), [ADR-0012](https://github.com/yunskim/lexical-tufte-css/blob/design/host-asset-provider-20261023/docs/adr/0012-host-reference-asset-provider-layers.ko.md), [ADR-0013](https://github.com/yunskim/lexical-tufte-css/blob/design/host-asset-provider-20261023/docs/adr/0013-document-reference-revision-serialization.ko.md).

## 0. 장기 목표와 불변 원칙 (자산 기능 재개 시)

**장기 목표(현재 보류):** Wagtail처럼 한 이미지 선택 UI에서 문서 자산 검색·재사용·새 항목 등록·속성 편집을 제공한다. 라이브러리 UI는 호스트 저장소와 분리하고, 필요 시 Magnolia Works 등의 외부 Asset 제공자를 교체할 수 있게 한다.

- Wagtail에서 빌릴 것: **chooser → 기존 자산 선택 → 필요할 때 가져오기/로컬 참조 생성 → 에디터에서 일반 이미지로 사용**이라는 상호작용과 확장 지점.
- `wagtail-bynder`에서 빌릴 것: **외부 자산 ID 보존, 중복 가져오기 방지, 동기화 작업과 선택 UI 분리, 오류 시 기존 사본 보존, 썸네일/웹용 파생본 구분**.
- 빌리지 않을 것: Django/Wagtail URL middleware 교체, Bynder 전용 인증/SDK, 외부 DAM을 편집기의 필수 의존성으로 만드는 설계.
- `lexical-tufte-css`의 역할은 **문서 구조·편집 UI·출력·호스트용 계약**이다. 외부 저장/동기화/업로드는 호스트 또는 별도 adapter가 맡는다.
- 문서 내부 이미지 참조 `assetId`와 호스트 자산 `hostAsset:{namespace,assetId,revisionId?}`는 **서로 다른 식별 체계**다. 같은 이미지 노드에 동시에 넣지 않는다.
- 저장된 문서의 이미지 revision 또는 발행 결과는 외부 변경에 따라 **조용히 바뀌면 안 된다**. Bynder의 최신 원본 동기화 정책을 Magnolia의 불변 revision 정책으로 그대로 가져오지 않는다. 최신본 발견과 사용 revision 변경을 분리한다.
- `alt`·표시 `width/height`는 **문서 내 사용처의 표현 속성**, 원본 파일·식별자는 **자산 메타데이터**다. 사용처 속성 편집으로 자산을 바꾸거나 재등록하지 않는다.
- Local-first: 네트워크 없이 기존 문서 편집·저장·복구가 가능해야 한다. 외부 제공자 호출은 명시적/취소 가능한 작업이며 발행 시 암묵적 다운로드·동기화 금지.
- 기존 발행 경로(SSR 및 Lexical HTML), HostLink/HostAsset, revision/SQLite/복구 계약, 공식 Tufte CSS DOM 패리티는 회귀시켜서는 안 된다.

## 1. 실제 저장소 기준 현황 (완료와 검증을 분리)

**코드 작성됨 — 실행 검증 전**

- [x] `examples/editor/src/NoteImagePanel.tsx`: 현재 노트 내 **기존 이미지** 썸네일/검색·alt/크기 편집 UI 작성.
- [x] `examples/editor/src/main.tsx`: 현재 노트에서 이미지 key를 골라 위 UI로 연결하는 동작 작성.
- [x] `packages/lexical/src/InlineImageNode.ts`: 표현 속성 편집과 기존 `assetId`/`hostAsset` 보존 로직 작성.
- [x] `packages/document/src/imageCatalog.ts`: 문서 자산 등록을 불변 배열로 검증하는 초기 함수 작성. **아직 export/편집기/테스트/발행과 연결되지 않음**.
- [x] 노트 선택·크기 관련 테스트 코드를 새 폼에 맞춰 작성/수정했으나 실행하지 않음.
- [x] 기존 `tests/managed-note-assets-browser.mjs`의 구형 prompt/관리 문서 저장 계약과 구현 간 격차 확인.
- [x] 이전 기준 `test/main-verification-20261023` 커밋 `2ec9b4e`: unit 403 통과, browser 19 통과/15 실패. **이후 커밋의 결과가 아니다**.

**아직 충족되지 않은 핵심 계약**

- [ ] 문서 전체 자산 카탈로그를 편집기에서 목록·등록·선택할 수 없음.
- [ ] `imageCatalog.ts` 입력의 MIME/URL/중복/크기/악성 accessor 경계 및 기존 catalog 항목 전체 검증을 단위 테스트로 확정하지 않음.
- [ ] canonical `TufteDocument.assets`와 Lexical 상태를 **하나의 정상 저장·복구 단위**로 묶는 UI 경로가 없음.
- [ ] `packages/render/src/profile.ts`는 `tufte-inline-image`의 `assetId`, `width`, `height`를 여전히 `UNSUPPORTED_RENDER_PROPERTY`로 거부함. `packages/render/src/index.ts`도 inline image의 크기를 출력하지 않음.
- [ ] **현행 fix 브랜치에는** 자산과 `hostAsset`을 잇는 실제 provider/resolver 주입이 없음. 별도 `design/host-asset-provider-20261023` 브랜치에는 호스트 중립 `AssetProvider` **공개 타입만** 구현됨(어댑터와 런타임 연결은 미구현).
- [ ] 신규 코드의 빌드·단위·브라우저·공식 예제 패리티 재검증 미완료.

## 2. 자산 기능 재개 시 작업 단위 (전체 보류)

각 항목은 **하나의 의미 있는 변경 + 해당 의미를 검증하는 테스트 + 문서 갱신**으로 커밋한다. 코드가 있다는 사실은 `[x]`로 표시할 수 있지만, 아래 각 단계의 **완료 게이트는 테스트 증거가 있어야** 통과한다.

### A0. 기준선 고정 및 계약 대조 — 재개 시 1순위 (보류)

- [ ] 최신 작업 브랜치와 `main`, 검증 브랜치의 차이를 다시 확인하고, cherry-pick 대상만 선별한다. 분기된 브랜치를 무조건 병합하지 않는다.
- [ ] `tests/managed-note-assets-browser.mjs`, `note-image-chooser-browser.mjs`, `note-image-dimensions-browser.mjs`, `note-export-parity-browser.mjs`의 **기능/저장/접근성** 기대값을 매핑한다. 구형 `prompt()` 호출 방식은 제품 요구사항으로 고정하지 않는다.
- [ ] `imageCatalog.ts`, `validateDocument`, `InlineImageNode`, `renderArticle`, `documentBridge`, recovery 및 publication/SQLite 경계의 책임 분담을 표로 확정한다.
- [ ] 새 UI와 기존 발행 구조 수정의 빌드·타입 위험을 점검할 소규모 테스트 목록을 만든다. CI는 실행하지 않는다.

**A0 게이트:** 기존 테스트가 확인하려는 *데이터 불변조건*을 삭제하지 않고 새 UI 계약으로 옮길 범위가 명시됨.

### A1. 순수 자산 계약과 안전한 등록 — 재개 시 P0 (보류)

- [ ] `imageCatalog.ts`를 공개 API(`packages/document/src/index.ts`)에 필요한 최소 범위로 export.
- [ ] `AssetRef`는 문서 로컬 카탈로그 메타데이터이고 `ImageFields.assetId`는 그 ID를 가리키며, `hostAsset`는 호스트의 별도 네임스페이스라는 규칙을 타입·문서로 확정.
- [ ] 이미지 등록 API는 완전한 기존 `assets` 유효성, 중복 ID, 허용 URL, MIME 형식, 양의 정수 크기, 최대 개수, 알 수 없는 키/접근자·prototype 입력을 **변경 전에** 검증. 오류 시 기존 목록 불변.
- [ ] 자산 등록·조회·검색은 **IO 없는 순수 계층**으로 두고 URL/메타데이터가 확인되지 않은 경우 실패 결과를 반환. 이미지 파일 자체의 검증은 별도 업로드 계층에서 수행.
- [ ] 자산의 교체/삭제는 사용 문서의 참조를 확인하거나 명시적 relink를 요구. ID 재사용으로 다른 파일을 덮어쓰지 않음.
- [ ] 단위 테스트: 정상 등록, 중복/악성 URL/MIME/크기/접근자/수량 제한/불변성, HostAsset와 문서 assetId 상호배타성.

**A1 게이트:** 등록 실패가 카탈로그와 기존 이미지 노드를 변경하지 않으며, document validator 계약과 모순이 없고 단위 테스트 통과.

### A2. canonical 문서·저장·복구의 원자성 — 재개 시 P0 (보류)

- [ ] 임시 UI 카탈로그를 **문서 envelope의 `assets`**에서 읽고, Lexical `lexicalState`와 같은 저장본으로 내보낸다. 별도 영구 자산 목록을 두어 두 상태가 어긋나는 설계 금지.
- [ ] managed envelope key와 기존 raw `lexical-tufte-p1` / recovery 슬롯의 우선순위·호환성 결정. 레거시 복원은 명시적 이전 경로로만 허용하며 손상된 managed 저장본을 raw 슬롯으로 조용히 대체하지 않는다.
- [ ] 사용자 명시적 동의 없이 기존 유효한 관리 문서를 다른 임시/레거시 상태로 덮어쓰지 않는다. 취소 시 기존 저장 bytes 그대로 보존.
- [ ] 복구 스냅샷에 본문과 자산 목록을 함께 넣고, 둘 중 하나가 유효하지 않으면 **둘 다** 교체하지 않는다.
- [ ] `documentBridge`의 v1/v2 import/export와 publication/SQLite adapter에 기존 `assets` 전달 누락이 없는지 확인하고 기존 계약을 보존한다.
- [ ] 회귀 테스트: `managed-note-assets-browser`의 저장·불러오기·중복·손상·복구·거부(확인창 취소)·사본 생존 시나리오를 새 GUI에 맞춰 이관.

**A2 게이트:** 저장·복구 roundtrip에서 `assets`, `lexicalState`, `assetId`, `hostAsset`가 보존되고 실패/취소가 상태를 부분 적용하지 않음.

### A3. Wagtail 패턴의 공통 이미지 Chooser — 재개 시 P0 (보류)

- [ ] `NoteImagePanel`의 썸네일·검색·상세 폼을 재사용 가능한 presentation 컴포넌트로 분리. 데이터 공급은 prop/adapter, 선택 결과는 명시적 callback으로 받는다.
- [ ] UI를 **기존 노트 이미지 편집**과 **문서 자산 라이브러리에서 선택/등록/삽입**으로 나누어 명확한 제목·동작을 제공한다. 같은 대화상자 안의 탭/보기 구분은 가능하되 다른 의미의 작업을 혼동하지 않는다.
- [ ] 문서 이미지 자산 목록/검색/결과 없음/중복 ID·URL 오류/등록 취소·재시도 구현. Wagtail처럼 썸네일을 먼저 탐색하고 상세 정보에서 alt/크기를 수정한다.
- [ ] 본문·노트 안에서 이미지 삽입 대상의 Lexical selection 또는 note key를 열기 전에 보존하고, 실제 적용할 때 다시 검증. 모달 열기/닫기가 선택 위치·편집 상태를 파괴하지 않도록 함.
- [ ] Wagtail의 선택창은 **디자인/흐름 참고**만 사용. Django/Python 또는 Bynder 클라이언트를 브라우저 번들에 연결하지 않는다.
- [ ] 접근성: dialog 이름/설명·Tab 순환·ESC·초기/복귀 focus·검색/썸네일 버튼 이름·375px 레이아웃·작업 실패 알림.
- [ ] 브라우저 테스트: 현재 이미지 선택, 같은 자산 재사용, 새 자산 등록, 잘못된 입력 취소, 모바일/키보드, 노트 2개에서 교차 편집 방지.

**A3 게이트:** 기존 이미지 재사용과 새 등록이 모두 GUI로 작동하며, 본문·노트별 수정 대상이 섞이지 않고 브라우저 테스트 통과.

### A4. 자산 연결 및 이미지 수정 의미론 — 재개 시 P0 (보류)

- [ ] `등록`(카탈로그에 AssetRef 추가), `연결`(선택한 이미지 노드에 assetId 설정), `삽입`(새 이미지 노드), `표현 변경`(alt/width/height 수정)을 서로 다른 명령으로 정의한다.
- [ ] 문서 자산 선택 시 `src`/원본 치수를 카탈로그에서 일관되게 채운다. 동일 이미지의 여러 사용처는 동일 `assetId`를 공유하되 alt/표시 크기는 각 노드에서 독립적.
- [ ] `InlineImageNode` 변경 명령은 선택 key 유효성 검사, 문서 schema 조건, undo/redo를 준수. 자산 재연결은 identity 변경이므로 명시적 선택 동작으로만 수행.
- [ ] 기존 HostAsset 노드는 로컬 `assetId` 연결 동작으로 묵시 변환하지 않는다.
- [ ] 노트 이미지 chooser·서식·clipboard·가져오기/내보내기·Lexical JSON roundtrip에서 중복·참조 손실 검사.

**A4 게이트:** 같은 자산을 두 번 삽입해도 카탈로그는 1개이고, 각 사용처의 alt/크기·undo·저장·복구가 정상 작동.

### A5. 자산 발행·크기·패리티 — 재개 시 P0 (보류; 편집기 일반 패리티 E1~E3는 현재 우선)

- [ ] `packages/render/src/profile.ts`가 거부하는 managed/sized inline image 기능을 **실제 renderer 지원 추가와 함께** 해제한다. 단순히 실패 조건을 지워서 통과 처리하지 않는다.
- [ ] 발행 `img`에서 안전하게 검증된 `src`, `alt`, 선택적 `width/height`를 출력. `assetId`는 내부 참조이며 원본 Tufte CSS HTML에 불필요한 관리 속성을 누출하지 않는다.
- [ ] 문서 로컬 catalog의 URL/치수와 참조하는 이미지 노드의 값이 불일치할 때 검사 실패; HostAsset가 미해결이면 진단을 남기고 잘못된 URL로 침묵 발행하지 않는다.
- [ ] Lexical HTML export와 SSR 발행 간 이미지 구조/순서/모바일 표시 동등성, 공식 Tufte CSS sample의 실제 DOM·픽셀 비교를 유지한다.
- [ ] 독립 회귀: `note-image-dimensions-browser`, `managed-note-assets-browser`, `server-browser`, `note-export-parity-browser`, 원본 동일 내용 테스트.

**A5 게이트:** 관리·크기 지정 이미지가 validated SSR/HTML로 출력되고 기존 Tufte CSS 및 HostAsset 검증을 회귀시키지 않음.

### A6. 교체 가능한 자산 Provider/Resolver 구현 — 후순위 (보류; 기본 타입만 다른 브랜치에 존재)

- [ ] `AssetProvider`/resolver를 별도 모듈·포트로 정의. 권장 최소 연산: `search(query,cursor)`, `get(locator)`, `resolve(locator,revision)`, 명시적 `importOrCache`(capability 있을 때만).
- [ ] 결과에 `provider/namespace`, 외부 asset ID, 사용 가능한 revision/etag·수정시각, MIME/파일 크기, 썸네일 URL, 접근 가능 여부를 **영구 보존 필드와 일시적 UI 메타데이터로 분리**.
- [ ] `LocalDocumentAssetProvider`부터 어댑터 구현. 추가 provider가 없어도 같은 chooser가 작동해야 한다. provider 실패/네트워크 차단 시 기존 데이터가 유지되어야 함.
- [ ] 검색 pagination·cancellation·에러 분리·중복 결과 dedup(네임스페이스+ID+revision 기준) 및 chooser의 상태 전이 검증.
- [ ] 호스트 인증·저장·파일 다운로드는 호스트 경계가 담당하고, 비밀 token을 Lexical JSON·발행 HTML·브라우저 설정에 포함하지 않는다.

**A6 게이트:** 로컬 provider만으로 동일 UI·테스트가 통과하고, mock 외부 provider 실패/취소/재시도에서 저장본이 불변.

### A7. Bynder식 외부 DAM 연동 및 revision 정책 — 후순위 선택 (보류)

- [ ] 실제 Bynder/Wagtail 의존 없이 **읽기 전용 가짜 DAM adapter**로 검색→선택→ID 매핑→명시적 로컬 캐시/복사 검증.
- [ ] 이미 가져온 외부 자산을 ID로 조회하여 중복 다운로드/등록 방지. 동시 요청 중복·저장 실패 시 유효한 기존 복사본을 보존.
- [ ] 원본 이미지/썸네일/발행용 파생본의 역할 분리. 파일 타입·바이트·픽셀 수 제한 및 필요한 변환/다운사이징 경계를 정의. 실제 파일 처리 구현은 호스트 기능으로 격리.
- [ ] 외부 수정 시각/해시 또는 provider revision으로 **변경 감지**. 기존 문서가 참조한 revision과 발행 결과는 변경하지 않고 `새 버전 사용`을 명시적으로 수행하도록 설계.
- [ ] 삭제/비공개/권한 만료/네트워크 오프라인 시 이전 로컬 사본 사용 가능 정책 및 실패 진단/재시도 정책 작성. 무조건 최신 원본으로 덮어쓰지 않음.
- [ ] Magnolia Works와 통합하는 경우 `assetId + revisionId` 참조와 로컬 cache/hand-off 의미를 기존 Magnolia 문서 계약에 맞춰 별도 검토.
- [ ] 실제 Bynder API/동기화 스케줄러 연결은 요청이 있을 때만 별도 계획/권한 승인 후 실시.

**A7 게이트:** mock DAM로 버전 고정/변경 감지/명시적 갱신/오프라인 복구가 테스트되며, 기존 revision의 발행 바이트가 임의로 바뀌지 않음.

### A8. 자산 확장 후 통합 검증·브랜치 이행·기록 — 재개 시 (보류)

- [ ] 의존성 frozen 설치, `pnpm check`, `pnpm package:check` 실행(단위 통과/실패를 파일별 기록).
- [ ] `pnpm test:note-assets`의 테스트 4개를 **각각** 재실행하고 managed image UI/저장/출력 실패를 원인별 수정.
- [ ] `pnpm test:browser`, `pnpm test:upstream-sections`, `pnpm test:upstream-full-page` 및 별도 같은 콘텐츠 DOM·모바일·시각/pixel 검사. 고정 upstream 시각 자산은 명시적 sync 후 hash 검증.
- [ ] HTTP/SQLite/복구/패키지 소비까지 기존 계약 재검증. CI는 사용자 지시대로 실행하지 않는다.
- [ ] 기준 19/34 browser 통과/15실패와 **새 검증 결과를 분리**하여 `docs/VERIFICATION_*.ko.md` 및 기계 판독 가능 기록 업데이트; skip/차단/미실행 표시.
- [ ] `docs/ERROR_LOG.md` 및 `docs/ERROR_PREVENTION.md`에 신규 회귀와 재발 방지 대책 기록.
- [ ] 코드 리뷰 후 divergent `main`에 필요한 커밋만 선별 이관. 계획 문서도 동일하게 전달하며 원본 검증 브랜치는 그대로 둔다.

**향후 자산 기능 1차 완료 게이트(현재 편집기 완료 기준과 별도):** A1~A5 및 A8 검증 통과, 해당 3개 자산 UI 회귀 테스트와 발행 계약 통과, 기존 안정 계약에 회귀 없음. **외부 DAM 및 자동 동기화(A6/A7)는 1차 완료의 선행조건이 아니다.**

## 3. 요구 데이터 흐름 및 정책 결정 기록

```text
Wagtail 스타일 공통 Chooser (presentation)
  ├─ LocalDocumentAssetProvider       → TufteDocument.assets
  ├─ [후속] HostAssetProvider          → hostAsset(namespace, assetId, revisionId)
  └─ [선택] ExternalDAMProvider        → remote ID + revision + explicit import/cache
                 ↓ 명시적 사용/연결
       Lexical InlineImageNode
       ├─ assetId  XOR  hostAsset
       ├─ alt / width / height (per-use)
       └─ src (검증된 표시/발행용 URL)
                 ↓
      validate + canonical envelope
                 ↓
        save / recovery / publish
```

- **정본 경계:** 문서의 사용처/연결과 선택된 revision은 저장된 문서가 정본. 로컬 자산 URL·파일 메타데이터는 카탈로그 정본, 외부 DAM 원본의 최신 상태는 외부 provider 정본이다. 셋을 구분한다.
- **발행 스냅샷:** 발행 시 해석된 대상/버전/파생본을 명시적으로 확정하고, 외부 교체 때문에 과거 발행본이 임의 변경되지 않게 한다. 실제 컨텐츠 주소 지정/복사 정책은 A7에서 호스트별로 확정.
- **삭제/교체:** 참조 중 자산 제거는 기본 거부 또는 명시적 대체 플로우. 로컬 `assetId`는 다른 파일에 재할당하지 않는다.
- **가져오기:** 네트워크 다운로드, 바이너리 저장, rendition 생성은 이번 1차 범위 밖. 1차는 검증된 URL·기존 catalog와 참조/발행 일치에 집중.
- **기술 선택:** 현재 UI는 React/Lexical, 스키마/검증은 `@lexical-tufte/document`, 외부 연결 계약은 에디터 포트/별도 adapter에 둔다. Wagtail이나 Bynder 패키지를 의존성으로 추가하지 않는다.

## 4. 운용 규약

- 완료 표시 규칙: 코드만 작성되면 해당 구현 체크박스만 `[x]`. **단계 완료 게이트**는 테스트 이름·실제 실행 결과·커밋·날짜를 기록한 뒤에만 닫는다.
- 작업 시작 때 브랜치가 바뀌었으면 `현재 기준 브랜치/HEAD`만 갱신하고, 단계의 불변 계약/테스트를 다시 검사한다. 특정 SHA에 과도하게 결합된 작업 지시는 피한다.
- 남은 버그를 단위 테스트 제거, schema 완화, UI mock 버튼, 테스트 skip으로 숨기지 않는다.
- 테스트 묶음 실행은 사용자가 요청하는 시점까지 유보한다. 현재 실행 수치는 **19 통과/15 실패**가 최종 증거이며, 새 코드가 통과했다는 뜻이 아니다.
- 향후 요청이 단순히 `다음 진행하세요`라면 **우선 E1 → E2 → E3(필요 시 E4)**의 Tufte CSS 편집기 코드·테스트 준비를 진행한다. **A0~A8 자산 확장은 별도 재개 요청 전에는 진행하지 않는다.**

## 5. 작업 이력

| 날짜 | 내용 | 증거 | 검증 |
|---|---|---|---|
| 2026-10-23 | 노트 내부 chooser, 이미지 표현 편집, 카탈로그 등록 함수 초안 존재 확인 및 이행 체크리스트 작성 | 위 경로 및 기준 브랜치 | 계획 작성/정적 확인; 신규 테스트 미실행 |
| 2026-10-23 | AssetProvider는 인터페이스만 유지하고 자산 기능 확장 보류. E1~E3 Tufte CSS 편집기/발행 패리티 우선, pinned 기본 UX 및 revision 명칭 통일을 미래 체크리스트에 추가 | `design/host-asset-provider-20261023` 및 본 계획 | 계획만 갱신, 코드·테스트 미실행 |

