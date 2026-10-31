# 정의목록 P2.2.b.3 수락 — 2026-10-31

기준 `034adedf24e59f0a44c6484aa5894a0da3b69702` 후속, `fix/main-browser-parity-20261023`. 정의목록의 아래 쌍/그룹 명령 지원·거부 범위를 완료했다. 상위 명령 단계 P2.2.b는 명시된 지원 범위에서 완료하고 F06 전체·P2.2·P2.2.d/P4/P6 게이트는 유지한다.

## 지원 범위

| 작업 | 지원·거부 계약 / 검증 |
| --- | --- |
| 삽입 | root-level section의 허용된 block 뒤에 dt/dd 쌍 삽입; 잘못된 section 직접 text 등은 진단·무변경 |
| 추가 | 유효한 그룹의 dt 또는 dd 내부에서 쌍 추가; 잘못된 그룹 순서/section 밖/목록 element 자체 선택은 거부 |
| 수정 | 실제 editor의 dt phrasing 및 dd 안 paragraph 내용을 편집 |
| 이동 | 하나 이상의 dt와 한 dd가 이루는 그룹 전체 이동; 상대 순서·노트 ID 보존, 처음/끝 경계 거부 |
| 그룹 삭제 | 선택 그룹만 삭제; 마지막 그룹은 거부해 빈 dl 방지 |
| 전체 삭제 | 명시적 별도 UI 명령으로 내용까지 삭제; 인접 블록 또는 editable paragraph로 caret 이동 |
| 범위/조합/노트 내부 | 모든5개 명령에서 진단·문서/선택 무변경 거부 |

UI의 기본 추가 단위는 dt/dd 쌍이다. 복수 dt가 하나의 dd를 공유하는 그룹은 Node/API·정본 입력에서 지원하며 그룹 이동/삭제와 편집·보존을 검증했다. 별도 alias-add 버튼을 구현했다는 뜻은 아니다. 전역 GUI/속성 capability 감사는 P2.2.d로 이어진다.

## 3경로 보존

1. canonical JSON을 실제 DOM editor로 읽고 한 프레임 재조정 후 export한다.
2. export 결과를 JSON 직렬화·재열기해 canonical 문서가 같은지 비교한다.
3. editor native HTML 및 순수 renderer HTML의 dl 직접 자식 dt/dd 순서·내용을 각각 비교한다.

fixture는 Term A + Alias A → Description A/노트, Term B → Description B의 그룹이다. 접근성 namespace/label/input 출력 차이는 의미 비교에서 해당 controls만 제외하고 텍스트를 비교한다. 노트 ID는 canonical JSON에서 보존한다. 원본 JSON을 손실 정규화하지 않았으며 임의 HTML→Lexical importer를 추가한 것은 아니다(P2.4). 비기본 direction/정렬 등 모든 속성 capability 완료를 뜻하지 않는다(P2.2.d).

## 결과

| 검사 | 결과 |
| --- | --- |
| frozen 설치·build/typecheck/static | 통과 |
| 최종 unit | 501통과, 실패/취소/skip0 |
| 패키지별 unit | document57/render52/blog77/editor-ports2/Lexical313 |
| 정의목록 unit | 기존10 + 새 경계18 =28개, 전체에 포함 |
| definition browser | 1440/375px 모두 통과 |
| publication/contextual browser | 실제 편집·엄격 export·CSP/5폭·메뉴/focus/375px 회귀 통과 |
| packed 소비 | 5개 tarball JS·선언·왕복·SQL·라이선스 통과 |
| CI | 요청대로 미실행 |

실제 정의목록 UI에서 내용 편집·순서 변경과 한 Undo/Redo, 그룹 삭제와 한 Undo/Redo, 마지막 그룹 거부, 전체 삭제와 한 Undo/Redo, 저장/재열기·발행을 검사했다. 수정한 마지막 insert 경계 이후 check/정의목록 두 폭/package 및 publication/contextual을 모두 다시 통과했다.

전체36 browser/공식 전체 pixel/Python은 이번에 재실행하지 않았다. 이전의 보류 자산 등록 실패가 해결됐다는 의미는 아니다. 실제 OS IME/스크린리더·다른 브라우저는 P6다.

## 오류와 점검

E132/M122: APPEND만 그룹 구조/section 경계를 사용하지 않아 새17개 중2개가 malformed/outside-section 내용을 변경하는 실패를 재현했다. selectedGroup을 공유하도록 수정했다. 추가 정적 검토에서 insert의 상수 타입 검사를 실제 block canonical type 검사로 바꾸고 직접 TextNode 거부1개를 더했다. 원래 source metadata alias는 canonicalBlockType으로 인정한다. 새 총18개는 범위·공개 composition key·note 내부의 문서/선택 무변경을 포함한다.

시작에 E090/M084와 M117–M121을 검토했고 종료에 두 문서의 기록/상태와 과거 main/환경/실기기 한계를 다시 대조했다. 과거 미해결 기록을 이번 브랜치의 제한된 성공으로 일괄 해결 처리하지 않았다. 다음 점검은 P2.2.c.1 인용문·출처·epigraph 수정/삭제 범위 시작·완료다.

Node24.22.1/pnpm11.25.0/Playwright1.51.1 Chromium134 shell. 성공 설치·build 이후 browser를 실행했고 실패한 build 산출물을 사용하지 않았다. 로그는 `/workspace/scratch/484e46557938/lexical-tufte-definition-20261031`, [소스·실패/최종 로그 해시](verification/definition-list-20261031.json). CI·배포·패키지 발행 없음.
