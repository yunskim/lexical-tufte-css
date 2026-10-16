# P2 노드 구현과 실행 검증 범위

2026-10-16 통합 재검증 기준. [전체 보고서](VERIFICATION_2026-10-16.ko.md)와 [PLAN](PLAN.ko.md)을 정본으로 함께 읽는다.

## 확인한 범위

- document schema는 33개 타입이다. strict 왕복 테스트의 공통 TUFTE_NODES와 Lexical 기본 노드에서 coverage를 파생하며 33개 타입 모두를 등록한다.
- 추가된 정의목록·epigraph/출처/cite·section footer·fullwidth·code·ImageQuilt·embed의 실물 JSON 왕복/입력 거부는 lexical 67개 검사에 포함된다.
- 새 publication 브라우저 harness는 정의목록/출처를 실제로 편집하고 코드 공백·방향/정렬·이미지 로딩·embed 비율/CSP를 5개 폭에서 검사한다.
- paragraph/list golden에 더해 실제 고정 런타임의 전체33종 document golden을 생성했다. nullable code token과 대표 속성·layout을 포함하고, 타입별 unknown field/future version 거부 및 상태 불변성을 검사한다. [R02 보고서](ROUNDTRIP_R02.ko.md) 참조. 과거/미래 npm 버전 호환성 증거는 아니다.

## 구현과 제품 지원의 차이

기본 examples/editor UI도 공통33종 registry를 사용해 전체 문서를 로드·저장할 수 있다. 새 Node 클래스의 export/단위 테스트 통과만으로 실제 UI에 모든 삽입·속성·키보드·복구 경로가 생기는 것은 아니다. P2.2/P2.3과 F표의 완료 체크는 유지하지 않는다.

남은 우선순위: R03.d UI 문서 교체 history, R05 무효 구조 복구, 이후 P2.2 노드별 commands와 UI 연결. code-highlight/언어 메타데이터 등 발행 미지원 경로는 명시적으로 차단한다. 폰트는 P4, 접근성/다른 브라우저/OS IME는 P6에 남는다.

## 노드별 수락 기준

1. 타입·필드·자식·값 제약을 document와 Lexical에서 일치시킨다.
2. document→실제 editor→document 무손실 저장 값 및 실패 진단을 검사한다.
3. 실제 편집/JSON 보존/HTML 의미 구조와 독립 CSS 기준을 검증한다.
4. 알 수 없는 데이터나 미지원 출력은 삭제/평탄화하지 않고 차단한다.
5. 로컬 실행 증거와 오류 대책을 기록한 범위만 체크한다. CI는 사용하지 않는다.
