# R12 — 파일 저장 경로와 slug 충돌 정책

- **정본 경로는 ID 기반**: `posts/<document.id>/post.json`. 사용자가 변경 가능한 slug를 디렉터리명으로 사용하지 않는다.
- ID는 ASCII 영숫자로 시작하며 뒤에 영숫자, `_`, `-`만 허용한다. Windows 장치명 `CON`, `PRN`, `AUX`, `NUL`, `COM1`–`COM9`, `LPT1`–`LPT9`는 대소문자와 무관하게 거부한다.
- slug는 NFC 정규화된 문자/숫자 및 단어 사이 하이픈만 허용한다. 충돌 키는 `slug.toLowerCase().normalize('NFC')`이다. 대소문자만 다른 slug는 충돌로 거부한다.
- 파일시스템의 실제 대소문자 접기와 Unicode 정규화 규칙은 OS별로 다르다. 위 충돌 키는 **최소 공통 정책**이며 완전한 Unicode case folding을 보장하지 않는다. 공개 URL 인덱스의 동시성 잠금 및 추가 Unicode 충돌 정책을 P5에서 검증한다.
- adapter-fs는 신뢰할 수 있는 root 디렉터리 내부로 경로를 해석하고 심볼릭 링크 및 TOCTOU 우회를 방어해야 한다. 문자열 기반 키 검사만으로 실제 파일시스템 접근을 안전하게 만들 수 없다.
- slug 변경 시 기존 공개 URL의 redirect/alias 예약 정책을 적용해야 한다. 활성 slug뿐 아니라 과거 URL과의 충돌도 검사한다.
- 저장은 임시 파일 생성·동기화·원자 교체, 예상 revision 비교, 실패 시 기존 파일 보존을 기본으로 한다.

구현: `packages/document/src/storageKeys.ts`의 `postStorageKey`, `slugCollisionKey`, `assertUniqueSlugs`. 테스트: `packages/document/test/storage-keys.test.mjs`.

**남은 조건:** 실제 adapter-fs 구현, Windows/macOS/Linux 파일시스템 테스트, 심볼릭 링크와 동시성 테스트. 코드 작성만으로 R12를 완료 표시하지 않는다.
