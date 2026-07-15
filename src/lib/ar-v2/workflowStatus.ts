import {
  createArV2SourceSignature,
  createLegacyArV21SourceSignature,
} from "./createArV2SourceSignature";
import {
  AR_V2_GENERATOR_VERSION,
  AR_V2_LEGACY_GENERATOR_VERSION,
  DEFAULT_FRONT_BRIGHTNESS,
  LEGACY_FRONT_BRIGHTNESS,
} from "./constants";
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
  frontBrightness: DEFAULT_FRONT_BRIGHTNESS,
  allowRatioMismatch: false,
};

const LEGACY_CONFIG: WorkArV2Config = {
  ...DEFAULT_CONFIG,
  frontBrightness: LEGACY_FRONT_BRIGHTNESS,
};

function normalizeText(value?: string | number | null | undefined) {
  return typeof value === "string" ? value.trim() : `${value ?? ""}`.trim();
}

function normalizeNumber(value?: number | null | undefined, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function getCurrentConfig(work: WorkArV2WorkflowSource) {
  return work.arV2Request?.status === "requested"
    ? work.arV2Request.config
    : work.arV2Config ??
    (work.arV2Asset?.generatorVersion === AR_V2_LEGACY_GENERATOR_VERSION
      ? LEGACY_CONFIG
      : DEFAULT_CONFIG);
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
    frontBrightness: config.frontBrightness,
    allowRatioMismatch: config.allowRatioMismatch,
  };
}

export function getCurrentArV2SourceSignatures(work: WorkArV2WorkflowSource) {
  const config = getCurrentConfig(work);
  const input = getCurrentSignatureInput(work, config);

  return {
    current: createArV2SourceSignature(input),
    legacy: createLegacyArV21SourceSignature(input),
  };
}

export function getCurrentArV2SourceSignature(work: WorkArV2WorkflowSource) {
  return getCurrentArV2SourceSignatures(work).current;
}

function isLegacySignature(signature: string) {
  return signature.includes(`"version":"${AR_V2_LEGACY_GENERATOR_VERSION}"`);
}

export function isArV2SourceSignatureCurrent(
  work: WorkArV2WorkflowSource,
  signature?: string,
  generatorVersion?: string
) {
  if (!signature) {
    return false;
  }

  const config = getCurrentConfig(work);
  const signatures = getCurrentArV2SourceSignatures(work);

  if (
    generatorVersion === AR_V2_LEGACY_GENERATOR_VERSION ||
    isLegacySignature(signature)
  ) {
    return (
      config.frontBrightness === LEGACY_FRONT_BRIGHTNESS &&
      signature === signatures.legacy
    );
  }

  if (generatorVersion === AR_V2_GENERATOR_VERSION) {
    return signature === signatures.current;
  }

  return signature === signatures.current;
}

export function isArV2RequestSignatureCurrent(
  work: WorkArV2WorkflowSource,
  signature?: string
) {
  return isArV2SourceSignatureCurrent(work, signature);
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

  if (!isArV2RequestSignatureCurrent(work, request.sourceSignature)) {
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
    review?.status === "approved" &&
    review.sourceSignature === request.sourceSignature &&
    isArV2SourceSignatureCurrent(
      work,
      work.arV2Asset.sourceSignature,
      work.arV2Asset.generatorVersion
    )
  ) {
    return "approved";
  }

  return "requested";
}
