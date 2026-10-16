# P2.2 Lexical 노드 구현 범위와 순서

기준: `packages/document/src/schema.ts`의 33개 타입과 `packages/lexical/src/index.ts`의 공개 커스텀 노드. 이 문서는 코드 정적 점검 결과이며, 실행 검증을 뜻하지 않는다.

## 현재 등록 가능한 커스텀 노드 (7개)

- `tufte-section`: SectionNode
- `tufte-note`: NoteNode
- `tufte-inline-image`: InlineImageNode
- `tufte-span`: TufteSpanNode
- `tufte-figure`: FigureNode
- `tufte-caption`: CaptionNode
- `tufte-table-layout`: TableLayoutNode

기본 Lexical 패키지로 지원 가능한 타입은 `root`, `paragraph`, `text`, `linebreak`, `link`, `list`, `listitem`, `table`, `tablerow`, `tablecell` 등이다. 지원 가능성과 실제 editor registry 등록 및 왕복 검증은 다르다. `heading`, `quote`, `horizontalrule`은 공식 패키지 노드를 평가하되 Tufte 전용 직렬화 계약을 확인해야 한다.

## 구현 대기 노드 및 의존성

| 순서 | 노드/기능 | 관련 F | 우선 검증 |
| --- | --- | --- | --- |
| 1 | heading, quote, horizontalrule (공식 노드 매핑) | F02, F07, F08 | h2/h3, export JSON, 섹션 내부 구조 |
| 2 | tufte-definition-list, tufte-term, tufte-definition | F06 | dt/dd 순서, 복수 정의, 복사·이동 |
| 3 | tufte-attribution, tufte-cite, tufte-epigraph | F08, F09 | quote footer/cite, 묶음 및 인용 제목 |
| 4 | tufte-section-footer | F07 | section 직계 구조, 블록 경계 |
| 5 | tufte-fullwidth | F15 | 중첩 금지, CSS direct-child 보존 |
| 6 | tufte-code, tab, code-highlight | F17 | 공백·언어·highlight 정보 보존 |
| 7 | tufte-imagequilt | F19 | 이미지 크기·자산 ID 보존 |
| 8 | tufte-embed | F18 | provider URL allowlist, title, 비율 |

노트/이미지/표의 심화 편집은 P2.3과 연결하되 기존 구현은 R01/R02 검증 대상으로 유지한다.

## 각 노드 수락 기준

1. 문서 schema의 타입·필드·허용 자식과 Lexical importJSON/exportJSON을 맞춘다.
2. 유효하지 않은 버전·속성·자식은 진단하거나 거부한다. 모르는 필드를 조용히 버리지 않는다.
3. document → editor → document 왕복과 golden fixture를 추가한다.
4. HTML export는 편집 DOM과 분리하고 P2.4에서 의미적 HTML을 확인한다.
5. 로컬 build/typecheck/test 명령과 실제 결과를 `docs/PROGRESS.md`에 기록한 뒤에만 완료 체크한다.

우선 다음 구현: 공식 heading/quote/horizontalrule 직렬화 호환성 검사와 최소 왕복 fixture. CI는 사용하지 않는다.
