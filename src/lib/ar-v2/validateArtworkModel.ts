import {
  Box3,
  Mesh,
  MeshStandardMaterial,
  Vector3,
  type BufferGeometry,
  type Object3D,
  type Scene,
} from "three";
import { ATLAS_RECTS, GEOMETRY_FACE_ORDER, atlasRectToUv } from "./buildTextureAtlas";
import {
  LABEL_WIDTH_TO_HEIGHT,
  MAX_SHORT_SIDE_FRACTION,
  getArtworkImageRatio,
  getBackLabelCardMetrics,
} from "./productionArtwork";
import {
  MAX_FRONT_BRIGHTNESS,
  MIN_FRONT_BRIGHTNESS,
  normalizeFrontBrightness,
} from "./constants";
import type { ArV2Diagnostic, ArtworkScene, ArtworkValidationResult } from "./types";

const EPSILON = 0.001;

function pass(code: string, label: string, detail: string): ArV2Diagnostic {
  return { severity: "PASS", code, label, detail };
}
function warning(code: string, label: string, detail: string): ArV2Diagnostic {
  return { severity: "WARNING", code, label, detail };
}
function fail(code: string, label: string, detail: string): ArV2Diagnostic {
  return { severity: "FAIL", code, label, detail };
}
function near(actual: number, expected: number) {
  return Math.abs(actual - expected) <= Math.max(Math.abs(expected) * EPSILON, 0.00001);
}

function getReadbackContext(canvas: HTMLCanvasElement) {
  return canvas.getContext("2d", { alpha: false, willReadFrequently: true });
}

function collectMeshes(scene: Scene) {
  const meshes: Mesh[] = [];
  scene.traverse((object) => {
    if (object instanceof Mesh) meshes.push(object);
  });
  return meshes;
}

function validateNormals(geometry: BufferGeometry) {
  const diagnostics: ArV2Diagnostic[] = [];
  const normals = geometry.getAttribute("normal");
  const positions = geometry.getAttribute("position");
  const expected = [
    [0, 0, 1], [0, 0, -1], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0],
  ];
  let correct = true;
  for (let face = 0; face < 6; face += 1) {
    const [nx, ny, nz] = expected[face];
    for (let vertex = 0; vertex < 4; vertex += 1) {
      const index = face * 4 + vertex;
      const x = normals.getX(index);
      const y = normals.getY(index);
      const z = normals.getZ(index);
      const length = Math.hypot(x, y, z);
      if (Math.abs(length - 1) > 0.0001 || Math.abs(x - nx) > 0.0001 || Math.abs(y - ny) > 0.0001 || Math.abs(z - nz) > 0.0001) correct = false;
      const px = positions.getX(index);
      const py = positions.getY(index);
      const pz = positions.getZ(index);
      if (px * nx + py * ny + pz * nz <= 0) correct = false;
    }
  }
  diagnostics.push(correct ? pass("normals", "Face normals", "All six faces have unit outward normals.") : fail("normals", "Face normals", "A face normal is not unit length or not outward-facing."));
  return diagnostics;
}

function validateAtlasUvMapping(geometry: BufferGeometry) {
  const uv = geometry.getAttribute("uv");
  let correct = true;
  GEOMETRY_FACE_ORDER.forEach((face, faceIndex) => {
    const rect = atlasRectToUv(ATLAS_RECTS[face]);
    const values = [
      rect.uLeft, rect.vBottom,
      rect.uRight, rect.vBottom,
      rect.uRight, rect.vTop,
      rect.uLeft, rect.vTop,
    ];
    for (let vertex = 0; vertex < 4; vertex += 1) {
      const index = faceIndex * 4 + vertex;
      if (
        Math.abs(uv.getX(index) - values[vertex * 2]) > 0.000001 ||
        Math.abs(uv.getY(index) - values[vertex * 2 + 1]) > 0.000001
      ) {
        correct = false;
      }
    }
  });
  return correct
    ? pass("atlas-uv-mapping", "Atlas UV mapping", "Geometry face order and vertex UV order match the diagnostic atlas.")
    : fail("atlas-uv-mapping", "Atlas UV mapping", "Geometry face order or vertex UV order does not match the diagnostic atlas.");
}

function rectIsOpaque(canvas: HTMLCanvasElement, rect: { x: number; y: number; width: number; height: number }) {
  const context = getReadbackContext(canvas);
  if (!context) return false;
  const samples = [
    [rect.x + 1, rect.y + 1],
    [rect.x + rect.width - 2, rect.y + 1],
    [rect.x + 1, rect.y + rect.height - 2],
    [rect.x + rect.width - 2, rect.y + rect.height - 2],
    [rect.x + Math.floor(rect.width / 2), rect.y + Math.floor(rect.height / 2)],
  ];
  return samples.every(([x, y]) => context.getImageData(x, y, 1, 1).data[3] === 255);
}

