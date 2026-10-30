# 목록 키보드 소유권과 Enter 계약 — P2.2.b.2

호스트는 `registerListCommands(editor)`와 `registerListKeyboardCommands(editor)`를 함께 등록한다. 예제는 RichTextPlugin을 사용하며 ListPlugin을 추가하지 않았다. 다른 ListPlugin을 함께 사용하는 호스트는 별도 수락 검증이 필요하다.

## 소유권

| 입력/조건 | 소유자와 처리 |
| --- | --- |
| 최상위 Tufte section의 빈 마지막 ul/ol 항목 Enter | Tufte HIGH: 목록 뒤 paragraph, 비어 버린 목록 제거 |
| 같은 section에 속한 중첩된 빈 항목 Enter | Tufte HIGH: 정확히 한 단계 outdent, 앞뒤 목록·부모 payload 보존 |
| 일반 항목 처음/중간/끝 Enter | 기본 RichText EDITOR → INSERT_PARAGRAPH 및 ListItemNode 분할 |
| 비어 있는 첫 최상위 항목 Backspace | 기존 Tufte HIGH: 다음 항목 보존 또는 paragraph로 대체 |
| 혼합 부모 내부 항목 시작 Backspace | 내용 손실 방지 진단·무변경 거부; 일반 문자 삭제와 구분 |
| 첫 nonempty top-level phrasing 항목 시작 Backspace | Tufte HIGH: 항목만 paragraph로 해제, 서식·노트·나머지 목록 보존 |
| 첫 항목에 nested list 등 non-phrasing payload 존재 | 진단·무변경 거부 |
| 다른 안전한 Backspace | 기본 RichText 위임; 문자 삭제·병합·list-only nested outdent 검증 |
| 유효한 section 목록 Tab/Shift+Tab | 기존 구조적 명령에 위임, 허용되는 변경에서만 preventDefault |
| 첫 항목 indent·최상위 outdent·깊이20·혼합 부모 outdent·section 밖 Tab | 기본 포커스 탐색 유지 |
| 노트 내부·범위 선택·조합 중·수정키 단축키 | Tufte handler는 false로 위임; 자체 변형 없음 |

## 혼합 부모와 구조적 wrapper

Lexical의 list-only wrapper는 중첩 list 하나만 포함하는 listitem이다. 문서 스키마는 텍스트/노트와 list를 함께 갖는 혼합 부모도 허용한다. 고정 Lexical0.52.0의 일반 outdent는 wrapper를 제거하므로 혼합 부모에 호출하면 텍스트/노트가 소실될 수 있다(E127).

빈 항목 Enter는 선택 항목을 부모 다음으로 이동하고, 뒤쪽 형제는 원본 list의 메타데이터를 복사한 꼬리 목록에 유지한다. 앞쪽 목록이 비면 그 list만 제거한다. 부모는 자식이 완전히 없어졌을 때만 제거한다. note ID나 본문 텍스트를 변경하지 않는다. 일반 outdent는 이 구조를 자동 정규화하지 않고 진단 거부한다. Shift+Tab 거부 시 브라우저 포커스 탐색을 막지 않는다.

## JSON과 발행

Lexical은 nested listitem의 indent를 구조에서 계산해 JSON에 저장한다. renderer는 nonzero listitem.indent가 실제 목록 조상 깊이와 일치할 때만 허용한다(E128). 다른 노드의 임의 들여쓰기와 구조 불일치 값은 계속 발행을 차단한다. 기존 nested fixture의 indent0 기본값도 유지한다. JSON/golden을 삭제하거나 발행용으로 손실 정규화하지 않는다.

## 수락 근거와 범위

- `packages/lexical/test/list-keyboard-ownership.test.mjs`: 실제 RichText 등록 앞/뒤 × ul/ol × 처음/중간/끝 Enter; 인접 노트1개 보존; 빈 nested 항목 처음/중간/끝의 부모 노트·앞뒤 형제·list start 보존; 혼합 부모 outdent/Shift+Tab 거부; section 밖 Tab; note/실제 editor composition guard. 실제 OS IME를 뜻하지 않는다.
- `packages/lexical/test/list-commands.test.mjs`: 기존 명령/키보드 경계와 우선순위 회귀. 이전 혼합 부모 outdent 테스트의 느슨한 내용 검사와 별개로 새 회귀에서 전체 JSON 보존·진단을 확인한다.
- `tests/list-kind-browser.mjs`: 1440/375px 실제 키 입력, 기본 Enter 분할과 최종 빈 항목 종료·nested 빈 항목 outdent 각각 한 Undo/Redo, 저장·재열기, 실제 중첩 JSON 발행. 동적 last UL 대신 section 직접 자식 목록으로 경계를 검사한다.
- `packages/render/test/render.test.mjs`: 구조 깊이 일치 허용/불일치 거부와 입력 불변성.

K1·K2의 실행 판정과 전체 회귀 결과는 별도 실행 보고서에 기록한다. K3는 2026-10-31 위 지원/거부 경계의 history·노트·저장/발행을 검증했다([보고서](VERIFICATION_BACKSPACE_2026-10-31.ko.md)). K4 Tab 전체 깊이·focus 수락과 K5 통합 행렬은 미완료다. 실제 OS IME·다른 브라우저·스크린리더 실기기는 P6이며 자산 확장은 보류한다. CI 없음.
