# Upstream 대조·누적 회귀 실행 — 2026-10-18

대상 main `02bb31472b8e72546fd94fd18c8bf9da8984c245` 및 이번 수정. 기존 폴더를 보존한 별도 worktree에서 실행했다. CI는 추가·실행하지 않았다.

## 체크리스트

- [x] AGENTS·오류/대책·고정 upstream HTML·새 테스트 소스 점검, frozen 설치.
- [x] `pnpm check`: lint/inventory/font/typecheck/build 및 **316개** 단위·통합(document47/render33/blog34/lexical202), 실패·skip0.
- [x] `pnpm package:check`: **4개** tarball 소비·JS/types/고지/SQL 통과. npm 발행 없음.
- [x] constraints 기반 Python 설치 및 pytest **16개** 통과. 기존 HTTPX TestClient 경고1건 유지.
- [x] `pnpm test:browser` **15개 실행 파일 전체 통과**(exit0).
- [x] 실제 TS client→Python HTTP→SQLite 저장/조회/목록/checksum/CAS/접근·CSRF 거부/삭제 왕복 통과(exit0).
- [x] E098–E101/M090–M093 수정·대책 기록. diff 검사.

이번 누적 자동화 실행은 완료했다. 위 수정이 포함된 최종 tree에서 check/package/browser/HTTP를 재실행했다. 전체 제품 또는 원본 전체 fidelity 완료는 아니다.

## 이번 실패와 수정

- 새 upstream vocabulary 검사가 원본에 없는 figcaption/table/dl/dt/dd를 요구했다. 원본에 실제 있는 figure/img/pre/code/iframe 등과 확장 요소의 부재를 확인하도록 수정했다. 확장 지원 테스트는 기존 자체 fixture에 남는다.
- 빈 label만 추출해 marginnote ⊕가 누락됐다. 두 노트 kind와 각 glyph, label for=인접 input id를 정확히 검사한다.
- span 밖 unwrap은 무변경 거부되지만 부모 진단으로 오분류됐다. span 부재의 selection 진단을 분리했다.
- 신규 목록 회귀의 잘못된 note 타입명과 note 내부로 들어간 끝 선택을 실제 tufte-note/본문 TextNode 기준으로 수정했다. note 내부 명령 거부는 유지한다.

## 원본 대조 테스트가 입증하는 범위

`packages/render/test/upstream-demo.test.mjs`의 **3개** 검사는 고정 upstream HTML의 vocabulary, 현재 별도 server-document fixture의 노트 인접 구조/ID, 알려진 newthought 노트 중첩 차이를 검사한다.

이는 **원본 전체 문서→Lexical 로드/편집→발행→전체 DOM/시각 비교 테스트가 아니다.** 같은 콘텐츠를 양쪽 renderer에서 출력해 screenshot·글꼴·폭·노트 위치를 전수 대조하지 않는다. 세 번째 테스트의 통과는 알려진 차이를 확인한 것이지 그 차이를 해결한 것이 아니다. newthought 안의 note label 및 현재 data-tufte-note wrapper 차이는 남는다. 전체 fidelity와 P4.3.a는 미완료다.

따라서 이번 자동화 실행 완료를 Tufte 예제 모든 노드의 동일 렌더링 완료로 보고하지 않는다. 실제 OS IME/다른 브라우저·스크린리더·터치·운영 인증/배포·생산 한글 폰트·E064/W001 및 전체 P2–P7/F표도 미완료 범위에 유지한다.

환경: Node24.19/pnpm11.25/Lexical0.52/Playwright1.51.1/Chromium134, Python3.12.14 및 서버 test-constraints. build/check/package 이후 browser/HTTP 직렬 실행. 기존 Chromium 부재는 공식 설치로 준비했다.
