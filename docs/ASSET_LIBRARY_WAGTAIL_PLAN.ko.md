# 에셋 라이브러리 구축 계획 — Wagtail 관리 UX 참고

상태: **설계/체크리스트 초안 확정, 구현 미착수** (2026-10-20)
대상: `lexical-tufte-css`. 작성·관리 UI는 Lexical 기반이며 문서/렌더러/저장은 별도 패키지로 유지한다.
목표: 개인 블로그부터 사용할 수 있는 **한곳에서 업로드·검색·선택·재사용·교체·사용처·정리** 경험을 만들고, 이미지뿐 아니라 PDF/첨부파일/오디오/동영상까지 다룰 수 있는 저장 계약을 둔다.
참고 범위: Wagtail의 관리 UX·개념; Wagtail/Django의 내부 코드나 의존성을 그대로 도입하지 않는다. 실제 Wagtail 최신 권한·사용처/프라이버시 세부 규칙을 복제한다고 주장하지 않는다.

## 0. 현재 코드 기준선과 비목표

| 영역 | 현재 상태 | 목표 변화 |
| --- | --- | --- |
| `packages/document/src/types.ts`의 `AssetRef` | 문서의 `assets[]`는 이미지 메타데이터 (`id/src/mimeType/alt/width/height/byteLength/sha256`) | 전역 에셋 엔터티/버전과 개별 문서 참조를 분리 |
| `packages/document/src/validate.ts` | `mimeType`에 `image/*`만 허용, 이미지 노드와 `assetId` 매칭 검증 | 파일 종류별 명시적 정책 및 유효한 참조 검증 |
| `packages/lexical`·`examples/editor/src/main.tsx` | 이미지 URL prompt, 일부 데모 이미지. 업로드/라이브러리 chooser 없음 | 선택기(기존 검색/새 업로드), 형식별 삽입, 초점·undo/redo |
| `packages/blog/src/publication.ts` | 출판 시 `assetExists(src)` 확인, immutable snapshot 안에 `assetSources[]` 보관 | 버전 고정 참조/공개 가능 여부/실제 파일 존재·해시를 확인 |
| 파일 저장 | 실제 에셋 바이너리 저장 어댑터 미구현, `packages/adapter-fs`도 아직 없음 | 명시적 blob 저장 인터페이스와 로컬 FS 구현, 이후 객체 스토리지 |
| 복구/백업 | 문서·SQLite 리비전/복구 관련 기능 존재 | 에셋 바이너리 포함 백업/복원, 참조와 파일 무결성 검사 |

이 계획으로 **완료 처리하지 않을 것**: 에셋 기능 구현, 전체 Wagtail CMS 구축, 다중 사용자 권한 시스템, ImageQuilt 이미지 합성, 오디오/동영상 트랜스코딩, 파일 내용을 이용한 전체 텍스트 색인, 원본 Tufte CSS 전체 페이지의 시각 일치성.

기존 `tufte-note` 구형 노드 마이그레이션 미지원 결정은 변경하지 않는다. 기존에 유효한 이미지 `AssetRef`는 파일/문서 스키마 변경 시 **별도 명시적 이행**을 설계하며, 신규 에셋 모델을 끼워 넣어 현재 `schemaVersion:1/2` 문서를 조용히 재해석하지 않는다.

## 1. Wagtail에서 참고할 사용자 경험과 채택 결정

