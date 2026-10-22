# 실제 코드 리뷰 후속 수정 — 2026-10-22

대상: `test/upstream-full-page-baseline-20261019`.
검토 기준: 공식 Tufte CSS 전체 페이지 parity 및 headless/pure renderer 경계.
최신 테스트 실행을 검증 전 완료로 표시하지 않는다. 이전 2026-10-19 batch 성공은 이 변경들에 전이되지 않는다.

## 판단과 작업 규칙

- **이미 수정됨, 유지**: `tufte-pre-wrap` 발행 래퍼 제거, `newthought + sidenote`의 split-parent 발행 변환. 임의 `white-space:pre-wrap` 확대나 note의 중복 구조 변경 금지.
- **우선 수정**: registry freeze, publish exception 경계, schema↔render 지원 선언 검사, React 없는 horizontal rule 사용.
- **연속 검증**: 노트 접근성, 버전 업그레이드의 저장 JSON 무손실 migration 정책, 문서/테스트 잔재.
- **별도 보류**: Recovery Server의 운영 호스트 연결(P5) 및 Wagtail 에셋 계획. 지금 제품 범위를 확대하지 않는다.
- **실행 방침**: 테스트는 사용자 지시에 따라 모아서 진행한다. 새 테스트 파일·assertion만 추가하고, `pnpm verify:batch`, 별도 Python/Chromium 및 CI는 이번 변경 동안 실행하지 않는다. 이후 Work 일괄 실행 결과로만 수락한다.

## 수정 원칙

1. schema는 공통 wire node type을 선언하며, Lexical은 같은 type을 직렬화하고,
   renderer는 지원 type마다 명시적으로 구현한다. 지원 누락이 `PUBLICATION_STORAGE_ERROR`로
   가장되지 않도록 예외·진단 경계를 분리한다.
2. `TUFTE_NODE_TYPES`의 안정성/결정성, `TUFTE_NODES` 불변성, 전체 golden을 모두 유지한다.
3. React 없는 HorizontalRule은 Lexical 0.52.0의 정확한 API와 package dependency를 확인해 교체한다.
   구조를 바꾼 후 기존 `horizontalrule` JSON 및 브라우저 선택/명령을 확인한다.
4. 빈 sidenote label은 공식 Tufte CSS의 숫자 표시 및 note 이동 관계를 유지하면서
   제어 접근성을 보장해야 한다. 임의 glyph/visible text로 레이아웃을 바꾸지 않는다.
5. 저장 포맷의 `UNKNOWN_FIELD`·`LEXICAL_IMPORT_LOSSY` fail-closed 정책은 유지한다.
   lexical version upgrade 시 기존 golden/legacy 문서 저장·재열기·HTML 대응을
   확인하는 명시적 수락 절차로 관리한다.

## 증거·완료 기준

각 코드 수정은 관련 경로/테스트와 함께 후술한 체크리스트에서 추적한다.
체크 완료는 코드 작성이 아니라 테스트를 실제 실행해 성공한 뒤 한다.
메타데이터/문서 갱신도 검증을 마친 뒤 체크한다.
오류 등록은 `docs/ERROR_LOG.md`, 예방책은 `docs/ERROR_PREVENTION.md`에서
ID를 연결한다.

## 변경 체크리스트 (문서 끝 유지)

- [ ] CR01. Lexical registry의 `TUFTE_NODES` immutable 계약 복구, 기존 R02/golden 검사 및 회귀 추가 후 실행 통과.
- [ ] CR02. SQLite publish에서 preflight renderer/asset/DB 예외를 분류하고 안전한 diagnostics 반환; rollback/CAS/snapshot 보존 회귀 실행 통과.
- [ ] CR03. NODE_SCHEMA ↔ RENDER_PROFILE ↔ pure render switch의 type 지원 동기화 테스트 및 누락/미지원 진단 회귀 실행 통과.
- [ ] CR04. React 없는 HorizontalRuleNode로 전환; dependency/lockfile/번들 검토, HR 생성·저장·HTML·선택 회귀 실행 통과.
- [ ] CR05. Sidenote/marginnote 모바일 toggle의 키보드·접근 가능한 이름, 공식 CSS hierarchy, 화면/스크린리더 수락 범위 검증 완료.
- [ ] CR06. Lexical 0.52.0 기준 문서/노드 버전 golden, v1→v2 envelope과 손실 감지/unsupported-version 정책을 포함한 명시적 업그레이드 수락 절차 작성·회귀 통과.
- [ ] CR07. 구형 ADR/unused CSS/검사 잔재와 운영 외부 범위를 현재 코드와 일치시키고 오류 기록에 예방책 반영; 검증 완료.
- [ ] CR08. `pnpm install --frozen-lockfile`, build/typecheck/lint/unit/browser/packed/HTTP/Python 등 전체 일괄 검증의 통과·실패·skip 및 커밋 기록(명시적 CI 생략).
