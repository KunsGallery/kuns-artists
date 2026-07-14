import type {
  ArtworkImageRatio,
  ArtworkOrientation,
  ArtworkProductionMetadata,
  PhysicalDimensions,
} from "./types";

export const PRODUCTION_COLORS = {
  atlasBackground: "#f5f2ec",
  backBackground: "#f0eadf",
  backCard: "#faf7f0",
  text: "#111111",
} as const;

export function getArtworkImageRatio(
  image: Pick<HTMLImageElement, "naturalWidth" | "naturalHeight"> | undefined,
  dimensions: PhysicalDimensions,
  orientation: ArtworkOrientation,
): ArtworkImageRatio | null {
  if (!image?.naturalWidth || !image.naturalHeight) return null;
  const physicalAspect = dimensions.widthCm / dimensions.heightCm;
  if (!Number.isFinite(physicalAspect) || physicalAspect <= 0) return null;
  const isQuarterTurn = orientation.rotationDeg === 90 || orientation.rotationDeg === 270;
  const imageAspect = isQuarterTurn
    ? image.naturalHeight / image.naturalWidth
    : image.naturalWidth / image.naturalHeight;
  const differenceRatio = Math.abs(imageAspect - physicalAspect) / physicalAspect;
  const status = differenceRatio <= 0.02 ? "pass" : differenceRatio <= 0.05 ? "warning" : "fail";
  return { imageAspect, physicalAspect, differenceRatio, status };
}

export function formatDimensions(dimensions: PhysicalDimensions) {
  return `${dimensions.widthCm} × ${dimensions.heightCm} × ${dimensions.depthCm} cm`;
}

export function formatRatioPercent(ratio: ArtworkImageRatio | null) {
  return ratio ? `${(ratio.differenceRatio * 100).toFixed(1)}%` : "—";
}

type CanvasRect = { x: number; y: number; width: number; height: number; padding: number };

export const LABEL_SURFACE_SHORT_PX = 768;
export const LABEL_SURFACE_MAX_LONG_PX = 4096;
export const MAX_LABEL_HEIGHT_CM = 36;
export const LABEL_WIDTH_TO_HEIGHT = 0.8;
export const MAX_SHORT_SIDE_FRACTION = 0.72;

function ellipsize(context: CanvasRenderingContext2D, value: string, maxWidth: number) {
  if (context.measureText(value).width <= maxWidth) return value;
  let result = value;
  while (result.length > 1 && context.measureText(`${result}…`).width > maxWidth) result = result.slice(0, -1);
  return `${result.trimEnd()}…`;
}

function wrapTextLines(context: CanvasRenderingContext2D, value: string, maxWidth: number, maxLines: number) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let line = "";
  let truncated = false;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    if (lines.length === maxLines) {
      truncated = true;
      break;
    }
    line = word;
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (line && lines.length === maxLines && lines[lines.length - 1] !== line) truncated = true;
  if (truncated || lines.some((item) => context.measureText(item).width > maxWidth)) lines[lines.length - 1] = ellipsize(context, lines[lines.length - 1], maxWidth);
  return lines;
}

function drawTextLines(
  context: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  lineHeight: number,
) {
  lines.forEach((line, index) => context.fillText(line, x, y + index * lineHeight));
  return y + lines.length * lineHeight;
}

export function getBackLabelSurfaceSize(widthCm: number, heightCm: number) {
  const aspect = widthCm / heightCm;
  if (!Number.isFinite(aspect) || aspect <= 0) throw new Error("Back label requires valid artwork dimensions.");

  if (aspect >= 1) {
    const width = Math.min(LABEL_SURFACE_MAX_LONG_PX, Math.round(LABEL_SURFACE_SHORT_PX * aspect));
    const height = Math.max(1, Math.round(width / aspect));
    return { width, height };
  }

  const height = Math.min(LABEL_SURFACE_MAX_LONG_PX, Math.round(LABEL_SURFACE_SHORT_PX / aspect));
  const width = Math.max(1, Math.round(height * aspect));
  return { width, height };
}