| Wagtail에서 참고한 패턴 | 이 프로젝트의 설계 선택 | 우선순위 |
| --- | --- | --- |
| Images·Documents 전용 관리 화면, 제목·태그·검색·필터·일괄 작업 | **단일 에셋 라이브러리**, 이미지 카드/나머지 목록 UI. 유형 필터와 다중 선택 | MVP |
| 기존 미디어 선택과 신규 업로드를 한 chooser 안에서 제공 | 편집기 삽입 버튼 → `검색/업로드` 탭 → 파일 선택 → 삽입 옵션. 성공한 업로드는 라이브러리에 재사용 가능 | MVP |
| 이미지 alt·focal point, format 선택 | 라이브러리 기본 alt/설명·저작자·출처, 사용 위치별 alt/caption/배치 선택; focal point·rendition은 후속 | MVP/후속 |
| 컬렉션과 태그, 권한에 따른 선택 가능 범위 | 태그/유형 검색 우선; **초기 컬렉션은 단순한 하나의 분류 필드**(기본 컬렉션 포함). 계층 트리/상속 ACL은 필요성이 확인된 후 | 2차 |
| 파일 교체 시 그 파일을 참조한 페이지도 바뀔 수 있음 | **그대로 복제하지 않음**: 에셋 ID는 안정적, 바이너리 버전은 불변. 기존 출판 스냅샷은 사용 버전을 고정 | 필수 |
| 어디에 쓰는지(usage) 보고 후 관리·삭제 | 초안/현재 공개/과거 보관 스냅샷 각각에 대한 역참조 색인. 참조 중인 파일은 즉시 영구 삭제 불가 | 필수 |
| 이미지 리사이즈/크롭 및 rendition 캐싱 | 원본 불변 + 파생물 캐시 키 (`sourceVersionId+transformSpec+encoderVersion`); 후속 단계 | 후속 |
| 백엔드 저장소를 local/cloud로 교체 | `AssetBlobStore` 인터페이스로 byte 저장 계층과 메타데이터 DB 분리 | 필수 |

참고: https://docs.wagtail.org/en/stable/advanced_topics/images/overview.html ·
https://docs.wagtail.org/en/stable/advanced_topics/documents/overview.html ·
https://docs.wagtail.org/en/stable/topics/permissions.html ·
https://docs.wagtail.org/en/stable/advanced_topics/images/renditions.html ·
https://docs.wagtail.org/en/stable/advanced_topics/api/v3/images.html ·
https://docs.wagtail.org/en/stable/advanced_topics/api/v3/documents.html ·
https://docs.wagtail.org/en/stable/deployment/under_the_hood.html

## 2. 제안 UI와 사용자 작업 경로

**관리 화면**: 왼쪽 메뉴 `에셋` → 상단 [전체 | 이미지 | 문서 | 기타] 필터, 검색, 태그/컬렉션, 정렬(업로드일/이름/크기/사용처), 업로드 버튼. 이미지는 썸네일 카드, PDF/오디오/동영상/일반 파일은 아이콘·제목·확장자·크기·상태의 행. 다중 선택은 삭제 전 참조 보호 확인/컬렉션 이동 등 안전한 작업부터 시작한다.

**상세 화면**: 미리보기(안전한 유형만), 이름/제목, 실제 판별 MIME, 크기·체크섬, 이미지 고유 폭/높이, 기본 alt·저작권/출처/사용권/설명, 태그·컬렉션, 생성·교체 시간, 파일 버전, 다운로드, 사용처(글·초안·공개 revision 구분), 파일 교체, 비공개/공개 여부, 휴지통으로 이동. 공개 제한은 UI 숨김이 아니라 호스트 접근 제어로 강제한다.

**편집기 chooser**: 기존 에셋 검색·선택과 새 업로드 탭; 새 파일을 올려도 등록된 라이브러리 에셋 선택 결과를 돌려준다. 이미지 → 본문/그림/여백 이미지와 alt·caption·배치; PDF·일반 파일 → 제목 있는 다운로드 링크/첨부 표시; 오디오·비디오는 초기에는 다운로드 참조만, 플레이어는 안전성·접근성 검증 후 활성화. Wagtail처럼 업로드마다 기존 파일을 다시 올리지 않아도 된다.

**상태와 접근성**: 파일별 대기/검증/업로드/저장/완료/취소/실패/재시도, 진행률과 이유를 명시한다. 검색 결과 0건·권한 없음·유효하지 않은 형식·일부 실패를 구분한다. 키보드 초점 이동, chooser dialog 내 포커스·ESC, 스크린리더 발표, 375px, drag/drop·다중 파일·중복 파일 경고를 확인한다. 취소는 서버에 저장 중이던 데이터를 안전하게 정리하지만, 이미 완료된 라이브러리 등록은 자동 삭제하지 않는다.

## 3. 데이터 모델(설계 목표; 코드 구현 전)

핵심은 **`Asset`(사람이 식별하는 항목), `AssetVersion`(불변 바이너리), `Blob`(바이트 저장), `AssetUsage`(참조)**의 분리다.

