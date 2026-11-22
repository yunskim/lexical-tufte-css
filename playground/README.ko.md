# Lexical 기반 Tufte CSS 편집기

Node.js 24와 pnpm 11을 사용합니다. 저장소 루트에서 실행합니다.

```sh
bash playground/start.sh
```

[로컬 편집기 열기](http://127.0.0.1:5191/)

첫 실행에서 고정된 Lexical 소스와 의존성, 공식 Tufte CSS 예제의 그림과 글꼴을 가져옵니다. Lexical 원본은 `playground/.cache/`에 저장하고, 이 저장소의 `playground/overlay/` 변경분을 적용합니다. 포트와 호스트를 지정할 수 있습니다.

```sh
bash playground/start.sh --help
bash playground/start.sh --port 5200
bash playground/start.sh --port 5200 --host 0.0.0.0 -- --open --force
bash playground/start.sh --port 5200 --allow-port-fallback
```

기본 호스트는 `127.0.0.1`, 기본 포트는 `5191`입니다. `TUFTE_PLAYGROUND_HOST`와 `TUFTE_PLAYGROUND_PORT`로 기본값을 바꿀 수 있습니다. 포트가 사용 중이면 기본적으로 종료합니다. `--allow-port-fallback`을 지정하면 다음 빈 포트를 사용합니다. `--` 뒤의 옵션은 Vite로 전달합니다.

편집기는 공식 Tufte CSS 예제로 시작합니다. 제목과 부제목을 본문에서 각각 편집할 수 있고, 블록 왼쪽의 `+` 버튼은 현재 블록 바로 아래에 삽입합니다. 우클릭 메뉴에는 문단, 그림, 주석, 인용문과 섹션에 해당하는 작업이 표시됩니다.

- [기준 Lexical Playground 소스](https://github.com/meta/lexical/tree/b2af316af8ab328a86ff27885f2ce94f18dce571/packages/lexical-playground)
- [공식 Tufte CSS 예제](https://edwardtufte.github.io/tufte-css/)