export function getBackLabelCardMetrics(widthCm: number, heightCm: number) {
  const surface = getBackLabelSurfaceSize(widthCm, heightCm);
  const pxPerCmX = surface.width / widthCm;
  const pxPerCmY = surface.height / heightCm;
  const shortSideCm = Math.min(widthCm, heightCm);
  const labelHeightCm = Math.min(MAX_LABEL_HEIGHT_CM, shortSideCm * MAX_SHORT_SIDE_FRACTION);
  const labelWidthCm = labelHeightCm * LABEL_WIDTH_TO_HEIGHT;
  const labelWidthPx = Math.max(1, Math.round(labelWidthCm * pxPerCmX));
  const labelHeightPx = Math.max(1, Math.round(labelHeightCm * pxPerCmY));
  const cardX = Math.round((surface.width - labelWidthPx) / 2);
  const cardY = Math.round((surface.height - labelHeightPx) / 2);
  return {
    surface,
    pxPerCmX,
    pxPerCmY,
    shortSideCm,
    labelWidthCm,
    labelHeightCm,
    labelWidthPx,
    labelHeightPx,
    cardX,
    cardY,
    cardWidth: labelWidthPx,
    cardHeight: labelHeightPx,
    contentX: cardX + Math.max(36, Math.round(labelWidthPx * 0.1)),
    contentY: cardY + Math.max(40, Math.round(labelHeightPx * 0.12)),
    contentWidth: labelWidthPx - Math.max(36, Math.round(labelWidthPx * 0.1)) * 2,
    contentHeight: labelHeightPx - Math.max(40, Math.round(labelHeightPx * 0.12)) * 2,
    cardShortPx: Math.min(labelWidthPx, labelHeightPx),
  };
}

function buildBackLabelTypography(cardShortPx: number, scale = 1) {
  const adjusted = Math.max(0.7, Math.min(scale, 1));
  return {
    gallery: Math.max(24, Math.round(cardShortPx * 0.055 * adjusted)),
    title: Math.max(32, Math.round(cardShortPx * 0.105 * adjusted)),
    artist: Math.max(28, Math.round(cardShortPx * 0.075 * adjusted)),
    info: Math.max(22, Math.round(cardShortPx * 0.048 * adjusted)),
  };
}

function measureBackLabelLayout(
  context: CanvasRenderingContext2D,
  metadata: ArtworkProductionMetadata,
  dimensions: PhysicalDimensions,
  metrics: ReturnType<typeof getBackLabelCardMetrics>,
  typography = buildBackLabelTypography(metrics.cardShortPx),
) {
  const contentX = metrics.contentX;
  const contentWidth = Math.max(1, metrics.contentWidth);
  const title = metadata.title.trim() || "Untitled Test";
  const artist = metadata.artistName.trim() || "Test Artist";
  const infoRows = [
    metadata.year.trim() ? `Year  ${metadata.year.trim()}` : "",
    metadata.medium.trim() ? `Medium  ${metadata.medium.trim()}` : "",
    `Dimensions  ${formatDimensions(dimensions)}`,
    metadata.inventoryNumber?.trim() ? `Inventory No.  ${metadata.inventoryNumber.trim()}` : "",
  ].filter(Boolean);

  context.textAlign = "left";
  context.textBaseline = "top";

  context.font = `700 ${typography.gallery}px Arial, sans-serif`;
  const galleryLineHeight = Math.max(30, Math.round(typography.gallery * 1.22));
  const galleryHeight = galleryLineHeight;

  context.font = `800 ${typography.title}px Arial, sans-serif`;
  const titleLines = wrapTextLines(context, title, contentWidth, 3);
  const titleLineHeight = Math.max(38, Math.round(typography.title * 1.24));
  const titleHeight = titleLines.length * titleLineHeight;

  context.font = `600 ${typography.artist}px Arial, sans-serif`;
  const artistLines = wrapTextLines(context, artist, contentWidth, 2);
  const artistLineHeight = Math.max(34, Math.round(typography.artist * 1.23));
  const artistHeight = artistLines.length * artistLineHeight;

  context.font = `500 ${typography.info}px Arial, sans-serif`;
  const infoLineHeight = Math.max(28, Math.round(typography.info * 1.24));
  const infoBlocks = infoRows.map((row) => wrapTextLines(context, row, contentWidth, 2));
  const infoHeight = infoBlocks.reduce((total, lines) => total + lines.length * infoLineHeight + 12, 0);

  const totalHeight = galleryHeight + Math.max(18, Math.round(metrics.cardShortPx * 0.06))
    + titleHeight + Math.max(16, Math.round(metrics.cardShortPx * 0.045))
    + artistHeight + Math.max(18, Math.round(metrics.cardShortPx * 0.05))
    + infoHeight;

  return {
    contentX,
    contentWidth,
    typography,
    galleryLineHeight,
    titleLines,
    titleLineHeight,
    artistLines,
    artistLineHeight,
    infoBlocks,
    infoLineHeight,
    totalHeight,
  };
}

