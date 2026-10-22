# 문서 정본 v1 — 공유 계약

P2.1 구현. `@lexical-tufte/document`은 runtime dependency 없이 타입, 고정 노드 registry, validator를 제공한다. 전체 노드의 편집/HTML 변환 구현은 P2.2–P2.4, migration과 더 넓은 malformed fixture는 P2.5에서 진행한다. **문서 구조 지원과 렌더 지원은 다르다.** `@lexical-tufte/render`는 현재 `p1-v1` profile만 출력하며 나머지는 발행을 차단한다.

## 정본과 운영 메타데이터

```ts
type TufteDocument = {
  schemaVersion: 1;
  id: string;
  locale: string;
  title: string;
  titleId?: string; // optional stable HTML h1 anchor
  subtitle?: string;
  lexicalState: {root: RootNode};
  assets: AssetRef[];
};
type AssetRef = {
  id: string; src: string; mimeType: string; alt?: string;
  width?: number; height?: number; byteLength?: number; sha256?: string;
};
type PostRecord = {document: TufteDocument; metadata: PostMetadata};
type PostMetadata = {
  slug: string; summary: string; tags: string[]; authors: string[];
  status: 'draft' | 'published' | 'archived';
  createdAt: string; updatedAt: string; publishedAt?: string; revision: number;
};
```

ID는 영숫자로 시작하는 영숫자/밑줄/하이픈 1–128자다. `titleId`는 선택적 `h1` 앵커로 같은 규칙을 따르며, 다른 heading ID와 충돌하면 진단한다. 값이 없을 때에는 제목의 ID를 생성하지 않는다. title은 공백만 아닌 최대 1000자, subtitle은 최대 2000자, locale은 유효한 BCP 47 문자열(최대64자)이다. 입력을 정규화·변경하거나 알 수 없는 필드를 삭제하지 않는다.

slug는 NFC 한글 등 유니코드 문자/숫자를 하이픈으로 구분하고 최대160자다. 경로 구분자·점 경로는 허용하지 않는다. summary는 최대2000자, tags는 중복 없는 NFC 문자열 0–50개(각64자), authors는 1–20개(각200자)다. revision은 1 이상의 safe integer다. slug 중복/저장 충돌은 P5의 저장소 책임이다.

날짜는 유효한 달력 날짜와 timezone이 있는 `YYYY-MM-DDTHH:mm:ss[.SSS]Z` 또는 `±HH:mm` 형식이다. 최대 소수점3자리, offset은 ±14:00 이내, leap second는 미지원이다. Date.parse의 잘못된 날짜 자동 보정을 허용하지 않는다. createdAt≤updatedAt, published일 때 publishedAt 필수 및 createdAt≤publishedAt≤updatedAt을 검사한다. draft에는 publishedAt이 없고 archived에는 과거 발행일을 보존할 수 있다. 상태 전이·immutable 발행 snapshot·revision 비교 저장은 P5에 남는다.

