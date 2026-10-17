# P2.2.b.2 — Tufte 목록 유형 전환·구조 들여쓰기 계약

상태: **구현 및 회귀 테스트 코드 작성, 실행 검증 대기** (2026-10-17). 정본 범위 [PLAN P2.2.b.2](PLAN.ko.md) / [이슈 #9](https://github.com/yunskim/lexical-tufte-css/issues/9). CI 생략.

## 범위

- `INSERT_TUFTE_LIST_COMMAND('bullet'|'number')`: 접힌 선택에서 최상위 Tufte 섹션의 유효 블록 뒤에 빈 ul/ol 삽입.
- `APPEND_TUFTE_LIST_ITEM_COMMAND`: 현재 선택이 속한 목록에 항목 하나 추가.
- **신규** `SET_TUFTE_LIST_KIND_COMMAND('bullet'|'number')`: 가장 가까운 `ListNode`의 유형을 변경. 전체 목록의 기존 `ListItemNode`와 텍스트·링크·노트 ID를 보존하며 노드 자체를 교체하지 않는다. 내부 중첩 목록은 별도 목록이며 변경 대상은 가장 가까운 것만.
- **신규** `CHANGE_TUFTE_LIST_INDENT_COMMAND('indent'|'outdent')`: 가장 가까운 `ListItemNode`의 구조적 깊이를 한 단계 변경한다. 시각 CSS padding만 변경하지 않고 Lexical의 `ListItemNode.setIndent`를 사용한다.

## 불변식 및 거부 계약

- 구조 경계: 문서 정본은 `root→tufte-section→list→listitem`, 중첩 목록은 `listitem→list`다. `NODE_SCHEMA`가 불허하는 부모에서 변환하지 않는다.
- 기존 목록 전환/들여쓰기는 접힌 `RangeSelection`만 받고 IME 조합 중 또는 `tufte-note` 내부 선택을 거부한다. `check`는 Tufte ul/ol에서 지원하지 않으므로 자동 변환하지 않는다.
- 유형 전환은 항목 자식의 노트·링크 ID/내용을 건드리지 않는다. 동일 유형 재선택은 무변경.
- 첫 항목은 상위 형제가 없으므로 더 안쪽으로 들여쓰지 않으며 최상위 item은 내어쓰지 않는다. 깊이는 문서 schema 공통 indent 한도 20을 초과하지 않는다.
- 허용되지 않는 명령과 잘못된 payload는 편집 상태를 바꾸지 않고 `INVALID_LIST_SELECTION` diagnostic으로 처리한다. 성공 변경은 `HISTORY_PUSH_TAG` 한 단위로 undo/redo 가능해야 한다.
- 부적합한 `ListItemNode`를 임의의 paragraph로 조용히 교체하거나 span·note payload를 제거하지 않는다.


## 목록 해제: flat ul/ol → 문단 (추가 구현)

- `UNWRAP_TUFTE_LIST_COMMAND`는 **최상위 `tufte-section`의 직계 목록**에서만 작동한다. 자식이 모두 `ListItemNode`, 모든 항목의 구조적 깊이가 0, 각 항목의 직계 자식 타입이 `NODE_SCHEMA.paragraph.children`에 허용되는지 **변경 전에** 검사한다.
- 성공 시 원래 목록의 위치에 항목 순서대로 `paragraph`를 만들고, 항목의 문단 호환 속성(direction/format/textFormat/textStyle/indent)과 내부의 기존 Lexical 자식 노드를 보존하여 텍스트·링크·주석 `noteId`를 유지한다. 선택은 해제된 항목의 새 문단 시작으로 옮긴다. 구분선·다른 섹션·앞뒤 문단은 바꾸지 않는다.
- 중첩 목록, 지원되지 않는 원소, 주석 내부 선택, 목록 밖 커서, IME 조합 중 작업은 **무변경 진단·거부**한다. 명령 수행 전 조건을 모두 검사하고 단일 history step으로 되돌릴 수 있어야 한다.
- `packages/lexical/test/list-commands.test.mjs`에 note ID를 포함한 여러 항목 해제와 중첩·목록 밖 선택 거부 사례를 추가했다. `tests/list-kind-browser.mjs`에 해제 후 문단 텍스트·순서, 순수 JSON→HTML 출판, undo 복구 회귀를 추가했다.
- 검증은 여전히 미실행. 중첩/복합 리스트의 선택적 해제, 구조가 다른 다중 선택, 스크린리더 경로 및 실기기 IME는 추후 수락 게이트로 남긴다.

## 회귀와 실행 조건

- `packages/lexical/test/list-commands.test.mjs`: ul↔ol, 자식·노트 ID 보존, 중첩 목록 범위, 잘못된 위치/종류 거부, 구조 들여쓰기/내어쓰기 및 최초/최상위 경계.
- `tests/list-kind-browser.mjs`: 실제 React 툴바, ul/ol DOM, 저장·재열기, undo/redo, 순수 JSON→HTML 렌더, 문단에서 호출 시 원본 불변.
- 일괄 실행: `pnpm install --frozen-lockfile` → `pnpm check` → `pnpm package:check` → `pnpm test:browser` 직렬. 사용자 지시에 따라 지금은 실행하지 않았으며 위 검사들의 성공을 주장하지 않는다.
- 후속: 동일/복합 목록 항목 다중 선택, 중첩 ul/ol 혼합 유형·내어쓰기 경계, 키보드 Enter/Backspace/Tab 정책, 전체 목록 해제, 실제 OS IME·포커스·스크린리더 검증. 따라서 P2.2.b.2/F06 완료로 표시하지 않는다.

## 키보드 Enter — 최소 안전 경계 (2026-10-18)

- `registerListKeyboardCommands`가 `KEY_ENTER_COMMAND`를 **최상위 섹션 직계 ul/ol의 마지막 빈 항목**에서만 소비한다. 이때 빈 항목을 제거하고 목록 뒤에 문단을 생성한다. 목록에 다른 항목이 남아 있으면 기존 항목과 inline note ID는 변경하지 않는다. 유일한 빈 항목이면 빈 목록도 제거한다.
- 일반/중간 텍스트의 Enter 분할, 중첩 목록, 빈 중간 항목, Shift+Enter, IME 조합, 노트 내부, 수정키 조합은 모두 `false`를 반환해 Lexical 기본 동작에 맡긴다. 이 범위를 넘어 임의로 키 이벤트를 선점하지 않는다.
- `packages/lexical/test/list-commands.test.mjs`에 마지막 빈 항목 종료, 유일한 빈 목록 종료, 비어 있지 않은 항목/중간 빈 항목/IME 무개입을 추가했다. 실제 단위/브라우저 테스트는 아직 실행하지 않았다.