| 엔터티 | 주요 속성/계약 |
| --- | --- |
| `Asset` | `assetId`(안정적), `kind=image/document/audio/video/other`, `title`, `originalFilename`(표시만; 저장 경로 금지), `defaultAlt?`(이미지), `description?`, `credit?`, `license?`, `tags[]`, `collectionId?`, `ownerId?`(호스트), `createdAt`, `updatedAt`, `currentVersionId`, `state=active/trashed` |
| `AssetVersion` | `versionId`(불변), `assetId`, `blobDigest=sha256`, `byteLength`, 검증된 `mediaType`, 이미지 `width/height`, 업로드 시각, 검증 상태, 원본/파생물 관계. 같은 버전 ID의 바이트 수정 금지 |
| `Blob` | `blobDigest`, byteLength, `storageKey`, 원본/파생물 구분, 저장 무결성 검증 상태. SHA-256은 파일 바이트 기준이며 파일명과 무관. 같은 작업 공간/보안 경계 내에서만 중복 제거 |
| `AssetUsage` | `assetId`, `versionId`, `postId`, `documentRevision` 또는 `snapshotId`, `origin=draft/published/retained`, `nodePath/role`. 캐시/색인이라 정본에서 재구성 가능 |
| `Rendition`(후속) | 원본 `versionId`, 정규화된 변환 옵션·엔코더 버전, 저장 digest, 폭/높이/품질. 원본을 덮어쓰지 않음 |
| `Collection`(후속) | 단순 `collectionId/title`와 선택·보기 권한 경계. 초기 단계에서 복잡한 부모/자식 트리는 넣지 않음 |

메타데이터는 SQLite를 우선으로 하고 blob은 로컬 FS 어댑터(후속 S3/R2)로 관리한다. 콘텐츠/제목/태그 업데이트는 메타데이터 변경이지 파일 버전 교체가 아니다. 파일 교체는 항상 **새 `AssetVersion`**을 만든 뒤 `Asset.currentVersionId`만 원자 변경한다. 버전이 고정된 기존 문서/발행 스냅샷에 자동 반영하지 않는다.

### 문서 참조의 단계적 계약

- **현재 유지**: 현행 `AssetRef`, `document.assets[]`, `tufte-inline-image/tufte-imagequilt`의 `src`+`assetId?`, 이미지-only validator와 외부 이미지 URL 경로를 깨지 않는다. 이 단계에서 PDF MIME을 단순히 기존 배열에 허용하는 방식은 금지한다.
- **첫 라이브러리 버전**: 전역 SQLite Asset/Version에 파일을 저장하며 아직 본문으로 표현하지 않아도 라이브러리·다운로드·메타데이터 관리가 가능해야 한다. 기존 이미지 URL과 업로드한 관리 파일을 명확히 구분한다.
- **본문 통합 버전**: 별도 문서 형식 변경(후보 `schemaVersion:3`, 반드시 별도 ADR로 확정)으로 관리 에셋 참조에 안정적인 `assetId + versionId`를 명시한다. 이미지 노드에는 에셋 버전 참조를 연계하고 PDF·기타 파일에 대해 링크/첨부의 문서 의미를 정의한다. 기존 `link.url`에 임시 `asset:` 스킴을 무검증 주입하거나 raw HTML을 편집 정본으로 저장하지 않는다.
- **기존 문서 전환**: 유효한 `schemaVersion:1/2` 문서·외부 URL 이미지에서 신규 형식으로의 명시적 도구/경로, 필드별 무손실 변환·원본 유지·재시도·실패 롤백. **구형 `tufte-note` wire type 지원은 범위 밖**이다.
- **참조 생성 원칙**: 삽입할 때 명시적 버전을 선택/고정한다. Wagtail식 “파일 교체가 모든 페이지를 바꿈” 기능을 기본값으로 만들지 않는다. “최신 버전 적용”은 사용자가 글 단위로 명시적으로 실행하는 후속 기능이다. 사용 위치별 alt/caption은 라이브러리 기본값에서 시작하되 각 노드가 재정의할 수 있다.
- **발행 원칙**: 참조 `assetId/versionId`의 존재·권한·안전 상태·실제 blob digest를 모두 검증하고, 발행 스냅샷에 불변 버전 매니페스트를 포함한다. 공개 URL은 백엔드가 버전에 매핑한 안정적인 URL로 생성; 초안/private blob 경로를 직접 노출하지 않는다.

## 4. 저장·전송·접근 보안 계약

