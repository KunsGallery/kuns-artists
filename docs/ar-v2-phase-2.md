# AR v2 Phase 2 — Production Artwork Validation

## 1. Phase 1 baseline

Phase 1 established the isolated canonical model path:

- one Scene, Mesh, BufferGeometry, MeshStandardMaterial, and CanvasTexture atlas;
- geometry order `front, back, right, left, top, bottom` with identity mesh transforms;
- one GLB Blob shared by Desktop Actual GLB Preview, Download, and model-viewer AR delivery;
- `texture.flipY = false`, no `ios-src`, no browser-side USDZExporter, and no manual USDZ generation;
- verified face directions, physical scale, opacity, normals, and tearing behavior.

The existing Legacy AR, Admin Works, public `/ar`, Firestore, and R2 paths remain outside this lab.

## 2. Phase 2 purpose

Phase 2 validates a real artwork input in Production Artwork mode. It adds local-only metadata, image ratio review, an atlas-backed production label, contain-only image drawing, and repeatable Portrait / Landscape / Square QA records.

## 3. Production input structure

`ArtworkBuildConfig` keeps the Phase 1 physical dimensions and adds optional production fields:

```ts
type ArtworkProductionMetadata = {
  title: string;
  artistName: string;
  year: string;
  medium: string;
  inventoryNumber?: string;
};
```

Production + Local Image requires a non-empty title, artist name, and readable image. Diagnostic mode does not require production metadata.

## 4. Front image policy

The selected image is drawn only into the front atlas cell. Rotation and horizontal/vertical flip are applied during the front canvas drawing step. Back, side, geometry, mesh transforms, and normals do not receive the artwork orientation.

The image fit is `contain` only: the entire image remains visible, no crop is performed, and no non-uniform stretch is used. The front cell is filled first with the selected side color so the atlas remains opaque.

## 5. Ratio validation

Image aspect is compared with `widthCm / heightCm`. For 90° and 270° orientation, the effective image aspect is calculated as `naturalHeight / naturalWidth` before comparison.

- PASS: difference ≤ 2%.
- WARNING: difference > 2% and ≤ 5%.
- FAIL: difference > 5%.

An over-5% mismatch disables Build Preview Model until the local confirmation checkbox is enabled. Confirmed mismatches remain a WARNING and still use contain drawing.

## 6. Back label layout

`createProductionBackLabelCanvas` generates an offscreen label surface whose pixel aspect matches the artwork's physical `widthCm / heightCm` ratio. The canvas draws an ivory background, a warm-white bordered 4:5 card sized from the artwork's shorter side, and left-aligned information hierarchy:

- KÜN’S GALLERY
- title
- artist
- year, medium, dimensions, and optional inventory number

Long title and medium values wrap to bounded lines with final-line ellipsis. The offscreen canvas is then baked into the square back atlas rect, which means the atlas preview can look pre-distorted while the actual GLB restores the physical proportions. No orientation transform is applied to the back label. The Diagnostic back fixture remains separate from this production label.

## 7. Production UI

`/tools/ar-v2` uses the following flow:

1. Build Mode: Diagnostic Faces or Production Artwork.
2. Artwork Source: Diagnostic Fixture or Local Image.
3. Physical Dimensions with Portrait, Landscape, and Square presets.
4. Artwork Information metadata editor.
5. Artwork Source Preview with source pixels, ratio, orientation, and contain thumbnail.
6. Artwork Orientation.
7. Finish, side color, back label, and mismatch confirmation.
8. Build, Diagnostics, Phase 2 Test Checklist, and Event Log.

The Source Preview and Back Label Source Preview are input-review surfaces. The Back Label Source Preview reuses the same offscreen canvas as the atlas bake and shows it with contain behavior. Actual GLB Preview remains the only model preview.

## 8. QA presets and checklist

Presets change dimensions only:

| Preset | Width | Height | Depth |
| --- | ---: | ---: | ---: |
| Portrait | 60 cm | 90 cm | 3.5 cm |
| Landscape | 120 cm | 80 cm | 3.5 cm |
| Square | 100 cm | 100 cm | 3.5 cm |

The local checklist records Desktop front, back label, side finish, iPhone front, iPhone back, iPhone physical scale, and no tearing/transparency for each case. It does not write to Firestore, R2, localStorage, or the model build.

## 9. Desktop test order

1. Open `/tools/ar-v2`.
2. Select Production Artwork and Local Image.
3. Choose a local JPG, PNG, or WEBP.
4. Enter metadata and dimensions.
5. Review Artwork Source Preview and Back Label Source Preview.
6. Apply one of the three presets and inspect ratio status.
7. Set orientation and confirm only the front preview changes.
8. Build Preview Model.
9. Confirm Actual GLB Preview shows the front image, back label, side color, correct ratio, and all Phase 1 directions.
10. Confirm Diagnostics has no FAIL and Download GLB is enabled.

## 10. iPhone Quick Look test order

Use `View in AR` on the same generated model. Confirm front image orientation, back label readability, side finish, wall placement, physical scale, no transparency, and no tearing. Desktop PASS does not automatically imply iPhone PASS; record each result in the local checklist and Event Log.

Actual device testing is not automated by the application and must be performed on the target iPhone over HTTPS.

## 11. Phase 2 pass criteria

Portrait, Landscape, and Square must each pass Desktop and iPhone checks with no Diagnostics FAIL. Image contain behavior must show no crop or stretch, and the same generated GLB Blob must be used for preview, download, and model-viewer AR.

## 12. Phase 3 preparation

The read-only page section lists the future Admin One-Click Builder inputs: work image URL, title, artist, year, medium, dimensions, side color, orientation, back-label flag, generated GLB Blob, and validation result. The actual `/admin/works`, Firestore, and R2 connections are intentionally deferred.

## 13. Excluded in Phase 2

No Admin Works or artist-page connection, Firestore write, R2 upload, public `/ar/{slug}` connection, Legacy AR change, QR or audio change, USDZExporter, `ios-src`, manual USDZ, external conversion API, server function, model-viewer dependency change, or Three.js version change is included.
