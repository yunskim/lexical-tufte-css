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
| 3 | Fundamentals | `upstream-same-content-fundamentals-browser.mjs`: **코드 추가, 실행 대기** | 기존 `paragraph`에 선택적 `tufteClass:'sans'`, `quote`에 안전한 `cite`를 추가. 14개 원본 블록·실제 3개 주석·newthought 결합·인라인 링크/강조, 전체 DOM을 비교. Lexical factory/저장 왕복 테스트도 작성, 실제 검증 대기 |
| 4 | Epigraphs | `upstream-same-content-epigraphs-browser.mjs`: **코드 추가, 실행 대기** | 세 인용문, 문단 있는/없는 블록, footer·cite·강조를 원본과 비교; 검증 후 편집 경로 연결 |
| 5 | Sidenotes: Footnotes and Marginal Notes | `upstream-same-content-sidenotes-browser.mjs`: **코드 추가, 실행 대기** | 12개 원본 블록·2개 실제 note·pre/code 및 인라인 강조·ID 참조·375/760/761/1440px 모바일 토글; 실행 후 검증 판정 |
| 6 | Figures | `upstream-same-content-figures-browser.mjs`: **코드 추가, 실행 대기** | 원본 11블록·2개 풍부한 marginnote·이미지·코드·일반/fullwidth figure 엄격 대조. iframe은 `figure.iframe-wrapper > iframe` 직접 자식과 CSS 계층 유지, URL·접근성·보안 속성 및 **설명 코드 한 곳**만 명시적 현대화 예외. 375/759/760/761/1024/1440px iframe geometry 비교 |
| 7 | Code | `upstream-same-content-final-sections-browser.mjs`: **코드 추가, 실행 대기** | 긴 pre/code의 줄바꿈·들여쓰기·표시 영역 geometry |
| 8 | ImageQuilts | 같은 파일: **코드 추가, 실행 대기** | 공식 예제 `figure > img`의 원래 HTML 속성·상대 URL 및 이미지 실제 로딩/geometry. 원본에 별도 ImageQuilt class 없음 |
| 9 | Epilogue | 같은 파일: **코드 추가, 실행 대기** | 실제 편집 후 전체 문서 저장·발행 경로 |

현재 **검증 완료된 섹션은 2/9**, 새로 작성된 동일 콘텐츠 테스트 대상은
7개 섹션(Fundamentals, Epigraphs, Sidenotes, Figures, Code, ImageQuilts, Epilogue)이다.
**9개 섹션 모두 단독 동일 콘텐츠 비교 테스트가 작성되었으나**
새로운 7개는 실행 검증 전이다. 모두 통과해야 섹션 단위 DOM 대응을 **9/9**로 판정할 수 있다.
부분 섹션 테스트를 전체 문서 동등성으로 해석하지 않는다.

## 하나의 Lexical 문서: 전체 페이지 왕복 회귀 (2026-10-22, 실행 대기)

- 빌더: `tests/helpers/pinned-upstream-article.mjs`.
  9개 섹션 **60개 직접 블록**, 실제 note **7개**, 제목·부제·링크·quote·
  epigraph·코드·fullwidth figure·margin image·iframe을
  고정 upstream **전체**에서 재구성한다.
  지원하지 않는 DOM 태그·속성·구조/노트 조합, 섹션별 block type 목록이
  달라지면 실패한다. 원본을 변경하거나 기존의 부분 fixture를 이어 붙이지 않는다.
- 통합 테스트: `tests/upstream-full-document-roundtrip-browser.mjs`.
  `validateDocument` → v1→v2 envelope migration →
  실제 Headless Lexical **import** → v2 **export** → JSON 저장·재열기 →
  전 9개 섹션 **단일** `renderArticle` → 전체 DOM 대조를 검사한다.
  별도 저장본의 첫 문장 한 곳을 수정한 후 **재열기/재발행**하여
  그 문장 외의 모든 콘텐츠와 노트·iframe이 그대로인 것도 검사한다.
  JSON 문장 변경은 실제 키보드 편집/undo 검증을 대신하지 않는다.
- 전체 페이지 상단의 `article`은 제품 발행이
  `id="upstream-complete-demo-article" class="tufte-article" lang="en-US"`
  를 추가한다. 원본 `h1 id="tufte-css"`는 현행 document envelope에
  제목 앵커 필드가 없으므로 **현재는 보존되지 않는 차이**다.
  통합 오라클은 이 차이를 묵인하지 않고 원본/출력의 정확한 값과
  h1 텍스트/부제 DOM을 각각 검증한다.
  제목 앵커를 완전 보존할지는 별도의 schema/편집 계약 결정이 필요하다.
- 기존의 정확한 note ID namespace와 모든 note `aria-label`,
  Figures의 **한 iframe 전체 속성 집합과 한 설명 코드 블록**만
  의도적으로 현대화한다. 태그·중첩·순서·일반 텍스트는 정밀 비교하며,
  SECTION/FIGURE/epigraph/BLOCKQUOTE의 소스 들여쓰기와
  공식 Sidenotes의 note 컨트롤 사이 공백 두 곳만 무시한다.
- 375/759/760/761/1024/1440px의 iframe-wrapper 원본/발행
  CSS 위치·크기를 비교하는 코드를 포함한다.
  **실제 이미지/폰트 파일 로드, 전체 페이지 pixel/screenshot parity,
  브라우저 editor UI 키 입력**은 아직 수락되지 않은 별도 단계다.
