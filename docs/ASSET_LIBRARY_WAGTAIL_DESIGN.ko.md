# 문서 자산 라이브러리 — Wagtail 참고 구현 계약

상태: 3차 설계 검토 반영 / 제품 UI 미구현. 2026-10-31 누적 검증의 `managed-note-assets-browser.mjs` 실패를 해결하기 위한 구현 기준.

## 원칙

Wagtail의 이미지 라이브러리처럼 **등록 → 검색·선택 → 문서에 삽입 → 기존 이미지 교체**의 흐름을 제공한다. Wagtail 자체를 의존성으로 추가하지 않으며 Wagtail의 서버 모델·권한 시스템을 복제하지 않는다. 현재 예제는 로컬 관리 자산을 사용하고, 호스트별 외부 자산은 선택적 `AssetProvider`로 연결한다. Magnolia Works 종속성은 금지한다.

## 사용자 경험

1. 툴바의 **문서 이미지 자산 등록**으로 자산을 추가한다. 초기 프로토타입은 ID, URL, MIME, 선택적 너비·높이를 입력받는다. 이후 등록 다이얼로그는 미리보기·대체텍스트·검증 오류를 한곳에 표시한다.
2. **문서 이미지 자산** 영역에서 썸네일, 파일명/ID, 유형, 크기를 확인하고 검색·필터링한다. Wagtail 이미지 chooser처럼 선택을 마쳐야 본문이 바뀐다.
3. 노트 내 기존 이미지에 대해 **선택한 노트 이미지에 {id} 연결**을 제공한다. 원래 alt 텍스트는 유지하며 URL·assetId·너비·높이를 함께 변경한다. 선택된 이미지가 없거나 유효하지 않으면 문서를 변경하지 않는다.
4. 동일 ID 등록은 거부하고 기존 자산을 덮어쓰지 않는다. 이후 자산 교체/버전 선택은 별도 명시적 동작으로 추가한다.
5. 접근성: 검색/선택 UI는 dialog 또는 명명된 group, 이미지 선택 버튼, 오류 status를 제공하며 키보드 포커스 복귀를 보장한다.

## 정본 및 저장 계약

- Lexical JSON이 본문 정본이며 자산 카탈로그는 문서 envelope의 `assets[]`에 저장한다. 로컬 예제의 저장 키는 `lexical-tufte-p1-document`다.
- 관리 문서 저장·불러오기·발행 HTML은 동일한 검증된 envelope를 사용한다. raw Lexical 저장본이 관리 문서를 조용히 덮어쓰거나 손상된 envelope를 대체해서는 안 된다.
- 복구 snapshot은 `{savedAt,state,assets}`를 원자적으로 저장·복원한다. 손상된 관리 문서에서 레거시 raw 슬롯으로 자동 후퇴하지 않는다.
- 이미지 참조는 `assetId`를 안정적인 식별자로 사용한다. URL은 해석된 위치이며 참조의 정체성이 아니다. 외부 공급자의 임시 URL을 영구 식별자로 저장하지 않는다.
- 자산 등록/연결 시 URL, MIME, 양의 정수 크기, ID 중복, 발행 허용 정책을 검증한다. 외부 `AssetProvider`의 검색·revision·resolve는 편집기 경계에서만 호출한다.

## 구현 순서와 수락 조건

- [ ] A1: 예제 편집기 관리 자산 상태와 등록 UI. 중복·잘못된 입력 거부, 1개 등록 상태 표시.
- [ ] A2: 노트 이미지 선택/연결 명령. alt 보존, `assetId/src/width/height` 동시 반영, Undo/Redo.
- [ ] A3: canonical envelope 저장·불러오기·발행, 기존 관리 문서 덮어쓰기 확인, 오류 상태.
- [ ] A4: 자산 포함 recovery snapshot 복원, 손상된 관리 문서 거부.
- [ ] A5: `managed-note-assets-browser.mjs` 포함 전체 테스트 재실행 및 검증 보고서 갱신.
- [ ] A6: Wagtail형 이미지 chooser의 검색/필터/미리보기와 호스트 `AssetProvider` 연동. A1–A5와 분리해 진행.

테스트를 skip하거나 성공으로 바꾸지 않는다. UI 없는 현재 상태는 2026-10-31 보고서 기준 브라우저 37/38 통과이며 전체 통과가 아니다.

## 설계 재검토 (2026-10-31, 세 차례)

### 1차 — 기존 타입과 책임 경계

- `AssetProvider`는 `search/revisions/resolve`만 제공하며 **upload/create/delete API가 없다**. 따라서 문서 자산 등록 UI를 외부 공급자에 쓰기 작업으로 연결하지 않는다. 예제의 로컬 `assets[]` 등록과 외부 provider 검색은 별개의 경로다. 향후 업로드는 별도 선택적 `AssetWriter` 계약을 설계한 후 추가한다.
- 문서 `AssetRef`는 `id/src/mimeType/alt?/width?/height?/byteLength?/sha256?`를 사용하지만, provider의 `AssetSummary`는 `id/title/mediaType/currentRevision?`이고 `ResolvedAsset`는 `assetId/revisionId/mediaType/url/expiresAt?`다. 둘을 강제 형변환하거나 동일 객체로 취급하지 않는다.
- 이미지 노드의 `assetId`(문서 로컬 참조)와 `hostAsset:{namespace,assetId,revisionId?}`(외부 공급자 참조)를 구분한다. 공급자 namespace가 없는 `AssetLocator`만으로 여러 호스트 자산을 동일하게 취급하지 않는다.

