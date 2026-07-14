# AR v2 Phase 3 — Admin Approval Workflow

## 1. Phase 2 baseline

Phase 2 established the isolated production GLB path for `/tools/ar-v2`:

- one shared GLB build pipeline;
- local artwork image support;
- ratio review and mismatch gating;
- production metadata validation;
- Actual GLB Preview backed by the same Blob that is downloaded and inspected in AR;
- no USDZ exporter, no `ios-src`, and no geometry, UV, or Three.js version changes.

Phase 3 keeps that build behavior intact and connects it to the admin approval flow.

## 2. Phase 3 purpose

Phase 3 makes `/admin/works` the approval and storage point for AR v2 models.

The admin workflow now:

1. reads the current work record and cover image URL;
2. builds the exact same canonical GLB through the shared builder;
3. shows the same diagnostics and viewer experience as `/tools/ar-v2`;
4. uploads the approved GLB to R2;
5. saves the AR v2 config and asset metadata back to Firestore.

## 3. Shared GLB pipeline

The generation logic is shared through `buildArtworkGlb`.

Both the lab and the admin builder use the same production pipeline for:

- physical dimensions;
- orientation;
- side color;
- back-label toggle;
- ratio validation;
- GLB export and blob validation.

This keeps the admin approval path aligned with the isolated lab and avoids drift between two separate build implementations.

## 4. Remote artwork image loading

Phase 3 adds a dedicated remote image loader for AR v2:

- the admin builder loads the cover image from its URL;
- the loader uses the browser fetch path with `mode: "cors"`, `credentials: "omit"`, and `cache: "no-store"`;
- the image is converted to an object URL and then decoded into a real `HTMLImageElement`;
- the same decoded image is reused for preview and approval.

If the image cannot be loaded or decoded, the builder shows a readable error instead of silently producing a broken model.

The current admin build expects the R2 bucket CORS policy to allow:

- `https://artists.kunsgallery.com`
- `http://localhost:3000`

with `GET` and `HEAD` enabled for public image reads.

## 5. Source signature

The admin workflow records a deterministic source signature for each approved model.

The signature includes:

- work ID;
- cover image URL;
- title, artist name, year, and medium;
- width, height, and depth;
- rotation and flip state;
- side color;
- back-label toggle;
- ratio-mismatch allowance;
- generator version.

This makes the stored GLB provenance explicit and lets the admin UI detect outdated previews before approval.

## 6. Firestore save shape

Phase 3 adds AR v2 fields to the work document without overwriting legacy AR fields.

The saved structure now includes:

```ts
arV2Config?: {
  version: 2;
  rotationDeg: 0 | 90 | 180 | 270;
  flipX: boolean;
  flipY: boolean;
  sideColor: string;
  depthCm: number;
  backLabelEnabled: boolean;
  allowRatioMismatch?: boolean;
};

arV2Asset?: {
  status: "none" | "preview" | "ready" | "error";
  glbUrl?: string;
  generatorVersion: string;
  sourceSignature?: string;
  generatedAt?: unknown;
  byteSize?: number;
  errorMessage?: string;
};
```

The legacy AR fields remain untouched, and the admin save path only writes the new AR v2 keys plus `updatedAt`.

## 7. Admin approval flow

The new builder on `/admin/works` is intentionally two-step:

1. Build preview GLB.
2. Review the actual model and approve the exact Blob.

On approval, the GLB is uploaded to R2 first, then the Firestore work document is updated with the AR v2 config and ready asset metadata.

If upload fails after the file has already reached R2, the workflow attempts to clean up the uploaded object so the work record does not point at a half-finished artifact.

The builder now exposes an explicit image load state:

- `idle` when no artwork URL exists;
- `loading` while the remote source is being fetched;
- `ready` once the image decodes successfully;
- `error` when CORS, decode, or response validation fails.

The build button stays disabled until the image is ready, and the UI shows the concrete reason when a required field is missing, the source is loading, or the source is blocked by CORS.

## 8. What did not change

Phase 3 does not change:

- geometry;
- UV layout;
- `GEOMETRY_FACE_ORDER`;
- `texture.flipY = false`;
- `model-viewer`;
- the public `/ar` route;
- back label behavior;
- side structure;
- Diagnostic Fixture behavior;
- Three.js version.

Legacy AR v1 assets remain available in the admin UI only as a collapsed reference section.

The `/admin/works` detail area is now split into five tabs:

- 작품 검수
- 공개 설정
- AR V2
- 도슨트
- 레거시·관리

The AR V2 builder is mounted only when the AR V2 tab is active, so remote image fetching and model-viewer setup do not run until the admin opens that tab.

## 9. Review expectations

The admin builder and the lab should continue to show:

- Portrait, Landscape, and Square artwork cases;
- 0°, 90°, 180°, and 270° orientation;
- horizontal and vertical flips;
- front-only orientation changes;
- unchanged back label placement;
- no crop and no letterbox in the actual GLB preview;
- contain-only artwork source preview.

## 10. Verification

Phase 3 is considered complete when:

- `npx tsc --noEmit` passes;
- `npm run build` passes;
- `git diff --check` passes;
- targeted lint on `src/app/admin/works/page.tsx`, `src/components/ar-v2/AdminArtworkArV2Builder.tsx`, and `src/lib/ar-v2/loadArtworkImage.ts` passes with warnings only for existing `<img>` usage in the admin page;
- the shared lab and admin preview flows build the same GLB result;
- the approved GLB is saved to R2 and Firestore through the admin workflow.