자산 ID는 중복 불가, MIME은 image/* 메타데이터다. width/height/byteLength는 양의 safe integer, sha256은 소문자16진64자리다. 이미지의 선택적 assetId는 assets 목록에 존재해야 하고 src 및 양쪽에 명시된 크기가 일치해야 한다. alt는 문맥별 대체 텍스트이므로 자산의 기본 alt와 달라도 된다. 외부 src만 있는 이미지는 허용한다. 미사용 자산도 보존하며 삭제 보호·실제 MIME/파일 크기/checksum 검증·immutable URL은 P5 대상이다.

## 노드 registry

모든 노드는 type과 version:1을 갖는다. element는 children과 선택적 direction/format/indent/textFormat/textStyle을 가진다. root는 section만, section은 아래 block을 포함한다. 속성의 실행 정본은 `packages/document/src/schema.ts`, `types.ts`, `validate.ts`다. registry는 수정 불가 객체로 export한다. 노드 추가 시 타입·registry·validator·소비자 구현·fixture를 함께 갱신한다.

| 노드 | 자식/핵심 계약 |
| --- | --- |
| root / tufte-section | section / block(문단·h2/h3·목록·인용·그림·표·코드·embed·fullwidth·footer) |
| paragraph / heading | phrasing / note 없는 phrasing; heading.tag=h2/h3 |
| text / linebreak | text+Lexical format flags / 자식 없음 |
| link | text/br/image/span; url, rel?, target?, title?; span을 통한 간접 중첩 링크도 금지 |
| tufte-span | note 없는 phrasing; kind=sans/newthought/numeral/danger |
| tufte-note | note 없는 phrasing; noteId 문서 내 유일, kind=sidenote/marginnote |
| list / listitem | listitem / phrasing 또는 하위 list; bullet/number와 ul/ol 일치, start/value≥1 |
| tufte-definition-list | 1개 이상 term 그룹 뒤 1개 이상 definition 그룹, 반복 가능 |
| tufte-term / tufte-definition | note 없는 phrasing / paragraph 또는 list |
| horizontalrule / tufte-section-footer | 자식 없음 / note 없는 phrasing 및 cite |
| quote / tufte-epigraph | phrasing·paragraph 뒤 선택적 attribution 1개 / quote 묶음 |
| tufte-attribution / tufte-cite | note 없는 phrasing 및 cite / note 없는 phrasing |
| tufte-inline-image | src, alt 필수; assetId/width/height 선택 |
| tufte-imagequilt | 완성된 단일 이미지, src/alt/width/height 필수; 조합 제작 도구 아님 |
| tufte-figure | 첫 이미지 또는 ImageQuilt 1개, caption 최대1개, 직접 note는 marginnote만; width=body/fullwidth |
| tufte-caption / tufte-fullwidth | note 없는 phrasing / fullwidth 자체·section footer를 제외한 block |
| tufte-table-layout | 정확히 table 1개; layout=body/fullwidth/scroll |
| table / tablerow / tablecell | 동일 셀 수의 행 / cell / paragraph; headerState=0–3 |
| tufte-code | text/tab/br/code-highlight; width=body/fullwidth, language? |
| tab / code-highlight | text는 단일 tab / highlightType은 null 또는 제한된 token 이름 |
| tufte-embed | provider/src/title/wrapper/width/aspectRatio; 자식 없음 |

phrasing은 text/br/link/image/span/note이며 note 안에서 다시 note를 포함할 수 없다. span/link를 통한 간접 중첩도 검사한다. root/section/note/구조용 그룹/표는 비어 있을 수 없다. paragraph/heading/link/caption/attribution/cite/footer/code/listitem은 비어 있을 수 있다.

공식 Lexical HeadingNode/QuoteNode/ListNode/ListItemNode가 실제 생성한 JSON을 통합 테스트한다. ListItem은 paragraph를 추가하면 공식 append가 평탄화하므로 phrasing을 직접 보존한다. checklist는 Tufte 범위 밖으로 checked가 설정되면 거부한다. custom 노드의 편집기 등록은 후속 작업이다. tufte-code는 계획된 커스텀 계약이며 공식 CodeNode를 자동 변환하지 않는다.

공통 element: direction=null/ltr/rtl, alignment=기본/left/center/right/justify/start/end, indent=0–20, cached textFormat=0–255, textStyle은 빈 문자열만 허용한다. text는 format=0–255, 동시에 sub/sup는 금지, mode=normal, detail=0/2, style은 빈 문자열이다. 임의 HTML/CSS는 없다.

표는 명시적 양의 colWidths/행 높이/셀 폭, rowStriping, frozen counts, top/middle/bottom을 구조로 보존할 수 있다. colWidths는 셀 수와 일치해야 한다. 셀 병합과 임의 배경색은 v1에서 진단하며 거부한다. 출력 구현이 없는 속성은 렌더러가 별도로 차단한다.

embed는 HTTPS `www.youtube-nocookie.com/embed/{11자리ID}` 또는 `player.vimeo.com/video/{숫자ID}`만 허용한다. query/hash/port/credentials를 허용하지 않고 접근 가능한 title을 요구한다. wrapper는 figure/div, width는 body/fullwidth, aspectRatio는 0.1–10이다. provider 확장은 명시적 계약 변경과 fixture가 필요하다.

## API와 진단

```ts
parseDocument(json: string): ValidationResult
validateDocument(input: unknown): ValidationResult
validateMetadata(input: unknown): Result<PostMetadata>
validatePostRecord(input: unknown): Result<PostRecord>
```

성공은 ok:true와 document 또는 value 및 빈 diagnostics다. 실패는 ok:false와 `{code,path,message}[]`다. PostRecord의 경로는 `$.document...` / `$.metadata...`로 연결된다. JSON parse 실패를 HTML import로 재해석하지 않는다. 입력을 수정하지 않으며 plain data object만 허용한다. 노드 accessor는 실행하지 않고 거부한다. Proxy 같은 실행 가능한 객체는 API 입력 계약에 포함하지 않는다.

한도: JSON 5백만 문자, node 1만, tree 깊이64, text 총2백만 문자, 자산1000개, 문서 진단100개. 순환/공유 node object를 거부한다. 이는 방어 한도이며 성능 예산은 P6에서 측정한다.

링크는 http(s)/mailto/tel/sms, 이미지는 http(s), /·./·../ 상대 주소를 허용한다. 링크는 #도 허용한다. protocol-relative, 제어문자/공백/역슬래시, credentials, 4096자 초과 URL과 javascript/data scheme을 거부한다. 원격 콘텐츠의 신뢰성을 검사하지 않는다.

## 렌더 profile

`renderArticle(input, {idPrefix?})`는 먼저 공유 validateDocument, 다음 현재 출력 capability를 검사한다. 알 수 없는 구조는 schema 진단, 구조는 유효하지만 출력 구현이 없으면 `UNSUPPORTED_RENDER_NODE` / `UNSUPPORTED_RENDER_PROPERTY`와 `html:null`이다. 공유 validator 통과를 발행 허가로 사용하지 않는다.

현재 p1-v1은 기존 paragraph/note/link/image/figure/caption/section/table 조합만 지원한다. 새 노드, managed/sized image, figure 직접 note, indent, 명시적 표 크기/striping/frozen/alignment를 출력하지 않는다. 새 지원은 P2.2/P2.3에서 구현과 차등 검증 후 profile을 갱신한다.

출력은 article+h1+선택적 subtitle+section이다. `titleId`가 있으면 `h1 id`로 출력하며, 호스트 namespace로 생성되는 article/note ID와 충돌하면 발행을 거부한다. body/fullwidth table-layout은 table로 unwrap하고 scroll만 table-wrapper를 유지한다. label/input/payload 인접성을 유지한다. ID는 `{prefix}-note-{noteId}` 및 `{prefix}-article`, 기본 prefix는 문서 ID다. 같은 문서 반복 표시는 호출자가 고유 prefix를 제공한다. article별 CSS counter reset, text/attribute escape, _blank noopener/noreferrer, script/편집 속성 미포함을 유지한다. CSS/폰트는 호스트가 제공하며 한글 본명조/본고딕 binary는 P4에 남는다.