- `pnpm test:upstream-same-content` 마지막에 단일 문서 JSON/DOM 회귀를 등록하고,
  `pnpm test:browser`에는 **실제 React 편집기 UI** 테스트
  `tests/upstream-full-document-editor-browser.mjs`를 추가했다.
  이 UI 검사는 9섹션/60블록 전체를 브라우저 편집기에 로드한 뒤
  실제 키보드로 본문 한 곳을 수정·undo/redo·로컬 저장/재열기하고,
  바뀌지 않은 나머지 8개 섹션/7개 note/iframe의 발행 HTML을 대조한다.
  임베드는 편집 화면에서는 decorator placeholder, 발행 시 iframe이다.
  이 1개 본문 편집 수락 코드는 개별 note/figure 입력 UI를 전부 검사하지 않는다.
- `pnpm verify:batch`의 browser-file 자동 발견에 **두 전체 문서 회귀가 모두** 포함된다.
  **빌드/타입/브라우저 등 실행은 사용자 지시에 따라 모아서 진행**한다.
  코드가 추가된 사실은 수락 완료나 오라클 통과가 아니다. CI 생략.

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
- **모바일 주석 접근성 예외**: 공식 원본의 빈 `label.sidenote-number`와
  `input.margin-toggle {display:none}`는 그대로 복제하지 않는다.
  발행 HTML에는 각 `input.margin-toggle`에 종류에 따른 고정
  `aria-label="Toggle sidenote" / "Toggle margin note"`가 들어간다.
  비교기는 원본 문서 파일을 수정하지 않고, 파싱된 원본 INPUT 하나에
  기대되는 `aria-label`만 추가하고 발행 INPUT의 정확한 값/유일한 추가 속성을
  비교한다. 주석의 tag/parent/child/sibling 관계·문자열·다른 속성은 엄격 비교한다.
  `packages/render/styles.css`는 모바일에서 체크박스를 시각적으로만 숨겨
  키보드 포커스 및 Space 전환과 시각 포커스 표시를 허용한다.
  실제 접근성 트리/모바일 브라우저/스크린리더 수동 수락은 여전히 별도 단계다.
- Sidenotes 섹션에는 `label → input` / `input → span` 사이에 **서식용 공백-only Text 노드 두 개**가 있다.
  이는 `margin-toggle` 형제 간 레이아웃에만 영향을 주지 않는 소스 들여쓰기다.
  해당 두 간격에서만 DOM 정규화를 허용하며, label 전후 일반 본문 공백·노트 내부
  개행과 공백·`pre/code` 내용은 절대 제거하지 않는다.
- 코드·ImageQuilts·Epilogue 재구성은 `heading`/`paragraph`/
  `tufte-code`/`tufte-figure`/`tufte-inline-image`/`link`/
  텍스트 코드 서식을 이용한다. 공식 ImageQuilt 샘플 HTML은 일반 img를
  사용하므로 이 정밀 DOM 테스트에서 별도의 `tufte-imagequilt` class를
  강제로 붙이지 않는다.
- Figures iframe은 **정해진 현대화 예외**만 허용한다. 원본 `figure.iframe-wrapper > iframe`의
  직접 자식 관계·태그·class·형제 순서는 원본과 정확히 비교한다.
  원본 `youtube.com` → 허용된 `youtube-nocookie.com`, 오래된 `frameborder` 삭제,
  `title`·`loading`·`referrerpolicy`·`sandbox` 및 intrinsic width/height는
  새 **고정 속성 집합 전체**를 검증한다. SVG spacer·`tufte-embed` wrapper는 금지한다.
  설명용 `pre > code`의 구형 iframe HTML은 현대화된 예제 문자열로 교체하며,
  이를 제외한 모든 본문·이미지·노트 payload·코드는 원본과 완전 비교한다.
  `iframe-wrapper`의 공식 16:9 CSS padding 예약 규칙은 원형 유지한다.
- 공식 페이지 이미지 `img/...` 상대 URL을 원형 보존하기 위해
  document URL 정책에 제한된 bare-relative path 형식을 추가했다.
  URI scheme, authority, 물음표/fragment, 위험한 공백·역슬래시는 기존
  보안 정책에 따라 허용하지 않는다.

## 다음 작업 순서

1. 9개 섹션의 단독 동일 콘텐츠 비교 테스트와 Lexical/document/render 회귀를 **한 번에 실행**해
   추가 실패를 해결하고 오류·재발 방지·검증 결과를 기록한다. CI는 생략한다.
2. Figures의 현대화된 임베드 예외는 정확히 고정된 소스 코드/속성에만 적용하고,
   `figure.iframe-wrapper > iframe` 및 모든 일반 그림/주석 DOM의 동등성을 확인한다.
   `aspectRatio` 메타데이터와 공식 CSS의 고정 16:9 컨테이너 정책 차이도 후속 제품 계약에서 별도 검토한다.
3. **작성된** 전체 9섹션 단일 Lexical 문서 왕복 테스트를 누적 batch에서 실행하여,
   저장·재열기·수정본/발행 DOM의 실패 원인을 수정한다.
   이후 실제 editor 키보드 수정·undo/redo 및 전체 페이지 이미지·폰트·스크린샷 parity를 진행한다.
   제목 `h1#tufte-css`의 원본 앵커 ID 보존 여부는 별도 schema 결정으로 추적한다.

임시 완화나 보이지 않는 노드 삭제로 테스트를 통과시키지 않는다.
