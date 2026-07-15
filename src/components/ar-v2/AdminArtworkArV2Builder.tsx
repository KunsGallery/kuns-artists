"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArtworkModelViewer } from "./ArtworkModelViewer";
import { ArV2Diagnostics } from "./ArV2Diagnostics";
import { AdminArV2Status, getWorkArV2Summary } from "./AdminArV2Status";
import { ArV2SourceImageStatus, type ImageLoadStatus } from "./ArV2SourceImageStatus";
import {
  buildArtworkGlb,
  createArV2SourceSignature,
  loadArtworkImageForArV2,
  type ModelViewerLoadStatus,
  type ArV2Diagnostic,
  type ArtworkOrientation,
  type ArtworkProductionMetadata,
  ArtworkSourceLoadError,
  type WorkArV2Asset,
  type WorkArV2Config,
} from "@/lib/ar-v2";
import { saveWorkArV2ForAdmin, type ArtistWorkDoc } from "@/lib/firebase/firestore";
import { deleteR2ObjectsByPublicUrls, uploadGlbFileToR2 } from "@/lib/r2/client";

const ORIENTATION_CHOICES = [0, 90, 180, 270] as const;
const DEFAULT_SIDE_COLOR = "#111111";
const DEFAULT_DEPTH_CM = 3.5;
const DEFAULT_GENERATOR_VERSION = "ar-v2.1";

type ApprovalStatus =
  | "idle"
  | "confirming"
  | "uploading-r2"
  | "saving-firestore"
  | "cleaning-old-asset"
  | "complete"
  | "error";

function normalizeRotationDeg(value?: number) {
  const normalized = ((Math.round(value ?? 0) % 360) + 360) % 360;
  return ORIENTATION_CHOICES.includes(normalized as (typeof ORIENTATION_CHOICES)[number])
    ? (normalized as (typeof ORIENTATION_CHOICES)[number])
    : 0;
}

function normalizeHexColor(value?: string) {
  const trimmed = value?.trim();
  return trimmed && /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed : DEFAULT_SIDE_COLOR;
}

function normalizeDepthCm(value?: number) {
  return Number.isFinite(value ?? NaN) && (value ?? 0) > 0 ? Number(value) : DEFAULT_DEPTH_CM;
}

function toSafeSlugPart(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function buildArV2Filename(workSlug: string) {
  const safeSlug = toSafeSlugPart(workSlug) || "work";
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "").replace("T", "-");
  return `${safeSlug}-ar-v2-${stamp}.glb`;
}

function formatRatio(value?: number) {
  return typeof value === "number" && Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : "—";
}

function getInitialOrientation(work: ArtistWorkDoc): ArtworkOrientation {
  return {
    rotationDeg: normalizeRotationDeg(work.arV2Config?.rotationDeg ?? work.arTextureRotationDeg),
    flipX: work.arV2Config?.flipX ?? work.arTextureFlipX ?? false,
    flipY: work.arV2Config?.flipY ?? work.arTextureFlipY ?? false,
  };
}

function getInitialSideColor(work: ArtistWorkDoc) {
  return normalizeHexColor(work.arV2Config?.sideColor ?? work.arSideColor);
}

function getInitialDepthCm(work: ArtistWorkDoc) {
  return normalizeDepthCm(work.arV2Config?.depthCm ?? work.depthCm ?? work.arDepthCm);
}

function getInitialBackLabelEnabled(work: ArtistWorkDoc) {
  return work.arV2Config?.backLabelEnabled ?? work.arBackLabelEnabled ?? work.showBackLabel ?? true;
}

function getInitialAllowRatioMismatch(work: ArtistWorkDoc) {
  return work.arV2Config?.allowRatioMismatch ?? false;
}

function getCurrentCoverImageUrl(work: ArtistWorkDoc, override?: string) {
  return (override?.trim() || work.coverImageUrl?.trim() || "").trim();
}

function getCurrentSignature(
  work: ArtistWorkDoc,
  coverImageUrl: string,
  orientation: ArtworkOrientation,
  sideColor: string,
  depthCm: number,
  backLabelEnabled: boolean,
  allowRatioMismatch: boolean,
) {
  return createArV2SourceSignature({
    workId: work.id,
    coverImageUrl,
    title: work.title?.trim() || "",
    artistName: work.artistName?.trim() || "",
    year: work.year?.trim() || "",
    medium: work.medium?.trim() || "",
    widthCm: work.widthCm || 0,
    heightCm: work.heightCm || 0,
    depthCm,
    rotationDeg: orientation.rotationDeg,
    flipX: orientation.flipX,
    flipY: orientation.flipY,
    sideColor,
    backLabelEnabled,
    allowRatioMismatch,
  });
}

