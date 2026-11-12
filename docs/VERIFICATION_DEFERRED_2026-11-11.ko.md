# 누적 자동 테스트 실행 — 2026-11-11

> 구조 명령 공통화 이후의 최신 실행은 [2026-11-12 보고서](VERIFICATION_DEFERRED_2026-11-12.ko.md)를 따른다. 이 문서의 45개 결과는 당시 소스의 이력이다.

기준 `d4d724f37db29e537afbdbf631cc47fe5b1b78c5`에 이번 테스트 fixture 수정 3개와 폰트 환경 설정 1개를 적용한 소스를 검증했다. **제품 코드 수정 없이 최종 브라우저 45/45개가 통과했다.** 11월 3일 검증 이후 공통 노트 플러그인·공개 탐색 명령·ToolbarButton 이관과 클립보드/수명 회귀를 포함한다.

| 검사 | 결과 |
| --- | --- |
| frozen install, audit/lint/inventory/font | 통과 |
| 전체 build/typecheck | 통과 |
| 단위 | 629개 통과(document 58/render 72/blog 77/editor-ports 2/Lexical 420), 실패·skip 0 |
| 패키지 소비자 | 6개 tarball의 packed JS·타입·CSS·왕복·SQL/라이선스 통과, 새 노트 명령/ToolbarButton export 포함 |
| 호스트 자산 정책 | revision·URL·만료·백오프 상한 통과 |
| 브라우저 | 최초 42/45 → fixture 수정 후 해당 3개 재실행 → 최종 45/45 |
| Python | 16개 통과, Starlette/httpx deprecation warning 1개 |
| 실제 TS→Python HTTP→SQLite | save/read/list/checksum/CAS/access/CSRF/delete 통과 |
| 발행 revision 제안 모델 | 12그룹 통과 (운영 저장소 수락과 구분) |
| 공식 Tufte 예제 | 9섹션·60블록·7노트 DOM·편집·저장/재열기·발행 통과 |
| 화면 비교 | 375/759/760/761/1024/1440px 모두 검증된 iframe 1개 마스크 밖 RGBA 픽셀 차이 0 |
| CI | 기존 지시에 따라 미실행 |

## 이번에 실행한 신규 수락 범위

- `note-browser.mjs`: 기존 예제의 '다음 노트로'·'본문으로' 버튼이 공통 공개 명령으로 실제 노트 진입/본문 복귀를 수행한다. **E148/M131의 미검증 버튼 경로를 이 범위에서 수락했다.**
- `reusable-note-interactions-browser.mjs`: 두 실제 React/Lexical 인스턴스에서 Alt+Down/Escape, 각 호스트의 정확히 한 번씩 알림, 편집 격리, readonly 왕복 및 unmount/remount 후 단일 callback을 확인했다.
- `reusable-note-paste-browser.mjs`: Chromium clipboard의 실제 Control+V로 CRLF/LF를 각 노트에 붙여넣고 canonical linebreak 1개, 링크·이미지·노트 ID 보존과 형제 문서 불변성을 확인했다.
- `reusable-note-clipboard-identity-browser.mjs`: 실제 Copy 시 새 ID, Cut/Paste 이동 시 기존 ID 유지, rich payload 보존, 중첩 노트 paste 거절 알림 및 canonical JSON 무변경·형제 편집기 격리를 확인했다.
- 기존 controlled editor·자산/갱신·노트 이미지·선택/목록/인용·복구·발행·공식 예제 회귀도 모두 실행했다. 이전 통과 수치를 신규 소스의 증거로 대체하지 않았다.

## 최초 실패와 수정

**E149 — 클립보드 fixture 선택 위치:** plain paste는 시각적 `End` 키가 노트 밖 본문으로 caret을 이동시켜 linebreak가 노트에 없었다. Copy 후 Cut/Paste는 마지막 자손 span이 복사된 노트 내부 링크여서 중첩 거절을 받았다. 진단 DOM/JSON으로 확인한 뒤 노트 TextNode 끝의 Range를 명시하고, 본문 목적지는 paragraph의 직접 자식 TextNode로 제한했다. paste 직전 실제 선택의 note ID/노트 밖 여부 단언을 추가했다. linebreak·rich payload·copy/cut ID·중첩 거절·다른 편집기 보존 기대는 유지했다.

