# P3.1.e 편집기 재사용 경계 — 1차 구현 설계

작성: 2026-11-01. 기준 브랜치: `test/full-deferred-20261031`.

## 현재 코드에서 확인한 사실

- `examples/editor/src/main.tsx`가 `LexicalComposer`, `RichTextPlugin`, `HistoryPlugin`, `TablePlugin`, 노드·명령 등록, 툴바, 선택 UI, 외부 자산 연결, 저장/복구 상태를 함께 소유한다.
- `examples/editor/src/NoteImagePanel.tsx`와 `examples/editor/src/style.css`는 예제 경로에 있다.
- `packages/editor-react`는 아직 없고, `packages/editor-ports`에는 호스트 중립 `AssetProvider` 계약이 있다.
- `examples/editor/package.json`은 React 19.2.0, Lexical 0.52.0을 직접 의존한다. workspace는 `packages/*`, `examples/*`를 포함한다.

## 분리할 공개 계약

```ts
interface TufteEditorProps {
  value: TufteDocument;
  onChange?: (value: TufteDocument) => void;
  onError?: (error: Error) => void;
  assetAdapter?: AssetProvider;
  assetNamespace?: string;
  readonly?: boolean;
}
```

이는 **목표 API 초안**이며 현재 구현된 export가 아니다. `value`는 Lexical JSON을 포함하는 canonical 문서 envelope다. `onChange`는 편집 변경 알림이며 영속 저장 완료 알림이 아니다. 호스트가 문서 저장·revision 충돌·권한·업로드·인증을 책임진다.

## 단계별 이관 순서

- [ ] R1. `packages/editor-react` 패키지·export·React/Lexical peer dependency를 생성하고 독립 소비자 타입 검사 추가.
- [ ] R2. 순수 툴바 action 정의·아이콘·버튼을 먼저 추출하고 기존 접근성 이름과 단축키를 유지한다.
- [ ] R3. SelectionToolbar와 문맥 메뉴를 추출한다. Lexical composer context를 내부에서만 읽고 선택/IME/포커스 경계를 검증한다.
- [ ] R4. NoteImagePanel과 AssetProvider 연결을 옮긴다. namespace·revision·만료 URL·generation guard의 동작을 보존한다.
- [ ] R5. LexicalComposer와 플러그인 조립을 `TufteEditor`로 캡슐화하고 `value/onChange/onError/readonly` 계약을 연결한다.
- [ ] R6. `examples/editor`를 `@lexical-tufte/editor-react` 소비자로 바꾸되 저장/발행/호스트 정책은 예제에 남긴다.
- [ ] R7. 두 편집기 동시 렌더, unmount/remount, 외부 value 교체, readonly, 이벤트 중복 등록, 자산 namespace 격리 및 기존 브라우저 회귀를 실행한다.

## 이동 중 불변식

1. Lexical JSON만 본문 정본이다. React 상태나 HTML을 별도 정본으로 만들지 않는다.
2. 문서 schema·순수 renderer·`AssetProvider`는 React에 의존하지 않는다.
3. 패키지는 예제 코드나 브라우저 `window.lexicalTufteAssetProvider` 전역에 의존하지 않는다. 기존 전역 주입은 예제 호환 계층으로만 유지한다.
4. 공개 HTML에 편집기 UI wrapper가 유출되지 않아야 한다.
5. 여러 편집기 사이에서 선택, 타이머, 비동기 resolve, note ID, 이벤트 리스너가 공유되지 않아야 한다.
6. 단일 파일을 기계적으로 이동한 것만으로 P3.1.e를 완료 처리하지 않는다. 소비자 테스트까지 통과해야 한다.

## 검증 상태

이 문서는 실제 파일 구조에 근거한 **이관 설계**다. 새 패키지 생성·코드 이동·테스트 실행은 아직 수행하지 않았다. 최신 자동 검증 결과는 [2026-11-01 보고서](VERIFICATION_DEFERRED_2026-11-01.ko.md)를 따른다.
