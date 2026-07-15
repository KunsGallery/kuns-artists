# AR v2 Phase 5

## Goal

Phase 5 splits the AR workflow into three parts:

1. The artist saves the work record and requests AR production.
2. The admin reviews the request, builds the canonical GLB, and stores the approved asset.
3. The public AR route ignores stale approved assets when the artwork data changes.

## Data Model

`Work` and `ArtistWorkDoc` now support:

- `arV2Request`
- `arV2Review`
- `arV2Config`
- `arV2Asset`

Request and review data are stored separately so the artist can only create or cancel a request, while the admin can review and approve it.

## Workflow Status

Derived status values:

- `not-requested`
- `requested`
- `changes-requested`
- `approved`
- `outdated`
- `cancelled`

The workflow status is derived from the request, review, current source signature, and approved asset signature.

## Source Signature

The same `createArV2SourceSignature` helper is reused everywhere:

- Artist request page
- Admin builder
- Public stale-asset guard

No separate artist signature implementation is introduced.

## Artist Request Page

Route:

- `/artist/works/[id]/ar`

Responsibilities:

- Verify the current artist owns the work.
- Load the source image through `loadArtworkImageForArV2`.
- Block requests when the image / physical ratio differs by more than 5%.
- Let the artist adjust direction and finish settings only.
- Save `arV2Request` only.

The artist cannot upload GLB files or modify `arV2Asset` / `arV2Review`.

## Admin Review

The admin builder now:

- Shows request metadata at the top of the page.
- Prefers the active request config when it is current.
- Lets the admin send a `changes-requested` review message.
- Saves `arV2Config`, `arV2Asset`, and `arV2Review` together on approval when possible.

If the request is outdated, approval is blocked until the artist resubmits.

## Public Stale-Asset Guard

`getReadyArV2GlbUrl` now compares the current source signature with the stored asset signature.

If they differ, the approved AR v2 GLB is treated as stale and the public route falls back to the legacy AR path or the preparing screen.

## Firestore Rules

Artists can update:

- `arV2Request`

Artists cannot update:

- `arV2Config`
- `arV2Asset`
- `arV2Review`
- `isPublished`
- `generatedGlbUrl`
- `generatedUsdzUrl`

## Operational Notes

- Legacy artist-side GLB download UI is hidden from the artist editor.
- Admin legacy creation flow remains available.
- No notification or background job was added in this phase.

## Validation

Recommended checks:

```bash
npx tsc --noEmit
npm run build
git diff --check
```

## Phase 5.1 - Scaling and Front Brightness

This follow-up keeps the existing workflow intact while adding AR placement scaling and front-facing brightness control.

1. `ArtworkModelViewer` now uses `ar-scale="auto"` while keeping `ar-placement="wall"`.
2. Native AR placement can be resized with pinch gestures after the model is placed.
3. No 100% snap, Y-axis lock, or custom AR manipulation was added.
4. `WorkArV2Config` now includes `frontBrightness`.
5. The default for new requests is `1.08`.
6. Legacy `ar-v2.1` configs and approved assets continue to resolve with `1.0` brightness.
7. Brightness is baked into the front texture only.
8. Back labels and side faces are unchanged.
9. The generator version for new assets is `ar-v2.2`.
10. Source signatures now include `frontBrightness` for `ar-v2.2`, while legacy `ar-v2.1` signatures are preserved.
11. Firestore rules allow artists to update `arV2Request` only, with `frontBrightness` validated in the request config.
12. Public AR guidance now mentions wall-height placement and pinch resizing.
13. Desktop routing quirks, QR URLs, slug routes, and DeviceRedirect behavior were left untouched.
