import {
  CanvasTexture,
  ClampToEdgeWrapping,
  LinearFilter,
  LinearMipmapLinearFilter,
  SRGBColorSpace,
} from "three";
import { createOrientationFixture } from "./createOrientationFixture";
import { drawArtworkImageToFrontAtlas, drawProductionBackLabel } from "./productionArtwork";
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

export function buildTextureAtlas(config: ArtworkBuildConfig): ArtworkAtlas {
  if (typeof document === "undefined") throw new Error("Texture atlas requires a browser canvas.");
  if (config.buildMode === "production" && config.sourceMode === "local-image" && (!config.metadata?.title.trim() || !config.metadata.artistName.trim())) {
    throw new Error("Production Artwork requires Artwork Title and Artist Name.");
  }
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
    drawArtworkImageToFrontAtlas(context, front, ATLAS_RECTS.front, config.orientation);
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
    if (config.showBackLabel && config.metadata) {
      drawProductionBackLabel(context, ATLAS_RECTS.back, config.metadata, config);
    }
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
