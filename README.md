# KÜN’S Artists

KÜN’S Gallery Artists Archive 프로젝트입니다.

- 공개 작가 포트폴리오 사이트
- 작가 CMS
- 관리자 CMS
- 작품 상세와 AR Preview
- Next.js / Firebase / R2 / Netlify 기반

## 주요 라우트

- `/`: 공식 랜딩 페이지
- `/artists`: 공개 작가 목록
- `/artists/[slug]`: 공개 작가 상세
- `/works/[slug]`: 공개 작품 상세
- `/ar/[slug]`: 작품 AR Preview
- `/artist/login`: Google 로그인
- `/artist/dashboard`: 작가 대시보드
- `/artist/profile`: 작가 프로필 편집
- `/artist/works`: 작가 작품 목록
- `/admin`: 관리자 홈
- `/admin/artists`: 작가 관리
- `/admin/works`: 작품 관리
- `/tools/canvas-glb`: admin-only internal tool

## R2 업로드 구조

- 프론트는 `/.netlify/functions/r2-presign-upload`를 호출합니다.
- Netlify Function이 `uploadUrl`, `publicUrl`, `key`를 반환합니다.
- 클라이언트는 presigned `uploadUrl`로 직접 `PUT` 업로드합니다.
- 업로드 후 `publicUrl`을 Firestore 필드에 저장합니다.
- 업로드 target 예시:
  - `profile`
  - `work-image`
  - `glb`
  - `ar-model`
  - `usdz`
  - `cv`

## 환경변수

### Firebase

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

### R2

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_PUBLIC_BASE_URL`

## AR 상태

- AR v1은 구현 완료 상태입니다.
- `generatedGlbUrl`, `modelGlb`, `generatedUsdzUrl`, `modelUsdz` 중 하나라도 있으면 AR Ready로 판단합니다.
- `/works/[slug]`와 `/ar/[slug]`에서 AR 상태를 노출합니다.
- GLB 자동 생성/업로드는 내부 프로토타입 흐름으로 제공됩니다.
- USDZ 자동 변환은 아직 보류 상태입니다.

## 운영 전 확인 항목

- Firebase Auth에서 admin / artist 로그인 확인
- Firestore Rules 배포 확인
- R2 업로드 확인
- 업로드 후 public URL 접근 확인
- `next/image`의 R2 `remotePatterns` 확인
- `/tools/canvas-glb`가 admin-only로만 접근되는지 확인
- iPhone / Android 실기기에서 AR 확인

## 주의사항

- 작가 allowlist는 `src/lib/artistAccess.ts`와 `firestore.rules` 양쪽에 정의되어 있습니다.
- 작가 이메일을 변경할 때는 두 파일을 함께 확인해야 합니다.
- 추후 allowlist 단일화 리팩토링이 필요합니다.
- Firestore / R2 secret 값은 저장소나 README에 기록하지 않습니다.

## 로컬 검증

```bash
npx tsc --noEmit
npm run build
```
