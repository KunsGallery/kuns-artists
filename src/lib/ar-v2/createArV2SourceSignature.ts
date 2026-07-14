import type { ArV2SourceSignatureInput } from "./types";

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function createArV2SourceSignature(input: ArV2SourceSignatureInput) {
  return JSON.stringify({
    workId: normalizeText(input.workId),
    coverImageUrl: normalizeText(input.coverImageUrl),
    title: normalizeText(input.title),
    artistName: normalizeText(input.artistName),
    year: normalizeText(input.year),
    medium: normalizeText(input.medium),
    widthCm: input.widthCm,
    heightCm: input.heightCm,
    depthCm: input.depthCm,
    rotationDeg: input.rotationDeg,
    flipX: Boolean(input.flipX),
    flipY: Boolean(input.flipY),
    sideColor: normalizeText(input.sideColor),
    backLabelEnabled: Boolean(input.backLabelEnabled),
    allowRatioMismatch: Boolean(input.allowRatioMismatch),
    version: "ar-v2.1",
  });
}
