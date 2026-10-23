# P2.2.b.1 — 인라인 속성 생성·변경·해제 계약

지원 범위는 일반 TextNode 하나의 부분 선택이다. `sans`, `newthought`, `numeral`, `danger`를 같은 명령으로 생성하며 선택 방향·글자 서식·링크 URL·인접 노트 ID를 보존한다. 기존 span의 kind 변경과 전체 wrapper 해제는 각각 한 history step이다.

| 명령 | 지원 | 무변경 거부 |
| --- | --- | --- |
| WRAP_TUFTE_SPAN_COMMAND(kind) | 같은 TextNode의 비어 있지 않은 정방향/역방향 부분 선택, 링크 안 텍스트 포함 | 여러 TextNode/부모에 걸친 범위, 노트 내부, 기존 span 내부, IME, 허용되지 않는 부모/kind |
| SET_TUFTE_SPAN_KIND_COMMAND(kind) | 양 끝점이 같은 기존 span, 내용·선택·kind 외 속성 유지 | 다른 span/일반 텍스트까지 걸친 범위, IME, 잘못된 kind |
| UNWRAP_TUFTE_SPAN_COMMAND | span 내부 텍스트의 접힌 caret, 부모가 자식을 그대로 수용하는 경우 | 범위 선택, 노트 내부, span 밖, IME, 부모 제약 위반 |

같은 span kind 재선택은 무변경 성공이다. 미지원 명령은 diagnostic을 반환하며 text split이나 history mutation 전에 거부한다. 여러 노드를 합치거나 부분 span을 자동 해제하는 기능은 포함하지 않는다.

## HTML 지원 범위

TufteSpanNode.importDOM은 네 가지 kind 중 하나를 가진 span을 복원한다. `dir=ltr|rtl`, 선택적 `tufte-align-left/start/center/right/end/justify` 클래스 및 같은 의미의 단일 `text-align` CSS 선언을 지원한다. native exportDOM도 정렬을 scoped class로 출력하므로 publisher와 같은 의미를 유지한다.

인식된 Tufte span에 복수 kind, 알 수 없는 클래스/속성, 잘못된 dir, 임의 CSS·중복 CSS·important·충돌한 정렬이 있으면 Error를 발생시킨다. CSSOM이 잘못된 CSS를 먼저 버리므로 원본 style 문자열도 검사한다. HTML 변환을 적용하는 호스트는 변환이 모두 끝난 뒤 기존 상태를 교체하고 오류를 처리해야 한다.

이 단계의 HTML 왕복은 **span/link 인라인 fragment**와 글자 서식의 native HTML 및 publisher HTML이다. 전체 article·노트 controls·외부 문서의 strict importer/위치 있는 진단 UI는 P2.4에서 다룬다. 이 노드 converter만으로 외부 HTML 문서 전체가 검증되는 것은 아니다.

## 검증과 제한

- inline-commands15개: partial/reversed/rich-text/link·인접 note identity·무변경 거부·선택 보존·3명령 composition guard.
- inline-span-browser: 1440/375px 실제 선택·wrap/unwrap/kind의 Undo/Redo·저장/재열기·CDP 한글 조합 취소/조합 중 해제 거부.375px Space 버튼 활성화는 키보드 접근 경로도 확인한다.
- inline-span-html-browser:4 kind×3 방향/정렬 입력, native/publisher 왕복36회, malformed12종 거부 시 기존 편집 상태 보존.
- 전체 check425개·package5개·browser35파일·공식9섹션6폭 pixel 회귀 결과는 최신 진행/실행 보고서를 따른다. CI 생략.

OS별 실제 한국어 IME와 스크린리더 실기기 검증은 P6 게이트다. P2.2.b.1은 위 지원/거부 범위의 구현·회귀를 완료하며 P2.2.b/P2.2 전체 또는 F03/F05 전체 완료를 뜻하지 않는다.
