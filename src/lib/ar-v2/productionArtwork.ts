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

export function drawProductionBackLabel(
  context: CanvasRenderingContext2D,
  rect: CanvasRect,
  metadata: ArtworkProductionMetadata,
  dimensions: PhysicalDimensions,
) {
  const cardPadding = Math.max(42, Math.round(rect.width * 0.06));
  const cardX = rect.x + cardPadding;
  const cardY = rect.y + cardPadding;
  const cardWidth = rect.width - cardPadding * 2;
  const cardHeight = rect.height - cardPadding * 2;
  const contentX = cardX + Math.max(34, Math.round(cardWidth * 0.08));
  const contentWidth = cardWidth - Math.max(34, Math.round(cardWidth * 0.08)) * 2;
  let cursorY = cardY + Math.max(48, Math.round(cardHeight * 0.12));

  context.save();
  context.fillStyle = PRODUCTION_COLORS.backBackground;
  context.fillRect(rect.x, rect.y, rect.width, rect.height);
  context.fillStyle = PRODUCTION_COLORS.backCard;
  context.fillRect(cardX, cardY, cardWidth, cardHeight);
  context.strokeStyle = PRODUCTION_COLORS.text;
  context.lineWidth = 3;
  context.strokeRect(cardX, cardY, cardWidth, cardHeight);
  context.fillStyle = PRODUCTION_COLORS.text;
  context.textAlign = "left";
  context.textBaseline = "top";

  context.font = `700 ${Math.max(24, Math.round(rect.width / 25))}px Arial, sans-serif`;
  context.fillText("KÜN’S GALLERY", contentX, cursorY);
  cursorY += Math.max(54, Math.round(rect.height / 12));

  context.font = `800 ${Math.max(32, Math.round(rect.width / 12))}px Arial, sans-serif`;
  cursorY = drawTextLines(context, wrapTextLines(context, metadata.title || "Untitled Test", contentWidth, 3), contentX, cursorY, Math.max(42, Math.round(rect.height / 14)));
  cursorY += 22;
  context.font = `600 ${Math.max(28, Math.round(rect.width / 18))}px Arial, sans-serif`;
  cursorY = drawTextLines(context, wrapTextLines(context, metadata.artistName || "Test Artist", contentWidth, 2), contentX, cursorY, Math.max(36, Math.round(rect.height / 18)));
  cursorY += Math.max(34, Math.round(rect.height / 18));

  const infoRows = [
    metadata.year.trim() ? `Year  ${metadata.year.trim()}` : "",
    metadata.medium.trim() ? `Medium  ${metadata.medium.trim()}` : "",
    `Dimensions  ${formatDimensions(dimensions)}`,
    metadata.inventoryNumber?.trim() ? `Inventory No.  ${metadata.inventoryNumber.trim()}` : "",
  ].filter(Boolean);
  context.font = `500 ${Math.max(22, Math.round(rect.width / 28))}px Arial, sans-serif`;
  infoRows.forEach((row) => {
    const lines = wrapTextLines(context, row, contentWidth, 2);
    cursorY = drawTextLines(context, lines, contentX, cursorY, Math.max(30, Math.round(rect.height / 25))) + 12;
  });
  context.restore();
}

export function drawContainedArtworkImage(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  rect: CanvasRect,
  orientation: ArtworkOrientation,
  background: string = PRODUCTION_COLORS.atlasBackground,
) {
  const naturalWidth = "naturalWidth" in image ? image.naturalWidth : "width" in image && typeof image.width === "number" ? image.width : 0;
  const naturalHeight = "naturalHeight" in image ? image.naturalHeight : "height" in image && typeof image.height === "number" ? image.height : 0;
  if (!naturalWidth || !naturalHeight) throw new Error("Selected image has no readable dimensions.");
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

export function drawArtworkSourceThumbnail(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  width: number,
  height: number,
  orientation: ArtworkOrientation,
) {
  drawContainedArtworkImage(context, image, { x: 0, y: 0, width, height, padding: Math.max(8, Math.round(Math.min(width, height) * 0.04)) }, orientation);
}
