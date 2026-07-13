import {
  CanvasTexture,
  ClampToEdgeWrapping,
  LinearFilter,
  LinearMipmapLinearFilter,
  SRGBColorSpace,
} from "three";
import { createOrientationFixture } from "./createOrientationFixture";
import type {
  ArtworkAtlas,
  ArtworkBuildConfig,
  AtlasRect,
  FaceName,
} from "./types";

export const ATLAS_SIZE = 2048;
export const ATLAS_RECTS: Record<FaceName, AtlasRect> = {
  front: { x: 0, y: 0, width: 1024, height: 1024, padding: 20 },
  back: { x: 1024, y: 0, width: 1024, height: 1024, padding: 20 },
  left: { x: 0, y: 1024, width: 512, height: 512, padding: 16 },
  right: { x: 512, y: 1024, width: 512, height: 512, padding: 16 },
  top: { x: 1024, y: 1024, width: 512, height: 512, padding: 16 },
  bottom: { x: 1536, y: 1024, width: 512, height: 512, padding: 16 },
};

export const GEOMETRY_FACE_ORDER: FaceName[] = [
  "front",
  "back",
  "right",
  "left",
  "top",
  "bottom",
];

export function atlasRectToUv(rect: AtlasRect, atlasSize = ATLAS_SIZE) {
  return {
    uLeft: (rect.x + rect.padding) / atlasSize,
    uRight: (rect.x + rect.width - rect.padding) / atlasSize,
    vTop: (rect.y + rect.padding) / atlasSize,
    vBottom: (rect.y + rect.height - rect.padding) / atlasSize,
  };
}

function drawOrientedImage(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  rect: AtlasRect,
  orientation: ArtworkBuildConfig["orientation"],
) {
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;
  const drawWidth = rect.width - rect.padding * 2;
  const drawHeight = rect.height - rect.padding * 2;
  const naturalWidth = "naturalWidth" in image ? image.naturalWidth : "width" in image && typeof image.width === "number" ? image.width : 0;
  const naturalHeight = "naturalHeight" in image ? image.naturalHeight : "height" in image && typeof image.height === "number" ? image.height : 0;
  if (!naturalWidth || !naturalHeight) throw new Error("Selected image has no readable dimensions.");
  const rotated = orientation.rotationDeg === 90 || orientation.rotationDeg === 270;
  const imageWidth = rotated ? naturalHeight : naturalWidth;
  const imageHeight = rotated ? naturalWidth : naturalHeight;
  const scale = Math.min(drawWidth / imageWidth, drawHeight / imageHeight);

  context.save();
  context.translate(centerX, centerY);
  context.rotate((orientation.rotationDeg * Math.PI) / 180);
  context.scale(orientation.flipX ? -1 : 1, orientation.flipY ? -1 : 1);
  context.drawImage(
    image,
    (-naturalWidth * scale) / 2,
    (-naturalHeight * scale) / 2,
    naturalWidth * scale,
    naturalHeight * scale,
  );
  context.restore();
}

function drawLabel(
  context: CanvasRenderingContext2D,
  rect: AtlasRect,
  label: string,
  color = "#f0eadf",
) {
  context.fillStyle = color;
  context.fillRect(rect.x, rect.y, rect.width, rect.height);
  context.strokeStyle = "#111111";
  context.lineWidth = 7;
  context.strokeRect(rect.x + 8, rect.y + 8, rect.width - 16, rect.height - 16);
  context.fillStyle = "#111111";
  context.font = `800 ${Math.max(24, Math.round(rect.width / 15))}px Arial, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(label, rect.x + rect.width / 2, rect.y + rect.height / 2);
}

export function buildTextureAtlas(config: ArtworkBuildConfig): ArtworkAtlas {
  if (typeof document === "undefined") throw new Error("Texture atlas requires a browser canvas.");
  const canvas = document.createElement("canvas");
  canvas.width = ATLAS_SIZE;
  canvas.height = ATLAS_SIZE;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Could not create the texture atlas canvas.");

  context.fillStyle = config.sideColor;
  context.fillRect(0, 0, ATLAS_SIZE, ATLAS_SIZE);
  const fixtures = createOrientationFixture(config.orientation);
  const front = config.sourceMode === "local-image" && config.image ? config.image : fixtures.front;

  if (config.sourceMode === "local-image" && config.image) {
    drawLabel(context, ATLAS_RECTS.front, config.sideColor);
    drawOrientedImage(context, front, ATLAS_RECTS.front, config.orientation);
  } else {
    context.drawImage(fixtures.front, ATLAS_RECTS.front.x, ATLAS_RECTS.front.y);
  }
  context.drawImage(fixtures.back, ATLAS_RECTS.back.x, ATLAS_RECTS.back.y);
  context.drawImage(fixtures.left, ATLAS_RECTS.left.x, ATLAS_RECTS.left.y);
  context.drawImage(fixtures.right, ATLAS_RECTS.right.x, ATLAS_RECTS.right.y);
  context.drawImage(fixtures.top, ATLAS_RECTS.top.x, ATLAS_RECTS.top.y);
  context.drawImage(fixtures.bottom, ATLAS_RECTS.bottom.x, ATLAS_RECTS.bottom.y);

  if (config.buildMode === "production") {
    context.fillStyle = config.sideColor;
    for (const face of ["left", "right", "top", "bottom"] as const) {
      const rect = ATLAS_RECTS[face];
      context.fillRect(rect.x, rect.y, rect.width, rect.height);
    }
    context.fillStyle = "#f0eadf";
    context.fillRect(ATLAS_RECTS.back.x, ATLAS_RECTS.back.y, ATLAS_RECTS.back.width, ATLAS_RECTS.back.height);
    if (config.showBackLabel) drawLabel(context, ATLAS_RECTS.back, "BACK / WORK LABEL");
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.flipY = false;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return { canvas, texture, rects: ATLAS_RECTS };
}

export function applyAtlasUvs(geometry: import("three").BufferGeometry) {
  const uv = geometry.getAttribute("uv");
  GEOMETRY_FACE_ORDER.forEach((face, faceIndex) => {
    const rect = atlasRectToUv(ATLAS_RECTS[face]);
    const values = [
      rect.uLeft, rect.vBottom,
      rect.uRight, rect.vBottom,
      rect.uRight, rect.vTop,
      rect.uLeft, rect.vTop,
    ];
    for (let vertex = 0; vertex < 4; vertex += 1) {
      uv.setXY(faceIndex * 4 + vertex, values[vertex * 2], values[vertex * 2 + 1]);
    }
  });
  uv.needsUpdate = true;
}
