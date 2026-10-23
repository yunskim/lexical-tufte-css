# ADR-0004 — Tufte CSS 공식 제목 앵커 보존

상태: 채택(코드 작성, 검증 미실행). 2026-10-22.

## 결정

문서 제목은 편집 본문이 아닌 `TufteDocument.title`에 보존한다.
공식 예제 `<h1 id="tufte-css">`를 무손실 발행하려면 문서 envelope에
선택적 `titleId?: string`을 둔다. Lexical root에 h1을 별도 복제하거나
제목 문자열에서 자동 slug를 생성하지 않는다. 기존 `titleId`
없는 문서는 ID 없는 h1을 출력해 호환성을 유지한다.

## 계약

- ID는 영숫자 시작, 영숫자/밑줄/하이픈의 1–128자다.
- 다른 h2/h3 ID와의 충돌은 문서 validator가 진단한다.
- 렌더러 namespace에 따라 생성되는 article ID, note ID와의
  충돌은 `DUPLICATE_TITLE_ID`와 `html:null`로 거부한다.
- v1→v2 envelope 및 headless/실제 Lexical export 재열기에도
  같은 ID를 보존한다. 알 수 없는 필드 거부는 유지한다.
- 제품이 생성하는 article ID/class/lang는 별도의 명시적 차이로 둔다.
  공식 `h1#tufte-css` 누락은 더 이상 예외가 아니다.

## 수락 조건

`packages/document/test/title-anchor.test.mjs`,
`packages/lexical/test/title-anchor.test.mjs`,
`packages/render/test/title-anchor.test.mjs`,
`tests/upstream-full-document-roundtrip-browser.mjs`,
실제 editor UI 및 visual 회귀를 누적 테스트 때 실행한다.
**현재 테스트·CI 미실행. 수락 완료로 표시하지 않는다.**
