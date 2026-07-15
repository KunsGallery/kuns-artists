import { buildArtworkScene } from "./buildArtworkScene";
import { exportArtworkGlb } from "./exportArtworkGlb";
import { validateArtworkBlob, validateArtworkScene } from "./validateArtworkModel";
import type { BuildArtworkGlbInput, BuildArtworkGlbResult, ArtworkScene } from "./types";

function disposeArtworkScene(artwork: ArtworkScene) {
  artwork.mesh.geometry.dispose();
  const material = artwork.mesh.material;
  if (!Array.isArray(material)) {
    material.dispose();
  }
  artwork.atlas.texture.dispose();
}

export async function buildArtworkGlb(
  input: BuildArtworkGlbInput,
): Promise<BuildArtworkGlbResult> {
  if (input.buildMode === "production" && input.sourceMode === "local-image" && !input.image) {
    throw new Error("Production Artwork requires a readable artwork image.");
  }

  if (input.buildMode === "diagnostic" && input.sourceMode === "local-image" && !input.image) {
    throw new Error("Diagnostic build requires a readable artwork image when local-image source mode is selected.");
  }

  const artwork = buildArtworkScene({
    widthCm: input.widthCm,
    heightCm: input.heightCm,
    depthCm: input.depthCm,
    buildMode: input.buildMode,
    sourceMode: input.sourceMode,
    image: input.image,
    orientation: input.orientation,
    sideColor: input.sideColor,
    showBackLabel: input.showBackLabel,
    frontBrightness: input.frontBrightness,
    metadata: input.metadata,
    allowRatioMismatch: input.allowRatioMismatch,
  });

  try {
    const sceneValidation = validateArtworkScene(artwork);
    const exportResult = await exportArtworkGlb(artwork.scene, sceneValidation.diagnostics);
    const blobValidation = validateArtworkBlob(exportResult.blob);
    const diagnostics = [...sceneValidation.diagnostics, blobValidation];
    return {
      blob: exportResult.blob,
      objectUrl: exportResult.objectUrl,
      byteSize: exportResult.byteSize,
      diagnostics,
      hasFailure: diagnostics.some((item) => item.severity === "FAIL"),
    };
  } finally {
    disposeArtworkScene(artwork);
  }
}
