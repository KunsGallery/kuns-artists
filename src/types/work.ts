import type {
  WorkArV2Asset,
  WorkArV2Config,
  WorkArV2Request,
  WorkArV2Review,
} from "@/lib/ar-v2";

export type QuickLookAssetStatus = "none" | "uploaded" | "ready" | "failed";

export type QuickLookAsset = {
  status: QuickLookAssetStatus;
  usdzUrl?: string;
  objectKey?: string;
  fileName?: string;
  sizeBytes?: number;
  contentType?: "model/vnd.usdz+zip";
  uploadedAt?: string;
  uploadedBy?: string;
  approvedAt?: string;
  approvedBy?: string;
  sourceArV2AssetUrl?: string;
  sourceArV2GeneratorVersion?: string;
  notes?: string;
  hasAudio?: boolean;
  audioDescription?: string;
  hasAnimation?: boolean;
};

export type QuickLookPendingAsset = {
  status: "uploaded" | "failed";
  usdzUrl?: string;
  objectKey?: string;
  fileName?: string;
  sizeBytes?: number;
  uploadedAt?: string;
  uploadedBy?: string;
  errorMessage?: string;
};

export type Work = {
  slug: string;
  artistSlug: string;
  artistName: string;
  artistId?: string;
  title: string;
  year?: string;
  medium?: string;
  dimensions?: string;
  description?: string;
  coverImage?: string;
  coverImageUrl?: string;
  modelGlb?: string;
  modelUsdz?: string;
  widthCm?: number;
  heightCm?: number;
  depthCm?: number;
  arTextureRotationDeg?: number;
  arTextureFlipX?: boolean;
  arTextureFlipY?: boolean;
  arSideColor?: string;
  arDepthCm?: number;
  arBackLabelEnabled?: boolean;
  frontRotationXDeg?: number;
  frontRotationYDeg?: number;
  sideMode?: "canvas" | "image";
  showBackLabel?: boolean;
  generatedGlbUrl?: string;
  generatedUsdzUrl?: string;
  generatedAt?: unknown;
  arV2Config?: WorkArV2Config;
  arV2Asset?: WorkArV2Asset;
  arV2Request?: WorkArV2Request;
  arV2Review?: WorkArV2Review;
  quickLookAsset?: QuickLookAsset;
  quickLookPendingAsset?: QuickLookPendingAsset;
  displayOrder?: number;
  isPublished?: boolean;
  archived?: boolean;
  docentAudioEnabled?: boolean;
  docentAudioUrl?: string;
  docentAudioTitle?: string;
  docentAudioDescription?: string;
};

export type WorkFormValues = {
  title: string;
  artistName: string;
  year: string;
  medium: string;
  dimensions: string;
  description: string;
  widthCm: string;
  heightCm: string;
  depthCm: string;
  coverImageUrl: string;
  frontRotationXDeg: string;
  frontRotationYDeg: string;
  sideMode: "canvas" | "image";
  showBackLabel: boolean;
  docentAudioEnabled?: boolean;
  docentAudioUrl?: string;
  docentAudioTitle?: string;
  docentAudioDescription?: string;
};