**E150 — 라틴 fallback 환경:** 폰트 검사에서 CJK custom font는 정상 로드됐으나 새 컨테이너의 공백이 Liberation Serif로 렌더돼 표 폭 77px가 기존 78.640625px 기준과 달랐다. DejaVu 참조 환경에서는 79px로 기존 0.5px 허용 오차와 전체 샘플을 통과했다. Linux에 DejaVu가 있고 사용자가 `FONTCONFIG_FILE`을 명시하지 않은 경우 해당 폰트 검사 browser process에만 `tests/fixtures/fontconfig-dejavu.conf`를 적용하도록 했다. 기준값·허용 오차·glyph 검사는 유지했으며 일반 `node tests/font-proof-browser.mjs` 명령으로 재통과했다. OS 전역 설정은 바꾸지 않았다. `knownKoreanFallback:false`는 기존 한글 시스템 fallback 한계로 남는다.

[최초/최종 파일별 결과, 적용 소스 패치/해시와 로그 증거](verification/deferred-20261111.json)에 실패·진단·집중 재실행을 구분했다. 제품 노트 구현은 변경하지 않았다. 오류/예방 문서에 E149–E150/M132를 추가하고 E148/M131에 실제 검증 결과를 남겼다.

## 실행과 한계

frozen install → `pnpm check` → `node scripts/pack-and-check.mjs` → 순수 갱신 정책 → `tests/*-browser.mjs` 45개 개별 직렬 실행 → 실패 3개 수정/집중 재실행. 테스트 수정 후 lint도 통과했다. 각 browser 파일의 프로세스 제한은 240초이며 프로세스 timeout·강제 skip 없음. assertion의 초기 10초 대기 실패는 최초 결과에 남겼다. Playwright 1.51.1 공식 shell 설치/launch smoke 후 실행했고, 화면 비교 전 이미지 5개·ET Book 4개의 고정 Git blob을 검증했다. 첫 CDN의 손상 ZIP 응답은 공식 설치기 fallback으로 설치됐다(E004 재관찰, 네트워크 일반 해결 주장은 하지 않음). Python pytest/HTTP는 같은 `/tmp/tufte-notes-venv/bin/python`을 사용했다. 빌드의 500kB chunk 알림과 Python deprecation warning은 실패가 아니며 성능 수락을 뜻하지 않는다.

실제 OS IME·시스템 clipboard·스크린리더·물리 터치·Firefox/WebKit, 실제 DAM/업로드/인증/권한·운영 네트워크, 장시간 반복 수명/리스너 누수 계측은 미실행이다. Chromium clipboard와 단일 readonly/remount 시나리오를 모든 OS/장시간 cleanup 보장으로 확대하지 않는다. R2/R3/R4–R7/P3.1.e 전체 게이트는 남긴다. 시작/종료에 E139–E148/M127–M131을 점검했다. CI 미실행.

## 브라우저 파일별 최종 결과

| 파일 | 결과 |
| --- | --- |
| all-nodes-browser.mjs | 통과 |
| contextual-ui-browser.mjs | 통과 |
| controlled-editor-browser.mjs | 통과 |
| controlled-host-assets-browser.mjs | 통과 |
| controlled-host-refresh-browser.mjs | 통과 |
| definition-pairs-browser.mjs | 통과 |
| font-proof-browser.mjs | 통과 (fixture 수정 후 재실행) |
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
| reusable-note-clipboard-identity-browser.mjs | 통과 (fixture 수정 후 재실행) |
| reusable-note-interactions-browser.mjs | 통과 |
| reusable-note-paste-browser.mjs | 통과 (fixture 수정 후 재실행) |
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