function samplePixel(canvas: HTMLCanvasElement, x: number, y: number) {
  const context = getReadbackContext(canvas);
  if (!context) return null;
  const [r, g, b, a] = context.getImageData(x, y, 1, 1).data;
  return { r, g, b, a };
}

function hexToRgb(value: string) {
  const normalized = value.replace("#", "");
  if (normalized.length !== 6) return null;
  const parsed = Number.parseInt(normalized, 16);
  if (Number.isNaN(parsed)) return null;
  return {
    r: (parsed >> 16) & 0xff,
    g: (parsed >> 8) & 0xff,
    b: parsed & 0xff,
  };
}

function validateFrontBrightness(value: number | undefined) {
  if (!Number.isFinite(value ?? NaN)) {
    return fail(
      "front-brightness",
      "Front brightness",
      "Front brightness must be a finite number.",
    );
  }

  if ((value ?? 0) < MIN_FRONT_BRIGHTNESS || (value ?? 0) > MAX_FRONT_BRIGHTNESS) {
    return fail(
      "front-brightness",
      "Front brightness",
      `Front brightness must stay between ${Math.round(MIN_FRONT_BRIGHTNESS * 100)}% and ${Math.round(MAX_FRONT_BRIGHTNESS * 100)}%.`,
    );
  }

  const normalized = normalizeFrontBrightness(value);

  if (normalized > 1.15) {
    return warning(
      "front-brightness",
      "Front brightness",
      `Front brightness above 115% may clip bright artwork details.`,
    );
  }

  return pass(
    "front-brightness",
    "Front brightness",
    `Front brightness is ${Math.round(normalized * 100)}%.`,
  );
}

