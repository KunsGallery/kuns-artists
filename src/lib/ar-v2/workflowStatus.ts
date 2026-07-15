import { createArV2SourceSignature } from "./createArV2SourceSignature";
import type {
  ArV2SourceSignatureInput,
  WorkArV2Asset,
  WorkArV2Config,
  WorkArV2Request,
  WorkArV2Review,
} from "./types";

export type ArV2WorkflowStatus =
  | "not-requested"
  | "requested"
  | "changes-requested"
  | "approved"
  | "outdated"
  | "cancelled";

type WorkArV2WorkflowSource = {
  id?: string;
  coverImageUrl?: string;
  title?: string;
  artistName?: string;
  year?: string;
  medium?: string;
  widthCm?: number;
  heightCm?: number;
  depthCm?: number;
  arV2Config?: WorkArV2Config;
  arV2Request?: WorkArV2Request;
  arV2Review?: WorkArV2Review;
  arV2Asset?: Partial<WorkArV2Asset>;
};

const DEFAULT_CONFIG: WorkArV2Config = {
  version: 2,
  rotationDeg: 0,
  flipX: false,
  flipY: false,
  sideColor: "#111111",
  depthCm: 3.5,
  backLabelEnabled: true,
  allowRatioMismatch: false,
};

function normalizeText(value?: string | number | null | undefined) {
  return typeof value === "string" ? value.trim() : `${value ?? ""}`.trim();
}

function normalizeNumber(value?: number | null | undefined, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function getCurrentConfig(work: WorkArV2WorkflowSource) {
  return work.arV2Request?.config ?? work.arV2Config ?? DEFAULT_CONFIG;
}

function getCurrentSignatureInput(
  work: WorkArV2WorkflowSource,
  config: WorkArV2Config
): ArV2SourceSignatureInput {
  return {
    workId: normalizeText(work.id),
    coverImageUrl: normalizeText(work.coverImageUrl),
    title: normalizeText(work.title),
    artistName: normalizeText(work.artistName),
    year: normalizeText(work.year),
    medium: normalizeText(work.medium),
    widthCm: normalizeNumber(work.widthCm),
    heightCm: normalizeNumber(work.heightCm),
    depthCm: normalizeNumber(config.depthCm),
    rotationDeg: config.rotationDeg,
    flipX: config.flipX,
    flipY: config.flipY,
    sideColor: normalizeText(config.sideColor || "#111111"),
    backLabelEnabled: config.backLabelEnabled,
    allowRatioMismatch: config.allowRatioMismatch,
  };
}

export function getCurrentArV2SourceSignature(work: WorkArV2WorkflowSource) {
  return createArV2SourceSignature(getCurrentSignatureInput(work, getCurrentConfig(work)));
}

export function getArV2WorkflowStatus(
  work: WorkArV2WorkflowSource
): ArV2WorkflowStatus {
  const request = work.arV2Request;

  if (!request) {
    return "not-requested";
  }

  if (request.status === "cancelled") {
    return "cancelled";
  }

  const currentSignature = getCurrentArV2SourceSignature(work);

  if (currentSignature !== request.sourceSignature) {
    return "outdated";
  }

  const review = work.arV2Review;

  if (
    review?.sourceSignature === request.sourceSignature &&
    review.status === "changes-requested"
  ) {
    return "changes-requested";
  }

  if (
    work.arV2Asset?.status === "ready" &&
    work.arV2Asset.sourceSignature === currentSignature &&
    review?.status === "approved"
  ) {
    return "approved";
  }

  return "requested";
}
