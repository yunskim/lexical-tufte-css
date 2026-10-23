# 공식 Tufte CSS 예제 재현 — 실행 체크리스트

기준: `fixtures/tufte/upstream/index.html` (upstream `b5d7b7bbe5ce9c4c50fcfad4f19ee3646cfd7ae1`).
목표: **같은 내용**을 Lexical 문서로 편집·저장·재열기·발행한 결과와 원본의 의미 있는 DOM/CSS 구조를 비교한다.

상태 표기: `[x]`는 **코드·자료 확인**에만 사용한다. 실제 동작 검증은 테스트 실행 전까지 `[ ]`로 유지한다.

## 1. 기존 비교 기반 점검

- [x] 고정 upstream HTML 기준 파일 존재: `fixtures/tufte/upstream/index.html`.
- [x] Chromium DOMParser 기반 비교 스크립트 존재: `tests/upstream-dom-browser.mjs`.
- [x] 비교 스크립트는 원본과 **별도 server-document fixture**를 사용한다. 따라서 원본 전체 페이지와 동일 콘텐츠의 동등성 증거가 아니다.
- [x] 비교 스크립트에 `newthought > sidenote label` 차이가 **known gap**으로 명시되어 있다.
- [ ] 동일 콘텐츠의 전체 9개 섹션을 사용하는 Lexical 문서 fixture와 렌더 결과를 실제 비교 테스트로 검증한다.
- [x] 기존 브라우저 비교에 공식 upstream **9개 섹션**의 수와 섹션별 구조 수집 여부를 고정하는 assertion을 작성했다. 실행은 대기 중이다.
- [ ] 기존 전체 페이지 fixture/테스트 구현의 정확한 위치와 중복 여부를 조사해 대응표에 연결한다.
- [x] 기존 DOMParser 비교 코드에 섹션별 heading, 직계 자식 태그 순서, 노트·그림·표 개수를 수집하는 진단 정보를 추가했다. **실행 결과는 아직 없다.**

## 현재 확보한 비교 계측 (미실행)

`tests/upstream-dom-browser.mjs`는 이제 `upstreamSectionOutline`과 `publishedFixtureSectionOutline`을 출력하도록 작성되었다. 각각 section 순번, 첫 직계 heading, 직계 자식 태그 배열, note/figure/table 개수를 담는다. 비교 대상은 여전히 **원본 전체 페이지 대 별도 server-document fixture**이므로 이 수치만으로 전체 페이지 parity를 수락하지 않는다. 기존 코드에서 직접 확인된 발행 입력은 `fixtures/tufte/server-document.json`이며 원본 9개 섹션과 같은 콘텐츠가 아니다. 저장소 검색만으로 전체 페이지용 Lexical fixture의 정확한 경로를 확정하지 못했으므로 **존재한다고 가정하거나 새로 중복 생성하지 않는다**. 다음에는 전체 페이지 변환/fixture 생성 코드를 특정한 뒤 이 계측을 연결한다.

## 2. DOM 차이 분류 및 해결

- [ ] 원본 각 section별 heading, paragraph, link, code, list, quote, epigraph, figure, table, note를 구조적으로 대응시킨다.
- [ ] 노트의 label/input/span 인접 관계 및 newthought 안쪽 label 배치를 원본과 대조한다.
- [ ] 차이를 (a) schema 표현 불가, (b) Lexical 편집 불가, (c) renderer 출력 차이, (d) 원본에서 의도적으로 생략한 속성으로 구분한다.
- [ ] 원본의 의미 있는 속성·요소 순서를 비교하되 생성 ID, 브라우저 정규화 등 비본질적 차이는 명시적으로 정규화한다.
- [ ] 실제 차이가 확인된 항목부터 **하나의 의미 변화 + 하나의 회귀 테스트**로 수정한다.

## 3. 편집·저장·발행

- [ ] 공식 예제의 각 노드/조합을 GUI에서 생성·수정·삭제할 수 있다.
- [ ] Lexical JSON 저장→재열기에서 본문 및 note identity가 유지된다.
- [ ] 발행 renderer가 편집 DOM과 무관하게 결정적 HTML을 생성한다.
- [ ] CSS/서체/반응형 및 접근성 차이를 브라우저에서 점검한다.

## 4. 일괄 검증 (사용자 요청 전 실행 금지)

- [ ] 의존성 설치 및 빌드·타입 검사.
- [ ] 단위/통합 테스트 및 전체 페이지 DOM 비교.
- [ ] 브라우저 시각/반응형 비교와 오류 수정 후 재검증.
- [ ] 통과·실패·건너뜀을 분리 보고하고 기존 오류 기록에 재발 방지 조치를 남긴다.
- [ ] CI는 별도 지시 없이는 실행하지 않는다.

## 범위 제한

호스트 검색/저장소/권한 확인은 `ReferenceProvider` 인터페이스 바깥의 책임이다. Magnolia Works 구현은 이 계획에 포함하지 않는다. Markdown import/export는 별도 저우선순위 계획으로 유지한다.
