# ADR 0003 — 현대식 iframe 임베드와 원본 Tufte CSS 계층의 공존

- 상태: **채택 — 코드·테스트 작성, 실행 검증 대기**
- 기준: `fixtures/tufte/upstream/index.html` 및 `tufte.css`의 Figures(6/9)
- 결정: 2026-10-22
- 적용 코드: `packages/render/src/index.ts`, `packages/lexical/src/EmbedNode.ts`, `packages/render/styles.css`

## 배경

고정된 Tufte CSS 공식 예제는 `figure.iframe-wrapper > iframe`을 사용하지만,
`youtube.com` 직접 URL, `frameborder="0"`, 접근성 제목 없음 및 느슨한 iframe
속성을 포함한다. 반면 이전 프로젝트 출력은 개인정보 보호 URL/제한된 sandbox,
`title`·지연 로딩을 적용했지만 `figure.tufte-embed > svg + iframe`으로
원본 CSS hierarchy와 달랐다.

사용자 결정: **현대적인 임베드 속성을 유지하고 공식 Tufte CSS의 계층을 유지**한다.
원본 HTML의 옛 속성·호스트를 단순 복제하여 통과시키는 방법은 허용하지 않는다.

## 채택 구조

```html
<figure class="iframe-wrapper">
  <iframe
    src="https://www.youtube-nocookie.com/embed/YslQ2625TR4"
    title="YouTube video: Tufte CSS example"
    loading="lazy"
    referrerpolicy="strict-origin-when-cross-origin"
    sandbox="allow-scripts allow-same-origin allow-presentation"
    width="960"
    height="540"
    allowfullscreen></iframe>
</figure>
```

- `figure` 또는 `div`의 `iframe-wrapper` 클래스, **직접 자식 iframe 하나**를
  보존하며 SVG, 임의 wrapper, `data-tufte-ratio`, inline style, frameborder를 출력하지 않는다.
- `width:'fullwidth'`는 `fullwidth iframe-wrapper` 클래스가 추가된다.
- 문서 모델의 `tufte-embed` 타입과 `provider/src/title/wrapper/width/aspectRatio`
  JSON은 유지한다. `isEmbedURL`의 HTTPS·제공자 호스트·동영상 경로
  allowlist와 query/hash/credential 거부는 변경하지 않는다.
- `title`, `loading='lazy'`, `referrerpolicy`, `sandbox`,
  `allowfullscreen`을 유지한다. CSP에서 iframe src를 별도로 허용해야 한다.
- 원본 `.iframe-wrapper`의 위치 지정 및 **16:9 padding-bottom**을 그대로 사용한다.
  임의의 저장 `aspectRatio`는 iframe의 `width/height` *속성*으로 보존하되
  실제 표시 비율은 CSS의 16:9이다. 이는 SVG 기반 가변 표시 비율과의 **의도된
  동작 차이**이며, 동적 비율 표시가 필수인 제품 확장은 별도 디자인/수락 조건으로 다룬다.

## 동일 콘텐츠 테스트 오라클의 예외 범위

`tests/upstream-same-content-figures-browser.mjs`는 공식 원본 HTML을 수정하지 않는다.

1. 일반 11개 블록의 태그·중첩·class·속성·텍스트·순서·rich marginnote와 이미지
   내용은 동일하게 검사한다. 주석 ID 네임스페이스 및 section/figure 사이
   서식 전용 공백만 기존 허용 계약을 적용한다.
2. **정확히 한** `figure.iframe-wrapper > iframe` 원본에서
   `frameborder`를 제거하고 개인정보 보호 `src` 및 현대식 전체 속성 집합을
   검증한다. 비교기에 무작정 iframe 속성을 버리는 정규화는 금지한다.
3. **정확히 한** `pre > code` 내부의 구형 설명용 iframe HTML 문자열을
   위 채택 코드와 같은 현대식 예제로 교체한다. 다른 pre/code와 본문 텍스트는
   변경·정규화하지 않는다.
4. 375/759/760/761/1024/1440px에서 공식 Tufte CSS가 실제
   `iframe-wrapper > iframe`에 적용되고 기존/현대화된 iframe wrapper 및
   iframe의 위치·크기가 허용오차 1px 이내인지 확인한다.
5. `packages/render/test/render.test.mjs`,
   `packages/lexical/test/embed-html.test.mjs`,
   `tests/publication-browser.mjs`에서 pure renderer/Lexical export/CSP 및
   iframe metadata 속성과 direct-child 계층을 재검증한다.

오라클의 나머지 DOM을 완화하지 않으며 iframe 현대화로 **9개 섹션 전체 동등성
검증이 완료되었다고 보지 않는다**. 다음 일괄 실행 후 성공/실패를 기록한다.
CI는 실행하지 않는다.
