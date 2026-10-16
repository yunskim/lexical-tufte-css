# P2.2.a — 섹션·본문 블록 명령

`registerSectionCommands(editor, onDiagnostic?)`를 TUFTE_NODES 편집기에 한 번 등록한다. 해제 함수를 반환한다. 이 등록은 editor.update 밖에서 수행한다. 명령은 라이브러리와 실제 예제 툴바에서 함께 사용한다.

| 명령 | 동작 |
| --- | --- |
| WRAP_TUFTE_ROOT_COMMAND | 섹션이 없는 기존 root 본문 블록을 명시적으로 한 섹션으로 묶음 |
| INSERT_TUFTE_SECTION_COMMAND | 현재 섹션 다음에 빈 문단을 가진 섹션 추가 |
| SPLIT_TUFTE_SECTION_COMMAND | 현재 섹션의 직접 자식 블록 앞에서 나눔. 현재 블록과 뒤의 블록을 새 섹션으로 이동 |
| MERGE_TUFTE_SECTION_COMMAND | 다음 섹션을 현재 섹션으로 병합. 방향·정렬 등 직렬화 속성이 같을 때만 허용 |
| SET_TUFTE_BLOCK_COMMAND | 같은 문단 안의 선택을 paragraph/h2/h3로 변환 |

나누기는 문단 내부 문자열을 자르는 명령이 아니다. 첫 블록 앞에서 나누면 이전 섹션에 편집 가능한 빈 문단을 남긴다. 분할된 섹션의 직렬화 속성, payload 순서 및 기존 note ID를 보존한다. 자동 root 정규화는 수행하지 않는다. 기존 prototype의 raw 문단 문서는 사용자가 ‘본문을 섹션으로 묶기’를 선택할 때만 변환된다.

블록 변환은 child key·rich payload·선택 offset·방향/정렬/들여쓰기·text format/style cache를 보존한다. h1은 metadata에서 별도로 발행하며 이 명령은 h2/h3만 지원한다. 선택이 여러 블록에 걸치거나, 주석 안이거나, 조합 중이면 거부한다. 표 셀/정의 등 부모가 제목을 허용하지 않는 위치 또는 제목으로 바꿀 문단에 주석이 포함된 경우도 mutation 전에 거부한다. 내용을 지우거나 노트를 다른 위치로 옮겨 유효한 척하지 않는다.

등록된 명령의 dispatch 반환 true는 처리됐다는 뜻이다. 성공 여부와 동일하지 않으며 거부 이유는 onDiagnostic으로 전달한다. 거부 시 내용과 선택을 유지한다. 성공한 구조 변경은 HISTORY_PUSH_TAG로 undo/redo 경계를 만든다. 조합 중 구조 변경은 거부하되 OS 실제 IME의 전체 품질 검증은 P6에 남긴다.

## 증거와 범위

- `section-commands.test.mjs`: 명시적 root 변환, rich heading 변환/offset, section 속성·순서·note ID, 첫 블록 분할, 주석/지원하지 않는 블록/병합 속성/여러 블록/표 셀 거부, 해제 및 실제 HistoryPlugin.
- `section-commands-browser.mjs`: 실제 React UI로 묶기/추가/분할/병합, h2/h3/paragraph, 주석 거부, undo/redo, 저장·재열기 및 정본 renderArticle 성공.
- 로컬 tarball 소비 타입 검사에 새 명령 API도 포함한다.

이 작업은 P2.2.a다. F01/F02 전체 CSS·접근성·모바일·metadata 편집 UI 또는 P2.2 전체 완료를 뜻하지 않는다. 다음 P2.2.b 인라인/목록 명령, P2.2.c 인용/맺음말/epigraph 명령과 P2.2.d 통합 경계를 진행한다. 2026-10-16 결과: check214/214(document47·lexical127·render28·blog12, fail/skip0), browser10, package4 tarball 소비/타입, frozen offline install, diff check 통과. CI 없음.
