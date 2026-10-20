# Tufte CSS 공식 예제 — 섹션별 동일 콘텐츠 재구성 추적

기준: `fixtures/tufte/upstream/index.html`, Tufte CSS 1.9.0의 고정 커밋
`b5d7b7bbe5ce9c4c50fcfad4f19ee3646cfd7ae1`.

목표는 **원본의 의미 있는 모든 노드와 조합**을 Lexical JSON으로 표현하고 같은
콘텐츠를 순수 발행 렌더러에서 거의 동일하게 내보내는 것이다.
원본과 별개의 fixture로 DOM 개수만 비교하는 검증은 동일 콘텐츠 검증이 아니다.

## 섹션별 대응

| # | 원본 h2 또는 위치 | 동일 콘텐츠 검사 | 남은 과제 |
| --- | --- | --- | --- |
| 1 | Opening (h2 없음) | `upstream-same-content-opening-browser.mjs`: 통과(2026-10-19 Work) | 실제 편집 후 저장·재열기/전체 페이지 재구성 연결 |
| 2 | Getting Started | `upstream-same-content-getting-started-browser.mjs`: 통과(2026-10-19 Work) | 실제 편집기 재열기/시각 비교 |
| 3 | Fundamentals | 미작성 | blockquote의 `cite` 속성, 문단 자체의 `sans` class, 여러 rich sidenote/marginnote·newthought 결합의 동등 모델 검토 |
| 4 | Epigraphs | `upstream-same-content-epigraphs-browser.mjs`: **코드 추가, 실행 대기** | 세 인용문, 문단 있는/없는 블록, footer·cite·강조를 원본과 비교; 검증 후 편집 경로 연결 |
| 5 | Sidenotes: Footnotes and Marginal Notes | 미작성 | 2개 note 제어 구조, 복잡한 인라인 코드 조각, margin toggle ID·공백, 모바일 표시 검증 |
| 6 | Figures | 미작성 | figure 내부/문단 내부 marginnote의 이미지·링크·강조; `figure.iframe-wrapper`와 원본 YouTube iframe 속성/URL 정책은 현재 렌더러와 **구조적으로 불일치** |
| 7 | Code | `upstream-same-content-final-sections-browser.mjs`: **코드 추가, 실행 대기** | 긴 pre/code의 줄바꿈·들여쓰기·표시 영역 geometry |
| 8 | ImageQuilts | 같은 파일: **코드 추가, 실행 대기** | 공식 예제 `figure > img`의 원래 HTML 속성·상대 URL 및 이미지 실제 로딩/geometry. 원본에 별도 ImageQuilt class 없음 |
| 9 | Epilogue | 같은 파일: **코드 추가, 실행 대기** | 실제 편집 후 전체 문서 저장·발행 경로 |

현재 **검증 완료된 섹션은 2/9**, 새로 작성된 동일 콘텐츠 테스트 대상은
4개 섹션이며, 나머지 3개 섹션(Fundamentals, Sidenotes, Figures)은
아직 전체 재구성 검사가 없다. 새로운 4개가 통과하면 섹션 단위 DOM 대응 범위는
6/9가 된다. 부분 섹션 테스트를 전체 문서 동등성으로 해석하지 않는다.

## 엄격한 비교 계약

- 각 테스트는 고정된 원본을 `DOMParser`로 읽고, 이해하지 못하는 노드·속성을
  명시적으로 거부한다. 테스트 편의상 원본 HTML을 바꾸지 않는다.
- 원본/발행에서 element의 이름·속성·순서·텍스트·인라인 공백·pre/code 개행을 비교한다.
  허용하는 유일한 현재 예외는 **블록 사이의 포맷용 공백-only 들여쓰기**로,
  기존 opening/Getting Started에서는 SECTION 직속, Epigraphs에서는
  SECTION/epigraph DIV/BLOCKQUOTE 직속에 한한다. 이 예외를 일반 텍스트 공백에
  확대하지 않는다.
- 서로 다른 note ID namespace가 있으면 ID/for의 대응만 명시적으로 정규화한다.
  원본의 노트 순서, 태그 및 부모 관계를 변형하지 않는다.
- 코드·ImageQuilts·Epilogue 재구성은 `heading`/`paragraph`/
  `tufte-code`/`tufte-figure`/`tufte-inline-image`/`link`/
  텍스트 코드 서식을 이용한다. 공식 ImageQuilt 샘플 HTML은 일반 img를
  사용하므로 이 정밀 DOM 테스트에서 별도의 `tufte-imagequilt` class를
  강제로 붙이지 않는다.
- 공식 페이지 이미지 `img/...` 상대 URL을 원형 보존하기 위해
  document URL 정책에 제한된 bare-relative path 형식을 추가했다.
  URI scheme, authority, 물음표/fragment, 위험한 공백·역슬래시는 기존
  보안 정책에 따라 허용하지 않는다.

## 다음 작업 순서

1. 새 `Epigraphs`와 마지막 세 섹션 테스트를 Work에서 실행하고 진단·재발 대책을 기록한다. CI는 생략한다.
2. Sidenotes의 단독 동일 콘텐츠 변환/모바일 구조 비교 추가.
3. Fundamentals의 `blockquote[cite]`와 `p.sans`를 보존할 최소 구조 계약 결정 후 편집기·렌더러·테스트 반영.
4. Figures의 일반 margin image와 독립 embed 보안/DOM 정책을 구분한다. 원본 iframe으로 되돌리는 방식의 안전성 약화는 별도 검토 없이 하지 않는다.
5. 9개 섹션을 **하나의 Lexical 문서**로 묶어 정본 저장·재열기, 전체 원본 대비 DOM·viewport별 geometry/실제 이미지·폰트/스크린샷을 확인한다.

임시 완화나 보이지 않는 노드 삭제로 테스트를 통과시키지 않는다.