- `AssetBlobStore`는 앱/호스트가 주입하는 포트다. 개념 API: `putTemp(stream, constraints)`, `commitTemp(digest)`, `head/read/streamRange`, `removeTemp`, `deleteImmutableBlob`. 메타데이터 CRUD/트랜잭션은 별도 `AssetRepository`. 프론트엔드 번들에는 Node FS나 비밀 저장키가 들어가지 않는다.
- 업로드는 인증/CSRF 또는 동일 강도의 호스트 보호, 파일당/사용자당 용량·개수·동시성 한도, 총합 quota·timeout·취소/재시도·idempotency key를 받는다. 정책 수치는 구성값으로 두고, MVP에서 안전한 기본값을 정해 검증한다.
- 원본 파일명은 표시용으로만 저장. 확장자/클라이언트 `Content-Type`를 신뢰하지 않고 magic bytes·형식별 파서를 사용해 검증한다. 이미지 pixel/frame 폭탄, 손상 PDF·아카이브, 무한 스트림·잘못된 chunk 길이를 거부한다. SVG/HTML 및 실행 가능한 파일은 초기에 inline 서비스하지 않는다; SVG는 별도 sanitizer와 격리 테스트를 통과하기 전 다운로드 전용 또는 거부.
- 우선 허용: 이미지(정의된 PNG/JPEG/WebP/GIF 등), PDF, 안전한 일반 다운로드 파일(호스트 allowlist). 문서/오디오/동영상의 수용 범위와 다운로드/미리보기 여부는 별도 명시적 정책으로 분기한다. 코덱/저작권 분석이나 악성코드 검사 완료를 거짓으로 주장하지 않는다.
- private 업로드는 비공개 키 공간에 저장, 접근 권한 확인 뒤 스트리밍 또는 짧은 만료 서명 URL 발급. 공개된 **특정 버전**만 공개 배포할 수 있다. 업로드 파일은 `Content-Disposition: attachment` 기본, `X-Content-Type-Options: nosniff`, 안전한 `Content-Type`, 강한 CSP/샌드박스·별도 origin(가능 시)을 강제한다. URL만 알아도 비공개 파일이 열리지 않아야 한다.
- 임시 파일→digest 확인→blob 내구성 확인→DB 자산/버전 트랜잭션 완료→성공 응답 순서. FS·SQLite 사이 원자성 한계를 보상하는 중단/재시도/스캔 복구 규칙을 둔다. **파일 영속화 전 성공 응답 금지**, 실패 시 정본 포인터를 바꾸지 않음.
- 중복 파일은 같은 작업 공간/ACL 경계에서 저장 바이트를 재사용할 수 있으나 사람에게 보이는 Asset 엔터티까지 강제로 합치지 않는다. 중복 여부나 이미 존재하는 비공개 자산의 제목·사용처·ID를 권한 없는 사용자에게 누설하지 않는다.
- 삭제는 참조 검사 후 휴지통 처리, 보존 기간 경과·모든 초안/활성 공개/보존 snapshot/백업 참조 해제·관리자 검토 시에만 영구 GC. 재검증하는 동안 새 참조가 생기는 TOCTOU 경쟁을 DB transaction/CAS로 방지한다. 파생 이미지도 동일한 수명 주기 규칙에 포함한다.
- 저작권/라이선스/출처/alt는 관리 메타데이터로 보존하되 강제 정책 여부를 호스트가 선택한다. 미리보기는 MIME별로 제한하고 악성 PDF/SVG/HTML과 실행 파일을 본문 iframe으로 직접 임베드하지 않는다.

## 5. 구현 순서와 추적 체크리스트

**상태 규칙**: 아래 신규 작업은 모두 `[ ]` 미완료로 시작한다. [x]로 바꾸려면 구현 PR/commit과 테스트·실행 증거(또는 설계라면 승인 ADR)가 있어야 한다. 설계 작성 자체가 구현 완료를 의미하지 않는다. CI는 사용자 지시대로 별도 요청 전까지 생략한다. 단계별 테스트는 작성한 후 사용자가 정한 일괄 실행 흐름과 맞춰 실행한다.

### A0 — 범위/계약 확정 (P3.4/P5.1 선행)