function drawBackLabelSurface(
  context: CanvasRenderingContext2D,
  metadata: ArtworkProductionMetadata,
  dimensions: PhysicalDimensions,
  metrics: ReturnType<typeof getBackLabelCardMetrics>,
) {
  context.save();
  context.fillStyle = PRODUCTION_COLORS.backBackground;
  context.fillRect(0, 0, metrics.surface.width, metrics.surface.height);
  context.fillStyle = PRODUCTION_COLORS.backCard;
  context.strokeStyle = PRODUCTION_COLORS.text;
  context.lineWidth = Math.max(2, Math.round(metrics.cardShortPx * 0.006));

  let typography = buildBackLabelTypography(metrics.cardShortPx);
  let layout = measureBackLabelLayout(context, metadata, dimensions, metrics, typography);
  if (layout.totalHeight > metrics.contentHeight) {
    typography = buildBackLabelTypography(metrics.cardShortPx, metrics.contentHeight / layout.totalHeight);
    layout = measureBackLabelLayout(context, metadata, dimensions, metrics, typography);
  }

  const cardX = metrics.cardX;
  const cardY = metrics.cardY;
  const cardWidth = metrics.cardWidth;
  const cardHeight = metrics.cardHeight;

  context.fillRect(cardX, cardY, cardWidth, cardHeight);
  context.strokeRect(cardX, cardY, cardWidth, cardHeight);

  context.fillStyle = PRODUCTION_COLORS.text;
  context.textAlign = "left";
  context.textBaseline = "top";

  const gapAfterGallery = Math.max(18, Math.round(metrics.cardShortPx * 0.06));
  const gapAfterTitle = Math.max(16, Math.round(metrics.cardShortPx * 0.045));
  const gapAfterArtist = Math.max(18, Math.round(metrics.cardShortPx * 0.05));
  const infoGap = 12;
  const titleStart = layout.contentX;
  let cursorY = metrics.contentY;

  context.font = `700 ${layout.typography.gallery}px Arial, sans-serif`;
  context.fillText("KÜN’S GALLERY", titleStart, cursorY);
  cursorY += layout.galleryLineHeight + gapAfterGallery;

  context.font = `800 ${layout.typography.title}px Arial, sans-serif`;
  cursorY = drawTextLines(context, layout.titleLines, titleStart, cursorY, layout.titleLineHeight) + gapAfterTitle;

  context.font = `600 ${layout.typography.artist}px Arial, sans-serif`;
  cursorY = drawTextLines(context, layout.artistLines, titleStart, cursorY, layout.artistLineHeight) + gapAfterArtist;

  context.font = `500 ${layout.typography.info}px Arial, sans-serif`;
  layout.infoBlocks.forEach((lines) => {
    cursorY = drawTextLines(context, lines, titleStart, cursorY, layout.infoLineHeight) + infoGap;
  });

  context.restore();
}

export function createProductionBackLabelCanvas(metadata: ArtworkProductionMetadata, dimensions: PhysicalDimensions) {
  if (typeof document === "undefined") throw new Error("Back label rendering requires a browser canvas.");
  const { width, height } = getBackLabelSurfaceSize(dimensions.widthCm, dimensions.heightCm);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Could not create the back label canvas.");
  const metrics = getBackLabelCardMetrics(dimensions.widthCm, dimensions.heightCm);
  drawBackLabelSurface(context, metadata, dimensions, metrics);
  return canvas;
}

export function drawProductionBackLabelToAtlas(
  context: CanvasRenderingContext2D,
  rect: CanvasRect,
  labelCanvas: HTMLCanvasElement,
) {
  context.save();
  context.fillStyle = PRODUCTION_COLORS.backBackground;
  context.fillRect(rect.x, rect.y, rect.width, rect.height);
  context.drawImage(labelCanvas, rect.x + rect.padding, rect.y + rect.padding, rect.width - rect.padding * 2, rect.height - rect.padding * 2);
  context.restore();
}

