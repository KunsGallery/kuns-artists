# AR v2 Phase 4 — Public AR Delivery

## 1. Phase 3 baseline

Phase 3 established the admin approval flow for AR v2:

- the admin builder generates the canonical GLB;
- the exact Blob is uploaded to R2;
- Firestore stores `arV2Config` and `arV2Asset`;
- `arV2Asset.status = "ready"` marks the approved public asset;
- the legacy AR v1 fields remain in place as a separate fallback path.

## 2. Phase 4 purpose

Phase 4 makes the public `/ar/{slug}` route consume AR v2 first.

The public route now uses this priority:

1. ready AR v2 GLB from `arV2Asset.glbUrl`;
2. legacy GLB / USDZ fallback;
3. a preparing screen when no AR asset is available yet.

When AR v2 is ready, the public page shows the actual 3D model with `model-viewer` and keeps the AR button available for mobile devices.

## 3. Public AR source selection

The public work mapping now includes the AR v2 Firestore fields:

- `arV2Config`;
- `arV2Asset`.

The shared work-display helpers now separate:

- ready AR v2 GLB lookup;
- legacy GLB lookup;
- legacy USDZ lookup;
- combined AR availability checks.

This keeps the public route, work-detail pages, and artist-detail pages aligned on the same source data.

## 4. Public viewer behavior

The public AR v2 experience now:

- uses the approved remote `glbUrl` directly;
- renders the canonical 3D model inside the public page;
- keeps iPhone Quick Look and Android Scene Viewer available through `model-viewer`;
- does not recreate a Blob URL on the public route;
- does not reintroduce `ios-src` or manual USDZ generation.

The legacy AR fallback remains available for works that have the older GLB / USDZ pair but no approved AR v2 asset yet.

## 5. What did not change

Phase 4 does not change:

- geometry;
- UV layout;
- GLB export;
- R2 upload;
- Firestore save structure for `arV2Config` and `arV2Asset`;
- the admin approval flow;
- the public artwork and artist archive pages beyond AR source mapping;
- Three.js version;
- `model-viewer` version.

## 6. Verification

Phase 4 is considered complete when:

- the public `/ar/{slug}` route renders AR v2 first when `arV2Asset.status === "ready"`;
- legacy GLB / USDZ fallback still works for older works;
- unpublished works still show the existing preparing / unavailable screens;
- `npx tsc --noEmit` passes;
- `npm run build` passes;
- `git diff --check` passes.
