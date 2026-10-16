# R10 — 밑줄·취소선·강조 표시 계약 (v1)

## 범위와 의미

Lexical 텍스트의 format bitmask 중 underline(8), strikethrough(4), highlight(128)를 일반 본문 및 노트 등 text 노드가 허용되는 위치에서 보존한다. 서로 조합할 수 있으며, JSON의 bitmask는 정본이다. 단, 다른 노드 구조나 스타일 문자열을 통해 같은 의미를 추측해 복구하지 않는다.

| Lexical format | 발행 HTML | 의미 |
| --- | --- | --- |
| underline (8) | `<u>` | 시각적 밑줄. 링크나 인용의 의미를 자동 부여하지 않음 |
| strikethrough (4) | `<s>` | 더 이상 정확하지 않거나 관련 없는 표현. 편집 이력의 삭제를 뜻하지 않음 |
| highlight (128) | `<mark>` | 문맥상 강조/표시. 단순 굵은 글씨와 구별 |

이 세 기능은 Tufte CSS의 고유 컴포넌트가 아니라 표준 HTML 의미를 활용하는 **편집 확장**이다. 따라서 Tufte 원본 CSS와 동일한 시각적 결과를 보장하지 않는다. 기본 브라우저 스타일을 사용하고, 향후 테마별 색상·대비 검증 후 scoped CSS를 선택적으로 추가한다.

## 변환 및 편집 규칙

- 각 비트는 독립적으로 유지하고 함께 적용할 수 있다. 발행 직렬화의 중첩 순서는 현재 구현의 정해진 비트 순서에 따른다. HTML 중첩 순서를 JSON 정본의 의미로 삼지 않는다.
- 링크와 밑줄은 별개다. 링크를 밑줄로 추론하거나 밑줄을 링크로 변환하지 않는다.
- 취소선은 삭제 추적 기능이 아니다. 편집 이력·revision과 연결하지 않는다.
- mark는 배경색 등 임의의 인라인 CSS를 허용하는 통로가 아니다. 접근성 대비와 다크 모드 검증은 별도 품질 단계에서 수행한다.
- 미지원 format 비트 및 임의 style 문자열은 조용히 무시하지 않고 기존 validator/render profile 정책으로 진단한다.
- 선택 영역 토글, 복사/붙여넣기, undo/redo, 한국어 IME 중 포맷 유지 여부는 실제 편집기 회귀 테스트가 필요하다.

## 검증

`packages/render/test/render.test.mjs`의 각 비트/조합 의미 태그 검사를 실행했다. 실제 React 툴바에 밑줄·취소선·마크 버튼과 결합 decoration class를 연결했다. `tests/text-format-browser.mjs`가 본문·굵은 주석·링크에서 각 비트/조합/토글 해제/undo·redo/내부 caret 수정/저장·재열기 및 정본 renderer의 의미 태그·URL·주석 소속을 확인한다. 실제 clipboard로 본문의 조합 포맷을 여백 주석에 붙여넣는 경로도 검사한다.

포맷 토글과 링크 내부 수정은 URL을 유지한다. 링크 전체 텍스트 선택 후 새 텍스트로 교체하면 현재 Lexical 기본 동작이 링크 컨테이너를 제거할 수 있다(E057). 이를 포맷 토글의 부작용이나 내부 수정과 동일하게 취급하지 않는다. 전체 링크 교체 UX는 P2 입력 정책에서 다룬다.

밑줄+취소선은 `.text-underline-strike`로 두 장식을 함께 표시한다. 편집기 마크는 light/dark 색상을 제공하지만 전체 접근성 대비·OS 실제 IME·다른 브라우저 검증은 P6에 남는다. 현재 검증은 Chromium의 실제 입력/clipboard 및 기존 합성 composition 회귀 범위다. CI는 생략한다.


전체 주석 payload 붙여넣기는 기존 noteId/kind를 유지한 채 자식만 교체한다. 새 자식을 먼저 추가하고 이전 자식을 제거해 canBeEmpty=false 컨테이너와 선택을 보존한다(E058/E059, M051/M052). 양방향 선택 단위 검사와 실제 clipboard 검사를 실행한다.

2026-10-16 결과: `pnpm check` 189/189(document47·lexical114·render28), 실패/skip0. `pnpm test:browser` 8개 실행 파일 및 대상 clipboard 별도 실행 통과. diff check 통과. CI 생략.
