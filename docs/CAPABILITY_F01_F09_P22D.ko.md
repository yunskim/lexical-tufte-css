# P2.2.d.1 F01–F09 저장·발행 지원 범위 대조

2026-10-31 시작. NODE_SCHEMA가 허용하는 값, editor 저장 지원, 순수 renderer 지원은 별도다. 아래는 소스 및 기존 fixture/회귀를 대조한 **첫 검토 범위**이며 모든 타입/속성 조합의 실행 완료가 아니다. 기능 ID는 PLAN과 UPSTREAM_DOM_PARITY_P22E를 따른다.

## 공통 필드

| 필드/대상 | 스키마 | editor 저장 | 발행 |
| --- | --- | --- | --- |
| type/version/children | 허용 타입·version1·부모/자식 검사 | strict bridge와 canonical 경계 검사 | schema 먼저 검사; unknown/type 오류는 html:null |
| direction/format: 일반 element | null/ltr/rtl 및 정렬 enum | ElementNode 저장; 노드별 native HTML 동등성은 별도 | attrs/withClass가 dir·정렬 class 출력 |
| direction/format: root | 동일 허용 | canonical 보존 회귀 추가 | 전용 wrapper가 없으므로 nondefault 진단·html:null; 기본 null/빈 문자열 허용 |
| indent |0..20 | 구조/노드별 저장 | 일반 nonzero 거부; listitem은 실제 목록 깊이와 일치할 때만 허용 |
| textFormat/textStyle | cache0..255/빈 style | cached typing state, 콘텐츠 서식과 별개 | textFormat 자체 HTML 요소를 생성하지 않음; 실제 TextNode format으로 서식 출력. 임의 CSS는 schema 거부 |

## 노드별 필드 대조

| canonical 타입 | 고유 필드 | editor 경계 | 순수 발행 / 잔여 검토 |
| --- | --- | --- | --- |
| root | 없음 | RootNode | 자식만 출력; 방향/정렬 미지원 진단 추가 |
| tufte-section | 없음 | SectionNode | section + 공통 attrs |
| paragraph | tufteClass | metadata가 있으면 TufteParagraph runtime alias | p.sans, 공통 attrs |
| heading | tag/id | metadata가 있으면 TufteHeading runtime alias | h2/h3 및 id, 공통 attrs |
| text | text/format/detail/mode/style | TextNode; 기본 typing state | text escape 및8종 bit 의미 태그. mode/style은 schema 제한, detail은 편집 상태 |
| linebreak | 없음 | LineBreakNode | br |
| tufte-span | kind | TufteSpanNode | sans/newthought/numeral/danger class, 공통 attrs |
| list | listType/tag/start | ListNode; kind/tag schema 일치 | ul/ol, ol.start. ul.start 비기본값은 발행 차단(신규 회귀 실행 대기) |
| listitem | value/checked | ListItemNode | li.value는 ol에서만 출력. checked는 schema 거부; ul.value 비기본값 발행 차단(신규 회귀 실행 대기) |
| tufte-definition-list | 없음 | DefinitionListNode | dl 및 공통 attrs |
| tufte-term | 없음 | DefinitionTermNode | dt 및 공통 attrs |
| tufte-definition | 없음 | DefinitionDescriptionNode | dd 및 공통 attrs |
| horizontalrule | 없음 | HorizontalRuleNode | hr; schema가 element 공통 속성을 허용하지 않음 |
| quote | cite | metadata가 있으면 TufteQuote runtime alias | blockquote/cite URL 및 공통 attrs |
| tufte-epigraph | 없음 | EpigraphNode | div.epigraph 및 공통 attrs |
| tufte-attribution | 없음 | AttributionNode | footer 및 공통 attrs |
| tufte-cite | 없음 | CiteNode | cite 및 공통 attrs |
| tufte-section-footer | 없음 | SectionFooterNode | footer 및 공통 attrs |

`packages/document/src/schema.ts`/`validate.ts`, `packages/lexical/src/blockSerialization.ts`/`TufteBlockNodes.ts`, `packages/render/src/profile.ts`/`index.ts`를 기준으로 했다. 관련 기존 증거는 document-bridge/heading-id/all-nodes/quotation/list 단위 테스트와 이전 실제 UI 보고서다. 모든 행을 새로 전수 실행했다고 간주하지 않는다.