- [ ] **A0.1** 기존 이미지 `AssetRef`/검증/이미지 노드/발행 snapshot 경로를 기준 테스트로 고정한다. 기존 테스트 339개 JS/22개 브라우저/16개 Python(2026-10-19 결과)을 회귀 기준으로 기록한다.
- [ ] **A0.2** 새 Asset/Version/Usage와 문서 스키마 변경 여부를 ADR로 결정한다. 불변 버전·이미지 외 파일·외부 URL 분리, 구형 note 미지원, 복구 정책을 확정한다.
- [ ] **A0.3** 파일 유형별 업로드 허용 정책표와 기본 크기/픽셀/프레임·quota, download/preview/inline 권한을 설정으로 정의한다.
- [ ] **A0.4** 사용자 플로우(라이브러리→업로드→선택→삽입→발행→교체→사용처→삭제)·화면 구성 및 단축키/접근성 수락 시나리오를 기록한다.
- **Gate A0**: ADR·정책·입출력 계약이 승인되어 v1/2 동작 변경 없이 구현 범위를 설명할 수 있다.

### A1 — 에셋 리포지토리 및 불변 바이트 저장 (P5.1)

- [ ] **A1.1** `AssetBlobStore` / `AssetRepository` TypeScript 인터페이스와 오류 타입, 테스트용 fake adapter 작성.
- [ ] **A1.2** SQLite `assets/asset_versions/blobs` 스키마·인덱스·마이그레이션·CAS/트랜잭션/중복 digest 계약 구현; 기존 post schema와 충돌 금지.
- [ ] **A1.3** `packages/adapter-fs` 로컬 FS 구현: 안전한 경로, symlink·Windows 장치명 회피, temp/write/fsync/atomic move, 해시 검증, 부분 저장 복구.
- [ ] **A1.4** 스트림 읽기/메타데이터 조회/바이트 무결성 및 실패 주입 테스트(디스크 가득 참, 중단, DB 롤백, 재시도, 경로 우회).
- **Gate A1**: 이미지/PDF/일반 바이트 저장·읽기·유실 방지·중복 파일 idempotency가 로컬 FS+SQLite 실제 통합 테스트로 입증됨.

### A2 — 업로드/다운로드 서비스 (P3.4/P5.7)

- [ ] **A2.1** upload begin/commit/cancel/status, checksum·길이 검증, 재시도 및 quota. 성공 응답 이전 blob 내구성 보장.
- [ ] **A2.2** MIME sniff·형식별 제한(이미지·PDF 우선), 손상 파일/위험 파일 거부, 이미지 메타데이터 추출(크기/회전 반영)·EXIF 위치정보 정책.
- [ ] **A2.3** 인증/호스트 권한·CSRF·rate limit·Content-Disposition·nosniff·private route·감사 로그 경계 구현.
- [ ] **A2.4** 다운로드/Range 요청(필요한 유형에 한함), 권한·404/403 구분 정책과 private↔published URL 경계를 검증.
- **Gate A2**: 여러 파일 업로드/취소/재시도와 비인가 읽기/업로드·악성 MIME·path traversal/zip bomb·브라우저 다운로드 보안 검증 통과.

### A3 — 에셋 라이브러리 관리 UI (P3)

- [ ] **A3.1** 전체/이미지/문서/기타 탭, 카드·목록, 서버 측 검색·정렬·페이지네이션, 로딩/비어 있음/오류 UI.
- [ ] **A3.2** 다중 업로드 drag/drop·개별 진행/취소/실패·재시도와 접근성 구현.
- [ ] **A3.3** 상세·메타데이터 수정(제목, 기본 alt, credit/license, tags), 원본 다운로드, 현재 버전·이전 버전 조회.
- [ ] **A3.4** 반복된 입력 오류·권한 부족·중복 파일을 구분하여 보여주고, 키보드/375px/스크린리더/초점 이동 검증.
- **Gate A3**: 에셋 관리 화면에서 실제 PDF와 이미지의 업로드→검색→수정→다운로드/권한 제어를 완료할 수 있음.

### A4 — 편집기 선택기·본문 참조 (P3.4/P2 계약 연계)

