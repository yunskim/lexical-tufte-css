# iframe 레이아웃 저장·발행 계약

`tufte-embed`는 두 레이아웃을 지원한다. 기존 문서의 출력은 유지하고, 공식 Tufte CSS 예제의 레이아웃은 선택 필드 `layout: 'tufte'`로 명시한다.

| 저장 값 | 출력 | 배치 |
| --- | --- | --- |
| layout 생략 | figure/div.tufte-embed, SVG 비율 공간, iframe | aspectRatio 0.1~10의 실제 반응형 비율 |
| layout: 'tufte' | figure/div.iframe-wrapper > iframe 하나 | 원본 CSS의 padding-bottom:56.25%, padding-top:25px, height:0 |

Tufte 레이아웃은 원본 padding 규칙을 그대로 사용한다. 이 규칙의 퍼센트 기준은 부모 너비이므로 표시되는 iframe의 실측 가로/세로 비율이 항상16:9인 것은 아니다. 임의 비율 레이아웃과 혼동하지 않도록 `layout:'tufte'`에는 `aspectRatio:16/9`만 허용하고 충돌값을 거부한다. wrapper의 figure/div 및 body/fullwidth 선택은 유지한다.

`$createEmbedNode(provider, src, title, wrapper, width, aspectRatio, 'tufte')`로 생성한다. 마지막 인자를 생략하면 기존 레이아웃이다. 선택 필드는 JSON import/export·clone·v1/v2 bridge에서 보존된다. node/schema 버전은 개발 중인 기존1을 유지하며, 이 필드를 모르는 이전 소비자는 strict validator에서 거부하므로 관련 document/lexical/render 패키지를 함께 갱신한다. 기존 golden과 layout 없는 저장 파일은 재작성하지 않는다.

두 경로 모두 provider URL 허용 목록, 필수 title, lazy loading, referrerpolicy, sandbox, allowfullscreen을 적용한다. 원본의 frameborder=0은 scoped 외부 CSS border:0으로 대체한다. 인라인 스타일이나 스크립트는 필요하지 않다.

검증은 새 레이아웃의 figure/div 직계 자식 구조, 잘못된 mode/비율 거부, 저장/clone/재열기 보존, 실제 CSP 아래 두 wrapper·5개 화면 폭, 기존5개 임의 비율·5개 화면 폭을 포함한다. 공식 Figures와9섹션 전체 DOM/시각 비교는 원본 레이아웃을 명시해 실행한다. GUI의 provider/비율 편집 도구 완성과 실제 외부 동영상 재생 호환성은 별도 게이트다.
