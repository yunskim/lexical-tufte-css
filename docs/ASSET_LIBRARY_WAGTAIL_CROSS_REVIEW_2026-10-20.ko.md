# Wagtail 대비 에셋 라이브러리 계획 독립 교차 검증

검토일: **2026-10-20**. 검토 대상: [에셋 라이브러리 계획](ASSET_LIBRARY_WAGTAIL_PLAN.ko.md)의 2026-10-20 초안, 현행 `AssetRef`/문서 validator/편집기 URL 삽입/SQLite publication snapshot 경계. **설계 검토만 수행, 구현·테스트·CI 미실행**.

검증 방법: 같은 계획을 **서로 다른 네 관점**에서 초기 가정을 다시 세우고 검토했다. (I) 관리자 경험과 편집, (II) 실제 Wagtail 데이터/저장 모델, (III) 보안·권한·전송, (IV) 교체·발행·보존·삭제 실패 시나리오. 매 차수마다 Wagtail 공식 문서/소스에서 확인한 사실과 우리의 **의도적 차이**를 구분한다. 각 차수의 다른 가정으로부터 나온 지적을 이후 차수의 전제로 삼지 않는다.

## 검증 I — 관리자 사용성 기준으로 역검증

**Wagtail 확인**: 기본적으로 `wagtail.images`와 `wagtail.documents`가 별도 모델·관리 영역이다. 이미지는 RichText/StreamField로, 문서는 chooser/문서 링크로 재사용한다. chooser는 기존 항목 선택 또는 새 업로드를 지원한다. `ImageBlock`은 *사용 지점마다* 대체 텍스트 또는 장식용 이미지를 표시한다. 파일 제목이나 라이브러리 설명이 모든 문맥의 alt를 대체하지 않는다. 오디오/비디오 라이브러리는 Wagtail의 기본 이미지/문서 모델과 다른 추가 생태계(`wagtailmedia`)다.

**초안 판단**: 단일 라이브러리 UI와 유형별 필터는 유지(의도적 차이); **하나의 범용 파일 노드/업로드 핸들러**로 구현하지 않는다. 공통 `Asset` 엔터티에 image/document/audio/video subtype 검증과 chooser 결과/삽입 명령을 분리한다. 이미지에는 문맥별 alt 및 **decorative 체크**가 MVP 수락 기준이어야 한다. PDF는 이미지와 같은 내부 preview/HTML 노드가 아니라 링크/안전한 다운로드용 문서 타입이다.

**수정 요청**: A0.3, A2.2, A4.2–A4.4 및 A8.2. 단일 UI를 고수하되 화면 안 유형별 입력/보안/선택 결과가 달라야 한다. 첫 MVP의 이미지·PDF만 실제 업로드하고 나머지는 후속 지원임을 명확히 한다.

