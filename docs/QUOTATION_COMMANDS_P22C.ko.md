# P2.2.c 인용문·출처·epigraph 명령 계약

2026-10-31, 기준 `339a7b3`. P2.2.c.1의 **지원/거부 범위 설계**다. 아래 후속 명령은 아직 구현하지 않았으며 P2.2.c/P2.2.c.2 완료 증거가 아니다.

## 현재 구현

`packages/lexical/src/quotationCommands.ts`, `QuotationNodes.ts`, `SectionFooterNode.ts`, `blockSerialization.ts`와 `packages/document/src/schema.ts`, `packages/render/src/index.ts`를 대조했다. 예제 React UI에는 생성·출처 추가 버튼만 있다. 일반 텍스트 입력 가능 여부와 구조 편집 전용 명령 지원을 구분한다.

| 대상 | 기존 명령/동작 | 후속 구현 범위 |
| --- | --- | --- |
| F07 구분선 | 섹션 블록 뒤 삽입 | 선택한 구분선만 삭제, 앞뒤 블록 보존 |
| F07 섹션 출처 | section-footer 생성, cite 1개 추가 | cite 삭제, footer 전체 삭제; 텍스트 수정은 기존 입력 경로 검증 |
| F08 인용문 | quote 생성, attribution 1개 추가 | cite URL 설정/해제, attribution 삭제, quote 전체 삭제 |
| F08 인용 출처 | attribution 안에 텍스트와 cite 생성 | 저자·문헌 텍스트는 기존 입력 경로 검증; 출처 삭제는 자식 전체를 명시적으로 삭제 |
| F09 epigraph | quote 1개를 가진 epigraph 생성 | 같은 epigraph 내부 quote 추가·이동·삭제, epigraph 전체 삭제 |

`quote.cite`는 blockquote의 URL 속성이다. `tufte-attribution`은 footer, `tufte-cite`는 문헌 이름의 의미 요소다. 세 값을 서로 변환하지 않는다. URL 수정은 기존 문서 URL validator 정책을 재사용하며 빈 값은 속성 삭제로 정의한다. runtime의 metadata quote alias는 canonical 저장 경계를 사용한다.

공식 원본 대응은 `UPSTREAM_DOM_PARITY_P22E.ko.md`의 `div.epigraph > blockquote > p + footer > cite` 행과 고정 fixture의 epigraph 구조다. 현재 발행은 render/index.ts의 div.epigraph/blockquote/footer/cite를 따른다. 구분선·section footer는 공식 예제 등장 여부와 별개로 스키마의 확장 지원 범위를 검사한다. 오래된 대응표의 note wrapper 설명을 현재 구현의 근거로 사용하지 않는다.

## 구조 변경의 공통 계약

- 최상위 root의 section 안에서 collapsed RangeSelection으로 대상을 정한다. note 내부·범위 선택·composition·대상 없음·잘못된 부모/자식 구조는 `INVALID_QUOTATION_SELECTION` 진단과 무변경으로 거부한다. 기존 생성 명령의 현재 지원 범위를 이 신규 계약만으로 축소하지 않는다.
- epigraph 항목은 직접 자식 quote 하나와 그 안의 본문·출처·노트 전체다. 추가는 선택 항목 뒤, 이동은 인접 항목과 순서를 교환한다. 처음/끝을 넘는 이동은 진단·무변경이다. 항목 삭제 후 빈 epigraph를 남기지 않고 마지막 항목이면 wrapper도 삭제한다.
- attribution 삭제는 quote 본문을 보존한다. cite 삭제는 소속 footer/attribution의 나머지 텍스트를 보존한다. quote 삭제는 소속 epigraph가 비는 경우 wrapper까지 제거한다. footer/epigraph 전체 삭제는 명시적인 별도 동작이다. 문단으로 해제하거나 내용을 다른 섹션으로 옮기는 동작은 이번 범위에 넣지 않는다.
- 삭제 후 선택은 다음 형제 시작, 없으면 이전 형제 끝으로 복귀한다. section의 마지막 블록을 지우면 빈 paragraph 하나를 두어 편집 위치를 보장한다. 다른 section의 내용·선택을 임의로 변경하지 않는다.
- 모든 유효 구조 변경은 한 Undo/Redo 단위다. 무효 명령은 내용·선택·이력을 바꾸지 않는다. 이동은 기존 노드 identity·노트 ID·서식·링크·방향·자식 순서를 유지한다. URL 등 미지원 속성을 조용히 지우지 않는다.
- 생성/수정/삭제 버튼은 명령과 동일한 지원 경계를 적용한다. 일반 Backspace/Delete의 모든 구조 동작을 이 계약으로 지원했다고 주장하지 않는다.

## 후속 체크리스트

- [ ] C1.a URL 설정/해제 및 attribution/cite/구분선/footer/quote/epigraph 삭제 명령과 public export, 예제 UI 연결.
- [ ] C1.b 같은 epigraph 내부 항목 추가/인접 이동/삭제, 첫·중간·끝·마지막 항목 및 잘못된 구조 거부.
- [ ] C2.a 각 명령의 내용·선택·노트 ID 보존/거부 원자성 및 한 Undo/Redo.
- [ ] C2.b canonical JSON 저장·재열기와 순수 renderer의 blockquote/URL/footer/cite/epigraph 자식 순서·개수 검사.
- [ ] C2.c 실제 1440/375px UI에서 키보드 접근·포커스 복귀·텍스트 수정과 다른 섹션 불변성 검사. 실제 OS IME·스크린리더 검증은 P6 증거와 연결한다.

## 이번 검증

frozen install과 workspace build 통과. `node --test packages/lexical/test/quotation-commands.test.mjs`: 기존 13개와 신규 18개, 총 31개 통과(실패/skip 0). 신규 검사는 기존 6개 명령/payload의 범위 선택·composition·note 내부 거부에 대한 전체 JSON 및 선택 보존, 진단 1회를 검사한다. append 명령의 range/composition fixture에는 실제 quote/footer 대상을 만든다. note fixture는 스키마가 허용하는 별도 paragraph 안에 둔다.

이 결과는 기존 생성 명령의 guard 증거다. 신규 수정·삭제 명령, 실제 OS IME, 브라우저 접근성, 전체 회귀는 이번에 검증하지 않았다. CI 생략. E132/M122의 경계 공유·canonical 타입 원칙과 M117–M121의 실제 저장/발행·검증 범위를 시작/종료에 점검했다. 다음은 C1.a 구현이다.