- [ ] **A4.1** chooser 모달(검색·업로드) 재사용 컴포넌트, 선택 결과에 `assetId/versionId`만 전달. 미등록 URL 이미지와 구분.
- [ ] **A4.2** 이미지 삽입·교체·alt/caption/width 옵션을 현행 Tufte figure/margin 모델과 연결하고 편집·복사·undo/redo·저장/재열기 보존.
- [ ] **A4.3** PDF/일반 파일은 안전한 첨부/다운로드 참조로 표현할 신규 문서 의미를 설계·구현. 새 schema와 Lexical node, validator, 순수 renderer, clipboard 및 자료형 소비 검증.
- [ ] **A4.4** audio/video 업로드 시 초기에는 안전한 다운로드 첨부로 처리. player는 정책/권한/자막/브라우저·Range 검증 후 별도 추가.
- [ ] **A4.5** 기존 유효 이미지 URL 문서→관리 자산 참조의 **명시적 opt-in 전환** 테스트. 외부 이미지/관리 자산 혼재 문서에서도 데이터 손실·조용한 URL 재작성 금지.
- **Gate A4**: 작성 중 파일을 선택/업로드해 삽입하고, 결과가 정본 JSON·실제 발행 HTML·편집/undo/복구/클립보드 왕복에서 유지됨.

### A5 — 사용처·교체·삭제 안전성 (P5.2/P5.5)

- [ ] **A5.1** draft/active published/retained snapshot별 역참조 색인을 빌드하고 정본 문서에서 재생성 가능하도록 한다.
- [ ] **A5.2** 에셋 상세의 사용처 목록·글 이동·사용처 수·색인 재구성 상태를 표시. 미검증 색인은 삭제 허용 근거로 사용 금지.
- [ ] **A5.3** 동일 Asset의 새 바이너리 교체는 새 immutable AssetVersion으로 기록, 원래 공개 글·이전 글을 그대로 렌더하고 최신 버전 적용은 명시적 확인으로만 수행.
- [ ] **A5.4** 다중 삭제·휴지통·참조된 자산 차단·복원·기간 기반 안전한 GC·경쟁 조건을 검증.
- **Gate A5**: “파일 A를 교체/휴지통으로 이동해도 기존 공개 글과 보존 snapshot의 버전이 바뀌거나 사라지지 않음”을 실제 테스트로 증명.

### A6 — 발행·백업/복원·스토리지 소비자 (P5)

- [ ] **A6.1** 현행 `assetExists(src)` 경계를 관리 asset 버전·blob 검증으로 확장하고 기존 외부 URL 처리는 별도 분기. 누락/권한 오류 시 발행 무변경.
- [ ] **A6.2** immutable publication snapshot에 버전·digest 매니페스트 고정, 공개용 URL·정적 번들에 필요한 byte 포함, 이전 snapshot·비공개 전환 무결성 확인.
- [ ] **A6.3** 백업 형식에 에셋 매니페스트와 바이너리를 포함할 export/import 설계. 원본 바이트·digest·version·사용처와 충돌 처리·미리보기 후 복원 검증.
- [ ] **A6.4** 호스트 예제에서 작성→업로드→삽입→발행→다운로드→교체→재발행→복원→안전 삭제 end-to-end 실행.
- **Gate A6**: SQLite/FS 실제 통합 환경에서 asset 누락·손상·버전 충돌에도 공개 상태와 원본을 보존하고 복원이 검증됨.

### A7 — 검색/컬렉션/권한·이미지 최적화 (후속)

- [ ] **A7.1** 태그·제목·메타데이터 검색, 유형별 필터/collection 분류. 단순 컬렉션 모델의 실제 수요 평가 후 계층화 결정.
- [ ] **A7.2** 관리자·업로더·편집자 역할 및 chooser `choose`, `view`, `edit`, `delete` 분리. 서버 측 범위 검사·정보 유출 테스트.
- [ ] **A7.3** 이미지 rendition(썸네일/본문/responsive)과 optional focal point, 캐시 무효화/버전 간 분리/선택적 재생성.
- [ ] **A7.4** 선택적 오디오/동영상 플레이어, 자막·대체 콘텐츠·스트리밍·Range/코덱과 CSP 검증; 기본 다운로드 정책 유지 가능.
- **Gate A7**: 권한·컬렉션/파생 이미지가 공개 안전성을 낮추지 않고, 성능 및 접근성 수락 테스트 통과.

### A8 — 최종 수락 및 운영 문서 (P6/P7)

