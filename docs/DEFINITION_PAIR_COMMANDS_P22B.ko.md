# P2.2.b.3 — 정의목록 dt/dd 편집 및 쌍 단위 이동/삭제 계약

상태: **구현·회귀 코드 작성, 실행 검증 대기** (2026-10-17). [계획](PLAN.ko.md) · [이슈 #9](https://github.com/yunskim/lexical-tufte-css/issues/9). 사용자 지시에 따라 CI·테스트 미실행.

## 스키마 및 편집 의미

- 기존 `INSERT_TUFTE_DEFINITION_LIST_COMMAND`: 선택한 섹션 블록 다음에 `dl` 생성, 초기 `dt(용어)`·`dd(p(설명))` 한 쌍으로 시작.
- 기존 `APPEND_TUFTE_DEFINITION_PAIR_COMMAND`: 현재 `dl` 끝에 쌍 추가, 새 term으로 커서 이동.
- 신규 `MOVE_TUFTE_DEFINITION_PAIR_COMMAND('up'|'down')`: **인접한 `dt/dd` 쌍 전체**를 한 단계 위·아래로 이동. 동작은 동일 `dl` 내부이며 기존 노드를 재배치하므로 노드 key, 텍스트·서식, 정의 설명 내 inline note ID와 링크를 유지한다. 단독 dt나 dd는 이동 대상이 아님.
- 신규 `REMOVE_TUFTE_DEFINITION_PAIR_COMMAND`: 커서가 속한 `dt/dd` 한 쌍 제거, 남은 쌍의 term으로 커서를 이동. **마지막 쌍** 삭제는 거부하여 비어 있는 `dl` 생성 금지. 정의목록 전체 해제는 별도 기능(미구현)으로 취급한다.
- `dt`, `dd` 내용은 기존 Lexical 텍스트/paragraph 편집으로 수정한다. 별도의 중복 텍스트 상태를 만들지 않는다.

## 데이터 보존을 우선하는 제한

- 문서 validator는 `dt dt dd`처럼 여러 용어가 하나의 정의를 공유하는 구조도 허용한다. 그러나 쌍 단위 재배치는 의미를 훼손할 수 있으므로 **이번 버전은 정확한 교대 순서(`dt dd dt dd ...`)에만 적용**한다.
- 변경 전에 접힌 선택, IME/노트 내부 여부, 최상위 섹션의 직계 `dl`인지, 전체 자식 타입·쌍 순서, 첫/끝 이동 경계를 확인한다. 하나라도 실패하면 진단을 반환하고 문서를 변경하지 않는다.
- 성공 이동은 중간 JSON 재생성/전체 노드 교체 대신 기존 `DefinitionTermNode`·`DefinitionDescriptionNode`의 위치를 바꾼다. UI는 편집기의 기존 선택·포커스 보존을 활용한다.
- 이번 명령은 쌍/목록 전체 복제, 다중 용어 그룹의 편집·삭제, 마지막 쌍이 하나 남은 `dl` 전체 삭제를 지원하지 않는다. 지원 범위 확장은 내용·ID 무손실 및 재열기 증거를 먼저 확보해야 한다.

## 테스트 수락 기준 (작성, 실행 대기)

- `packages/lexical/test/definition-commands.test.mjs`:
  - 두 쌍 위·아래 이동의 역연산이 JSON 의미·항목 순서를 복원한다.
  - 설명 본문의 노트 ID와 텍스트는 이동 뒤에도 원래 `dd`에 남는다.
  - 선택된 `dt/dd` 삭제는 정확히 한 쌍만 없애며 마지막 쌍·비정형 `dt dt dd`·잘못된 방향은 거부한다.
- `tests/definition-pairs-browser.mjs`: UI에서 정의 쌍 추가→내용 수정→쌍 이동→순서/semantic HTML→저장·재열기→쌍 삭제→마지막 쌍 거부→undo/redo.
- 기본 실행: `pnpm install --frozen-lockfile` → `pnpm check` → `pnpm package:check` → `pnpm test:browser` (브라우저 직렬) → 필요 시 실제 OS IME/스크린리더. **현재 단계에서는 결과를 통과로 기재하지 않는다.**

P2.2.b.3의 기존 전체 범위(추가·수정·삭제·순서 보존)를 닫으려면 다중 용어 그룹 정책, 정의목록 전체 삭제/해제 UX, JSON→발행 semantic DOM과 복구 검증을 추가로 완료해야 한다.

## 확장: 여러 dt가 하나의 dd를 공유하는 그룹 (2026-10-18)

- 정의 그룹은 **하나 이상의 연속된 `dt` 뒤에 정확히 하나의 `dd`**가 오는 단위로 파싱한다. `dt dt dd`는 한 그룹이고 `dt dd dt dd`는 두 그룹이다. `dd`가 앞에 나오거나 `dt`가 설명 없이 끝나면 구조 명령 전체를 거부한다.
- `MOVE_TUFTE_DEFINITION_PAIR_COMMAND`와 `REMOVE_TUFTE_DEFINITION_PAIR_COMMAND`는 이름을 호환 유지하되 동작 단위를 **완전한 정의 그룹**으로 확장한다. 이동은 원래의 `dt` 순서와 공유 `dd`를 함께 유지하며, 삭제도 그룹 전체를 제거한다. 마지막 그룹 삭제는 여전히 거부한다.
- 기존 문서의 '다중 용어 그룹은 거부' 제한은 이 확장으로 대체한다. 단위 회귀에는 `dt dt dd` 그룹을 인접 그룹과 교환 후 역교환, 그룹 삭제, 잘못된 `dd dd` 순서의 무변경 거부를 추가했다. 테스트 실행 전이므로 완료/통과는 주장하지 않는다.

## 정의목록 전체 삭제 (2026-10-18)

- `REMOVE_TUFTE_DEFINITION_LIST_COMMAND`: 정의목록 내부의 접힌 선택에서 명시적으로 호출할 때, 최상위 Tufte 섹션 직계 `dl` 전체를 제거한다. 한 그룹만 남았을 때의 그룹 삭제 거부와 구별되는 **의도적 전체 삭제**다.
- 삭제 후 앞쪽/뒤쪽의 편집 가능한 형제 요소로 커서를 이동한다. 섹션의 유일한 블록이었다면 빈 문단을 남겨 계속 작성할 수 있게 한다. 목록 외부 선택, 노트 내부 선택, IME 조합 중에는 원문 불변으로 거부한다.
- `packages/lexical/test/definition-commands.test.mjs`에 앞뒤 문단 보존, 유일한 정의목록 삭제 시 빈 문단, 목록 밖 선택의 무변경 회귀를 추가했다. 실행 검증은 여전히 보류 중이다.
