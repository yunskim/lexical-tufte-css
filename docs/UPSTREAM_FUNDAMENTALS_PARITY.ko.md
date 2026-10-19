# P2.2.e — Fundamentals 동일 콘텐츠 비교의 선행 계약

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
