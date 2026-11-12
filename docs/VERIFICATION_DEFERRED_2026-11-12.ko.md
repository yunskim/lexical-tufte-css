# 누적 자동 테스트 실행 — 2026-11-12

검증 소스: `d3eae8423ca3faf7f533435e331a21f1975d145b`. **제품 코드·테스트 수정 없이 최종 46/46개가 통과했다. 최초 정의목록 클릭 timeout 1건은 동일 소스 단독 재실행에서 통과했으며 원인은 미확정이다.** 지난 실행 이후 노트 삽입·분리·합치기·이동의 공통 명령과 `TufteEditor.editorRef`, readonly에서도 구조 명령 거부 안내를 유지하는 등록 경계를 포함한다.

| 검사 | 결과 |
| --- | --- |
| frozen install, audit/lint/inventory/font | 통과 |
| 전체 build/typecheck | 통과 |
| 단위 | 641개 통과(document 58/render 72/blog 77/editor-ports 2/Lexical 432), 실패·skip 0 |
| 신규 구조 명령 단위 | 위 641개에 포함된 12개 시나리오 통과 |
| 패키지 소비자 | 6개 tarball packed JS·타입·CSS·왕복·SQL/라이선스 통과, 신규 명령/등록 함수/구조 플러그인·editorRef 소비 포함 |
| 호스트 자산 정책 | revision·URL·만료·백오프 상한 통과 |
| 브라우저 | tests/*-browser.mjs 46개 전수 실행, 최초 45/46 → 동일 소스 집중 재실행 후 최종 46/46 |
| Python | 16개 통과, Starlette/httpx deprecation warning 1개 |
| 실제 TS→Python HTTP→SQLite | save/read/list/checksum/CAS/access/CSRF/delete 통과 |
| 발행 revision 제안 모델 | 12그룹 통과 (운영 저장소 수락과 구분) |
| 공식 Tufte 예제 | 9섹션·60블록·7노트 DOM·편집·저장/재열기·발행 통과 |
| 화면 비교 | 375/759/760/761/1024/1440px 모두 검증된 iframe 1개 마스크 밖 RGBA 픽셀 차이 0 |
| CI | 기존 지시대로 미실행 |

## 신규 구조 명령에서 확인한 범위

`packages/lexical/test/note-structure-commands.test.mjs`의 12개 시나리오를 실제 실행했다. 두 종류 노트 삽입, 잘못된/중첩/비축약 selection 및 heading/link 부모 거절, ID 충돌 재시도·소진/예외 거절, readonly에서 4개 명령의 거부 안내/JSON 보존, rich payload 분리·합치기, 한 노트 안 text range의 합치기 허용·교차 노트 range 거절, 이동 시 ID/본문 보존, 가장자리 분리·종류 불일치 합치기 거절, 등록 해제, 분리의 Undo/Redo를 확인했다.

`tests/reusable-note-structure-browser.mjs`는 실제 두 제어형 React/Lexical 편집기와 호스트 툴바의 공개 `editorRef` 명령으로 4개 시나리오를 통과했다.

1. 사이드노트·마진노트 삽입, 고유 ID, canonical Undo/Redo 및 상대 편집기 불변성. readonly에서 외부 삽입 요청은 문서를 바꾸지 않고 정확히 1번의 거부 안내를 보냈다.
2. rich note 분리·합치기에서 link/image·기존 ID 보존, 분리 Undo/Redo와 형제 문서 불변성.
3. 앞뒤 이동의 실제 canonical 순서와 각각의 Undo 복원, 중첩 삽입·노트 밖 분리 거절 및 문서 불변성.
4. unmount 중 외부 툴바 요청이 문서를 바꾸지 않음, remount 뒤 한 번의 삽입/안내와 형제 문서 불변성.

기존 노트 탐색/클립보드·readonly/remount·controlled API·자산 선택/URL 갱신·복구·발행·목록/인용·공식 예제 회귀도 새 소스에서 다시 실행했다. 11월 11일의 45개 통과를 이번 신규 소스의 증거로 재사용하지 않았다.

## 실행과 증거

frozen install → `pnpm check` → `node scripts/pack-and-check.mjs` → 순수 갱신 정책 → browser 46개 개별 직렬 실행. 전체 build/typecheck 종료 성공을 회수한 뒤 browser를 시작했다. 각 파일의 프로세스 제한은 240초이며 프로세스 timeout·강제 skip 없음. 정의목록 클릭의 초기 6초 assertion timeout과 동일 소스 단독 재실행은 별도 기록했다. 제한 시간을 늘리지 않았다. Python pytest/HTTP는 같은 `/tmp/tufte-structure-venv/bin/python`을 사용했다.

Playwright 1.51.1 공식 shell 설치/launch smoke를 통과했고, 공식 이미지 5개/ET Book 폰트 4개의 고정 Git blob 검증 후 화면 비교를 실행했다. 공식 설치기의 첫 CDN 손상 ZIP 응답은 fallback 경로로 설치됐다(E004 재관찰, 일반 네트워크 해결 주장은 하지 않음). 로그 디렉터리 생성과 자산 동기화 시작 순서가 한 번 겹쳐 redirection이 실패했으나 디렉터리 생성 후 명시적으로 동기화를 실행하고 성공을 회수했다. 테스트 결과와 구분하는 실행 준비 문제다. 빌드 chunk 크기 알림과 Python deprecation warning은 실패가 아니며 성능 수락을 뜻하지 않는다.

E139–E150/M127–M132의 선행 빌드·공식 browser smoke·같은 Python·실제 선택/Undo/저장·타이머·라틴 fallback 참조 경계를 시작/종료에 점검했다. E151/M133에 정의목록 클릭 timeout을 기록했다. 첫 클릭 로그는 visible/enabled/stable 확인 후 performing click에서 멈췄고, 코드/시간 제한 변경 없는 단독 재실행은 통과했다. 환경 지연 가능성은 추정이며 원인은 확정하지 않는다. 성공 재실행으로 간헐 실패 자체를 해결 처리하지 않는다. 기존 제품 오류 재현은 관찰되지 않았다. [소스 해시·파일별 결과·환경/로그 증거](verification/deferred-20261112.json).

## 남은 범위

실제 OS IME·시스템 clipboard·스크린리더·물리 터치·Firefox/WebKit, 실제 DAM/업로드/인증/권한·운영 네트워크, 장시간 반복 mount/unmount·리스너/타이머 누수 계측은 실행하지 않았다. Linux 폰트 기준 검사는 기존 DejaVu fixture 설정을 사용하며 `knownKoreanFallback:false` 한계는 유지한다. 이번 readonly/명령·Undo/Redo 시나리오의 성공을 모든 명령 조합과 운영/접근성 수락으로 확대하지 않는다. R2–R7/P3.1.e 전체 완료 게이트는 남긴다.

## 브라우저 파일별 결과

| 파일 | 결과 |
| --- | --- |
| all-nodes-browser.mjs | 통과 |
| contextual-ui-browser.mjs | 통과 |
| controlled-editor-browser.mjs | 통과 |
| controlled-host-assets-browser.mjs | 통과 |
| controlled-host-refresh-browser.mjs | 통과 |
| definition-pairs-browser.mjs | 통과 (동일 소스 단독 재실행) |
| font-proof-browser.mjs | 통과 |
| full-page-pixel-parity-browser.mjs | 통과 |
| host-asset-provider-browser.mjs | 통과 |
| inline-span-browser.mjs | 통과 |
| inline-span-html-browser.mjs | 통과 |
| layout-browser.mjs | 통과 |
| list-kind-browser.mjs | 통과 |
| list-tab-focus-browser.mjs | 통과 |
| managed-note-assets-browser.mjs | 통과 |
| note-browser.mjs | 통과 |
| note-dom-browser.mjs | 통과 |
| note-editing-browser.mjs | 통과 |
| note-export-parity-browser.mjs | 통과 |
| note-image-chooser-browser.mjs | 통과 |
| note-image-dimensions-browser.mjs | 통과 |
| p22d2-semantic-dom-browser.mjs | 통과 |
| publication-browser.mjs | 통과 |
| quotation-editing-browser.mjs | 통과 |
| recovery-browser.mjs | 통과 |
| reusable-note-clipboard-identity-browser.mjs | 통과 |
| reusable-note-interactions-browser.mjs | 통과 |
| reusable-note-paste-browser.mjs | 통과 |
| reusable-note-structure-browser.mjs | 통과 |
| section-commands-browser.mjs | 통과 |
| server-browser.mjs | 통과 |
| text-format-browser.mjs | 통과 |
| upstream-dom-browser.mjs | 통과 |
| upstream-full-document-editor-browser.mjs | 통과 |
| upstream-full-document-roundtrip-browser.mjs | 통과 |
| upstream-full-document-visual-browser.mjs | 통과 |
| upstream-full-page-baseline-browser.mjs | 통과 |
| upstream-geometry-browser.mjs | 통과 |
| upstream-newthought-sidenote-browser.mjs | 통과 |
| upstream-same-content-epigraphs-browser.mjs | 통과 |
| upstream-same-content-figures-browser.mjs | 통과 |
| upstream-same-content-final-sections-browser.mjs | 통과 |
| upstream-same-content-fundamentals-browser.mjs | 통과 |
| upstream-same-content-getting-started-browser.mjs | 통과 |
| upstream-same-content-opening-browser.mjs | 통과 |
| upstream-same-content-sidenotes-browser.mjs | 통과 |
