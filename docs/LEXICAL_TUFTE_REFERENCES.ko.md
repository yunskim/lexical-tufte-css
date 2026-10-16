# Lexical + Tufte CSS 선행 사례 조사 (2026-10-16)

## 결론

GitHub 및 공개 웹에서 Lexical과 원본 Tufte CSS를 결합해 전체 sidenote/figure/epigraph 편집과 JSON 무손실 왕복을 제공하는 직접 선행 구현은 이번 조사에서 확인하지 못했다. **부재의 증명이 아니며**, 검색 범위에서 미발견이라는 뜻이다.

## 확인한 참고 자료

- [edwardtufte/tufte-css](https://github.com/edwardtufte/tufte-css): CSS/HTML 원본, JS 편집기 통합은 프로젝트 범위 밖. DOM selector, note label/input/span, responsive fixture의 기준.
- [jez/tufte-pandoc-css](https://github.com/jez/tufte-pandoc-css): 원본 문서→Tufte HTML 변환 사례. 렌더링 계층 분리 참고.
- [robertchase/txt2tufte](https://github.com/robertchase/txt2tufte): 자체 문서 포맷→Tufte HTML 컴파일러. 입력과 발행 HTML을 분리하는 접근 참고.
- [eobrain/classless-tufte-css](https://github.com/eobrain/classless-tufte-css): semantic HTML과 selector 의존성 비교 참고. 원본 CSS의 완전 대체로 채택하지 않음.
- [sakib412/lexical-react-rte](https://github.com/sakib412/lexical-react-rte): Lexical 기반 React 편집 UI, JSON/HTML/Markdown API. Tufte 기능 자체의 근거는 아님.

## 설계 반영

1. 원본 Tufte CSS 버전을 기준으로 유지하고 발행 DOM은 renderer가 책임진다.
2. Lexical 편집 DOM과 공개 HTML을 별도로 다룬다. 특히 note와 table은 DOM 모양이 다르다.
3. 각 기능은 문서 validator, editor import/export, HTML, 반응형 fixture를 각각 검증한다.
4. 타 구현의 CSS 변형이나 자체 문서 문법을 무검증으로 채택하지 않는다.
5. P3 편집 UI를 구성할 때 lexical-react-rte의 명령/툴바 API를 참고하되 버전 호환성과 라이선스를 먼저 확인한다.