- [ ] **A8.1** 단위/통합/브라우저/packed 소비 테스트: 이미지·PDF·기타 파일 + 손상·중복·취소·quota·동시성·rollback + 권한.
- [ ] **A8.2** 실제 Chrome/Firefox/WebKit, 키보드·스크린리더, 375/759/760/761/1440px, 장문/다수 자산 성능 baseline.
- [ ] **A8.3** 백업→복원, 발행/비공개/휴지통/GC, 관리자 접근 통제, 다운로드 캐시·CSP·콘텐츠 스니핑 검사.
- [ ] **A8.4** 기존 Tufte CSS 공식 9개 섹션 DOM/CSS 회귀 및 브라우저 노트 토글·이미지 레이아웃과 충돌 없는지 검증.
- [ ] **A8.5** 기능별 테스트 증거·지원 MIME·quota·알려진 제한·운영 책임/어댑터 설명서를 작성. CI 실행은 별도 요청 전 생략.
- **Gate A8**: 모든 [ ] 실행 근거를 남기고 미지원 기능을 명시한 뒤에만 에셋 라이브러리 완성이라고 선언.

## 6. 사용자 시나리오 기반 수락 테스트

| 시나리오 | 반드시 입증할 불변식 |
| --- | --- |
| JPEG 업로드→다른 글에 재사용 | 한 Asset/불변 version 선택, 글별 alt·caption 독립, published HTML 안전 |
| PDF 업로드→첨부 링크 | 브라우저 클릭 다운로드, 인증·제목·MIME·헤더 일치, XSS/inline 실행 없음 |
| mp3/mp4 파일 업로드(추가 지원 단계) | MIME 정책별 안전 저장, 다운로드/Range 또는 명시적 미지원, 트랜스코딩 약속 없음 |
| 파일 A 내용 교체 | 새 versionId, 기존 공개 snapshot 이미지/다운로드 링크는 원래 바이트 |
| 사용 중 삭제 시도 | 사용처 목록 제시, 휴지통/영구 삭제 구분, 참조 손상 없음 |
| 초안 삭제·비공개 전환·GC | retained published snapshot/백업/복구본이 참조하면 blob 살아 있음 |
| 업로드 중 서버 종료·디스크 가득 참 | 성공 응답 없음, 정본 DB/기존 바이너리 보존, temp cleanup/recovery |
| 같은 파일 두 차례 업로드 | dedup 여부가 문서 참조/권한에 부작용 없음, 타인 파일 존재 정보 누출 없음 |
| 악성 SVG/HTML/PDF 및 path traversal | 검증 차단 또는 안전 첨부 다운로드, 스크립트·외부 경로 실행 불가 |
| 기존 문서 재열기 | 유효한 이미지 URL/AssetRef 원형 보존, 지원하지 않는 구형 note는 의도적 거부 |

## 7. 기존 로드맵 연결

- **P3.4**: 업로드·진행률·alt·caption·선택기(`A2–A4`)로 확장. 선행 `A0/A1` 구현 없이는 UI만으로 완료 금지.
- **P5.1/P5.5**: FS·SQLite 어댑터/백업과 발행(`A1/A5/A6`)으로 연결; 현재 `adapter-fs` 미구현.
- **P5.7/P6.3/P6.7**: 파일 보안·브라우저·권한 검증(`A2/A8`)으로 연결.
- Tufte CSS 정본 재현 목표와 섞지 않는다. 에셋 시스템의 DOM 변환은 기존 `renderArticle` 순수 함수와 분리된 별도 파일 해결/manifest 단계에서 수행한다.
- 별도 Wagtail 클론·Django 서버 구축, 기존 Lexical JSON을 Wagtail로 교체하는 작업은 계획에 포함하지 않는다.

## 8. 변경/체크리스트 관리 규칙

- 각 체크박스는 `A0.1`처럼 고유 ID를 사용한다. 구현/검증 증거 commit/PR과 테스트 명령·결과를 체크 완료 시 같은 줄 또는 인접 로그에 추가한다.
- 진행 중·실패·차단은 `[x]`가 아니라 미완료 `[ ]`와 이유로 남긴다. 일괄 테스트가 미실행이면 “검증 대기”라고 쓴다.
- 사용자 검토 전 새 schema/migration·데이터 삭제·권한 완화는 자동 채택하지 않는다.
- 장기적으로 제품/업로드 운영 세부가 바뀌어도 과거 완료 기준과 테스트 증거를 삭제하지 않고 변동 기록을 남긴다.
