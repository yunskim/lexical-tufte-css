# 문서 정본 v1 계약 — P1 profile

P1.5에서 확정한 경계와 실행 가능한 최소 validator다. 전체 노드 schema/metadata 구현은 P2.1, HTML import와 migration은 P2.4/P2.5에 남아 있다. 현재 렌더 지원 목록의 식별자는 `p1-v1`이다. envelope 버전과 개별 node version을 별도로 검사하며 지원하지 않는 버전은 자동 업그레이드하지 않는다.

```ts
type TufteDocument = {
  schemaVersion: 1;
  id: string;
  locale: string;
  title: string;
  subtitle?: string;
  lexicalState: {root: JsonNode};
  assets: {id: string; src: string; mimeType: string; alt?: string}[];
};
```

ID는 영숫자로 시작하는 영숫자/밑줄/하이픈 1–128자다. title은 공백만 아닌 1–1000자, subtitle은 최대 2000자, locale은 비어 있지 않은 최대 64자다. locale 정규화는 P2.1에서 확장한다. assets의 ID는 문서 안에서 중복될 수 없고 MIME은 image/* 메타데이터다. 실제 파일 형식 검증·자산 참조 무결성은 P2/P5에서 구현한다. 현재 image 노드는 src/alt를 직접 저장한다.

블로그 slug/status/createdAt/updatedAt/publishedAt/revision 및 draft/published snapshot은 본문 envelope와 별도 운영 metadata로 관리한다. P2.1에서 타입을 확정하고 P5에서 저장/발행 정책을 구현한다. 렌더러가 발행 상태나 접근 권한을 결정하지 않는다.

## 노드와 자식 관계

모든 노드는 type/version:1을 갖는다. element는 children을 갖는다. 알 수 없는 노드/필드와 지원하지 않는 속성값은 경로가 있는 진단으로 거부한다.

| 부모 | 허용 자식 | 추가 속성 |
| --- | --- | --- |
| root | tufte-section | Lexical element 기본 필드 |
| tufte-section | paragraph, tufte-figure, tufte-table-layout | 기본 필드 |
| paragraph | text, linebreak, link, tufte-inline-image, tufte-note | 기본 필드 |
| tufte-note | text, linebreak, link, tufte-inline-image | noteId, kind: sidenote/marginnote |
| link | text, linebreak, tufte-inline-image | url, rel?, target?, title? |
| tufte-figure | 첫 image와 선택적 caption 1개 | width: body/fullwidth |
| tufte-caption | text, linebreak, link, tufte-inline-image | 기본 필드 |
| tufte-table-layout | 정확히 table 1개 | layout: body/fullwidth/scroll |
| table | tablerow | 기본 table 속성만 |
| tablerow | tablecell | 기본 row 속성만 |
| tablecell | paragraph | headerState: 0–3, colspan/rowspan=1 |
| text / linebreak / tufte-inline-image | 없음 | text/format 등 / 없음 / src, alt |

element direction은 null/ltr/rtl, alignment는 기본 또는 left/center/right/justify/start/end, indent는 0, textStyle은 빈 문자열만 지원한다. cached textFormat은 0–255다. unwrapped body/fullwidth table-layout wrapper에는 기본 direction/alignment만 허용한다. text format은 Lexical의 0–255 bitmask(강조·기울임·취소선·밑줄·코드·아래/위첨자·highlight), mode=normal, style은 빈 문자열, detail은 0/2를 지원한다. 속성 목록과 세부 제한의 실행 정본은 packages/render/src/document.ts다.

표의 셀 병합, 배경색, 명시적 크기/verticalAlign, striping, frozen column/row는 현재 거부한다. 빈 paragraph/caption/link는 허용하고 root/section/note/table/row/cell은 비어 있을 수 없다. 이 제한을 조용히 제거하는 대신 P2 노드별 지원을 확장한다.

## API와 안전한 출력

```ts
parseDocument(json: string): ValidationResult
validateDocument(input: unknown): ValidationResult
renderArticle(input: unknown, options?: {idPrefix?: string}): RenderResult
```

성공 결과는 ok:true, 검증은 document, 렌더는 html을 포함한다. 실패 결과는 ok:false와 `{code,path,message}[]`이고 render의 html은 null이다. 입력은 변경하지 않는다. DOM 전역이 없어도 실행된다. parse는 최대 5백만 문자, tree는 깊이 64/노드 1만/본문 text 2백만 문자, 진단 100개까지다. 순환/공유 객체 참조는 거부한다. 이 숫자는 prototype 방어 한도이며 성능 예산 측정은 P6 대상이다.

문자열은 HTML text/attribute 문맥에서 escape한다. 링크는 http(s)/mailto/tel/sms, 이미지는 http(s), 안전한 /·./·../ 상대 주소를 허용한다. 링크는 # fragment도 허용한다. protocol-relative, 제어문자/공백/역슬래시, javascript/data scheme은 거부한다. 외부 _blank에는 noopener/noreferrer를 추가한다. 임의 CSS/HTML은 허용하지 않는다. URL의 실제 콘텐츠나 원격 리소스 신뢰성을 검사하는 API는 아니다.

출력은 article + h1 + 선택적 subtitle + section이다. body/fullwidth table-layout은 table로 unwrap하고 scroll만 div.table-wrapper를 유지한다. th에 가능한 scope를 부여한다. label/input/payload 인접성을 유지한다. note input ID는 `{idPrefix}-note-{noteId}`, article ID는 `{idPrefix}-article`이다. 기본 prefix는 doc.id이며 동일 문서를 한 페이지에 반복할 때 호출자가 다른 prefix를 제공한다. CSS/폰트는 호스트가 별도 제공하며 발행 결과에 script나 편집기 속성을 넣지 않는다.

구체적인 저장 예제: fixtures/tufte/server-document.json. TypeScript 소비자는 현재 workspace package의 export를 사용한다. npm 공개/호환성 보장은 아직 없다.