## 이번 실행과 E135/M125

root presentation을 설정한 schema-valid 문서를 renderer가 성공으로 반환하고 속성을 버렸다. 새4개 회귀의 최초 실패로 재현했다. root.direction/root.format이 nondefault일 때 UNSUPPORTED_RENDER_PROPERTY와 정확한 `$.lexicalState.root.*` 위치, html:null을 반환하게 했다. 기본값 성공1개와 editor canonical 저장 보존1개를 추가했다. 저장 schema를 축소하거나 값을 지우지 않았다.

## NODE_SCHEMA 기반 F01–F09 필드 전수 목록 (정적 대조, 실행 전)

`packages/document/src/schema.ts`의 F01–F09 관련 타입 19개를 기준으로 **고유 필드 전부**를 아래와 같이 펼쳤다. 기존 노드별 표는 요약이고 이 표는 필드 누락 검토용이다. 타입/필드가 추가되면 동기화해야 한다.

| 타입 | 스키마 고유 필드 | 별도 검증해야 할 경계 |
| --- | --- | --- |
| root | 없음 | direction/format 비기본 거부 |
| tufte-section | 없음 | section 순서와 공통 속성 |
| paragraph | tufteClass | sans 값·미지원 값 거부 |
| heading | tag, id | h2/h3·id 검증 |
| text | text, format, detail, mode, style | 서식 bit·직렬화 캐시·style 제한 |
| linebreak | 없음 | br 및 부모 허용 |
| tufte-span | kind | sans/newthought/numeral/danger |
| list | listType, tag, start | ol/ul 조합, start 기본/비기본 |
| listitem | value, checked | ol.value, ul.value, checked 거부 |
| tufte-definition-list | 없음 | dt/dd 짝과 순서 |
| tufte-term | 없음 | phrasing 자식 |
| tufte-definition | 없음 | paragraph/list 자식 |
| horizontalrule | 없음 | 공통 element 속성 비허용 |
| quote | cite | URL·attribution·노트 자식 |
| tufte-epigraph | 없음 | quote 자식만 허용 |
| tufte-attribution | 없음 | footer/cite 자식 |
| tufte-cite | 없음 | 문헌 이름과 inline 자식 |
| tufte-section-footer | 없음 | footer/cite 자식 |
| link | url, target, rel, title | F03 링크·안전 URL·속성 보존 |
| host-link | reference | 호스트 참조 해석 실패/발행 차단 |

`link`와 `host-link`는 앞선 첫18타입 요약에서 빠져 있던 **F03 인라인 링크 타입**이다. 둘 다 공통 element 필드가 적용되는지, renderer에서 실제 출력되는지, 호스트 참조 미해결 때 진단하는지는 구현·fixture별로 확인해야 한다. 이 목록은 NODE_SCHEMA를 읽은 결과이며 **각 필드의 편집·발행 동작이 검증되었다는 뜻은 아니다.**

## 남은 체크리스트

- [x] ul.start, ul의 li.value 비기본값 발행 차단 구현 및 회귀 작성. ol.start/ol의 li.value 보존, 링크 URL/target/rel/title, direction/format/indent/textStyle/textFormat 회귀 작성. **신규 회귀는 미실행이며 통과로 간주하지 않는다.**\n- [ ] F01–F09의 나머지 타입별 공통 속성·정규화/거부 fixture 확장 및 실행 증거 확보.
- [x] F03 link/host-link의 NODE_SCHEMA 필드 목록과 발행 정책을 본 문서에 추가. host-link는 해석 전에는 href가 아닌 참조 메타데이터 span으로 출력하며, 실제 링크 해석은 호스트 책임.\n- [ ] F10–F19 미디어·표·code/embed 전체 필드 매트릭스 확장(후속 P2.3과 연계).
- [ ] NODE_SCHEMA에서 타입/필드가 늘면 매트릭스 누락을 검출하는 기계 검증 추가.
- [ ] P2.2.d.2 실제 editor/저장/재열기/발행 DOM 통합 매트릭스로 연결.

따라서 P2.2.d.1 및 상위 P2.2.d는 미완료다. root 수정의 최종 실행 수치는 PROGRESS와 verification/root-capability-20261031.json에 기록한다. CI 생략.