export function drawProductionBackLabel(
  context: CanvasRenderingContext2D,
  rect: CanvasRect,
  metadata: ArtworkProductionMetadata,
  dimensions: PhysicalDimensions,
) {
  drawProductionBackLabelToAtlas(context, rect, createProductionBackLabelCanvas(metadata, dimensions));
}

function getArtworkImageDimensions(image: CanvasImageSource) {
  const naturalWidth = "naturalWidth" in image ? image.naturalWidth : "width" in image && typeof image.width === "number" ? image.width : 0;
  const naturalHeight = "naturalHeight" in image ? image.naturalHeight : "height" in image && typeof image.height === "number" ? image.height : 0;
  if (!naturalWidth || !naturalHeight) throw new Error("Selected image has no readable dimensions.");
  return { naturalWidth, naturalHeight };
}

export function drawContainedArtworkThumbnail(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  rect: CanvasRect,
  orientation: ArtworkOrientation,
  background: string = PRODUCTION_COLORS.atlasBackground,
) {
  const { naturalWidth, naturalHeight } = getArtworkImageDimensions(image);
  const drawWidth = rect.width - rect.padding * 2;
  const drawHeight = rect.height - rect.padding * 2;
  const rotated = orientation.rotationDeg === 90 || orientation.rotationDeg === 270;
  const imageWidth = rotated ? naturalHeight : naturalWidth;
  const imageHeight = rotated ? naturalWidth : naturalHeight;
  const scale = Math.min(drawWidth / imageWidth, drawHeight / imageHeight);
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;

  context.fillStyle = background;
  context.fillRect(rect.x, rect.y, rect.width, rect.height);
  context.save();
  context.translate(centerX, centerY);
  context.rotate((orientation.rotationDeg * Math.PI) / 180);
  context.scale(orientation.flipX ? -1 : 1, orientation.flipY ? -1 : 1);
  context.drawImage(image, (-naturalWidth * scale) / 2, (-naturalHeight * scale) / 2, naturalWidth * scale, naturalHeight * scale);
  context.restore();
}

export function drawArtworkImageToFrontAtlas(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  rect: CanvasRect,
  orientation: ArtworkOrientation,
) {
  getArtworkImageDimensions(image);
  const x = rect.x + rect.padding;
  const y = rect.y + rect.padding;
  const width = rect.width - rect.padding * 2;
  const height = rect.height - rect.padding * 2;
  const rotated = orientation.rotationDeg === 90 || orientation.rotationDeg === 270;
  const drawWidth = rotated ? height : width;
  const drawHeight = rotated ? width : height;
  const centerX = x + width / 2;
  const centerY = y + height / 2;

  context.save();
  context.translate(centerX, centerY);
  context.rotate((orientation.rotationDeg * Math.PI) / 180);
  context.scale(orientation.flipX ? -1 : 1, orientation.flipY ? -1 : 1);
  context.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  context.restore();
}

export function drawCanvasContained(
  context: CanvasRenderingContext2D,
  sourceCanvas: HTMLCanvasElement,
  rect: CanvasRect,
  background: string = PRODUCTION_COLORS.backBackground,
) {
  const innerWidth = rect.width - rect.padding * 2;
  const innerHeight = rect.height - rect.padding * 2;
  const scale = Math.min(innerWidth / sourceCanvas.width, innerHeight / sourceCanvas.height);
  const drawWidth = sourceCanvas.width * scale;
  const drawHeight = sourceCanvas.height * scale;
  const drawX = rect.x + rect.padding + (innerWidth - drawWidth) / 2;
  const drawY = rect.y + rect.padding + (innerHeight - drawHeight) / 2;

  context.save();
  context.fillStyle = background;
  context.fillRect(rect.x, rect.y, rect.width, rect.height);
  context.drawImage(sourceCanvas, drawX, drawY, drawWidth, drawHeight);
  context.restore();
}

export function drawArtworkSourceThumbnail(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  width: number,
  height: number,
  orientation: ArtworkOrientation,
) {
  drawContainedArtworkThumbnail(context, image, { x: 0, y: 0, width, height, padding: Math.max(8, Math.round(Math.min(width, height) * 0.04)) }, orientation);
}
