# ADR 0006 — 예제 GUI의 자산 카탈로그와 정본 저장

**상태:** 코드 작성, 빌드·브라우저 검증 대기 (2026-10-23)

## 문제

P1 예제는 Lexical 상태만 localStorage에 저장한다.
관리 자산이 연결된 이미지에는 `assetId`가 있고, 이 ID는
정본 문서 `assets` 테이블과 같은 시점에서 해석되어야 한다.
두 저장 키로 나누면 참조 불일치나 부분 저장이 발생할 수 있다.

## 결정

- 예제 GUI에 URL 참조 자산을 사용자가 직접 등록한다.
  파일 업로드·임의 원본 치수 추론을 제공하지 않는다.
- 자산 제안 시 `validateDocument`로 **전체 문서**를 검사한다.
  임의 `assets` 입력이나 유효하지 않은 Lexical 구조를
  묵시적으로 고치지 않는다.
- 등록된 catalog는 `assetsRef`로 유지하며
  `registerNoteAssetCommands`에 getter로 주입한다.
- 자산이 있는 문서는 `MANAGED_DOCUMENT_KEY`라는
  하나의 localStorage 레코드에 전체 `TufteDocument`를 저장한다.
  검사 실패 시 기존 정상 저장본을 덮어쓰지 않는다.
- managed restore 시 정본 검증 및 strict Lexical import를 모두
  통과한 뒤 자산 목록을 교체한다. 손상된 managed slot을
  발견해도 오래된 raw slot을 자동으로 열지 않는다.
- 자산이 전혀 없는 레거시 이용자는 기존 raw Lexical
  저장/복원 경로를 계속 사용한다. 두 슬롯 중 managed가 우선한다.
- 자산 문서의 발행 HTML은 순수 `renderArticle`의 결과다.
  Lexical exportDOM은 레거시 편집기 검사 보조로만 둔다.
- 자동 복구 슬롯에서도 자산이 있을 때 같은 snapshot에 기록하며
  자산·본문 정본 검증 후 복원한다.

## 범위 밖

실제 파일 업로드/다운로드, 자산 삭제·참조 유무 기반 GC,
여러 탭 간 동시 수정 충돌 해결, 전체 에디터의 정본 통일,
Magnolia Works 연동, 모바일/스크린리더/IME 실기기 수락은
후속 작업이다.

## 검증

`tests/managed-note-assets-browser.mjs`를 추가해
자산 등록/이미지 연결/JSON+HTML/중복/저장/복원/복구/손상
정본 거부를 검사하도록 작성했다. 실제 실행은 보류했다.
