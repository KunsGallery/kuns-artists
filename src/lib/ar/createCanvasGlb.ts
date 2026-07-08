import {
  BoxGeometry,
  CanvasTexture,
  Group,
  Mesh,
  MeshStandardMaterial,
  Scene,
  SRGBColorSpace,
} from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { USDZExporter } from "three/examples/jsm/exporters/USDZExporter.js";

export type CanvasGlbInput = {
  imageUrl: string;
  title: string;
  widthCm: number;
  heightCm: number;
  depthCm?: number;
  artistName?: string;
  year?: string;
  medium?: string;
  dimensions?: string;
};

export type CanvasSideMode = "canvas" | "image";

export type CanvasGlbOptions = {
  sideColor?: string;
  backColor?: string;
  maxTextureSize?: number;
  frontRotationXDeg?: number;
  frontRotationYDeg?: number;
  sideMode?: CanvasSideMode;
  showBackLabel?: boolean;
};

type EdgeTextureSet = {
  right: CanvasTexture;
  left: CanvasTexture;
  top: CanvasTexture;
  bottom: CanvasTexture;
};

type EdgeTextureOptions = {
  edgeSizePx?: number;
  textureSize?: number;
};

export const DEFAULT_DEPTH_CM = 2.8;
export const DEFAULT_SIDE_COLOR = "#d6cec0";
export const DEFAULT_BACK_COLOR = "#bfb5a5";
export const DEFAULT_FRONT_ROTATION_X_DEG = 0;
export const DEFAULT_FRONT_ROTATION_Y_DEG = 45;
export const DEFAULT_SIDE_MODE: CanvasSideMode = "canvas";
export const DEFAULT_SHOW_BACK_LABEL = true;
const DEFAULT_MAX_TEXTURE_SIZE = 2048;
const DEFAULT_BACK_LABEL_TEXTURE_SIZE = 1024;
const EDGE_TEXTURE_SIZE = 512;

