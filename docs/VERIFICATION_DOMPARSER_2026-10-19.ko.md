# DOMParser 대조 포함 실행 검증 — 2026-10-19

대상 main `aa7cb0a3722a476baff520a65cf36214b1458a96` 및 이번 테스트 수정. 별도 worktree에서 AGENTS·오류/대책·신규 정규식/브라우저 대조 코드를 확인했다. CI는 추가·실행하지 않았다.

## 체크리스트

- [x] frozen 설치, 신규 mjs 구문 검사.
- [x] `pnpm check`: lint/inventory/font/typecheck/build 및 **318개** 단위·통합(document47/render35/blog34/lexical202), 실패·skip0.
- [x] `pnpm package:check`: **4개** 로컬 tarball JS/types/고지/SQL/소비 검사 통과. npm 발행 없음.
- [x] Python constraints 설치 및 pytest **16개** 통과. 기존 HTTPX TestClient 경고1건.
- [x] `pnpm test:browser` 기존 **15개 실행 파일 전체 통과**(exit0).
- [x] `pnpm test:upstream-dom` 신규 DOMParser 브라우저 대조 통과(exit0). 브라우저 실행 파일 합계 **16개**.
- [x] 실제 TS client→Python HTTP→SQLite 저장/조회/목록/checksum/CAS/접근·CSRF 거부/삭제 왕복 통과(exit0).
- [x] E102 이중 escape 재발 수정 및 M094 반영. 제품 구현 수정 없음, diff 검사.

이번 작성된 자동화 테스트 실행은 완료했다. 수정 후 최종 tree에서 check/package/browser/upstream-dom/HTTP를 재실행했다.

DOMParser 관측: 원본 section9/note7/epigraph3/fullwidth figure2, 별도 발행 fixture section1/note2/epigraph0/fullwidth figure1. 이 수치는 동등성 수락값이 아니라 서로 다른 입력에 대한 관측값이다. 알려진 gap은 `newthought > sidenote label`이다.

신규 정규식2건은 parser 구문 오류가 아니라 의미 오류였다. label 단어 경계 및 article/section·인접 input/span의 escape 계층을 바로잡았으며, 기대 구조나 원본 HTML을 변경하지 않았다.

## 대조 범위

`tests/upstream-dom-browser.mjs`는 실제 Chromium에서 DOMParser로 고정 원본 index.html과 별도의 server-document 발행 HTML을 파싱한다. article 직계 h1/subtitle·section, label-for/input-id, input 다음 sidenote/marginnote payload 관계를 검사하고 section/notes/epigraph/fullwidth figure 수를 기록한다.

두 입력은 **같은 전체 콘텐츠가 아니다**. 수치를 같게 만들거나 원본 전체를 Lexical로 변환·편집·재발행한 결과와 비교하지 않는다. newthought 안 label과 현재 note wrapper의 차이를 알려진 gap으로 확인한다. 따라서 통과해도 전체 DOM parity/시각 pixel parity/폰트·노트 위치 일치가 입증된 것은 아니다.

전체 페이지 fixture·누락 구조 구현·동일 콘텐츠 DOM/뷰포트 비교(P2.2.e/P4.3.a), 실제 OS IME/다른 브라우저·스크린리더·터치·운영 인증/배포·생산 폰트 및 E064/W001, 전체 P2–P8/F표는 미완료 범위를 유지한다.

환경: Node24.19/pnpm11.25/Lexical0.52/Playwright1.51.1/Chromium134, Python3.12.14 및 서버 test-constraints. build/check/package 회수 후 browser→upstream-dom→HTTP를 직렬 실행했다. Chromium 부재는 공식 설치로 준비했다.
