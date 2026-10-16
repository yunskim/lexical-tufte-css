# R05 — 무효 레이아웃 구조의 복구

## 편집 정책

편집 중인 section/figure/table-layout을 비파괴적으로 검사한다. 빈 section, 허용되지 않는 자식, 선두 이미지 누락/이미지 중복/캡션 중복, 그림의 잘못된 주석 종류, 표 영역의 표 누락/복수 표를 진단한다. 자동으로 내용을 지우거나 이미지/표를 생성해 정상 문서로 꾸미지 않는다.

`inspectEditorStructure`는 현재 상태를 읽기만 한다. 진단에는 Lexical key와 JSON path가 있다. `focusStructureIssue`는 문제 컨테이너로 선택을 이동하며, 오래된 key는 안전하게 거부한다. 이 검사는 레이아웃 복구용이며 전체 document validator를 대체하지 않는다. 기존 raw prototype의 root 문단 허용과 문서 정본의 root > section 규칙도 구분한다.

## 실제 복구 UI

예제의 ‘문서 구조 복구’ 영역에서 문제 위치로 이동하거나 실행 취소한다. 구조가 정상이었던 마지막 EditorState를 메모리에 보관하고 ‘마지막 정상 구조로 복구’를 제공한다. 복구 전에 현재 무효 상태를 별도 사본으로 저장한다. 저장 공간 오류가 나면 복구 작업을 중단하고 현재 내용을 유지한다. 복구 자체도 실행 취소할 수 있다.

정상 checkpoint는 구조 기준이다. 전체 스키마/자산/발행 기능까지 유효함을 보장하지 않는다. 새로고침하면 메모리 checkpoint는 초기화되며 영속적인 revision 복구는 P5 책임이다.

## 저장과 발행의 분리

| 경로 | 무효 구조 처리 |
| --- | --- |
| 일반 저장 | 기존 `lexical-tufte-p1`을 덮어쓰지 않음 |
| 복구용 저장 | `lexical-tufte-recovery-v1`에 raw JSON 보존. 유효 문서/발행본이라고 표시하지 않음 |
| 복구용 사본 열기 | 항상 노출한 버튼으로 raw 상태를 열고 구조 진단 재표시 |
| 예제 JSON·HTML 확인 | JSON은 표시하되 HTML을 비우고 차단 사유 안내 |
| 정본 document export | 기존 validator가 무효 구조 거부 |
| 정본 `renderArticle` | HTML null과 진단 반환, 부분 발행 없음 |

복구 사본은 마지막 하나만 보존하며 다음 무효 저장이 교체한다. raw JSON import는 등록 노드 parse 범위만 제공한다. 손상된 JSON·알 수 없는 노드·미래 버전을 무손실로 복구했다고 주장하지 않는다.

## 검증

- 실제 Lexical 검사: 빈 section, 캡션만 있는 figure, 표 대신 문단이 있는 wrapper, 복수 이미지, 33종 정상 문서, 오래된 key. 검사 전후 메모리 불변성과 저장 JSON 동등성을 별도 assertion으로 확인한다.
- 실제 React UI: section/figure/table-layout 무효 상태 로드, 문제 위치 이동, 일반 저장 보호·복구 사본 보존, HTML 차단, 정상 checkpoint 복구·복구 취소·사본 재열기.
- 정본 renderer: 세 구조의 무효 JSON에 대해 전체 발행 차단과 원본 불변성.

2026-10-16 실행: check187/187(document47·lexical112·render28, 실패·skip0), browser7, diff check 통과. CI는 생략했다. OS 실제 IME/다른 브라우저/전체 접근성 검증은 P6에 남는다.
