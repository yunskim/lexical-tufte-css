# K3 Backspace 구현·검증 — 2026-10-31

기준 `6053b682e0f90e807dd94e6f4aa7908d2d0691d2` 후속, `fix/main-browser-parity-20261023`. K3의 아래 지원/거부 범위를 구현·검증했다. K4/K5와 상위 목록 작업 전체는 미완료다.

## 동작

- root-level Tufte section의 첫 비어 있지 않은 ul/ol 항목 시작에서 Backspace를 누르면 해당 항목만 paragraph로 옮긴다. phrasing 내용·노트 ID·direction/format/textFormat/textStyle 및 나머지 목록을 유지한다. 목록이 비면 제거하고 HISTORY_PUSH_TAG로 한 Undo를 보장한다.
- 첫 항목에 nested list 같은 non-phrasing payload가 있으면 기존 해제 명령의 진단 경로로 무변경 거부한다. 부모에 텍스트/노트와 nested list가 섞인 경우의 위험한 outdent도 기존 E127 거부를 유지한다.
- 일반 문자 삭제, 항목 병합, list-only wrapper의 안전한 nested outdent는 기본 RichText에 위임한다. note 내부·범위 선택·IME·수정키의 Tufte guard 정책을 유지한다.

## 결과

| 검사 | 결과 |
| --- | --- |
| frozen 설치 | 통과, lockfile 변경 없음 |
| pnpm check | build/typecheck/static 및 unit465통과, 실패/취소/skip0 |
| 단위 패키지별 | document57/render52/blog77/editor-ports2/Lexical277 |
| 새 Backspace 단위 | ul/ol 병합·nested outdent·첫 항목 해제 및 nested payload 거부7개 |
| 목록 browser | 1440/375px 두 실행 통과 |
| 노트 browser | note-browser / note-editing-browser / note-dom-browser 모두 통과 |
| 패키지 | 성공 build 후 pack-and-check5개 소비 통과 |
| CI | 요청대로 미실행 |

문자 삭제·병합·첫 항목 해제·nested outdent의 실제 키 입력 및 각각 Undo/Redo를 검사했다. 첫 항목 해제 후 저장/재열기·발행도 검사한다. ul/ol 두 note ID와 본문, 해제 시 방향/정렬 보존은 독립 단위에서 확인한다. 기존 note browser의 편집·복사/붙여넣기·조합·DOM 분리 회귀를 재실행했다.

이번 실행은 관련 browser4파일/5실행과 comparator smoke다. 전체35개 browser와 공식 전체 페이지 pixel 비교, Python은 이번에 재실행하지 않았다. 이전 자산 등록 실패1개를 이번에 해결하거나 통과했다고 해석하지 않는다. 실제 OS IME/스크린리더·다른 브라우저는 P6다.

## 오류와 대책

E129: 실제 browser에서 첫 nonempty 항목의 native Backspace 위임만으로 UL이 paragraph가 되지 않았다. 이 좁은 경계를 HIGH handler로 구현했다. 일반 native 삭제의 일부 headless 회귀는 window object not found로 실패해 browser로 옮겼다. Tufte 해제는 headless에서도 노트와 서식을 검사한다.

기존 “첫 nonempty 항목은 항상 위임” 테스트는 새 지원 계약과 충돌했다. 문자 내부 offset1의 위임 검사로 옮기고 시작 offset0의 Tufte 소유권은 새 독립 회귀에서 확인한다. 실패한 check 뒤의 browser는 실행하지 않았다. E127/M117·E128/M118·E097/M088·M004를 시작 시 검토하고 E129/M119를 추가했다. 종료 시 관련 오류·대책 및 지원 경계를 재검토했다. 다음 점검은 K4 깊이/포커스 시작·완료와 K5 통합 행렬이다.

Node24.22.1/pnpm11.25.0/Playwright1.51.1 Chromium134 shell. 공식 shell 설치 완료와 성공 build를 회수한 뒤 browser를 실행했다. `pnpm package:check` 로그에는 build 출력만 남아 최종 소비를 단독 `node scripts/pack-and-check.mjs`로 재확인해 PASS를 회수했다. 로그는 `/workspace/scratch/484e46557938/lexical-tufte-backspace-20261031`, 최종 소스·로그 해시는 [JSON](verification/backspace-20261031.json)에 있다. CI·배포·발행 없음.
