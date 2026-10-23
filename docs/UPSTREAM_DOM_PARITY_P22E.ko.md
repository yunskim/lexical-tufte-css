# 공식 Tufte CSS 데모 DOM 대응표 — P2.2.e (역사적 초안)

> **현재 정본이 아님 (2026-10-22)**. 이 문서는 당시의 `tufte-note`
> wrapper·newthought 분할 불가 등 해결 전 문제를 기록한 검토 초안이다.
> 2026-10-19 이후 구현에서 발행 노트는 직접 `label + input + span`,
> newthought 직전인 sidenote는 분할 부모 변환을 지원한다. 관련 unit/browser
> 검사는 작성되었으며 이전 batch 범위는 별도 증거로 확인한다.
> 현행 구현/미검증 상태는
> [전체 섹션 대응표](UPSTREAM_PAGE_PARITY_MATRIX.ko.md),
> [후속 수정 체크리스트](CODE_REVIEW_REMEDIATION_2026-10-22.ko.md),
> [ADR-0001 현행 주석 보정](adr/0001-note-editor-model.ko.md)을 참고한다.
> 아래 과거 판정 문장은 당시 상태의 기록이며 현행 미지원 목록이 아니다.

기준: edwardtufte/tufte-css v1.9.0, commit `b5d7b7bbe5ce9c4c50fcfad4f19ee3646cfd7ae1`, `index.html`.
고정 원본: `fixtures/tufte/upstream/index.html`. CSS selector 목록은 `fixtures/tufte/inventory.json`.
이 표는 **원본 예제에서 실제 사용된 구조**와 **추가로 지원하려는 Tufte CSS 기능**을 구분한다. 테스트는 작성했으나 아직 실행하지 않았다.

| 예제 DOM/관계 | F | 문서 모델 / Lexical | 발행 렌더러 | 상태·차이 |
| --- | --- | --- | --- | --- |
| `article > h1 + p.subtitle + section` | F01/F02 | envelope title/subtitle + tufte-section | article/h1/subtitle/section | 구조 대응. 제목의 원본 `id` 보존은 별도 정책 필요 |
| `section > p`, `section > h2/h3` | F01–F03 | paragraph/heading | p/h2/h3 | 직접 자식 관계를 유지해야 함 |
| `span.newthought`, `span.sans`, `.numeral`, `.danger` | F05 | tufte-span(kind) | span class | 종류별 테스트 필요 |
| `label.margin-toggle[for] + input.margin-toggle[id] + span.sidenote/marginnote` | F10/F11 | tufte-note(kind,noteId) 단일 논리 노드 | data-tufte-note wrapper 내부의 label/input/span | ID 연결·input→payload 인접 관계를 검사; 원본과 wrapper 구조는 다름 |
| **`span.newthought > label.sidenote-number` 다음 형제 `input + span.sidenote`** | F05/F10 | tufte-span 자식에 note 금지; note는 자체 wrapper 출력 | 원본의 span 경계와 다름 | **미지원 조합: 별도 결정 전 parity 완료 금지** |
| `div.epigraph > blockquote > p + footer > cite` | F08/F09 | tufte-epigraph/quote/attribution/cite | div/blockquote/p/footer/cite | 자식 순서·중첩을 별도 테스트 |
| `figure` 및 `figure.fullwidth` | F13/F14 | tufte-figure(width) | figure(.fullwidth) | img/figcaption 조합·폭 비교 필요 |
| `pre > code` | F17 | tufte-code | pre/code | 공백·탭·이스케이프 비교 필요 |
| `iframe-wrapper` 예시(원본의 설명용 escaped HTML 포함) | F18 | tufte-embed | iframe 포함 wrapper | 실제 실행 DOM인지 예제 코드인지 구분하여 비교 |
| `dl/dt/dd`, `table`, `figcaption` 등 원본 데모에 없는 확장 | F06/F13/F16 | 정의된 별도 노드 | 기능별 fixture | **원본 예제의 실제 등장 요소로 오인 금지** |

## newthought와 sidenote 결합 정책 검토

원본에는 `<span class="newthought">텍스트<label ...></label></span><input ...><span class="sidenote">...</span>` 구조가 있다. 이때 label은 newthought의 자식이지만 input과 note payload는 형제다. 현재 `tufte-span`은 note 자식을 금지하고 `tufte-note`는 label/input/payload를 하나의 wrapper 아래 렌더링한다. 따라서 **렌더러의 단순 태그 치환만으로는 원본 DOM을 정확히 재현할 수 없다.**

당장은 기존 note ID·선택·복사·IME 불변식을 보존한다. 스키마를 변경하기 전에 (1) 해당 구조의 실제 CSS 계산 결과, (2) newthought 범위에서 label을 포함하는 의미, (3) 편집 중 note anchor가 이동할 때의 동작, (4) HTML import/export 무손실성을 검증한다. 해결 후보는 별도 anchor 모델 또는 렌더 시 note anchor를 인라인 문맥에 배치하는 구조적 변환이다. 어느 쪽도 검증 없이 채택하지 않는다.

## 테스트와 수락 기준

- `packages/render/test/upstream-demo.test.mjs`: 원본 구조 존재, label/input ID 대응, input/payload 인접 관계, 현재 known gap 회귀. **작성 완료, 사용자 보고상 실행·통과(로그 미확인)**.
- 원본 HTML을 일반적인 regex만으로 완전한 DOM 동등성이라고 주장하지 않는다. P2.2.e에서는 DOM 파서 기반 부모·자식·순서 매트릭스와 기능별 fixture를 확장한다.
- P4에서 뷰포트별 시각 차이를 확인하기 전까지 전체 parity 및 F01–F22 완료 선언 금지.

## 테스트 실행 보고와 다음 수락 경계 (2026-10-19)

사용자가 기존 테스트를 실행하고 “모두 통과한 것 같은데요”라고 보고했다. 테스트 로그·실행 환경·커밋 SHA를 직접 확인하지 못했으므로 **사용자 보고상 통과**로만 기록한다. 이후 추가한 코드까지 검증되었다는 뜻은 아니다.

### 원본과 발행 DOM의 차이를 다루는 원칙

1. 현재 `tufte-note`의 단일 논리 노드와 wrapper는 편집 안정성 및 ID 네임스페이스에 기여한다. 원본의 label/input/payload를 1:1로 복제하려고 즉시 wrapper를 제거하지 않는다.
2. `newthought > label` 결합을 표현하려면 단순 `tufte-span > tufte-note` 허용만으로 충분하지 않다. label은 span 내부, input/payload는 span 외부여야 하므로 **한 논리 노드를 서로 다른 부모로 분할 렌더링**해야 한다.
3. DOM 비교는 구조의 불변식(직접 자식, 인접 형제, ID 연결)과 의도적인 차이(발행 네임스페이스, wrapper)를 별도 보고한다. 비지원 결합은 테스트에서 명시적으로 드러내되, 무손실 지원으로 표시하지 않는다.
4. 다음 단계는 원본의 실제 `newthought`+note 사례를 최소 fixture로 분리하고, Lexical의 노트 anchor 편집/이동·복사/붙여넣기·undo/redo 시나리오를 정의한 후, ADR에서 anchor 모델을 선택하는 것이다. 결정 전에는 schema version을 변경하지 않는다.
