# R13 — 라이선스 유지 및 한글 폰트 서브셋 검증

## 배포·재사용 정책

사용자가 생성한 저장소의 기존 GPL-3.0-only 설정을 유지한다(PLAN의 저장소 기준). 라이선스를 변경하거나 linking 예외·이중 라이선스를 추가하지 않는다. 자체 코드의 SPDX/루트 LICENSE/각 패키지 메타데이터를 일치시킨다.

기여자는 저작권을 유지하고 GPL-3.0-only로 기여한다. 별도 CLA/저작권 양도는 요구하지 않으며, 새로운 외부 기여에 DCO 1.1 sign-off를 권장한다. 과거 커밋을 소급 수정하지 않는다. [CONTRIBUTING](../CONTRIBUTING.md)에 정책을 공개했다.

사용자 글·사진과 라이브러리 코드는 구분한다. 생성물이 프로그램 코드를 포함하거나 CSS/폰트를 재배포한다면 해당 자료의 고지를 보존한다. 모든 상용 결합이 가능하다거나 모든 출력물이 GPL이라고 단정하지 않는다. 정책 근거는 [GNU GPLv3](https://www.gnu.org/licenses/gpl-3.0.html), [GNU output FAQ](https://www.gnu.org/licenses/gpl-faq.html#GPLOutput), [DCO](https://developercertificate.org/)다.

`prepack`은 자체 LICENSE와 THIRD_PARTY_NOTICES 및 licenses/를 복사한다. `pnpm package:check`는 document/lexical/render/blog 4개 로컬 tarball을 만들고 고지·JS import·fresh declaration·정본 왕복·renderer/blog API·SQL export를 검사한다. npm 발행은 하지 않았고 private 상태를 유지한다. 패키지 P7 품질 완료를 뜻하지 않는다.

## 원본 폰트와 수정본 이름

한국어 원본은 본명조 Source Han Serif KR Regular 2.003과 본고딕 Source Han Sans KR Regular 2.005다. Adobe 공식 저장소의 고정 commit과 SHA-256은 [manifest](../fixtures/fonts/proof/manifest.json)에 있다. 원본 약 7.67MB/4.63MB는 재생성 입력이며 저장소에 추가하지 않았다.

두 원본의 OFL-1.1은 'Source'를 Reserved Font Name으로 지정한다. 검증용 수정본은 primary family/PostScript 이름을 **Lexical Tufte Han Serif Proof / Lexical Tufte Han Sans Proof**로 바꾼다. 디자인 출처가 본명조/본고딕인 점과 원본 저작권·OFL을 보존한다. 폰트를 프로젝트 GPL로 재라이선스하지 않는다. [OFL 명명 기준](https://openfontlicense.org/ofl-reserved-font-names), [webfont 기준](https://openfontlicense.org/webfonts-and-reserved-font-names), 각 원본 고지를 따른다.

## 서브셋 전략 및 실제 결과

- 대표 한글/한자/문장부호/자모 4그룹을 family마다 분리해 WOFF2 8개, 총 **45,172 bytes**를 생성했다. unicode-range는 family 안에서 겹치지 않고 ASCII/Latin은 제외한다. 실제 사용 문자에 필요한 조각만 요청한다.
- fontTools 4.61.1/Brotli 1.2.0 및 원본 해시를 고정했다. 재생성한 WOFF2/CSS/manifest가 byte 단위로 일치했다. 원본 대비 cmap·hmtx와 primary font 이름을 검사했다.
- 실제 Chromium의 custom font/PostScript name/glyphCount를 확인했다. 원본 OTF와 같은 unicode-range·Latin/fallback·CSS를 적용해 8개 문자 샘플 및 6개 노트/캡션/표 위치의 폭·높이가 일치했다. reference-metrics.json은 명시적 원본 비교에서만 갱신한다.
- Latin-only 페이지는 WOFF2 요청 0개, 혼합 페이지는 8개 요청. `font-src 'self'`, 외부 CSS 및 script 금지 CSP에서 통과했다.
- 150ms 전달 지연에서 fallback glyph가 먼저 보이고 전달 후 custom glyph로 바뀌었다. 이 환경의 예시 한글 폭은 기본 fallback 518.48→828px, 한국어 폰트를 제공한 별도 환경 792→828px로 바뀌었다. 따라서 swap을 쓴다는 이유로 layout shift가 없다고 주장하지 않는다.
- 기본 실행 환경에는 한국어 시스템 fallback이 없다(E064). 가시성과 한글 가독성을 구분한다. 전역 설정을 바꾸지 않은 별도 fontconfig 환경에서는 webfont 차단 시 실제 SourceHanSansKR-Regular 시스템 glyph 사용을 확인했다. 모든 OS의 fallback 성공을 의미하지 않는다.

이 자료는 **전략 검증 fixture**다. 전체 한글/옛한글/한자 커버리지, 다른 굵기/italic, 제품 편집·미리보기·발행 연결, ET Book 실제 자산, 좁은 화면·실제 OS fallback 및 장문 로딩/CLS 예산은 P4/P6에 남는다. 전체 폰트를 이 45KB로 제공한다고 주장하지 않는다.

## 재현

1. `scripts/font-proof-requirements.txt`의 Python 의존성을 설치하고 manifest의 고정 URL에서 원본 OTF 두 파일을 내려받는다.
2. `python scripts/build-font-proof.py --source-dir /path/to/originals`로 생성한다. 원본 SHA-256 불일치는 중단한다.
3. `FONT_SOURCE_DIR=/path/to/originals UPDATE_FONT_METRICS=1 node tests/font-proof-browser.mjs`로 원본 직접 비교 후 metric fixture를 명시적으로 갱신한다.
4. 일반 검증: `pnpm check`, `pnpm test:browser`, `pnpm package:check`. 원본 직접 비교 및 별도 한국어 fontconfig 실패 fallback 검증은 추가 실행이다. 일반 테스트는 원본 다운로드나 Python 도구가 필요 없다.

## 완료 범위

- [x] 기존 GPL-3.0-only 유지 및 콘텐츠/외부 재사용 정책 공개
- [x] 기여자 저작권·DCO/CLA 방침 명시
- [x] 현재 4개 패키지 SPDX/고지 및 실제 tarball 소비 검사
- [x] 공식 폰트 고지·수정본 이름·고정 원본 해시 확인
- [x] 대표 WOFF2 분할·unicode-range·원본 메트릭·요청량/CSP/지연/차단 검증
- [ ] P4/P6: 전체 생산 폰트 커버리지·굵기·제품 연결·실제 OS fallback·CLS/접근성

2026-10-16 결과: check201/201(실패/skip0), browser9개, package4개 tarball 소비/타입, frozen offline install, diff check 통과. 원본 직접 비교·150ms 지연/차단·별도 한국어 fontconfig 및 재생성 byte 비교도 통과했다. CI는 생략했다.
