# ADR: newthought와 sidenote의 anchor 표현

- 상태: **제안(미채택)**
- 범위: P2.2.e, F05/F10
- 참조: `fixtures/tufte/newthought-sidenote-reference.html`

## 문제

원본은 `<span class="newthought">텍스트<label ...></label></span><input ...><span class="sidenote">...</span>`이다. 현재 문서 모델의 `tufte-note`는 하나의 논리 노드이고, 발행 시 `span[data-tufte-note]` 내부에 label/input/payload를 함께 배치한다. `tufte-span`의 자식에 `tufte-note`를 추가하는 것만으로 원본과 같은 DOM이 되지 않는다.

## 선택지

1. **현행 wrapper 유지**: 편집과 직렬화가 단순하다. 단, 원본의 부모/형제 관계와 CSS 선택자를 정확히 재현하지 못한다.
2. **렌더 단계의 분할 anchor**: 편집 모델은 하나의 노트를 유지하고, 특정 `newthought` 끝에 연결된 노트만 label을 span 안에, input/payload를 span 밖에 출력한다. 출력 트리가 서로 다른 부모를 가지므로 일반적인 재귀 렌더링 대신 명시적인 부모 수준 변환이 필요하다.
3. **별도 anchor 노드**: span 안에는 anchor를, span 밖에는 노트 본문을 저장한다. 원본 구조를 직접 표현하지만 anchor와 본문이 분리되면 고아 노드, 중복 ID, 복사·삭제·이동 문제를 새로 해결해야 한다.

## 잠정 방향

**2번을 우선 검증**한다. 편집 노트의 원자성과 기존 문서 호환성을 유지할 가능성이 높기 때문이다. 단, 노트가 `newthought`의 마지막 자식이고, 뒤에 실제 입력/본문이 이어지는 경우에만 분할 렌더링을 허용하는 제한을 먼저 검토한다. 이는 구현 확정이 아니다. 현재 스키마에서는 `tufte-span`이 `tufte-note`를 자식으로 받지 않으므로 새 fixture는 아직 문서 JSON의 유효성을 주장하지 않는다.

## 구현 전 수락 테스트(미실행)

- 원본 최소 fixture: `newthought > label`, 그 다음 형제 `input.margin-toggle + span.sidenote` 및 `for/id` 일치.
- 노트가 없는 `newthought`, 일반 sidenote 및 marginnote는 기존 발행 구조 유지.
- 동일 문서에서 note ID 중복 없음. 서로 다른 문서/namespace의 ID 충돌 없음.
- 새 anchor가 텍스트 입력, IME 조합, 선택 범위, 삭제, 복사·붙여넣기, undo/redo 후에도 연결 유지.
- 저장→재열기→발행 HTML의 구조 및 note 내용 유지.
- CSS 뷰포트 비교: 원본과 좁은 화면에서 margin-toggle 동작 확인.

## 보류 조건

위의 편집 불변식이나 무손실 왕복을 만족하지 못하면 스키마 확장과 렌더러 변경을 보류하고 대안을 재검토한다. 사용자 요청에 따라 테스트 코드는 누적하되 일괄 실행 전까지 검증 완료로 표시하지 않는다.
