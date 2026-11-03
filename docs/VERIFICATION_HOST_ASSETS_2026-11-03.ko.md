# 공통 호스트 이미지 자산 — 누적 자동 검증 (2026-11-03)

기준 `558bdcd4f9147e562b754e68db983777a5850669`에 아래 예제 선언·브라우저 fixture 수정 3개를 적용한 소스를 검증했다. 이전 `e39b8a1`의 40개 통과를 재사용하지 않고 신규 2개를 포함한 브라우저 42개를 모두 실행했다.

| 검사 | 결과 |
| --- | --- |
| frozen install, audit/lint/inventory/font | 통과 |
| 전체 build/typecheck | 예제 타입 수정 후 통과 |
| 단위 | 629개 통과(document 58/render 72/blog 77/editor-ports 2/Lexical 420), 실패·skip 0 |
| 패키지 소비자 | 6개 tarball의 packed JS·타입·CSS·왕복·SQL/라이선스 검사 통과 |
| 갱신 정책 | 잘못된 응답·고정/최신 revision·만료 여유·짧은 TTL·5분 상한 재시도 통과 |
| 브라우저 | 첫 실행 40/42 통과, 신규 fixture 2개 수정 후 최종 42/42 통과 |
| Python | 16개 통과, Starlette/httpx deprecation warning 1개 |
| 실제 TS→Python HTTP→SQLite | save/read/list/checksum/CAS/access/CSRF/delete 통과 |
| 발행 revision 제안 모델 | 12그룹 통과 (운영 저장소 검증과 구분) |
| 공식 예제 | 9섹션·60블록·7노트 DOM·편집·저장/재열기·발행 통과 |
| 화면 비교 | 375/759/760/761/1024/1440px 모두 검증된 iframe 1개 마스크 밖 RGBA 픽셀 차이 0 |
| CI | 기존 지시에 따라 미실행 |

## 신규 기능에서 확인한 범위

- `controlled-host-assets-browser.mjs`: 실제 두 React/Lexical 편집기의 자산 검색/MIME 필터·고정 revision·canonical host locator·Undo/Redo, 잘못된/만료 URL·revision 불일치·provider 예외 거절, 취소 후 늦은 resolve 차단, 선택한 노트 끝 삽입과 다른 편집기 불변성을 확인했다.
- `controlled-host-refresh-browser.mjs`: 60초 선제 갱신 경계, URL 회전 시 한 번의 controlled onChange와 동일 URL 무알림, alt/locator 보존, 수동 갱신의 이전 타이머 교체, 5초 재시도와 수동 복구 후 재시도 취소, 외부 문서 교체·unmount 중 늦은 응답 차단, remount 및 namespace 분리를 확인했다.
- 순수 정책 검사에서 6번째 실패 160초, 7번째 이후 300초 상한을 확인했다. 모든 재시도 단계의 실제 브라우저 타이머를 검증했다고 확대하지 않는다. 만료가 없는 응답의 폴링 없음은 순수 정책 검사 범위다.

## 실패와 수정

1. **E145/M130:** `hostAssetDemo.tsx`의 필수 harness 속성 교차 타입 단언 때문에 첫 빌드가 TS2352로 실패했다. Window 인터페이스 확장과 정상 대입으로 수정했다. 런타임 기능 코드는 바꾸지 않았다.
2. **E146/M127/M130:** 노트 컨테이너 좌표 클릭은 실제로 본문 caret을 선택했다. 노트 TextNode 클릭과 실제 selection의 note ID 단언으로 바꿨다. canonical JSON·다른 편집기 불변성 검사는 유지했다.
3. **E147/M128/M130:** 가상 시계가 멈춰 최초 연결/remount의 즉시 예약 callback이 실행되지 않았다. `clock.runFor(0)`으로 현재 시각 callback만 실행했다. 중간 1ms 시도는 만료 경계 기준을 이동해 실패했으며 최종 방식에서 59,999/60,000ms 단언을 그대로 통과했다.

첫 실패와 중간 시도를 삭제하지 않고 [파일별 결과·소스 패치/해시·로그 증거](verification/host-assets-deferred-20261103.json)에 구분했다. `HostAssetPicker`/`HostAssetRefresh` 제품 구현과 기존 테스트 기대값을 약화하지 않았다.

## 실행 순서와 한계

`pnpm install --frozen-lockfile` → `pnpm check`(타입 오류 수정 후 재실행) → `node scripts/pack-and-check.mjs` → `node tests/host-asset-refresh-policy.mjs` → `tests/*-browser.mjs` 42개 개별 직렬 실행 → 실패 신규 2개 집중 재실행. 각 브라우저 파일의 프로세스 제한은 240초이며 프로세스 timeout/강제 skip은 없었다. Python은 `/tmp/tufte-host-venv/bin/python`의 같은 환경에서 pytest와 실제 HTTP 검사를 실행했다. 공식 Playwright 1.51.1 shell 설치 후 launch smoke를 통과했고, 화면 비교 전 고정 이미지 5개와 ET Book 폰트 4개의 Git blob을 검증했다. 첫 다운로드의 손상 응답은 설치 도구의 공식 fallback 경로로 해결됐다.

실제 DAM·업로드·인증/권한·운영 네트워크, OS IME·스크린리더·물리 터치·Firefox/WebKit, 장시간 리스너/타이머 누수·백그라운드·다중 탭 수락은 실행하지 않았다. 두 인스턴스의 관찰된 독립성을 모든 자산/namespace 조합의 보장으로 확대하지 않는다. R4–R7/P3.1.e 전체 게이트는 유지한다. 시작/종료에 E139–E144/M127–M129를 점검했고 새 실패·대책 E145–E147/M130을 추가했다.

## 브라우저 파일별 최종 결과

| 파일 | 결과 |
| --- | --- |
| all-nodes-browser.mjs | 통과 |
| contextual-ui-browser.mjs | 통과 |
| controlled-editor-browser.mjs | 통과 |
| controlled-host-assets-browser.mjs | 통과 (fixture 수정 후 재실행) |
| controlled-host-refresh-browser.mjs | 통과 (fixture 수정 후 재실행) |
| definition-pairs-browser.mjs | 통과 |
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
