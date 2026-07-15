import type {
  CanvasTexture,
  Mesh,
  Scene,
  Texture,
} from "three";

export type ArV2BuildMode = "diagnostic" | "production";
export type ArtworkSourceMode = "fixture" | "local-image";
export type FaceName = "front" | "back" | "left" | "right" | "top" | "bottom";
export type OrientationRotation = 0 | 90 | 180 | 270;

export type ArtworkOrientation = {
  rotationDeg: OrientationRotation;
  flipX: boolean;
  flipY: boolean;
};

export type ArtworkProductionMetadata = {
  title: string;
  artistName: string;
  year: string;
  medium: string;
  inventoryNumber?: string;
};

export type WorkArV2Config = {
  version: 2;
  rotationDeg: OrientationRotation;
  flipX: boolean;
  flipY: boolean;
  sideColor: string;
  depthCm: number;
  backLabelEnabled: boolean;
  allowRatioMismatch?: boolean;
};

export type WorkArV2AssetStatus = "none" | "preview" | "ready" | "error";

export type WorkArV2Asset = {
  status: WorkArV2AssetStatus;
  glbUrl?: string;
  generatorVersion: string;
  sourceSignature?: string;
  generatedAt?: unknown;
  byteSize?: number;
  errorMessage?: string;
};

export type WorkArV2RequestStatus = "requested" | "cancelled";

export type WorkArV2ReviewStatus = "changes-requested" | "approved";

export type WorkArV2Request = {
  status: WorkArV2RequestStatus;
  config: WorkArV2Config;
  sourceSignature: string;
  message?: string;
  requestedAt?: unknown;
  requestedBy: string;
};

export type WorkArV2Review = {
  status: WorkArV2ReviewStatus;
  sourceSignature: string;
  message?: string;
  reviewedAt?: unknown;
  reviewedBy?: string;
};

export type ModelViewerDefinitionStatus = "loading" | "ready" | "error";

export type ModelViewerLoadStatus = "idle" | "preparing" | "loading" | "ready" | "error";

export type ArV2SourceSignatureInput = {
  workId: string;
  coverImageUrl: string;
  title: string;
  artistName: string;
  year: string;
  medium: string;
  widthCm: number;
  heightCm: number;
  depthCm: number;
  rotationDeg: OrientationRotation;
  flipX: boolean;
  flipY: boolean;
  sideColor: string;
  backLabelEnabled: boolean;
  allowRatioMismatch?: boolean;
};

export type ArtworkImageFit = "contain";

export type ArtworkRatioStatus = "pass" | "warning" | "fail";

export type ArtworkImageRatio = {
  imageAspect: number;
  physicalAspect: number;
  differenceRatio: number;
  status: ArtworkRatioStatus;
};

export type PhysicalDimensions = {
  widthCm: number;
  heightCm: number;
  depthCm: number;
};

export type ArtworkBuildConfig = PhysicalDimensions & {
  buildMode: ArV2BuildMode;
  sourceMode: ArtworkSourceMode;
  orientation: ArtworkOrientation;
  image?: HTMLImageElement;
  sideColor: string;
  showBackLabel: boolean;
  metadata?: ArtworkProductionMetadata;
  allowRatioMismatch?: boolean;
};

export type AtlasRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  padding: number;
};

export type ArtworkAtlas = {
  canvas: HTMLCanvasElement;
  texture: CanvasTexture;
  rects: Record<FaceName, AtlasRect>;
};

export type ArtworkScene = {
  scene: Scene;
  mesh: Mesh;
  atlas: ArtworkAtlas;
  dimensions: PhysicalDimensions;
  buildConfig: ArtworkBuildConfig;
};

export type LoadedArtworkImage = {
  image: HTMLImageElement;
  revoke: () => void;
};

export type BuildArtworkGlbInput = {
  widthCm: number;
  heightCm: number;
  depthCm: number;
  buildMode: ArV2BuildMode;
  sourceMode: ArtworkSourceMode;
  image?: HTMLImageElement;
  orientation: ArtworkOrientation;
  sideColor: string;
  showBackLabel: boolean;
  metadata?: ArtworkProductionMetadata;
  allowRatioMismatch?: boolean;
};

export type BuildArtworkGlbResult = {
  blob: Blob;
  objectUrl: string;
  byteSize: number;
  diagnostics: ArV2Diagnostic[];
  hasFailure: boolean;
};

export type DiagnosticSeverity = "PASS" | "WARNING" | "FAIL";

export type ArV2Diagnostic = {
  severity: DiagnosticSeverity;
  code: string;
  label: string;
  detail: string;
};

export type ArtworkGlbBuildResult = {
  blob: Blob;
  objectUrl: string;
  byteSize: number;
  diagnostics: ArV2Diagnostic[];
};

export type ArtworkValidationResult = {
  diagnostics: ArV2Diagnostic[];
  hasFailure: boolean;
};

export type ArV2Event = {
  id: number;
  timestamp: string;
  type: string;
  message: string;
};

export type ModelViewerElement = HTMLElement & {
  src: string;
  cameraOrbit: string;
  resetTurntableRotation?: () => void;
  jumpCameraToGoal?: () => void;
};

export type SupportedTexture = Texture | CanvasTexture;