function validateProductionArtwork(artwork: ArtworkScene) {
  const diagnostics: ArV2Diagnostic[] = [];
  const config = artwork.buildConfig;
  if (config.buildMode !== "production" || config.sourceMode !== "local-image") return diagnostics;

  const metadata = config.metadata;
  diagnostics.push(metadata?.title.trim() ? pass("production-metadata-title", "Artwork title", "Production metadata includes an artwork title.") : fail("production-metadata-title", "Artwork title", "Production Artwork requires an artwork title."));
  diagnostics.push(metadata?.artistName.trim() ? pass("production-metadata-artist", "Artist name", "Production metadata includes an artist name.") : fail("production-metadata-artist", "Artist name", "Production Artwork requires an artist name."));

  const imageReadable = Boolean(config.image?.naturalWidth && config.image.naturalHeight);
  diagnostics.push(imageReadable ? pass("artwork-image-readable", "Artwork image", `Source image is readable at ${config.image?.naturalWidth} × ${config.image?.naturalHeight}px.`) : fail("artwork-image-readable", "Artwork image", "Production Artwork requires a readable local image."));

  const ratio = getArtworkImageRatio(config.image, config, config.orientation);
  if (!ratio) {
    diagnostics.push(fail("artwork-ratio", "Image / physical ratio", "Image ratio could not be calculated."));
  } else if (ratio.status === "pass") {
    diagnostics.push(pass("artwork-ratio", "Image / physical ratio", `Ratio difference is ${(ratio.differenceRatio * 100).toFixed(1)}% after orientation.`));
  } else if (ratio.status === "warning") {
    diagnostics.push(warning("artwork-ratio", "Image / physical ratio", `Ratio difference is ${(ratio.differenceRatio * 100).toFixed(1)}%; contain mode preserves the full image.`));
  } else if (config.allowRatioMismatch) {
    diagnostics.push(warning("artwork-ratio", "Image / physical ratio", `Ratio difference is ${(ratio.differenceRatio * 100).toFixed(1)}%; intentional mismatch confirmed for this test.`));
  } else {
    diagnostics.push(fail("artwork-ratio", "Image / physical ratio", `Ratio difference is ${(ratio.differenceRatio * 100).toFixed(1)}%, above 5%. Confirm the intentional mismatch before building.`));
  }

  diagnostics.push(validateFrontBrightness(config.frontBrightness));

  const productionRects = [ATLAS_RECTS.front, ATLAS_RECTS.back, ATLAS_RECTS.left, ATLAS_RECTS.right, ATLAS_RECTS.top, ATLAS_RECTS.bottom];
  diagnostics.push(productionRects.every((rect) => rectIsOpaque(artwork.atlas.canvas, rect))
    ? pass("production-atlas-opacity", "Production atlas opacity", "Front, back, and side atlas cells are opaque.")
    : fail("production-atlas-opacity", "Production atlas opacity", "A production atlas cell contains transparency."));

  if (config.showBackLabel) {
    const metrics = getBackLabelCardMetrics(config.widthCm, config.heightCm);
    const physicalAspect = config.widthCm / config.heightCm;
    const surfaceAspect = metrics.surface.width / metrics.surface.height;
    const surfaceDiff = Math.abs(surfaceAspect - physicalAspect) / physicalAspect;
    const cardRatio = metrics.cardWidth / metrics.cardHeight;
    const cardRatioDiff = Math.abs(cardRatio - LABEL_WIDTH_TO_HEIGHT) / LABEL_WIDTH_TO_HEIGHT;
    const shortSideScale = metrics.labelHeightCm / metrics.shortSideCm;
    const cardInsideSurface = metrics.cardX >= 0
      && metrics.cardY >= 0
      && metrics.cardX + metrics.cardWidth <= metrics.surface.width
      && metrics.cardY + metrics.cardHeight <= metrics.surface.height;

    diagnostics.push(surfaceDiff <= 0.01
      ? pass("back-label-surface-aspect", "Back label surface aspect", "The offscreen back label surface matches the artwork aspect.")
      : surfaceDiff <= 0.02
        ? warning("back-label-surface-aspect", "Back label surface aspect", "The offscreen back label surface is slightly off the artwork aspect.")
        : fail("back-label-surface-aspect", "Back label surface aspect", "The offscreen back label surface does not match the artwork aspect."));
    diagnostics.push(cardInsideSurface
      ? pass("back-label-card-bounds", "Back label card bounds", "The 4:5 label card stays inside the back label surface.")
      : fail("back-label-card-bounds", "Back label card bounds", "The 4:5 label card would overflow the back label surface."));
    diagnostics.push(cardRatioDiff <= 0.01
      ? pass("back-label-card-ratio", "Back label card ratio", "The label card keeps the requested 4:5 ratio.")
      : cardRatioDiff <= 0.05
        ? warning("back-label-card-ratio", "Back label card ratio", "The label card is slightly off the requested 4:5 ratio.")
        : fail("back-label-card-ratio", "Back label card ratio", "The label card is too far from the requested 4:5 ratio."));
    diagnostics.push(shortSideScale <= MAX_SHORT_SIDE_FRACTION + 0.0001
      ? pass("back-label-short-side-scale", "Back label short-side scale", "The label card height is capped from the shorter artwork side.")
      : fail("back-label-short-side-scale", "Back label short-side scale", "The label card exceeds the shorter artwork side cap."));
    const backBackground = hexToRgb("#f0eadf");
    const centerSample = samplePixel(
      artwork.atlas.canvas,
      ATLAS_RECTS.back.x + Math.floor(ATLAS_RECTS.back.width / 2),
      ATLAS_RECTS.back.y + Math.floor(ATLAS_RECTS.back.height / 2),
    );
    const baked = Boolean(metadata && centerSample && backBackground && (
      centerSample.r !== backBackground.r
      || centerSample.g !== backBackground.g
      || centerSample.b !== backBackground.b
    ));
    diagnostics.push(baked
      ? pass("back-label-atlas-bake", "Back label atlas bake", "The generated back label changed the back atlas rect center away from the warm ivory fill.")
      : fail("back-label-atlas-bake", "Back label atlas bake", "The back atlas rect center still looks like a plain warm ivory fill."));
  }
  return diagnostics;
}

