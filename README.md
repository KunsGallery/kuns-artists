# KÜN'S Artists

KÜN'S Gallery 전속 작가용 작품 CMS 및 AR 준비 도구입니다.

- `Next.js 16.2.1` App Router
- `TypeScript`
- `Tailwind CSS`
- `Firebase Auth / Firestore`
- 향후 `Cloudflare R2` 업로드 예정

## Local Development

```bash
npm install
npm run dev
```

로컬 검증 명령:

```bash
npx tsc --noEmit
npm run build
```

참고:

- Firestore Security Rules는 Next.js build와 별개입니다.
- Rules는 실제 Firebase 배포 또는 Firebase Console의 Rules Playground에서 따로 검증해야 합니다.

## Firestore Rules

이 저장소는 루트의 `firestore.rules`를 사용합니다.

`firebase.json`

```json
{
  "firestore": {
    "rules": "firestore.rules"
  }
}
```

현재 Rules 방향:

- `artists`, `works`는 공개 페이지를 위해 읽기 허용
- `gallerykuns@gmail.com`만 admin
- 허용된 작가 이메일만 자기 `artists/{uid}` 최초 생성 가능
- 일반 작가는 자기 `artists/{uid}`만 수정 가능
- 일반 작가는 자기 `works`만 생성/수정 가능
- 일반 작가는 `artistId`, `artistSlug`, `artistName`, `modelGlb`, `modelUsdz`, `generatedGlbUrl`, `isPublished`, `createdAt` 수정 불가

## Firestore Rules Deploy

Firebase CLI 설치 및 연결:

```bash
npm install -g firebase-tools
firebase login
firebase use --add
```

Rules 배포:

```bash
firebase deploy --only firestore:rules
```

환경에 따라 아래 명령도 사용할 수 있습니다.

```bash
firebase deploy --only firestore
```

주의:

- CLI 배포는 Firebase 콘솔의 현재 Rules를 로컬 `firestore.rules` 기준으로 덮어씁니다.
- `firebase.json`은 커밋해도 되지만, `.firebaserc`는 실제 프로젝트 ID 확인 후 로컬에서만 설정하는 편이 안전합니다.
- 프로젝트에 `.firebaserc`가 아직 없다면 아래 예시를 참고해 직접 연결하세요.

`.firebaserc` example:

```json
{
  "projects": {
    "default": "YOUR_FIREBASE_PROJECT_ID"
  }
}
```

## Current CMS Write Flow

현재 작가 CMS는 아래 흐름으로 Firestore와 맞춰져 있습니다.

- `/artist/login`: 허용 이메일 기반 로그인
- `/artist/profile`: `artists/{uid}` 수정
- `/artist/works/new`: 현재 로그인 작가 기준 `works` 문서 생성
- `/artist/works`: 현재 로그인 작가의 작품 목록 조회
- `/artist/works/[id]/edit`: 본인 작품만 수정
- `GLB 생성 및 다운로드`: Firestore 저장과 별개로 현재 폼 값으로 동작

작품 수정 시 `artistId`, `artistSlug`, `artistName` 같은 immutable 필드는 다시 쓰지 않도록 정리되어 있어서, 일반 작가 update가 Rules에 막히지 않도록 맞춰져 있습니다.

## R2 Next Step

이번 단계에서는 타입과 placeholder만 준비되어 있습니다.

- `src/lib/r2/types.ts`
- `src/lib/r2/client.ts`

향후 R2 업로드 흐름:

1. 클라이언트에서 업로드할 파일 정보 전달
2. 서버 API 또는 Netlify Function에서 R2 presigned URL 발급
3. 클라이언트가 presigned URL로 R2에 직접 `PUT` 업로드
4. 업로드 성공 후 `publicUrl` 또는 `key`를 Firestore에 저장

주의사항:

- Presigned URL은 R2 S3 API endpoint에서 동작합니다.
- Custom domain에서는 presigned URL을 직접 사용할 수 없습니다.
- 브라우저 직접 업로드를 위해 R2 CORS 설정이 필요할 수 있습니다.
- R2 비밀 키는 절대 클라이언트에 노출하면 안 됩니다.

현재 placeholder:

```ts
requestR2UploadUrl(...)
```

는 아직 미구현이며, 호출 시 에러를 던집니다.

## References

- Firebase CLI reference: https://firebase.google.com/docs/cli/
- Cloudflare R2 presigned URLs: https://developers.cloudflare.com/r2/api/s3/presigned-urls/