function getArV2Config(
  orientation: ArtworkOrientation,
  sideColor: string,
  depthCm: number,
  backLabelEnabled: boolean,
  allowRatioMismatch: boolean,
): WorkArV2Config {
  return {
    version: 2,
    rotationDeg: orientation.rotationDeg,
    flipX: orientation.flipX,
    flipY: orientation.flipY,
    sideColor,
    depthCm,
    backLabelEnabled,
    allowRatioMismatch,
  };
}

function buildMetadata(work: ArtistWorkDoc): ArtworkProductionMetadata {
  return {
    title: work.title?.trim() || "Untitled",
    artistName: work.artistName?.trim() || "Unknown artist",
    year: work.year?.trim() || "",
    medium: work.medium?.trim() || "",
    inventoryNumber: "",
  };
}

function buildMessageFromDiagnostics(diagnostics: ArV2Diagnostic[]) {
  const failures = diagnostics.filter((item) => item.severity === "FAIL");
  const warnings = diagnostics.filter((item) => item.severity === "WARNING");
  if (failures.length > 0) return failures[0]?.detail || "Preview validation failed.";
  if (warnings.length > 0) return warnings[0]?.detail || "Preview generated with warnings.";
  return "Preview ready.";
}

export function AdminArtworkArV2Builder({
  work,
  coverImageUrl: coverImageUrlOverride,
  onUploaded,
}: {
  work: ArtistWorkDoc;
  coverImageUrl?: string;
  onUploaded?: (config: WorkArV2Config, asset: WorkArV2Asset) => void;
}) {
  const [rotationDeg, setRotationDeg] = useState<ArtworkOrientation["rotationDeg"]>(0);
  const [flipX, setFlipX] = useState(false);
  const [flipY, setFlipY] = useState(false);
  const [sideColor, setSideColor] = useState(DEFAULT_SIDE_COLOR);
  const [depthCm, setDepthCm] = useState(DEFAULT_DEPTH_CM);
  const [backLabelEnabled, setBackLabelEnabled] = useState(true);
  const [allowRatioMismatch, setAllowRatioMismatch] = useState(false);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);
  const [previewDiagnostics, setPreviewDiagnostics] = useState<ArV2Diagnostic[]>([]);
  const [previewSignature, setPreviewSignature] = useState("");
  const [previewWorkId, setPreviewWorkId] = useState("");
  const [previewSummary, setPreviewSummary] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isBuilding, setIsBuilding] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [viewerLoadStatus, setViewerLoadStatus] = useState<ModelViewerLoadStatus>("idle");
  const [viewerMessage, setViewerMessage] = useState("");
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>("idle");
  const [approvalMessage, setApprovalMessage] = useState("");
  const [imageLoadStatus, setImageLoadStatus] = useState<ImageLoadStatus>("idle");
  const [imageLoadAttempt, setImageLoadAttempt] = useState(0);
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const [imageLoadError, setImageLoadError] = useState<ArtworkSourceLoadError | null>(null);
  const [siteOrigin, setSiteOrigin] = useState("");
  const imageRevokeRef = useRef<(() => void) | null>(null);
  const previewObjectUrlRef = useRef<string | null>(null);
  const latestWorkRef = useRef(work);

  const coverImageUrl = getCurrentCoverImageUrl(work, coverImageUrlOverride);
  const orientation = useMemo(
    () => ({ rotationDeg, flipX, flipY }),
    [rotationDeg, flipX, flipY],
  );
  const metadata = useMemo(() => buildMetadata(work), [work]);
  const currentSignature = useMemo(
    () =>
      getCurrentSignature(
        work,
        coverImageUrl,
        orientation,
        sideColor,
        depthCm,
        backLabelEnabled,
        allowRatioMismatch,
      ),
    [allowRatioMismatch, backLabelEnabled, coverImageUrl, depthCm, orientation, sideColor, work],
  );

  const imageRatio = useMemo(() => {
    if (!loadedImage || !work.widthCm || !work.heightCm) return null;
    const physicalAspect = work.widthCm / work.heightCm;
    const isQuarterTurn = rotationDeg === 90 || rotationDeg === 270;
    const imageAspect = isQuarterTurn
      ? loadedImage.naturalHeight / loadedImage.naturalWidth
      : loadedImage.naturalWidth / loadedImage.naturalHeight;
    const differenceRatio = Math.abs(imageAspect - physicalAspect) / physicalAspect;
    const status = differenceRatio <= 0.02 ? "pass" : differenceRatio <= 0.05 ? "warning" : "fail";
    return { imageAspect, physicalAspect, differenceRatio, status } as const;
  }, [loadedImage, rotationDeg, work.heightCm, work.widthCm]);

  useEffect(() => {
    latestWorkRef.current = work;
  }, [work]);

  const requiredFieldsReady = Boolean(
    coverImageUrl &&
      work.title?.trim() &&
      work.artistName?.trim() &&
      work.widthCm &&
      work.heightCm &&
      Number.isFinite(depthCm) &&
      depthCm > 0,
  );

  const buildDisabledReason = useMemo(() => {
    if (!coverImageUrl) return "Missing artwork image";
    if (!work.title?.trim()) return "Missing artwork title";
    if (!work.artistName?.trim()) return "Missing artist name";
    if (!work.widthCm || !work.heightCm) return "Missing width / height";
    if (!Number.isFinite(depthCm) || depthCm <= 0) return "Invalid depth";
    if (imageLoadStatus === "loading") return "Artwork source is loading";
    if (imageLoadStatus === "error") return "Artwork source is blocked by CORS";
    if (imageLoadStatus !== "ready" || !loadedImage) return "Missing artwork source";
    return "";
  }, [coverImageUrl, depthCm, imageLoadStatus, loadedImage, work.artistName, work.heightCm, work.title, work.widthCm]);

  const approvalStageLabel =
    approvalStatus === "confirming"
      ? "Confirming"
      : approvalStatus === "uploading-r2"
        ? "Uploading to R2"
        : approvalStatus === "saving-firestore"
          ? "Saving to Firestore"
          : approvalStatus === "cleaning-old-asset"
            ? "Cleaning previous asset"
            : approvalStatus === "complete"
              ? "Complete"
              : approvalStatus === "error"
                ? "Error"
                : "Idle";
  const approvalStageTone =
    approvalStatus === "complete"
      ? "ready"
      : approvalStatus === "error"
        ? "amber"
        : approvalStatus === "idle"
          ? "gray"
          : "preparing";

  const missingChecks = [
    { label: "Artwork image", done: Boolean(coverImageUrl), detail: coverImageUrl || "Missing coverImageUrl" },
    { label: "Title", done: Boolean(work.title?.trim()), detail: work.title || "Missing title" },
    { label: "Artist", done: Boolean(work.artistName?.trim()), detail: work.artistName || "Missing artist" },
    { label: "Width", done: Boolean(work.widthCm && work.widthCm > 0), detail: work.widthCm ? `${work.widthCm} cm` : "Missing width" },
    { label: "Height", done: Boolean(work.heightCm && work.heightCm > 0), detail: work.heightCm ? `${work.heightCm} cm` : "Missing height" },
    { label: "Depth", done: Boolean(depthCm > 0), detail: `${depthCm.toFixed(1)} cm` },
  ];

  const hasDiagnosticsFailure = previewDiagnostics.some((item) => item.severity === "FAIL");
  const previewOutdated = Boolean(previewBlob && previewSignature !== currentSignature);
  const canBuild = Boolean(
    requiredFieldsReady &&
      imageLoadStatus === "ready" &&
      loadedImage &&
      !isBuilding &&
      !isUploading,
  );
  const canApprove = Boolean(
    previewBlob &&
      previewObjectUrl &&
      viewerLoadStatus === "ready" &&
      !hasDiagnosticsFailure &&
      !previewOutdated &&
      previewWorkId === work.id &&
      coverImageUrl &&
      !isBuilding &&
      !isUploading,
  );
  const approvalDisabledReason = useMemo(() => {
    if (!previewBlob) return "Build AR V2 Preview first.";
    if (viewerLoadStatus === "preparing" || viewerLoadStatus === "loading") {
      return "The actual GLB preview is still loading.";
    }
    if (viewerLoadStatus === "error") {
      return "The actual GLB preview could not be loaded.";
    }
    if (hasDiagnosticsFailure) return "Resolve the failed diagnostics before approval.";
    if (previewOutdated) return "Preview is outdated. Build it again.";
    if (previewWorkId !== work.id) return "The preview belongs to another artwork.";
    if (isUploading) return "AR V2 upload is in progress.";
    return "";
  }, [hasDiagnosticsFailure, isUploading, previewBlob, previewOutdated, previewWorkId, viewerLoadStatus, work.id]);

  useEffect(() => {
    const currentWork = latestWorkRef.current;

    setRotationDeg(getInitialOrientation(currentWork).rotationDeg);
    setFlipX(getInitialOrientation(currentWork).flipX);
    setFlipY(getInitialOrientation(currentWork).flipY);
    setSideColor(getInitialSideColor(currentWork));
    setDepthCm(getInitialDepthCm(currentWork));
    setBackLabelEnabled(getInitialBackLabelEnabled(currentWork));
    setAllowRatioMismatch(getInitialAllowRatioMismatch(currentWork));
    setPreviewBlob(null);
    setPreviewSignature("");
    setPreviewWorkId("");
    setPreviewDiagnostics([]);
    setPreviewSummary("");
    setErrorMessage("");
    setSuccessMessage("");
    setViewerLoadStatus("idle");
    setViewerMessage("");
    setApprovalStatus("idle");
    setApprovalMessage("");
    setImageLoadStatus("idle");
    setImageLoadError(null);
    setImageLoadAttempt(0);
    setLoadedImage(null);
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
    setPreviewObjectUrl(null);
  }, [work.id]);

  useEffect(() => {
    let cancelled = false;
    const previousRevoke = imageRevokeRef.current;
    imageRevokeRef.current = null;
    setImageLoadError(null);
    setLoadedImage(null);
    previousRevoke?.();

    if (!coverImageUrl) {
      setImageLoadStatus("idle");
      return () => undefined;
    }

    setImageLoadStatus("loading");

    void (async () => {
      try {
        const loaded = await loadArtworkImageForArV2(coverImageUrl);
        if (cancelled) {
          loaded.revoke();
          return;
        }
        imageRevokeRef.current = loaded.revoke;
        setLoadedImage(loaded.image);
        setImageLoadStatus("ready");
      } catch (error) {
        if (!cancelled) {
          setImageLoadStatus("error");
          setImageLoadError(error instanceof ArtworkSourceLoadError ? error : null);
        }
      }
    })();

    return () => {
      cancelled = true;
      imageRevokeRef.current?.();
      imageRevokeRef.current = null;
    };
  }, [coverImageUrl, imageLoadAttempt]);

  useEffect(() => () => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
    imageRevokeRef.current?.();
    imageRevokeRef.current = null;
  }, []);

  useEffect(() => {
    setSiteOrigin(window.location.origin);
  }, []);

  const handleBuild = async () => {
    setIsBuilding(true);
    setErrorMessage("");
    setSuccessMessage("");
    setPreviewSummary("");
    setApprovalStatus("idle");
    setApprovalMessage("");
    setViewerLoadStatus("preparing");
    setViewerMessage("Preparing 3D viewer…");

    try {
      if (!coverImageUrl) throw new Error("작품 이미지를 불러올 수 없습니다. R2 이미지 CORS 설정을 확인해주세요.");
      if (!work.title?.trim() || !work.artistName?.trim()) {
        throw new Error("작품 제목과 작가명이 필요합니다.");
      }
      if (!work.widthCm || !work.heightCm) {
        throw new Error("작품의 가로/세로 크기가 필요합니다.");
      }
      if (!loadedImage || imageLoadStatus !== "ready") {
        throw new Error("작품 이미지의 픽셀 크기를 읽을 수 없습니다.");
      }

      const result = await buildArtworkGlb({
        widthCm: work.widthCm,
        heightCm: work.heightCm,
        depthCm,
        buildMode: "production",
        sourceMode: "local-image",
        image: loadedImage,
        orientation,
        sideColor,
        showBackLabel: backLabelEnabled,
        metadata,
        allowRatioMismatch,
      });

      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
      }
      previewObjectUrlRef.current = result.objectUrl;
      setPreviewBlob(result.blob);
      setPreviewObjectUrl(result.objectUrl);
      setPreviewDiagnostics(result.diagnostics);
      setPreviewSignature(currentSignature);
      setPreviewWorkId(work.id);
      setPreviewSummary(buildMessageFromDiagnostics(result.diagnostics));
      setSuccessMessage("Preview generated. Review the exact GLB before approving.");
      setViewerLoadStatus("preparing");
      setViewerMessage("Preparing 3D viewer…");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "AR v2 preview could not be built.");
      setPreviewDiagnostics([{ severity: "FAIL", code: "build", label: "Build failed", detail: error instanceof Error ? error.message : "AR v2 preview could not be built." }]);
      setPreviewBlob(null);
      setPreviewObjectUrl(null);
      setPreviewSignature("");
      setPreviewWorkId("");
      setPreviewSummary("");
      setViewerLoadStatus("error");
      setViewerMessage(error instanceof Error ? error.message : "AR v2 preview could not be built.");
    } finally {
      setIsBuilding(false);
    }
  };

  const handleRetryArtworkImage = () => {
    imageRevokeRef.current?.();
    imageRevokeRef.current = null;
    setLoadedImage(null);
    setImageLoadError(null);
    setImageLoadStatus(coverImageUrl ? "loading" : "idle");
    setImageLoadAttempt((value) => value + 1);
  };

  const handleApprove = async () => {
    if (!previewBlob || !previewObjectUrl || !canApprove) return;
    const confirmed = window.confirm("Approve this exact preview and upload it as the AR v2 model?");
    if (!confirmed) return;

    setIsUploading(true);
    setErrorMessage("");
    setSuccessMessage("");
    setApprovalStatus("confirming");
    setApprovalMessage("Confirming approval for the exact preview Blob.");

    const config = getArV2Config(orientation, sideColor, depthCm, backLabelEnabled, allowRatioMismatch);
    const previousGlbUrl = work.arV2Asset?.glbUrl?.trim() || "";
    const filename = buildArV2Filename(work.slug || work.id);
    const asset: WorkArV2Asset = {
      status: "ready",
      glbUrl: "",
      generatorVersion: DEFAULT_GENERATOR_VERSION,
      sourceSignature: previewSignature,
      byteSize: previewBlob.size,
      errorMessage: "",
    };

    let uploadedUrl = "";

    try {
      setApprovalStatus("uploading-r2");
      setApprovalMessage("Uploading the exact preview Blob to R2…");
      const uploadResult = await uploadGlbFileToR2({
        blob: previewBlob,
        filename,
        artistSlug: work.artistSlug,
        workSlug: work.slug || work.id,
      });
      uploadedUrl = uploadResult.publicUrl;
      asset.glbUrl = uploadResult.publicUrl;
      setApprovalStatus("saving-firestore");
      setApprovalMessage("Saving the AR v2 config and asset to Firestore…");
      await saveWorkArV2ForAdmin(work.id, { config, asset });
      onUploaded?.(config, asset);
      setApprovalStatus("cleaning-old-asset");
      setApprovalMessage("Removing the previous stored asset if it changed…");
      if (previousGlbUrl && previousGlbUrl !== uploadedUrl) {
        await deleteR2ObjectsByPublicUrls([previousGlbUrl]).catch(() => undefined);
      }
      setApprovalStatus("complete");
      setApprovalMessage("AR v2 GLB uploaded, saved, and cleaned up.");
      setPreviewSummary("Approved and uploaded.");
      setSuccessMessage("AR v2 GLB uploaded and saved to Firestore.");
    } catch (error) {
      if (uploadedUrl) {
        void deleteR2ObjectsByPublicUrls([uploadedUrl]).catch(() => undefined);
      }
      setApprovalStatus("error");
      setApprovalMessage(error instanceof Error ? error.message : "AR v2 upload failed.");
      setErrorMessage(error instanceof Error ? error.message : "AR v2 upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleViewerEvent = useCallback((type: string, message: string) => {
    setViewerMessage(message);
    if (type === "load") {
      setViewerLoadStatus("ready");
      return;
    }
    if (type === "error") {
      setViewerLoadStatus("error");
      return;
    }
    if (type === "progress") {
      setViewerLoadStatus((current) => (current === "ready" ? current : "loading"));
    }
  }, []);

  const handleViewerLoadStatusChange = useCallback((status: ModelViewerLoadStatus, message?: string) => {
    setViewerLoadStatus(status);
    if (message) {
      setViewerMessage(message);
    }
  }, []);

  const storedAsset = getWorkArV2Summary(work);

  return (
    <section className="rounded-[1.75rem] border border-black/8 bg-white p-6 shadow-sm md:p-7">
      <div className="mb-6 space-y-2">
        <p className="text-[11px] font-medium tracking-[0.24em] text-neutral-400">
          AR V2 BUILDER
        </p>
        <p className="max-w-3xl text-sm leading-7 text-neutral-600">
          Build the canonical GLB from the artwork record, review the exact model, then approve the same Blob for upload.
        </p>
      </div>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.2fr)_minmax(380px,0.8fr)]">
        <div className="space-y-6">
          <div className="rounded-[1.6rem] border border-black/8 bg-[#fcfbf8] p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                  Source Data
                </p>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-neutral-600">
                  The builder uses the selected work record, plus the current cover image URL if the legacy form has one ready.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Pill>{work.slug || work.id}</Pill>
                <Pill>{work.artistSlug || "artist-slug"}</Pill>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Field label="Cover Image URL" value={coverImageUrl || "—"} wide />
              <Field label="Title" value={work.title || "—"} />
              <Field label="Artist" value={work.artistName || "—"} />
              <Field label="Year" value={work.year || "—"} />
              <Field label="Medium" value={work.medium || "—"} />
              <Field label="Dimensions" value={work.widthCm && work.heightCm ? `${work.widthCm} × ${work.heightCm} × ${depthCm.toFixed(1)} cm` : work.dimensions || "—"} wide />
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {missingChecks.map((item) => (
                <ChecklistLine
                  key={item.label}
                  label={item.label}
                  detail={item.detail}
                  done={item.done}
                />
              ))}
            </div>

            <div className="mt-4">
              <ArV2SourceImageStatus
                status={imageLoadStatus}
                coverImageUrl={coverImageUrl}
                image={loadedImage}
                error={imageLoadError}
                siteOrigin={siteOrigin}
                onRetry={handleRetryArtworkImage}
              />
            </div>
          </div>

          <div className="rounded-[1.6rem] border border-black/8 bg-[#fcfbf8] p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                  Orientation
                </p>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-neutral-600">
                  Rotation and flips apply to the front image only. The back label remains fixed.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Pill>{rotationDeg}°</Pill>
                <Pill>{flipX ? "Flip X" : "No Flip X"}</Pill>
                <Pill>{flipY ? "Flip Y" : "No Flip Y"}</Pill>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <ActionButton active={rotationDeg === 0} onClick={() => setRotationDeg(0)}>Reset</ActionButton>
              <ActionButton active={rotationDeg === 270} onClick={() => setRotationDeg(270)}>Rotate Left</ActionButton>
              <ActionButton active={rotationDeg === 90} onClick={() => setRotationDeg(90)}>Rotate Right</ActionButton>
              <ActionButton active={rotationDeg === 180} onClick={() => setRotationDeg(180)}>Rotate 180°</ActionButton>
              <ActionButton active={flipX} onClick={() => setFlipX((current) => !current)}>Flip Horizontal</ActionButton>
              <ActionButton active={flipY} onClick={() => setFlipY((current) => !current)}>Flip Vertical</ActionButton>
            </div>
          </div>

          <div className="rounded-[1.6rem] border border-black/8 bg-[#fcfbf8] p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                  Finish
                </p>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-neutral-600">
                  Side color, back label, and depth settings are baked into the AR v2 model.
                </p>
              </div>
              <Pill>{backLabelEnabled ? "Back Label On" : "Back Label Off"}</Pill>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">Side Color</span>
                <input
                  type="color"
                  value={sideColor}
                  onChange={(event) => setSideColor(event.target.value)}
                  className="mt-2 h-12 w-full rounded-[1rem] border border-black/10 bg-[#f7f6f2] p-1"
                />
              </label>
              <label className="block">
                <span className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">Depth cm</span>
                <input
                  type="number"
                  min="1"
                  step="0.1"
                  value={depthCm}
                  onChange={(event) => setDepthCm(Number(event.target.value))}
                  className="mt-2 h-12 w-full rounded-[1rem] border border-black/10 bg-[#f7f6f2] px-4 text-sm text-neutral-900 outline-none"
                />
              </label>
            </div>

            <label className="mt-4 inline-flex items-center gap-3 rounded-[1.15rem] border border-black/8 bg-white px-4 py-3 text-sm text-neutral-700">
              <input type="checkbox" checked={backLabelEnabled} onChange={(event) => setBackLabelEnabled(event.target.checked)} />
              Back label on
            </label>
          </div>

          <div className="rounded-[1.6rem] border border-black/8 bg-[#fcfbf8] p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                  Ratio Validation
                </p>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-neutral-600">
                  The image aspect is compared against the physical artwork aspect after orientation.
                </p>
              </div>
              <Pill tone={imageRatio?.status === "pass" ? "green" : imageRatio?.status === "warning" ? "amber" : "gray"}>
                {imageRatio?.status ? imageRatio.status.toUpperCase() : "LOADING"}
              </Pill>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Field label="Image aspect" value={imageRatio ? imageRatio.imageAspect.toFixed(3) : "—"} />
              <Field label="Physical aspect" value={imageRatio ? imageRatio.physicalAspect.toFixed(3) : "—"} />
              <Field label="Difference" value={imageRatio ? formatRatio(imageRatio.differenceRatio) : "—"} />
            </div>

            {imageRatio && imageRatio.status === "fail" ? (
              <label className="mt-4 inline-flex items-start gap-3 rounded-[1.15rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                <input
                  type="checkbox"
                  checked={allowRatioMismatch}
                  onChange={(event) => setAllowRatioMismatch(event.target.checked)}
                  className="mt-1"
                />
                I confirmed that the image ratio and physical dimensions intentionally differ.
              </label>
            ) : null}

            <p className="mt-4 text-[11px] uppercase tracking-[0.24em] text-neutral-400">
              {imageLoadStatus === "ready" && loadedImage
                ? `Image ready: ${loadedImage.naturalWidth} × ${loadedImage.naturalHeight}px`
                : imageLoadStatus === "loading"
                  ? "Loading artwork source…"
                  : imageLoadStatus === "error"
                    ? "Artwork source could not be loaded"
                    : "No artwork image URL"}
            </p>
          </div>

          <div className="rounded-[1.6rem] border border-black/8 bg-[#fcfbf8] p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                  Build
                </p>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-neutral-600">
                  1. 미리보기 만들기  2. 실제 GLB 확인  3. 승인 및 업로드
                </p>
              </div>
              <Pill tone={previewBlob ? "green" : "gray"}>
                {previewBlob ? "임시 미리보기 · 아직 저장되지 않음" : "Not Built"}
              </Pill>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-[1.15rem] border border-black/8 bg-white px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">1. 미리보기 만들기</p>
                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  브라우저에서 확인할 임시 GLB를 생성합니다. 아직 저장되지 않습니다.
                </p>
              </div>
              <div className="rounded-[1.15rem] border border-black/8 bg-white px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">2. 실제 GLB 확인</p>
                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  같은 Blob이 로딩되는지 viewer에서 꼭 확인합니다.
                </p>
              </div>
              <div className="rounded-[1.15rem] border border-black/8 bg-white px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">3. 승인 및 업로드</p>
                <p className="mt-2 text-sm leading-6 text-neutral-600">
                  확인한 동일 GLB를 R2에 업로드하고 작품 문서에 저장합니다.
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleBuild()}
                disabled={!canBuild}
                className="inline-flex h-12 items-center justify-center rounded-full border border-[#F37021]/35 bg-[#F37021]/12 px-5 text-sm font-medium text-[#8f4600] transition hover:border-[#F37021]/55 hover:bg-[#F37021]/18 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-white/35 disabled:opacity-100"
              >
                {isBuilding ? "Building…" : "Build AR V2 Preview"}
              </button>
              <button
                type="button"
                onClick={() => void handleApprove()}
                disabled={!canApprove}
                className="inline-flex h-12 items-center justify-center rounded-full border border-emerald-300/45 bg-emerald-500/25 px-5 text-sm font-medium text-white transition hover:bg-emerald-500/32 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.06] disabled:text-white/45 disabled:opacity-100"
              >
                {isUploading ? "Uploading…" : "Approve & Upload AR V2"}
              </button>
            </div>

            <p className="mt-3 text-[11px] leading-5 text-neutral-500">
              Build AR V2 Preview는 임시 미리보기 생성만 수행합니다. 최종 저장은 Approve & Upload AR V2에서만 진행됩니다.
            </p>

            {!canBuild && buildDisabledReason ? (
              <p className="mt-4 rounded-[1.15rem] border border-black/8 bg-white px-4 py-3 text-sm leading-6 text-neutral-600">
                {buildDisabledReason}
              </p>
            ) : null}

            {!canApprove && approvalDisabledReason ? (
              <p className="mt-3 rounded-[1.15rem] border border-black/8 bg-white px-4 py-3 text-sm leading-6 text-neutral-600">
                {approvalDisabledReason}
              </p>
            ) : null}

            {previewOutdated ? (
              <p className="mt-4 rounded-[1.15rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                Preview is outdated. Build AR V2 Preview again before approval.
              </p>
            ) : null}

            {errorMessage ? (
              <p className="mt-4 rounded-[1.15rem] border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                {errorMessage}
              </p>
            ) : null}

            {successMessage ? (
              <p className="mt-4 rounded-[1.15rem] border border-emerald-300/30 bg-emerald-500/15 px-4 py-3 text-sm leading-6 text-white">
                {successMessage}
              </p>
            ) : null}

            {previewSummary ? (
              <p className="mt-4 text-sm leading-6 text-neutral-600">
                {previewSummary}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <Pill tone={approvalStageTone}>{approvalStageLabel}</Pill>
              <Pill
                tone={
                  viewerLoadStatus === "ready"
                    ? "ready"
                    : viewerLoadStatus === "error"
                      ? "amber"
                      : viewerLoadStatus === "loading" || viewerLoadStatus === "preparing"
                        ? "preparing"
                        : "gray"
                }
              >
                {viewerLoadStatus === "ready"
                  ? "Viewer Ready"
                  : viewerLoadStatus === "preparing"
                    ? "Viewer Preparing"
                    : viewerLoadStatus === "loading"
                      ? "Viewer Loading"
                      : viewerLoadStatus === "error"
                        ? "Viewer Error"
                        : "Viewer Idle"}
              </Pill>
            </div>

            {approvalMessage ? (
              <p className="mt-3 rounded-[1.15rem] border border-black/8 bg-white px-4 py-3 text-sm leading-6 text-neutral-600">
                {approvalMessage}
              </p>
            ) : null}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[1.6rem] border border-black/8 bg-[#fcfbf8] p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                  Actual GLB Preview
                </p>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-neutral-600">
                  The same generated Blob is used for desktop preview and later approval.
                </p>
              </div>
              <Pill
                tone={
                  viewerLoadStatus === "ready"
                    ? "ready"
                    : viewerLoadStatus === "error"
                      ? "amber"
                      : viewerLoadStatus === "loading" || viewerLoadStatus === "preparing"
                        ? "preparing"
                        : "gray"
                }
              >
                {viewerLoadStatus === "ready"
                  ? "Ready"
                  : viewerLoadStatus === "preparing"
                    ? "Preparing"
                    : viewerLoadStatus === "loading"
                      ? "Loading"
                      : viewerLoadStatus === "error"
                        ? "Error"
                        : "Idle"}
              </Pill>
            </div>

            <div className="mt-4 overflow-hidden rounded-[1.6rem] border border-black/8 bg-[#ece8df]">
              <ArtworkModelViewer
                objectUrl={previewObjectUrl}
                arDisabled={!previewObjectUrl || hasDiagnosticsFailure}
                onEvent={handleViewerEvent}
                onLoadStatusChange={handleViewerLoadStatusChange}
              />
            </div>
            {viewerMessage ? (
              <p className="mt-3 rounded-[1.15rem] border border-black/8 bg-white px-4 py-3 text-sm leading-6 text-neutral-600">
                {viewerMessage}
              </p>
            ) : null}
          </div>

          <AdminArV2Status work={work} />

          <div className="rounded-[1.6rem] border border-black/8 bg-[#fcfbf8] p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                  Diagnostics
                </p>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-neutral-600">
                  PASS, WARNING, and FAIL outputs from the shared AR v2 validation pipeline.
                </p>
              </div>
              <Pill tone={hasDiagnosticsFailure ? "amber" : "green"}>{previewDiagnostics.length ? `${previewDiagnostics.length} checks` : "0 checks"}</Pill>
            </div>
            <div className="mt-4">
              <ArV2Diagnostics diagnostics={previewDiagnostics} />
            </div>
          </div>

          <div className="rounded-[1.6rem] border border-black/8 bg-[#fcfbf8] p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                  Stored Asset Status
                </p>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-neutral-600">
                  {storedAsset.detail}
                </p>
              </div>
              <Pill tone={storedAsset.tone}>{storedAsset.label}</Pill>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Pill({
  children,
  tone = "gray",
}: {
  children: React.ReactNode;
  tone?: "green" | "amber" | "gray" | "ready" | "missing" | "preparing" | "neutral";
}) {
  const toneClass = {
    green: "border-emerald-300/40 bg-emerald-500/20 text-white",
    amber: "border-amber-400/25 bg-amber-400/10 text-amber-900",
    gray: "border-black/10 bg-white text-neutral-700",
    ready: "border-emerald-300/40 bg-emerald-500/20 text-white",
    preparing: "border-amber-400/25 bg-amber-400/10 text-amber-900",
    missing: "border-black/10 bg-white text-neutral-700",
    neutral: "border-black/10 bg-white text-neutral-700",
  }[tone];

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.22em] ${toneClass}`}>
      {children}
    </span>
  );
}

function Field({
  label,
  value,
  wide,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "md:col-span-2 rounded-[1.15rem] border border-black/8 bg-white px-4 py-3" : "rounded-[1.15rem] border border-black/8 bg-white px-4 py-3"}>
      <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">{label}</p>
      <p className="mt-2 break-all text-sm leading-6 text-neutral-600">{value}</p>
    </div>
  );
}

function ActionButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm transition ${
        active
          ? "border-[#F37021]/35 bg-[#F37021]/10 text-[#b85d18]"
          : "border-black/10 bg-white text-neutral-700 hover:border-black/20 hover:bg-[#faf9f5]"
      }`}
    >
      {children}
    </button>
  );
}

function ChecklistLine({
  label,
  detail,
  done,
}: {
  label: string;
  detail: string;
  done: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-[1.15rem] border border-black/8 bg-white px-4 py-3">
      <span
        className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
          done ? "bg-emerald-500/20 text-white" : "bg-slate-100 text-slate-400"
        }`}
      >
        {done ? "✓" : "•"}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-neutral-700">{label}</p>
        <p className="mt-1 text-[12px] leading-5 text-neutral-500">{detail}</p>
      </div>
    </div>
  );
}
