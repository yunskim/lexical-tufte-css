# P2.2.e — Fundamentals 동일 콘텐츠 비교의 선행 계약 (역사적 문제 기술)

> **현행 구현 보정 (2026-10-22)**: 아래 초기 `tufte-note` wrapper
> 관련 미지원 설명은 과거 스키마 기준이며 지금은 해결됐다.
> 현행 JSON은 구체 `tufte-sidenote` 및 `tufte-marginnote`를 사용한다.
> 발행은 직접 `label + input + span`이며 `newthought + sidenote`
> 인접 결합은 newthought 내부 label 및 외부 input/payload로 분할 출력한다.
> `p.sans`/`blockquote[cite]` 구현·오라클도 작성되었고,
> 3번째 공식 섹션 14개 블록 비교는
> `tests/upstream-same-content-fundamentals-browser.mjs`에서 추적한다.
> **새 테스트 실행은 보류 상태**이며 완료 선언이 아니다.
> 접근성을 위해 input `aria-label`만 추가 허용한다.
> 정본 진행 상황은 [전체 parity 매트릭스](UPSTREAM_PAGE_PARITY_MATRIX.ko.md).

기준: `fixtures/tufte/upstream/index.html` (고정 upstream commit).

## 확인된 구조적 차이

공식 Fundamentals 문단에는 `span.newthought > label.margin-toggle.sidenote-number`가 있고, 같은 문단에서 이어지는 `input.margin-toggle + span.sidenote`가 **newthought 바깥에** 위치한다.

현재 문서 schema의 `tufte-span`은 `tufte-note`를 자식으로 허용하지 않는다. `tufte-note`는 label/input/payload를 하나의 wrapper span으로 발행한다. 따라서 현 모델로 원본과 정확히 같은 부모·형제 관계를 나타낼 수 없다.

테스트가 통과하도록 원본 fixture를 바꾸거나 label의 부모를 무시하는 DOM 정규화를 해서는 안 된다.

## 구현 순서

1. `newthought` 안의 note anchor와 외부 note payload를 연결하는 **단일 논리 note** 표현을 결정한다. 단순히 중첩 note를 허용하면 wrapper 문제는 해결되지 않으므로, 편집 모델·schema·renderer를 함께 검토한다.
2. `Fundamentals`의 전체 원본 DOM 요소·속성·조합을 고정한 실패 테스트를 추가한다. 지원하지 않는 요소는 반드시 진단한다.
3. 편집→JSON→HTML, 붙여넣기, undo/redo 및 주석 ID 재발급을 검증한다.
4. 원본과 동일 콘텐츠의 의미적 DOM을 비교하고, 동일 CSS·폰트 조건에서 1440/1024/761/760/759/375px 위치·크기와 스크린샷을 비교한다.
5. 관련 로컬 테스트 실행 후 오류·대책 문서와 검증 보고서를 갱신한다. CI는 실행하지 않는다.

현재 PR의 full-page baseline/geometry 및 opening/Getting Started 비교는 이 계약의 완료를 뜻하지 않는다. 실제 브라우저 실행 검증은 별도로 필요하다.


## 테스트 오라클 강화 (사용자 지시, 2026-10-19)

**공식 Tufte CSS `index.html`의 DOM 자체가 오라클이다.** 렌더링이 비슷하다는 이유로 다른 DOM을 허용하지 않는다. 테스트는 동일 콘텐츠를 비교하며 태그, 중첩, 형제 순서, 클래스, 의미 있는 속성, 텍스트 및 note의 label/input/span 위치를 보존해야 한다.

- `data-tufte-note` wrapper, `span.tufte-pre-wrap` 등 발행 전용 추가 요소도 DOM parity 실패로 취급한다.
- note ID 네임스페이스나 안전성에 필요한 차이는 **명시적인 별도 예외 계약**과 테스트로만 허용한다. 원본 구조의 임의 정규화는 금지한다.
- 기존 opening/Getting Started 의미 비교와 geometry 검증은 부분적인 회귀 테스트일 뿐, DOM 동일성 완료 증거가 아니다.
- 편집기 내부 Lexical DOM은 오라클 대상이 아니며, **발행 결과 DOM**이 대상이다.
- renderer 변경 시 기존 노드의 편집·JSON 왕복·복사/붙여넣기·접근성 계약을 함께 재검증한다.