function assertPositiveNumber(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive number.`);
  }
}

function normalizeOptionalText(value?: string) {
  const trimmed = value?.trim() ?? "";
  return trimmed || undefined;
}

function formatMeasurement(value: number) {
  return Number(value.toFixed(1)).toString();
}

function getDimensionsText(input: CanvasGlbInput) {
  return (
    normalizeOptionalText(input.dimensions) ??
    `${formatMeasurement(input.widthCm)} x ${formatMeasurement(input.heightCm)} cm`
  );
}

function createWrappedLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
) {
  const normalizedText = text.trim().replace(/\s+/g, " ");

  if (!normalizedText) return [];

  const lines: string[] = [];
  let currentLine = "";

  for (const char of normalizedText) {
    const nextLine = currentLine + char;

    if (currentLine && ctx.measureText(nextLine).width > maxWidth) {
      lines.push(currentLine.trim());
      currentLine = char;
      continue;
    }

    currentLine = nextLine;
  }

  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }

  if (lines.length <= maxLines) {
    return lines;
  }

  const visibleLines = lines.slice(0, maxLines);
  let lastLine = visibleLines[maxLines - 1].trimEnd();

  while (
    lastLine.length > 1 &&
    ctx.measureText(`${lastLine}...`).width > maxWidth
  ) {
    lastLine = lastLine.slice(0, -1).trimEnd();
  }

  visibleLines[maxLines - 1] = `${lastLine}...`;

  return visibleLines;
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
) {
  const lines = createWrappedLines(ctx, text, maxWidth, maxLines);

  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight);
  });

  return y + lines.length * lineHeight;
}

function createCanvasTexture(canvas: HTMLCanvasElement) {
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function getImageDimensions(image: HTMLImageElement) {
  return {
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
  };
}

function createFrontTextureFromImage(
  image: HTMLImageElement,
  maxTextureSize = DEFAULT_MAX_TEXTURE_SIZE
) {
  const { width, height } = getImageDimensions(image);
  const largestSide = Math.max(width, height);
  const scale =
    largestSide > maxTextureSize ? maxTextureSize / largestSide : 1;
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Failed to create the front texture canvas.");
  }

  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

  return createCanvasTexture(canvas);
}

function createEdgeTextureCanvas(
  image: HTMLImageElement,
  sourceX: number,
  sourceY: number,
  sourceWidth: number,
  sourceHeight: number,
  textureSize: number
) {
  const canvas = document.createElement("canvas");
  canvas.width = textureSize;
  canvas.height = textureSize;

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Failed to create an edge texture canvas.");
  }

  ctx.imageSmoothingEnabled = true;
  // If a side texture appears rotated or mirrored in a GLB viewer,
  // adjust the draw transform for that specific edge here.
  ctx.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    textureSize,
    textureSize
  );

  return createCanvasTexture(canvas);
}

function createEdgeTexturesFromImage(
  image: HTMLImageElement,
  options: EdgeTextureOptions = {}
): EdgeTextureSet {
  const { width, height } = getImageDimensions(image);
  const edgeSizePx =
    options.edgeSizePx ??
    Math.max(24, Math.floor(Math.min(width, height) * 0.04));
  const textureSize = options.textureSize ?? EDGE_TEXTURE_SIZE;
  const verticalStripWidth = Math.min(width, edgeSizePx);
  const horizontalStripHeight = Math.min(height, edgeSizePx);
  const rightSourceX = Math.max(0, width - verticalStripWidth);
  const bottomSourceY = Math.max(0, height - horizontalStripHeight);

  return {
    right: createEdgeTextureCanvas(
      image,
      rightSourceX,
      0,
      verticalStripWidth,
      height,
      textureSize
    ),
    left: createEdgeTextureCanvas(
      image,
      0,
      0,
      verticalStripWidth,
      height,
      textureSize
    ),
    top: createEdgeTextureCanvas(
      image,
      0,
      0,
      width,
      horizontalStripHeight,
      textureSize
    ),
    bottom: createEdgeTextureCanvas(
      image,
      0,
      bottomSourceY,
      width,
      horizontalStripHeight,
      textureSize
    ),
  };
}

function createBackLabelTexture(
  input: CanvasGlbInput,
  options: CanvasGlbOptions = {}
) {
  const widthCm = Math.max(input.widthCm, 1);
  const heightCm = Math.max(input.heightCm, 1);
  const isLandscape = widthCm >= heightCm;
  const aspectRatio = isLandscape
    ? widthCm / heightCm
    : heightCm / widthCm;
  const canvas = document.createElement("canvas");
  const longSide = DEFAULT_BACK_LABEL_TEXTURE_SIZE;
  const shortSide = Math.max(1, Math.round(longSide / aspectRatio));

  canvas.width = isLandscape ? longSide : shortSide;
  canvas.height = isLandscape ? shortSide : longSide;

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Failed to create the back label canvas.");
  }

  const backgroundColor = options.backColor ?? DEFAULT_BACK_COLOR;
  const primaryTextColor = "#2b2925";
  const secondaryTextColor = "rgba(43, 41, 37, 0.65)";
  const panelSide = Math.min(canvas.width, canvas.height);
  const panelX = (canvas.width - panelSide) / 2;
  const panelY = (canvas.height - panelSide) / 2;
  const cardInset = panelSide * 0.08;
  const cardX = panelX + cardInset;
  const cardY = panelY + cardInset;
  const cardSide = panelSide - cardInset * 2;
  const contentX = cardX + cardSide * 0.11;
  const contentWidth = cardSide * 0.78;
  const titleLineHeight = cardSide * 0.085;
  const contentBottom = cardY + cardSide;
  const labelFontSize = Math.max(14, Math.round(cardSide * 0.033));
  const footerFontSize = Math.max(14, Math.round(cardSide * 0.03));
  const infoRows = [
    { label: "Artist", value: normalizeOptionalText(input.artistName) },
    { label: "Year", value: normalizeOptionalText(input.year) },
    { label: "Medium", value: normalizeOptionalText(input.medium) },
    { label: "Size", value: getDimensionsText(input) },
  ].filter((row) => Boolean(row.value));

  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  ctx.fillRect(panelX, panelY, panelSide, panelSide);

  ctx.fillStyle = "rgba(248, 244, 238, 0.96)";
  ctx.fillRect(cardX, cardY, cardSide, cardSide);

  ctx.strokeStyle = "rgba(43, 41, 37, 0.12)";
  ctx.lineWidth = Math.max(1, Math.round(cardSide * 0.004));
  ctx.strokeRect(cardX, cardY, cardSide, cardSide);

  ctx.textBaseline = "top";

  let y = cardY + cardSide * 0.11;

  ctx.fillStyle = secondaryTextColor;
  ctx.font = `500 ${labelFontSize}px Arial, sans-serif`;
  ctx.fillText("KÜN’S GALLERY", contentX, y);
  y += cardSide * 0.08;

  ctx.fillStyle = primaryTextColor;
  ctx.font = `600 ${Math.max(24, Math.round(cardSide * 0.078))}px Arial, sans-serif`;
  y = drawWrappedText(
    ctx,
    normalizeOptionalText(input.title) ?? "Untitled",
    contentX,
    y,
    contentWidth,
    titleLineHeight,
    3
  );
  y += cardSide * 0.045;

  for (const row of infoRows) {
    ctx.fillStyle = secondaryTextColor;
    ctx.font = `600 ${labelFontSize}px Arial, sans-serif`;
    ctx.fillText(row.label.toUpperCase(), contentX, y);
    y += cardSide * 0.04;

    ctx.fillStyle = primaryTextColor;
    ctx.font =
      row.label === "Medium"
        ? `500 ${Math.max(18, Math.round(cardSide * 0.04))}px Arial, sans-serif`
        : `500 ${Math.max(19, Math.round(cardSide * 0.045))}px Arial, sans-serif`;
    y = drawWrappedText(
      ctx,
      row.value as string,
      contentX,
      y,
      contentWidth,
      row.label === "Medium" ? cardSide * 0.05 : cardSide * 0.055,
      row.label === "Medium" ? 3 : 2
    );
    y += cardSide * 0.028;
  }

  ctx.fillStyle = secondaryTextColor;
  ctx.font = `500 ${footerFontSize}px Arial, sans-serif`;
  ctx.fillText(
    "Generated canvas back label",
    contentX,
    contentBottom - cardSide * 0.12
  );

  // If the back label appears mirrored in a GLB viewer,
  // adjust canvas drawing orientation or texture transform here.
  return createCanvasTexture(canvas);
}

function toUserFacingImageError(imageUrl: string) {
  return new Error(
    `Failed to load the artwork image from "${imageUrl}". Check the URL and make sure the image host allows CORS access.`
  );
}

function toUserFacingExportError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Unknown export error.";

  if (
    /security|taint|cross-origin|cors|origin-clean|insecure/i.test(message)
  ) {
    return new Error(
      "The artwork export failed because the image is blocked by CORS. Use a same-origin image or enable Access-Control-Allow-Origin on the source."
    );
  }

  return new Error(`Export failed. ${message}`);
}

async function loadHtmlImage(imageUrl: string): Promise<HTMLImageElement> {
  const trimmedImageUrl = imageUrl.trim();

  if (!trimmedImageUrl) {
    throw new Error("Image URL is required.");
  }

  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(toUserFacingImageError(trimmedImageUrl));
    image.src = trimmedImageUrl;
  });
}

type CanvasArtworkScene = {
  scene: Scene;
  dispose: () => void;
};

async function buildCanvasArtworkScene(
  input: CanvasGlbInput,
  options: CanvasGlbOptions = {}
): Promise<CanvasArtworkScene> {
  const widthCm = Number(input.widthCm);
  const heightCm = Number(input.heightCm);
  const depthCm = Number(input.depthCm ?? DEFAULT_DEPTH_CM);
  const rotationXDeg =
    options.frontRotationXDeg ?? DEFAULT_FRONT_ROTATION_X_DEG;
  const rotationYDeg =
    options.frontRotationYDeg ?? DEFAULT_FRONT_ROTATION_Y_DEG;
  const sideMode = options.sideMode ?? DEFAULT_SIDE_MODE;
  const showBackLabel = options.showBackLabel ?? DEFAULT_SHOW_BACK_LABEL;
  const maxTextureSize = options.maxTextureSize ?? DEFAULT_MAX_TEXTURE_SIZE;

  assertPositiveNumber(widthCm, "Width");
  assertPositiveNumber(heightCm, "Height");
  assertPositiveNumber(depthCm, "Depth");

  const width = widthCm / 100;
  const height = heightCm / 100;
  const depth = depthCm / 100;
  const rotationXRad = (rotationXDeg * Math.PI) / 180;
  const rotationYRad = (rotationYDeg * Math.PI) / 180;
  const image = await loadHtmlImage(input.imageUrl);
  const frontTexture = createFrontTextureFromImage(image, maxTextureSize);
  const edgeTextures =
    sideMode === "image"
      ? createEdgeTexturesFromImage(image, {
          textureSize: Math.min(EDGE_TEXTURE_SIZE, maxTextureSize),
        })
      : null;
  const backTexture = showBackLabel ? createBackLabelTexture(input, options) : null;

  const geometry = new BoxGeometry(width, height, depth);
  // Re-assert material groups explicitly so the exported mesh keeps the same
  // face-to-material mapping: right, left, top, bottom, front, back.
  // If iOS Quick Look shows the back or side first,
  // adjust frontRotationYDeg in /tools/canvas-glb and regenerate the GLB.
  geometry.clearGroups();
  for (let faceIndex = 0; faceIndex < 6; faceIndex += 1) {
    geometry.addGroup(faceIndex * 6, 6, faceIndex);
  }

  const frontMaterial = new MeshStandardMaterial({
    map: frontTexture,
    metalness: 0,
    roughness: 0.98,
  });
  const sideMaterial = new MeshStandardMaterial({
    color: options.sideColor ?? DEFAULT_SIDE_COLOR,
    metalness: 0,
    roughness: 0.85,
  });
  const backMaterial = backTexture
    ? new MeshStandardMaterial({
        map: backTexture,
        metalness: 0,
        roughness: 0.9,
      })
    : new MeshStandardMaterial({
        color: options.backColor ?? DEFAULT_BACK_COLOR,
        metalness: 0,
        roughness: 0.9,
      });
  const rightEdgeMaterial =
    sideMode === "image" && edgeTextures
      ? new MeshStandardMaterial({
          map: edgeTextures.right,
          metalness: 0,
          roughness: 0.82,
        })
      : null;
  const leftEdgeMaterial =
    sideMode === "image" && edgeTextures
      ? new MeshStandardMaterial({
          map: edgeTextures.left,
          metalness: 0,
          roughness: 0.82,
        })
      : null;
  const topEdgeMaterial =
    sideMode === "image" && edgeTextures
      ? new MeshStandardMaterial({
          map: edgeTextures.top,
          metalness: 0,
          roughness: 0.82,
        })
      : null;
  const bottomEdgeMaterial =
    sideMode === "image" && edgeTextures
      ? new MeshStandardMaterial({
          map: edgeTextures.bottom,
          metalness: 0,
          roughness: 0.82,
        })
      : null;

  const materials =
    rightEdgeMaterial &&
    leftEdgeMaterial &&
    topEdgeMaterial &&
    bottomEdgeMaterial
      ? [
          rightEdgeMaterial,
          leftEdgeMaterial,
          topEdgeMaterial,
          bottomEdgeMaterial,
          frontMaterial,
          backMaterial,
        ]
      : [
          sideMaterial, // right
          sideMaterial, // left
          sideMaterial, // top
          sideMaterial, // bottom
          frontMaterial, // front
          backMaterial, // back
        ];

  const mesh = new Mesh(geometry, materials);
  mesh.name = "ArtworkCanvas";

  const root = new Group();
  root.name = "ArtworkCanvasRoot";
  root.rotation.x = rotationXRad;
  root.rotation.y = rotationYRad;
  root.add(mesh);

  const scene = new Scene();
  scene.name = input.title.trim() || "Artwork Canvas";
  scene.add(root);

  return {
    scene,
    dispose: () => {
      geometry.dispose();
      const disposableMaterials = new Set([
        frontMaterial,
        sideMaterial,
        backMaterial,
        rightEdgeMaterial,
        leftEdgeMaterial,
        topEdgeMaterial,
        bottomEdgeMaterial,
      ]);

      for (const material of disposableMaterials) {
        if (!material) continue;
        material.dispose();
      }
      frontTexture.dispose();
      backTexture?.dispose();
      edgeTextures?.left.dispose();
      edgeTextures?.right.dispose();
      edgeTextures?.top.dispose();
      edgeTextures?.bottom.dispose();
    },
  };
}

async function exportCanvasGlbBlob(scene: Scene, maxTextureSize: number) {
  const exporter = new GLTFExporter();

  const result = await new Promise<ArrayBuffer>((resolve, reject) => {
    exporter.parse(
      scene,
      (gltf) => {
        if (gltf instanceof ArrayBuffer) {
          resolve(gltf);
          return;
        }

        reject(new Error("GLB export failed: expected ArrayBuffer output."));
      },
      (error) => reject(error),
      {
        binary: true,
        trs: true,
        onlyVisible: true,
        maxTextureSize,
      }
    );
  });

  return new Blob([result], { type: "model/gltf-binary" });
}

export type CanvasArAssetBlobs = {
  glbBlob: Blob;
  usdzBlob: Blob | null;
  usdzError: Error | null;
};

export async function createCanvasGlbBlob(
  input: CanvasGlbInput,
  options: CanvasGlbOptions = {}
): Promise<Blob> {
  const maxTextureSize = options.maxTextureSize ?? DEFAULT_MAX_TEXTURE_SIZE;
  const { scene, dispose } = await buildCanvasArtworkScene(input, options);

  try {
    return await exportCanvasGlbBlob(scene, maxTextureSize);
  } catch (error) {
    throw toUserFacingExportError(error);
  } finally {
    dispose();
  }
}

type CanvasUsdzTextureMode = "image" | "solid";

type CanvasUsdzOptions = CanvasGlbOptions & {
  usdzTextureMode?: CanvasUsdzTextureMode;
};

function createSolidUsdzMaterial(color: string) {
  const material = new MeshStandardMaterial({
    color,
    metalness: 0,
    roughness: 0.92,
    transparent: false,
    opacity: 1,
    depthWrite: true,
    depthTest: true,
    alphaTest: 0,
    side: 0,
  });

  material.needsUpdate = true;
  return material;
}

function createUsdzFrontTextureFromImage(
  image: HTMLImageElement,
  maxTextureSize: number
) {
  const { width, height } = getImageDimensions(image);
  const largestSide = Math.max(width, height);
  const scale =
    largestSide > maxTextureSize ? maxTextureSize / largestSide : 1;
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Failed to create the USDZ front texture canvas.");
  }

  // Flatten the image onto an opaque background so Quick Look never sees
  // the artwork as transparent when the source image contains alpha.
  ctx.fillStyle = "#f7f4ee";
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

  const texture = createCanvasTexture(canvas);
  texture.flipY = false;

  return texture;
}

function createCanvasUsdzScene(
  input: CanvasGlbInput,
  image: HTMLImageElement,
  options: CanvasUsdzOptions = {}
) {
  const widthCm = Number(input.widthCm);
  const heightCm = Number(input.heightCm);
  const depthCm = Math.max(Number(input.depthCm ?? DEFAULT_DEPTH_CM), 2.5);
  const maxTextureSize = options.maxTextureSize ?? DEFAULT_MAX_TEXTURE_SIZE;
  const usdzTextureMode = options.usdzTextureMode ?? "image";
  const rotationXRad =
    ((options.frontRotationXDeg ?? DEFAULT_FRONT_ROTATION_X_DEG) * Math.PI) /
    180;
  const rotationYRad =
    ((options.frontRotationYDeg ?? DEFAULT_FRONT_ROTATION_Y_DEG) * Math.PI) /
    180;

  assertPositiveNumber(widthCm, "Width");
  assertPositiveNumber(heightCm, "Height");
  assertPositiveNumber(depthCm, "Depth");

  const width = widthCm / 100;
  const height = heightCm / 100;
  const depth = depthCm / 100;

  const geometry = new BoxGeometry(width, height, depth);

  let frontMaterial: MeshStandardMaterial;

  if (usdzTextureMode === "solid") {
    frontMaterial = createSolidUsdzMaterial("#f7f4ee");
  } else {
    frontMaterial = new MeshStandardMaterial({
      map: createUsdzFrontTextureFromImage(
        image,
        maxTextureSize
      ),
      color: 0xffffff,
      metalness: 0,
      roughness: 0.9,
      transparent: false,
      opacity: 1,
      depthWrite: true,
      depthTest: true,
      alphaTest: 0,
      side: 0,
    });
    frontMaterial.needsUpdate = true;
  }

  const mesh = new Mesh(geometry, frontMaterial);
  mesh.name = "ArtworkCanvasUSDZ";
  mesh.position.set(0, 0, 0);
  mesh.rotation.set(rotationXRad, rotationYRad, 0);
  mesh.scale.set(1, 1, 1);
  mesh.matrixAutoUpdate = true;

  const scene = new Scene();
  scene.name = input.title.trim() || "Artwork Canvas USDZ";
  scene.add(mesh);
  scene.position.set(0, 0, 0);
  scene.rotation.set(0, 0, 0);
  scene.scale.set(1, 1, 1);
  scene.updateMatrixWorld(true);

  return {
    scene,
    dispose: () => {
      geometry.dispose();
      frontMaterial.dispose();
      const texture = frontMaterial.map as CanvasTexture | null;
      texture?.dispose();
    },
  };
}

function isUsdzStandardMaterial(material: unknown) {
  return (
    material instanceof MeshStandardMaterial ||
    (typeof material === "object" &&
      material !== null &&
      "type" in material &&
      (material as { type?: unknown }).type === "MeshStandardMaterial") ||
    (typeof material === "object" &&
      material !== null &&
      "isMeshStandardMaterial" in material &&
      (material as { isMeshStandardMaterial?: unknown }).isMeshStandardMaterial ===
        true)
  );
}

function assertUsdzCompatibleScene(scene: Scene) {
  const invalidMaterials: string[] = [];
  const invalidObjects: string[] = [];

  scene.traverse((object) => {
    if (!(object instanceof Mesh)) {
      return;
    }

    if (Array.isArray(object.material)) {
      invalidObjects.push(
        `${object.name || "UnnamedMesh"}: material array is not supported for USDZ`
      );
      return;
    }

    if (!isUsdzStandardMaterial(object.material)) {
      const material = object.material as { type?: string } | undefined;

      invalidMaterials.push(
        `${object.name || "UnnamedMesh"}: ${material?.type || "unknown"}`
      );
    }
  });

  if (invalidObjects.length > 0 || invalidMaterials.length > 0) {
    throw new Error(
      `USDZ export requires MeshStandardMaterial only. Invalid materials: ${[
        ...invalidObjects,
        ...invalidMaterials,
      ].join(", ")}`
    );
  }
}

async function exportCanvasUsdzBlob(scene: Scene, maxTextureSize: number) {
  scene.updateMatrixWorld(true);
  assertUsdzCompatibleScene(scene);

  const exporter = new USDZExporter();
  const result = await exporter.parseAsync(scene, {
    includeAnchoringProperties: true,
    quickLookCompatible: true,
    onlyVisible: true,
    maxTextureSize,
  });

  const blob = new Blob([result], { type: "model/vnd.usdz+zip" });

  if (blob.size < 20 * 1024) {
    throw new Error(
      "USDZ was generated but looks too small to be valid for iPhone Quick Look."
    );
  }

  return blob;
}

export async function createCanvasUsdzBlob(
  input: CanvasGlbInput,
  options: CanvasUsdzOptions = {}
): Promise<Blob> {
  const maxTextureSize = options.maxTextureSize ?? DEFAULT_MAX_TEXTURE_SIZE;
  const image = await loadHtmlImage(input.imageUrl);
  const { scene, dispose } = createCanvasUsdzScene(input, image, options);

  try {
    return await exportCanvasUsdzBlob(scene, maxTextureSize);
  } catch (error) {
    throw toUserFacingExportError(error);
  } finally {
    dispose();
  }
}

export type CanvasArFilesResult = {
  glbBlob: Blob;
  usdzBlob?: Blob;
  usdzError?: string;
};

export async function createCanvasArFiles(
  input: CanvasGlbInput,
  options: CanvasUsdzOptions = {}
): Promise<CanvasArFilesResult> {
  const [glbResult, usdzResult] = await Promise.allSettled([
    createCanvasGlbBlob(input, options),
    createCanvasUsdzBlob(input, options),
  ]);

  if (glbResult.status === "rejected") {
    throw glbResult.reason;
  }

  if (usdzResult.status === "fulfilled") {
    return {
      glbBlob: glbResult.value,
      usdzBlob: usdzResult.value,
    };
  }

  const usdzError =
    usdzResult.reason instanceof Error
      ? usdzResult.reason.message
      : typeof usdzResult.reason === "string"
        ? usdzResult.reason
        : "USDZ generation failed.";

  return {
    glbBlob: glbResult.value,
    usdzError,
  };
}

export async function createCanvasArAssetBlobs(
  input: CanvasGlbInput,
  options: CanvasUsdzOptions = {}
): Promise<CanvasArFilesResult> {
  return createCanvasArFiles(input, options);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const downloadName = filename.toLowerCase().endsWith(".glb")
    ? filename
    : `${filename}.glb`;
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = objectUrl;
  anchor.download = downloadName;
  anchor.rel = "noopener";
  anchor.style.display = "none";

  document.body.appendChild(anchor);
  anchor.click();

  window.setTimeout(() => {
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  }, 0);
}

export function createSafeGlbFilename(title: string): string {
  const normalizedTitle = title
    .replace(/\.glb$/i, "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return normalizedTitle ? `${normalizedTitle}.glb` : "artwork-canvas.glb";
}
