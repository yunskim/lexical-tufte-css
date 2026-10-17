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

## 회귀와 실행 조건

- `packages/lexical/test/list-commands.test.mjs`: ul↔ol, 자식·노트 ID 보존, 중첩 목록 범위, 잘못된 위치/종류 거부, 구조 들여쓰기/내어쓰기 및 최초/최상위 경계.
- `tests/list-kind-browser.mjs`: 실제 React 툴바, ul/ol DOM, 저장·재열기, undo/redo, 순수 JSON→HTML 렌더, 문단에서 호출 시 원본 불변.
- 일괄 실행: `pnpm install --frozen-lockfile` → `pnpm check` → `pnpm package:check` → `pnpm test:browser` 직렬. 사용자 지시에 따라 지금은 실행하지 않았으며 위 검사들의 성공을 주장하지 않는다.
- 후속: 동일/복합 목록 항목 다중 선택, 중첩 ul/ol 혼합 유형·내어쓰기 경계, 키보드 Enter/Backspace/Tab 정책, 전체 목록 해제, 실제 OS IME·포커스·스크린리더 검증. 따라서 P2.2.b.2/F06 완료로 표시하지 않는다.
