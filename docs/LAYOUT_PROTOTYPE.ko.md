# P1.4 레이아웃 조합 검증

P1 단계의 검증용 노드와 예제다. 일반 사용자를 위한 삽입·속성 UI, 완성된 서버 렌더러, 모든 임의 자식 구조의 validator는 후속 단계다.

## 편집 구조와 발행 구조

| 노드 | 편집 DOM | 발행 DOM | 이유 |
| --- | --- | --- | --- |
| SectionNode | section[data-tufte-editor] | section | p/table이 section 직계 자식이 되게 유지 |
| FigureNode | figure[data-tufte-editor] | figure 또는 figure.fullwidth | figure를 p 안에 넣지 않고 전체 폭 속성 보존 |
| CaptionNode | figcaption[data-tufte-editor] | figure > figcaption | 캡션 float/max-width/전체 폭 margin 규칙 적용 |
| TableLayoutNode(body) | div[data-tufte-editor] > Lexical table | section > table | 편집 래퍼를 제거해 section > table의 폭 규칙 적용 |
| TableLayoutNode(fullwidth) | div[data-tufte-editor] > Lexical table | section > table.fullwidth | 전체 폭 class를 table에 적용 |
| TableLayoutNode(scroll) | div[data-tufte-editor] > Lexical table | div.table-wrapper > table | 의도한 스크롤 컨테이너를 남김 |

표 내부는 공식 @lexical/table 0.52.0의 TableNode/TableRowNode/TableCellNode를 사용한다. exportDOM의 colgroup/tbody·헤더·셀 직렬화를 재구현하지 않는다. TableLayoutNode의 after 단계는 이미 생성된 table을 받아 body/fullwidth 모드에서만 편집 래퍼를 제거한다. 유효한 단일 table이 없으면 조용히 버리지 않고 오류를 낸다.

## 수동 기준과 비교

`fixtures/tufte/layout-reference.html`은 렌더러 코드를 호출하지 않고 따로 작성한 기준 HTML이다. `examples/editor/src/layoutFixture.ts`는 같은 조합을 Lexical 노드로 만든다. 기준 이미지 fixture.svg는 이 프로젝트에서 직접 작성했다.

브라우저 검사는 다음을 수행한다.

1. 실제 예제 편집기에서 fixture를 로드하고 캡션·표 셀을 키보드로 수정한다.
2. JSON 저장→페이지 재로드→복원 후 구조가 동일한지 비교한다.
3. 발행 결과에 편집 전용 속성이나 임시 Lexical table 키가 남지 않는지 확인한다.
4. 그림·캡션·표의 직계 자식 구조를 확인한다. p 안의 figure는 없어야 한다.
5. 고정 upstream CSS를 실제 발행 HTML과 독립 기준 HTML에 각각 적용하고 1440/761/760/759/375px의 폭·캡션·overflow 속성을 비교한다.
6. 기준과 같다는 조건 외에 긴 표가 wrapper 안에서 실제로 overflow하고 문서 전체의 가로 넘침은 없다는 조건도 확인한다.

측정의 폭 비교 허용치는 section 폭 기준 0.02다. 글꼴 자산이 아직 연결되지 않았으므로 최종 조판의 픽셀/스크린샷 완전 일치를 의미하지 않는다. 캡션/셀 편집 후 내용은 바뀌므로 글 높이의 일치를 조건으로 두지 않는다.

| 조건 | 본문/일반 표 | 일반 그림 | 전체 폭 그림/표 | 캡션 |
| --- | --- | --- | --- | --- |
| 1440/761px | section의 약 55% | 약 55% | 약 90% | float right, max-width 40%, fullwidth caption margin 24% |
| 760/759/375px | section의 100% | 약 90% | 약 90% | max-width none, fullwidth caption margin 0 |

1440px에서 scrollWidth 6319 / clientWidth 1260, 375px에서 6319 / 268을 관측했고 스크롤은 wrapper 안에 한정됐다. 이 값은 해당 검증 환경의 관측값이며 일반 문서 전체의 성능 보장은 아니다.

## 실행

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm test:browser
```

layout 측정만 출력하려면 선행 build를 통과한 뒤 실행한다.

```sh
pnpm build && LAYOUT_METRICS=1 node tests/layout-browser.mjs
```

예제 실행은 `pnpm dev:editor`, 화면에서 ‘레이아웃 예제 불러오기’를 사용한다. 표의 cell 편집은 TablePlugin을 사용한다. 섹션/그림/표를 자유롭게 삽입하고 폭을 전환하는 일반 UI는 P3에서 제공한다.

## 남은 범위

- P1.5: headless/서버 렌더링 방식과 schema 허용 콘텐츠 확정.
- P2/P3: 모든 노드 조합의 validation/import·일반 작성 UI·추가 편집 동작.
- P4/P6: 본명조/본고딕·ET Book 연결 후 조판, 다크 모드, 전체 반응형·접근성·다른 브라우저 검증.
- F01–F22는 이 fixture의 부분 검증만으로 완료 표시하지 않는다.
