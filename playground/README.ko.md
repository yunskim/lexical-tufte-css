# Lexical 기반 Tufte CSS 편집기

Node.js 24와 pnpm 11을 사용합니다. 저장소 루트에서 실행합니다.

```sh
bash playground/start.sh
```

[로컬 편집기 열기](http://127.0.0.1:5191/)

첫 실행에서 고정된 Lexical 소스와 의존성, 공식 Tufte CSS 예제의 그림과 글꼴을 가져옵니다. Lexical 원본은 `playground/.cache/`에 저장하고, 이 저장소의 `playground/overlay/` 변경분을 적용합니다. 다른 포트가 필요하면 `TUFTE_PLAYGROUND_PORT=5192 bash playground/start.sh`로 실행합니다.

편집기는 공식 Tufte CSS 예제로 시작합니다. 제목과 부제목을 본문에서 각각 편집할 수 있고, 블록 왼쪽의 `+` 버튼은 현재 블록 바로 아래에 삽입합니다. 우클릭 메뉴에는 문단, 그림, 주석, 인용문과 섹션에 해당하는 작업이 표시됩니다.

- [기준 Lexical Playground 소스](https://github.com/meta/lexical/tree/b2af316af8ab328a86ff27885f2ce94f18dce571/packages/lexical-playground)
- [공식 Tufte CSS 예제](https://edwardtufte.github.io/tufte-css/)