export function validateArtworkScene(artwork: ArtworkScene): ArtworkValidationResult {
  const diagnostics: ArV2Diagnostic[] = [];
  const meshes = collectMeshes(artwork.scene);
  if (meshes.length !== 1) diagnostics.push(fail("mesh-count", "Mesh count", `Expected 1 mesh; found ${meshes.length}.`));
  else diagnostics.push(pass("mesh-count", "Mesh count", "Scene contains exactly one mesh."));

  const [mesh] = meshes;
  if (!mesh) return { diagnostics, hasFailure: true };
  const geometry = mesh.geometry as BufferGeometry;
  const material = mesh.material;
  if (Array.isArray(material)) diagnostics.push(fail("material-array", "Material structure", "Material arrays are not allowed."));
  else if (!(material instanceof MeshStandardMaterial)) diagnostics.push(fail("material-type", "Material type", "MeshStandardMaterial is required."));
  else diagnostics.push(pass("material", "Material structure", "One MeshStandardMaterial uses one atlas texture."));

  const positionCount = geometry.getAttribute("position").count;
  const indexCount = geometry.index?.count ?? 0;
  if (positionCount === 24 && indexCount === 36) diagnostics.push(pass("geometry-count", "Geometry counts", "24 vertices and 36 indices are present."));
  else diagnostics.push(fail("geometry-count", "Geometry counts", `Expected 24 vertices / 36 indices; found ${positionCount} / ${indexCount}.`));
  const position = geometry.getAttribute("position");
  const uv = geometry.getAttribute("uv");
  if (attributeIsFinite(position) && attributeIsFinite(uv)) diagnostics.push(pass("finite", "Finite geometry", "Position and UV attributes contain no NaN or Infinity."));
  else diagnostics.push(fail("finite", "Finite geometry", "Position or UV attributes contain a non-finite value."));
  let uvInRange = true;
  for (let index = 0; index < uv.count; index += 1) if (uv.getX(index) < 0 || uv.getX(index) > 1 || uv.getY(index) < 0 || uv.getY(index) > 1) uvInRange = false;
  diagnostics.push(uvInRange ? pass("uv-range", "UV range", "All atlas UVs are within 0–1.") : fail("uv-range", "UV range", "At least one UV falls outside 0–1."));
  diagnostics.push(validateAtlasUvMapping(geometry));

  const bounds = geometry.boundingBox ?? new Box3().setFromBufferAttribute(position as import("three").BufferAttribute);
  const expectedSize = [artwork.dimensions.widthCm / 100, artwork.dimensions.heightCm / 100, artwork.dimensions.depthCm / 100];
  const actualSize = bounds.getSize(new Vector3());
  const boundsMatch = near(actualSize.x, expectedSize[0]) && near(actualSize.y, expectedSize[1]) && near(actualSize.z, expectedSize[2]);
  diagnostics.push(boundsMatch ? pass("bounds", "Physical bounds", "Bounding box matches the requested dimensions.") : fail("bounds", "Physical bounds", "Bounding box does not match the requested dimensions."));
  diagnostics.push(...validateNormals(geometry));

  const atlas = artwork.atlas;
  const atlasValid = atlas.canvas.width === 2048 && atlas.canvas.height === 2048 && Object.keys(ATLAS_RECTS).every((face) => Boolean(atlas.rects[face as keyof typeof atlas.rects]));
  diagnostics.push(atlasValid ? pass("atlas", "Texture atlas", "2048² opaque atlas contains front, back, and four side cells.") : fail("atlas", "Texture atlas", "Texture atlas dimensions or face rects are invalid."));
  const atlasContext = getReadbackContext(atlas.canvas);
  const atlasIsOpaque = atlasContext ? [
    atlasContext.getImageData(0, 0, 1, 1).data[3],
    atlasContext.getImageData(1023, 1023, 1, 1).data[3],
    atlasContext.getImageData(2047, 2047, 1, 1).data[3],
  ].every((alpha) => alpha === 255) : false;
  diagnostics.push(atlasIsOpaque ? pass("atlas-alpha", "Atlas opacity", "Atlas samples are fully opaque.") : fail("atlas-alpha", "Atlas opacity", "Atlas contains a transparent sample or could not be inspected."));
  diagnostics.push(atlas.texture.flipY === false ? pass("texture-flipy", "Texture orientation", "CanvasTexture.flipY is fixed to false.") : fail("texture-flipy", "Texture orientation", "CanvasTexture.flipY must remain false."));
  diagnostics.push(mesh.rotation.x === 0 && mesh.rotation.y === 0 && mesh.rotation.z === 0 && mesh.scale.x === 1 && mesh.scale.y === 1 && mesh.scale.z === 1 ? pass("transform", "Transforms", "Mesh has no rotation, scale correction, or negative scale.") : fail("transform", "Transforms", "Mesh transform contains a correction that is not allowed."));
  const helperExists = artwork.scene.children.some((child: Object3D) => child !== mesh);
  diagnostics.push(helperExists ? fail("helpers", "Scene contents", "Scene contains an unexpected helper object.") : pass("helpers", "Scene contents", "Scene contains only the artwork mesh."));
  diagnostics.push(...validateProductionArtwork(artwork));

  return { diagnostics, hasFailure: diagnostics.some((item) => item.severity === "FAIL") };
}

function attributeIsFinite(attribute: { count: number; itemSize: number; getX: (index: number) => number; getY?: (index: number) => number; getZ?: (index: number) => number }) {
  for (let index = 0; index < attribute.count; index += 1) {
    if (!Number.isFinite(attribute.getX(index))) return false;
    if (attribute.itemSize > 1 && attribute.getY && !Number.isFinite(attribute.getY(index))) return false;
    if (attribute.itemSize > 2 && attribute.getZ && !Number.isFinite(attribute.getZ(index))) return false;
  }
  return true;
}

export function validateArtworkBlob(blob: Blob): ArV2Diagnostic {
  if (blob.type !== "model/gltf-binary") return fail("blob-type", "GLB MIME type", `Expected model/gltf-binary; found ${blob.type || "empty"}.`);
  if (blob.size < 10 * 1024) return warning("blob-size", "GLB size", `GLB is ${blob.size} bytes, below the 10 KB recommendation.`);
  return pass("blob", "GLB output", `Binary GLB is ready (${Math.round(blob.size / 1024)} KB).`);
}
