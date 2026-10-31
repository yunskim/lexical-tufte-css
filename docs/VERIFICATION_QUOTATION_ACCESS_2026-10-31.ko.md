# 인용 기능 Tab·DOM 읽기 순서 검증

기준 `4e71eee2aa48cc4eda215aa32746c4d2d63368b1` 후속. 제품 코드·schema·golden 변경 없이 `tests/quotation-editing-browser.mjs`의 검증만 확장했다.

| 검증 | 결과/범위 |
| --- | --- |
| 순방향 Tab | toolbar 직전 임시 버튼에서 시작, 실제 Tab 이벤트로 인용 관련17개 버튼을 DOM 순서대로 방문 |
| 역방향 Tab | toolbar를 벗어난 위치에서 실제 Shift+Tab으로17개 버튼 역순 방문 후 시작 위치 복귀 |
| trap/누락 | 각 방향250회 상한 내 종료, 대상 이름/순서의 완전 일치. 대상마다 focus()를 호출하지 않음 |
| 키보드 명령 | 기존 Enter/Space 실행·editor activeElement 복귀·본문/문헌/footer 입력 검사 유지 |
| DOM 읽기 순서 | 실제 편집 문서의 순수 발행 HTML에서 blockquote 본문→직접 자식 footer→cite 텍스트 순서, footer/cite의 마지막 요소 관계, aria-hidden 부재 확인 |
| 저장/재열기 | 기존 별도 탭 DOM harness의 canonical 재열기와 native/pure HTML 순서 비교 유지 |
| 화면 |1440×1000,375×1000 모두 통과 |

명령별 scope/history/노트 보존은 QUOTATION_COMMANDS_P22C.ko.md와 이전 unit588개 결과를 따른다. 이번에는 이 browser 파일만 실행했고 unit/build/typecheck/package/full browser/pixel/Python/CI는 재실행하지 않았다. 정본/제품 소스가 바뀌지 않은 상태에서 이전 단위 결과와 이번 브라우저 결과의 범위를 분리했다.

DOM 순서 검증은 실제 스크린리더의 발표 순서/억양/탐색을 검증한 것이 아니다. Tab 검사도 모든 disabled/메뉴 열린 상태·브라우저 조합의 전체 접근성 증거가 아니다. 다음 수동 검증은 PLAN의 P6.2/P6.6에 연결한다.

- [ ] 실제 스크린리더에서 인용 본문·저자·문헌의 발표 순서와 반복/누락 여부 확인.
- [ ] 운영체제 IME 조합 중 각 명령·취소·focus 복귀 확인.
- [ ] 다른 브라우저와 터치 환경에서 focus visible 및 탐색 확인.

C2.c의 Tab/텍스트/포커스/DOM 순서 자동화는 실행 완료다. 실제 스크린리더 항목이 남아 있어 상위 P2.2.c.2/P2.2.c는 완료 체크하지 않는다. 이후 독립적으로 가능한 P2.2.d.1 schema/editor/renderer capability 대조를 진행할 수 있다.

시작/종료에 E133/M123의 history/선택 비교 및 E134/M124의 보조 harness 독립 탭 원칙을 점검했다. 신규 실패/제품 오류 없음.