출처:
- [Images overview / ImageBlock](https://docs.wagtail.org/en/stable/advanced_topics/images/overview.html)
- [Documents overview / chooser](https://docs.wagtail.org/en/stable/advanced_topics/documents/overview.html)
- [ImageBlock reference](https://docs.wagtail.org/en/stable/reference/streamfield/blocks.html)
- [wagtailmedia: 오디오/비디오 추가 패키지](https://github.com/torchbox/wagtailmedia)

## 검증 II — 데이터·저장 모델 기준으로 역검증

**Wagtail 확인**: 소스에는 `AbstractImage`와 `AbstractDocument`가 독립적으로 있으며 두 객체에 각각 파일·제목·업로더·태그·컬렉션·파일 해시/크기 등이 있다. 이미지는 치수·focal point·파생 이미지(rendition)가 추가된다. Wagtail 소스의 `file_hash`는 SHA-1이고, 파생물은 필터/원본별 생성·조회 캐시다. 배포 환경에서 파일은 Django Storage 추상화로 로컬 FS 또는 원격 저장소에 둔다.

**초안 판단**: 공통 `Asset`/불변 `AssetVersion`/SHA-256 blob과 SQLite+FS 포트는 **유지**. 다만 Wagtail과 달리 바이너리 버전까지 고정하는 것은 우리 발행 스냅샷 정책에 맞춘 추가 요구다. `kind`에 따른 subtype 메타데이터/파서/미리보기/헤더를 명시하고, blob 계층을 도메인 레코드와 분리한다. 캐시는 canonical `versionId + transform + encoderVersion`에 의존. 단일 테이블이라는 이유로 권한과 이미지 치수를 PDF에 임의 적용하지 않는다.

**수정 요청**: A0.2/3, A1.1/2/3, A7.3. 에셋/버전 ID와 blob digest의 정체성을 분리하고, idempotency·CAS·충돌/동일 바이트 중복·파일 overwrite 정책을 각각 검증. `src`와 public URL은 호스트에서 생성되는 배포 표현이며 식별자/정본이 아니다.

출처:
- [Image model 구현](https://github.com/wagtail/wagtail/blob/main/wagtail/images/models.py)
- [Document model 구현](https://github.com/wagtail/wagtail/blob/main/wagtail/documents/models.py)
- [Renditions](https://docs.wagtail.org/en/stable/advanced_topics/images/renditions.html)
- [User-uploaded files / storage](https://docs.wagtail.org/en/stable/deployment/under_the_hood.html)

## 검증 III — 권한·파일 응답 보안 기준으로 적대적 검증

**Wagtail 확인**: Wagtail의 `choose` 권한은 chooser UI의 사용 편의를 위한 것으로 **비밀 파일 차단 수단이 아니다**. 컬렉션의 privacy 설정은 문서에 적용되지만 기본 이미지에는 동일하게 적용되지 않는다. 문서는 설정·저장소에 따라 서버 privacy check 뒤 제공하거나 저장소에서 직접 제공할 수 있으며, 후자의 경우 구현자가 보안 경계를 책임진다. 파일 확장자만으로 실제 파일 종류가 증명되지 않는다.

**초안 판단**: A2에 적힌 서버 보호 방향은 적절하다. 하지만 A7의 “권한 후속”과 혼동될 수 있다. **MVP부터** upload/list/search/preview/choose/read/download/update/delete/publication의 각 서버 API에 접근 검사를 강제해야 한다. A7에서는 세분화된 다중 사용자 그룹/컬렉션 ACL만 후속으로 둔다. UI에서 숨기고 ID를 아는 사람이 직접 API를 호출하는 공격, 이미지만 CDN에 공개된 경로, 외부 문서 렌더링으로 발생하는 XSS를 별도 위협으로 검사한다.

**수정 요청**: A0.3, A2.3/4, A3.1, A4.1, A7.2, A8.3. 로컬 개인 블로그 MVP는 단일 관리자/호스트 인증으로 충분하지만 **무인증 공개 관리 API는 금지**. 공개 snapshot 전용 asset 버전만 public 경로에서 제공; draft/private 원본과 관리자 thumbnail/metadata는 인증된 경로로. MIME sniff/확장자 allowlist/내용 처리/attachment/nosniff와 같은 다중 제어 유지.

출처:
- [Wagtail image/document permissions](https://docs.wagtail.org/en/stable/topics/permissions.html)
- [Private collections (documents only)](https://docs.wagtail.org/en/stable/advanced_topics/privacy.html)
- [Deployment: user uploaded files and serving modes](https://docs.wagtail.org/en/stable/deployment/under_the_hood.html)
- [Wagtail document upload settings](https://docs.wagtail.org/en/stable/reference/settings.html)

## 검증 IV — 발행/교체/삭제/백업 실패 시나리오로 역검증

**Wagtail 확인**: Wagtail의 같은 이미지/문서 객체에서 파일을 교체하면 그 객체를 참조하는 페이지에 새 파일이 반영될 수 있다(예전 편집자 가이드에 명시된 동작). Wagtail Reference Index는 사용처 화면 제공에 유용하지만 **best-effort**이며 관계 무결성의 유일한 보장은 아니다. 인덱스 재생성 명령이 제공된다.

**초안 판단**: “발행 시점의 `AssetVersion` 고정”은 **Wagtail과 달리 유지해야 할 핵심 차별점**. 그러나 초안의 `AssetUsage` UI 색인만으로 영구 삭제 여부를 판정하는 설계는 위험하다. **정본 문서/발행 snapshot과 같은 트랜잭션에서 저장하는 권위 있는 버전 참조 매니페스트(AssetPin) 또는 동등한 관계 테이블**을 만들어 삭제/GC 판단의 근거로 삼아야 한다. UI 사용처 색인은 이 정본에서 재구축할 수 있어야 한다.

기존 계획에서 놓친 세 가지 충돌:

1. **외부 이미지 URL**: `https://external/img.png`를 사용한 snapshot은 HTML 문자열이 불변이어도 파일 내용까지 불변인 것은 아니다. 외부 링크는 “비고정 외부 참조”라고 분리 표시하거나, 사용자의 명시적 자산 복사·고정 정책으로 managed blob을 확보해야 한다. 발행 성공만으로 무결성 보장이라고 주장하지 않는다.
2. **공개 후 비공개 전환/교체**: 이미 공개된 파일 버전은 브라우저/프록시/CDN 등에 남을 수 있다. 원본 라이브러리 항목을 private로 변경해도 과거 공개 버전이 자동 회수됐다고 간주하지 않는다. `unpublish/withdraw` + 게시물/파일 별 public grant 철회 + 캐시 무효화(가능한 범위) + 복구 가능성/기술적 한계를 문서화한다. 강제 삭제는 “불변 버전의 참조 유지” 원칙에 명시적 예외/진단을 남기는 정책이 필요하다.
3. **백업과 GC**: 독립적인 오프라인 백업이 있다고 해서 영구히 live blob을 보존하면 GC가 불가능해진다. **온라인 초안·복구 슬롯·발행/보존 snapshot**은 live pin으로 계산하고, **자체 바이너리를 포함한 오프라인 백업**은 별도 보관/복원 대상으로 다룬다. 복원 시 다시 검증·rehydrate한다. 백업이 live storage를 공유한다면 명시적으로 retention pin으로 등록해야 한다.

추가 crash 검증: `temp -> hashed durable blob -> SQLite staged/ready transaction -> visible reference` 순서에서 모든 중단점을 주입한다. DB rollback 전후의 orphan blob은 재조정/reconcile 가능한 상태여야 하며 commit/성공 응답 전 draft/publication 포인터를 변경하지 않는다. 업로드/파일교체의 `expectedCurrentVersionId` CAS 충돌 테스트를 요구한다.

**수정 요청**: A1.2–A1.4, A5.1–A5.4, A6.1–A6.3, A8.3. 파일 버전 유지, 참조 진실원천 및 외부 URL/개인정보 철회 정책은 A0에서 결정하고 A6 구현 전 승인한다.

출처:
- [Wagtail reference index: best-effort, rebuild](https://docs.wagtail.org/en/stable/advanced_topics/reference_index.html)
- [Wagtail document replacement behavior (editor guide)](https://docs.wagtail.org/en/v3.0/editor_manual/documents_images_snippets/documents.html)
- [Wagtail image replacement behavior (editor guide)](https://docs.wagtail.org/en/v4.0/editor_manual/documents_images_snippets/images.html)

## Wagtail 대비 채택/수정 결정표

| 항목 | Wagtail | 우리 계획의 결론 | 판정 |
| --- | --- | --- | --- |
| 분류/chooser | 이미지·문서 별도, chooser에서 재사용/업로드 | 하나의 라이브러리 **UI** + 타입별 작업/정책 | **유지** (의도적 차이) |
| 자산/본문 경계 | 별도 Image/Document 객체 참조 | Asset/AssetVersion 별도, Lexical JSON에서 ID+버전 참조 | **유지** |
| 이미지 alt | 사용 문맥별 alt·decorative 지원 | default alt + 사용 위치별 alt + decorative 플래그 | **보강, MVP** |
| 비디오/오디오 | 기본 이미지·문서 외 추가 패키지 | 모델 분류만 우선, 업로드/플레이어는 후속 | **유지** |
| 파일 해시/파생물 | SHA-1 file_hash, image rendition 캐시 | SHA-256 및 immutable version·변환 키 | **유지** (더 강한 계약) |
| 권한 | choose UI ≠ 안전한 읽기 권한, document privacy 별도 | host 모든 API/미디어 경로 검사 | **필수 보강** |
| 사용처 | best-effort ReferenceIndex | UI usage index + transactional AssetPin | **필수 수정** |
| 교체 | 같은 객체의 파일 교체가 참조 페이지에 반영 | 기존 발행 버전 pin, 새 버전 선택적 적용 | **유지** (의도적 차이) |
| private↔published | serve mode·저장소 배포 환경에 의존 | public grant/withdrawal/cache 정책 명시 | **필수 수정** |
| 외부 파일 URL | 참조/스토리지별 동작 다름 | managed/unmanaged 외부 URL과 보존 약속 분리 | **필수 수정** |
| 백업/정리 | reference index는 정리 무결성의 대체재가 아님 | 온라인 pin과 독립 백업 생명주기 분리 | **필수 수정** |
| MVP 범위 | 검증된 이미지·문서 관리 먼저 | 이미지+PDF부터, 한 번 업로드 재사용 및 다운로드 | **유지** |

## 계획 단계 조정 권고

1. **최우선 A0**: R1(버전/외부 URL/철회), R2(alt/decorative), R3(권위 pin 설계)를 ADR로 확정한다. 이 결정 전에 스키마/스토리지 테이블을 코딩하지 않는다.
2. **MVP A1–A4**: 우선 로컬 FS+SQLite 단일 관리자·이미지/PDF 단일 요청 업로드, 검색/선택/첨부를 하나의 경로로 검증. 대용량 멀티파트·오디오/비디오 업로드, 계층 ACL, rendition은 후순위. A2.1의 `begin/commit/cancel/status`은 내부 상태 API로 설계할 수 있지만 첫 배포에 원격 청크 resume를 요구하지 않는다.
3. **발행 수락 A5/A6**: 사용처 화면보다 **pin/ref의 정본성**, published public grant, 외부 URL 동작, 안전한 취소·복원·GC를 먼저 검증한다.
4. **검증 A8**: 미지원 파일의 명시적 거부와 private API 직접 호출, 원격 파일 변경, 공개 후 삭제, 롤백/재시도/백업 복원을 테스트하고 리포트로 고정한다.

## 검증 제한

- Wagtail docs는 현재 stable 8.0을 참조했고, 구현 소스는 GitHub `wagtail/wagtail`의 `main`을 별도로 확인했다. 릴리스 코드와 `main`의 세부 구현은 다를 수 있으므로 Wagtail 구현 **일반 개념**을 비교한 것이지 소스 라인별 동일 버전 감사를 의미하지 않는다.
- Wagtail 데이터 모델·권한 구조를 그대로 복제한다는 의미가 아니며, 네 차수의 독립적인 **설계/코드·문서 근거 검토**이지 네 번의 제품 테스트가 아니다.
- 신규 업로드 기능은 아직 미구현. 신규 코드·실제 사용자 UI·브라우저/OS/클라우드 검증은 없으며, CI는 사용자 지시대로 실행하지 않는다.

## 교차 검증에서 확정된 수락 게이트 (추가 구현 없이 체크리스트에 반영)

- [ ] **R1 / A0.2** `AssetVersion`/문서 스키마/외부 URL managed-vs-unmanaged와 공개 grant/철회 정책의 ADR을 승인한다.
- [ ] **R2 / A0.3+A4.2** 이미지 사용 위치별 alt 및 decorative 상태·미지원 입력의 노출 정책을 결정한다.
- [ ] **R3 / A1.2+A5.1** 참조 인덱스와 별개로 권위 있는 immutable asset-version pin을 트랜잭션 경계에 기록한다.
- [ ] **R4 / A1.3+A1.4** 모든 crash 지점에서 ready 상태가 내구화 이전에 노출되지 않고 orphan을 복구/정리한다.
- [ ] **R5 / A2.3+A4.1** chooser에서 숨긴 자산에 직접 ID/API/preview/원본 URL 접근 시도도 서버가 거부한다.
- [ ] **R6 / A2.4+A6.2** 공개 snapshot 고정 버전만 public grant로 제공하며 unpublish/withdrawal과 CDN 캐시 한계를 문서화한다.
- [ ] **R7 / A5.3** 원본 교체 뒤에도 현재·보존 snapshot 링크가 같은 바이트를 가리키고, 명시적 갱신 전에는 변경되지 않는다.
- [ ] **R8 / A5.4+A6.3** 백업은 별도 자급자족 번들, 온라인 pin만 live GC 차단; restore 재수화/해시 검증을 통과한다.
- [ ] **R9 / A6.1** 외부 URL 이미지를 발행할 때 remote drift를 오류/비고정 상태로 식별하거나 managed copy 정책을 적용한다.
- [ ] **R10 / A7.3** rendition은 소스 버전+변환 옵션+엔코더 버전을 캐시 키로 사용하고 원본 무손실을 확인한다.
- [ ] **R11 / A8.3** 악성 MIME/SVG/HTML/PDF·private 접근·구조화된 chooser 공격을 browser/HTTP로 실증한다.
- [ ] **R12 / A8.5** 범위·권한·임의 URL의 한계와 실제 Wagtail 대비 차이를 사용자 설명서에 기록한다.

이 문서의 R1–R12는 **원래 A0–A8의 38개 작업을 대체하거나 이미 완료 처리하지 않는다**. 동일 작업에 추가된 테스트·승인 기준이다. **모두 설계 검토에서 정의한 미완료 게이트**다.
