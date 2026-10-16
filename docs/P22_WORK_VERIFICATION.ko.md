# P2.2 Work 일괄 검증 인계

> 상태: 검증 대기. 사용자의 지시에 따라 이 대화에서는 실행 테스트를 수행하지 않는다. CI는 추가하지 않는다.

## 실행 순서

1. GitHub 최신 main을 깨끗하게 체크아웃하고 pnpm lockfile 기준 의존성을 설치한다.
2. `pnpm check` 및 `pnpm test:browser`를 실행한다. 실패하면 최초 원인과 재현 명령을 `docs/ERROR_LOG.md`에 기록하고 `docs/ERROR_PREVENTION.md`의 방지 규칙을 갱신한다.
3. P2.2.a 섹션/본문 명령과 P2.2.b 인라인/목록/정의목록 명령, P2.2.c 인용 명령을 React 예제에서 각각 실행한다. 버튼 mousedown 이후 selection 유지, IME 중 구조 변경 거부, 중첩 노트/표 셀/지원하지 않는 부모에서 거부를 확인한다.
4. 모든 명령에 대해 실행 전후 Lexical JSON, `exportEditorToDocument` 결과, `validateDocument`, `renderArticle` 출력, 저장 후 재열기 결과를 비교한다. 지원하지 않는 속성은 성공으로 둔갑시키지 않고 진단을 반환해야 한다.
5. undo/redo를 거쳐 텍스트·노트 ID·선택 범위·정의목록 dt/dd 순서·인용 출처의 최종 위치가 보존되는지 확인한다.
6. 결과와 재현 환경, 실패/통과 수치를 `docs/PROGRESS.md`에 기록한다. 통과 전 P2.2 체크박스 및 F01–F09를 완료로 바꾸지 않는다.

## 명령별 주요 계약

| 영역 | 명령 | 성공 구조 | 거부 조건 |
| --- | --- | --- | --- |
| 인라인 | SET_TUFTE_SPAN_KIND_COMMAND | 기존 span kind만 변경, 자식 보존 | 다른 span 사이 선택, IME, 잘못된 kind |
| 목록 | INSERT_TUFTE_LIST_COMMAND / APPEND_TUFTE_LIST_ITEM_COMMAND | section > list > listitem | 섹션 밖, 선택 없음, 잘못된 종류 |
| 정의목록 | INSERT_TUFTE_DEFINITION_LIST_COMMAND / APPEND_TUFTE_DEFINITION_PAIR_COMMAND | section > dl > (dt, dd)+ | 섹션 밖, 선택 없음, IME |
| 인용 | INSERT_TUFTE_QUOTATION_COMMAND | section > quote / epigraph > quote / section-footer | 잘못된 부모, 선택 없음, IME |
| 출처 | APPEND_TUFTE_ATTRIBUTION_COMMAND | quote > 본문, attribution > cite | 인용문 밖, 중복 attribution |

## 확인해야 할 잠재 문제

- Headless Lexical에서 빈 listitem/term 선택이 실제로 유지되는지.
- 인용문 안에서 출처 삽입 후 두 번째 시도가 올바르게 거부되는지.
- Tufte section의 루트 구조를 Lexical normalization이 임의로 바꾸지 않는지.
- renderer의 quote/epigraph/footer HTML과 편집기 DOM export가 의도한 의미 구조를 유지하는지.
- 새 명령 테스트의 명령 dispatch가 비동기 editor update를 완료한 뒤 상태를 관찰하는지.

검증 결과가 확인될 때까지 이 문서는 테스트 완료 증거가 아니다.
