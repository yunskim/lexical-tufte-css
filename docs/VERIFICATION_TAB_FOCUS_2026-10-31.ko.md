# K4 Tab·Shift+Tab 깊이·포커스 검증 — 2026-10-31

기준 `fe5449e7a10424f306c2194d999a75cfe07998f0` 후속, `fix/main-browser-parity-20261023`. K4의 명시한 지원/거부 경계를 완료했다. K5 및 상위 목록 항목 전체는 아직 미완료다.

## 변경

list-only nested wrapper 자체를 element selection으로 선택하면 Lexical의 indent는 no-op인데 기존 keyboard handler가 Tab을 소비했다(E130). 첫 자식이 ListNode인 컨테이너는 keyboard에서 false/기본 탐색으로 위임하고 toolbar 명령에서는 진단·무변경 거부한다. 일반 leaf 항목의 구조적 indent/outdent와 깊이20 제한은 유지한다.

테스트 전용 DOM editor harness는 실제 RichText와 동일 TUFTE_NODES·목록 명령을 등록한다. 앞/뒤 버튼과 독립 contenteditable을 만들고 실제 keyboard Tab/Shift+Tab의 activeElement, canonical JSON, 구조 깊이를 비교한다. production API/hook은 추가하지 않았다. Vite test config에 harness를 사전 탐색시켜 reload를 방지하고 `test:tab-focus` 및 기본 `test:browser`에 새 파일을 연결했다.

## 지원/거부 행렬

- ul/ol 각각 깊이19→20 Tab과20→19 Shift+Tab: editor focus 유지, 양방향 후 동일 JSON, 노트 ID/payload 보존.
- 깊이20 추가 indent, 최상위 outdent, 첫 항목 indent: 기본 focus 탐색, JSON/depth 무변경. toolbar의 같은 거부는 진단과 무변경 검사.
- 혼합 부모 outdent, 일반 paragraph, note 내부, 범위 선택: 기본 focus 탐색, 문서 무변경.
- list-only container 자체의 Tab/Shift+Tab: 기본 focus 탐색. element selection의 실제 anchor를 독립 단위에서 검사했다.
- 외부 버튼에서 Tab으로 editor에 들어오는 경우: indent 명령 실행 없음. 실제 contextual UI의 toolbar/메뉴 Tab·Escape focus 회귀도 실행했다.
- IME/modifier 및 section 밖 선택은 기존 독립 guard 회귀를 유지한다. 실제 OS IME/스크린리더·다른 브라우저는 P6다.

1440/375px × ul/ol에서 기본 focus 거부36건, 유효한 깊이 변경8키, 외부 버튼 진입4건을 검사했다. 새 fixture는 깊이 경계를 직접 생성하며 사용자 흐름의 history/저장/발행은 기존 목록 browser 두 폭에서 별도로 재검증한다.

## 결과

| 검사 | 결과 |
| --- | --- |
| frozen install | 통과, lockfile 변경 없음 |
| pnpm check | build/typecheck/static, unit475통과·실패/취소/skip0 |
| 패키지별 unit | document57/render52/blog77/editor-ports2/Lexical287 |
| 새 Tab 단위 | 10통과, 전체475개에 포함 |
| 포커스 browser | 1440/375px 통과 |
| 기존 목록 browser | 1440/375px history·저장/재열기·발행 통과 |
| contextual browser | toolbar/메뉴 Tab·Escape·375px 경계 통과 |
| 패키지 소비 | 5 tarball JS·선언·왕복·라이선스/SQL 통과 |
| CI | 요청대로 미실행 |

최종 체크 이후 컨테이너 Shift+Tab assertion을 보강했고 해당 단위10개와 포커스 browser 두 폭을 다시 통과했다. 제품 코드는 전체 check 이후 변경하지 않았다. browser는3파일/4프로세스 실행이다. 새 파일 추가로 전체 browser 파일은36개가 되었지만 이번에 전체 전수 실행은 하지 않았다. 공식 전체 pixel/Python도 미실행이다. 보류 자산 등록의 이전 실패가 해결됐다는 의미는 아니다.

## 오류·대책 점검

E130/M120: 최초 wrapper.selectStart() fixture는 자손을 선택해 컨테이너 경계를 검사하지 못했다. 공개 RangeSelection으로 wrapper element0과 실제 anchor key를 명시한 뒤 ul/ol 두 실패를 재현하고 수정했다. handler false만이 아니라 실제 focus 이동을 검증한다. M117–M119·M088·M004를 시작/종료에 검토했고 다음 점검은 K5 통합 수락 시작·완료다.

고정 공식 shell 설치 완료 및 성공 build를 먼저 회수하고 browser를 실행했다. Node24.22.1/pnpm11.25.0/Lexical0.52.0/Playwright1.51.1 Chromium134 shell. 로컬 로그는 `/workspace/scratch/484e46557938/lexical-tufte-tab-20261031`, [소스·로그 해시](verification/tab-focus-20261031.json). CI·배포·패키지 발행 없음.
