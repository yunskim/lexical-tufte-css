# ADR 0005 — 노트 이미지 관리 자산의 정본 참조 계약

**상태:** 구현 초안, 누적 테스트 미실행 (2026-10-23)

## 결정

노트 이미지의 관리 자산 연결은 Lexical UI가 만든 임의
`{assetId,src,width,height}` 페이로드를 받지 않는다.

호스트 앱은 저장/발행할 **동일한 TufteDocument.assets** 목록을
`registerNoteAssetCommands(editor,()=>currentDocument.assets,onDiagnostic)`
에 제공한다. 등록 시 스냅샷을 고정하는 대신 **각 명령 수행 직전**
목록을 조회하여 자산 ID, URL, MIME 및 이미지 크기 유효성,
중복/한도 여부를 점검한다.

- `ASSIGN_TUFTE_NOTE_IMAGE_ASSET_COMMAND`: 유효한 asset ID 하나를
  받아 해당 자산의 src/width/height와 함께 image node를 교체한다.
  같은 이미지의 alt는 유지한다.
- `DETACH_TUFTE_NOTE_IMAGE_ASSET_COMMAND`: assetId만 제거한다.
  이미지의 현재 URL/alt/치수는 변경하지 않는다.
- `SET_TUFTE_NOTE_IMAGE_DIMENSIONS_COMMAND`: 양의 safe integer를
  사용하고, `null`을 입력하면 해당 선택 치수를 해제한다.
  관리 자산은 정본 자산에 선언된 치수와 충돌할 수 없다.
- 이미지를 찾을 때는 기존 선택 경계(단일 이미지 note의 caret
  또는 정확한 image NodeSelection)를 재사용한다.
- 실제 저장과 발행 단계에서도 `validateDocument`를 호출한다.
  명령 수준 검증은 최종 정본 검증을 대체하지 않는다.

## 발행 규칙

일반 inline 이미지에 `width`/ `height`가 있다면
HTML에도 같은 숫자 속성을 출력한다. 필드가 없으면 종전 HTML과
동일하게 출력한다. 새로운 wrapper나 Tufte CSS 클래스를 만들지 않는다.

## 호스트 통합 제한

현재 standalone 예제는 Lexical JSON만 보관하므로
`assets` 정본 목록이 없다. 따라서 빈 자산 목록을 넘겨
자산 연결 기능을 fail-closed로 유지하고 비관리 이미지
크기 편집만 GUI에서 제공한다. Magnolia 또는 정본 document
호스트가 문서 저장/발행 경계와 자산 목록을 연동하면
자산 선택 UI를 활성화한다.

## 검증

`packages/lexical/test/note-asset-commands.test.mjs`,
`packages/render/test/inline-image-dimensions.test.mjs`,
`tests/note-image-dimensions-browser.mjs`를 작성했다.
설치/빌드/타입/단위/브라우저/CI는 사용자 요청에 따라
일괄 실행 대기 중이다. 미검증 사항을 완료로 표시하지 않는다.