### 2차 — 저장·복구·이력의 일관성

- **문서 카탈로그 등록과 노트 이미지 연결은 별도 작업**이다. 등록 직후 자동으로 기존 이미지의 URL을 변경하지 않는다. 연결 명령의 편집기 상태 변경은 하나의 Undo 단계로 기록한다. 카탈로그 등록 자체의 Undo/Redo 정책은 본문 이력과 혼합하지 않고 별도로 결정해야 한다.
- 자산 등록 직후 저장하지 않은 상태, 저장된 본문과 자산 카탈로그가 서로 다른 상태, 자산 제거 후 참조가 남는 상태를 검증한다. 참조 중인 자산은 무조건 삭제하지 않고 삭제 거부 또는 명시적 대체 흐름으로 처리한다.
- canonical envelope를 검증한 **후에만** editor state와 자산 목록을 함께 교체한다. 로드 실패 시 현재 편집 내용·자산 목록을 그대로 유지한다. 복구 snapshot의 저장·복원도 본문과 카탈로그를 같은 세대로 취급한다.
- 기존 raw 저장본과 관리 문서가 동시에 존재하면 관리 문서를 우선한다. 손상된 관리 문서의 조용한 fallback은 금지한다. 기존 관리 문서 덮어쓰기 확인은 **사용자가 취소하면 완전 무변경**이어야 한다.
- `managed-note-assets-browser.mjs`는 5회 `prompt` 입력, 카탈로그 group, 상태 문자열, legacy 저장 슬롯 등을 구체적으로 요구한다. 이것은 **현행 프로토타입 호환 수락 테스트**이지 Wagtail UX의 최종 사양이 아니다. 새 chooser/dialog UX는 별도 테스트로 검증한다.

### 3차 — 보안·접근성·Wagtail UX 적합성

- 외부 URL을 그대로 신뢰하지 않는다. `isSafeURL(src,'image')`와 MIME·ID·크기 계약을 사용하며, SVG·원격 이미지·임시 서명 URL은 공급자 정책 및 발행 시점 재해석/안전 정책을 별도로 확인한다. MIME 문자열만으로 업로드 파일의 실제 유형을 증명할 수 없다.
- `ResolvedAsset.expiresAt`가 있는 URL을 발행 HTML의 영구 링크로 고정하지 않는다. 발행 단계에서 안정적인 공개 URL을 얻거나 정책상 발행을 거부한다. revision이 지정된 자산은 조용히 최신 버전으로 변경하지 않는다.
- Wagtail형 chooser의 최소 흐름: 검색/필터 → 이미지 결과/미리보기 → 대체텍스트 검토 → 삽입/교체 확인 → 포커스 복귀. 로딩·빈 결과·오류·취소·중복 요청 및 늦게 도착한 비동기 결과를 모두 처리한다. 검색 결과는 페이지네이션 `nextCursor`를 존중한다.
- 기존 이미지 교체 시 alt는 기본 보존하되 새 이미지의 의미가 다르면 사용자가 변경할 수 있어야 한다. 장식용 이미지의 빈 alt와 정보 이미지의 설명 alt를 구별한다.
- 공급자 검색 결과는 삽입 시 `resolve`를 다시 호출해 권한·revision·만료를 확인한다. 사용자 선택 이후 응답이 뒤늦게 돌아오면 이전 선택이 덮어쓰지 못하도록 요청 식별자 또는 취소 신호를 사용한다.

### 수정된 단계별 게이트

- [ ] G1: 현행 `managed-note-assets-browser.mjs`가 요구하는 로컬 관리 문서의 등록/연결/저장/복구를 **제품 코드로** 구현한다. 기존 테스트를 skip하거나 이름만 맞추지 않는다.
- [ ] G2: 독립된 Wagtail형 chooser UI를 구현하고 검색/필터/미리보기/대체텍스트/취소/접근성/비동기 경합 테스트를 추가한다.
- [ ] G3: 호스트별 `AssetProvider` 연결 시 namespace·revision·임시 URL 정책을 검증한다. 업로드는 provider의 기존 인터페이스에 없는 기능이므로 별도 설계 없이 구현하지 않는다.
- [ ] G4: 누적 테스트 재실행, 실패 기록과 보고서 업데이트. 테스트 성공 전에는 완료 처리하지 않는다.

검토 근거: `packages/editor-ports/src/index.ts`, `packages/document/src/types.ts`, `packages/document/src/schema.ts`, `tests/managed-note-assets-browser.mjs`, `docs/VERIFICATION_FULL_DEFERRED_2026-10-31.ko.md`.
