# 최신 저장소 작업 검증 — 2026-10-17

대상: `yunskim/lexical-tufte-css`, main `038e55156341248db0bb43ad6e716d0454396892` 및 이 보고서와 함께 반영한 검증 수정. 기존 작업 폴더를 보존하고 새 clone에서 시작했다. CI는 추가·실행하지 않았다.

## 확인한 변경

- 인라인·목록·정의목록·인용·그림 명령과 단위 회귀가 추가되어 있다. 코드 블록 삽입 API는 초기 구현이며 UI/전체 회귀 완료로 간주하지 않는다.
- blog에 SQLite 원본 JSON 복구 슬롯, sequence CAS·checksum·세션 격리·CAS 삭제 및 6개 테스트가 추가되어 있다.
- 예제에 debounce 자동 복구, pagehide/숨김/cleanup flush, 탭별 슬롯, legacy 이관, 명시적 삭제와 원문 다운로드가 추가되어 있다. SQLite 어댑터와 예제 localStorage는 아직 연결되지 않는다.
- clean typecheck의 선행 build와 명령 테스트 commit flush 수정이 포함되어 있으며 이번 실행으로 단위 회귀를 확인했다.

## 종료 체크리스트

- [x] 최신 main/작업 규약/오류·대책/진행 문서 확인.
- [x] lockfile 유지 설치. offline 캐시 부재 후 일반 frozen install 성공; lockfile 변경 없음.
- [x] `pnpm check`: lint/inventory/font/typecheck/build 및 237개 테스트 통과. document47 + render28 + lexical144 + blog18, 실패/skip0.
- [x] `pnpm package:check`: 4개 로컬 tarball의 JS/types/고지/SQL export 및 소비 검사 통과. npm 발행 없음.
- [x] `pnpm test:browser`: 11개 실행 파일 전체 통과(exit0). 노트/편집/DOM/5폭 레이아웃/서버/발행/33노드/포맷/폰트/섹션/복구 UI 포함.
- [x] 추가 recovery browser: 800ms 이전 pagehide flush, 두 탭 슬롯 격리, 손상 JSON의 실제 다운로드 바이트 일치, 정리 취소와 확인 삭제 통과.
- [x] 발견한 타입·status 선택자·최초 폰트 paint 동기화 오류 수정 및 오류/대책 문서 연결(E072–E075, M066–M068/M058).

환경: Node24.19.0, pnpm11.25.0, Lexical0.52.0, Playwright1.51.1 / Chromium134.0.6998.35. 기존 Chromium이 없어 공식 설치를 수행했다. font 최초 CDN ZIP 실패 후 도구의 대체 다운로드 성공.

## 완료 판정과 남은 범위

이번 종료 범위는 최신 구현분의 로컬 검증과 발견한 회귀 수정이다. P2–P7 전체 제품 완료가 아니다. 열린 PR은 없다. 단계 이슈는 남은 gate가 있어 유지한다.

P23_WORK_VERIFICATION의 실제 figure UI 삽입/수정/삭제·Undo/Redo·cut/copy provenance·접근성 전체 시나리오는 기존 단위/브라우저 검사만으로 모두 입증하지 못한다. E069/E070은 관련 단위 실행 근거를 확보했지만 실제 UI 전체 성공으로 확대하지 않는다. E071의 외부 clipboard provenance 제한도 유지한다.

복구의 실제 OS 강제 종료, quota/권한 실패, legacy 충돌·전체 보존 정책, SQLite UI 연동, 여러 브라우저/실제 IME/스크린리더, 전체 생산 한글 폰트와 시스템 fallback은 후속이다. 폰트 기본 환경 한국어 시스템 fallback 부재(E064), editor bundle 500kB 경고(W001)는 해결했다고 주장하지 않는다. 원본 OTF 재생성 비교는 이번 실행에 포함하지 않았다.
