"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArtworkModelViewer } from "./ArtworkModelViewer";
import { ArV2Diagnostics } from "./ArV2Diagnostics";
import { AdminArV2Status, getWorkArV2Summary } from "./AdminArV2Status";
import {
  buildArtworkGlb,
  createArV2SourceSignature,
  loadArtworkImageForArV2,
  type ArV2Diagnostic,
  type ArtworkOrientation,
  type ArtworkProductionMetadata,
  type WorkArV2Asset,
  type WorkArV2Config,
} from "@/lib/ar-v2";
import { saveWorkArV2ForAdmin, type ArtistWorkDoc } from "@/lib/firebase/firestore";
import { deleteR2ObjectsByPublicUrls, uploadGlbFileToR2 } from "@/lib/r2/client";

const ORIENTATION_CHOICES = [0, 90, 180, 270] as const;
const DEFAULT_SIDE_COLOR = "#111111";
const DEFAULT_DEPTH_CM = 3.5;
const DEFAULT_GENERATOR_VERSION = "ar-v2.1";

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
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const [imageError, setImageError] = useState("");
  const imageRevokeRef = useRef<(() => void) | null>(null);
  const previewObjectUrlRef = useRef<string | null>(null);

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
    coverImageUrl &&
      work.title?.trim() &&
      work.artistName?.trim() &&
      work.widthCm &&
      work.heightCm &&
      !isBuilding &&
      !isUploading &&
      !imageError,
  );
  const canApprove = Boolean(
    previewBlob &&
      previewObjectUrl &&
      !hasDiagnosticsFailure &&
      !previewOutdated &&
      previewWorkId === work.id &&
      coverImageUrl &&
      !isBuilding &&
      !isUploading,
  );

  useEffect(() => {
    setRotationDeg(getInitialOrientation(work).rotationDeg);
    setFlipX(getInitialOrientation(work).flipX);
    setFlipY(getInitialOrientation(work).flipY);
    setSideColor(getInitialSideColor(work));
    setDepthCm(getInitialDepthCm(work));
    setBackLabelEnabled(getInitialBackLabelEnabled(work));
    setAllowRatioMismatch(getInitialAllowRatioMismatch(work));
    setPreviewBlob(null);
    setPreviewSignature("");
    setPreviewWorkId("");
    setPreviewDiagnostics([]);
    setPreviewSummary("");
    setErrorMessage("");
    setSuccessMessage("");
    setImageError("");
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
    setPreviewObjectUrl(null);
  }, [work]);

  useEffect(() => {
    let cancelled = false;
    const previousRevoke = imageRevokeRef.current;
    imageRevokeRef.current = null;
    setImageError("");
    setLoadedImage(null);
    previousRevoke?.();

    if (!coverImageUrl) {
      setImageError("작품 이미지를 불러올 수 없습니다. R2 이미지 CORS 설정을 확인해주세요.");
      return () => undefined;
    }

    void (async () => {
      try {
        const loaded = await loadArtworkImageForArV2(coverImageUrl);
        if (cancelled) {
          loaded.revoke();
          return;
        }
        imageRevokeRef.current = loaded.revoke;
        setLoadedImage(loaded.image);
      } catch (error) {
        if (!cancelled) {
          setImageError(error instanceof Error ? error.message : "작품 이미지를 불러올 수 없습니다. R2 이미지 CORS 설정을 확인해주세요.");
        }
      }
    })();

    return () => {
      cancelled = true;
      imageRevokeRef.current?.();
      imageRevokeRef.current = null;
    };
  }, [coverImageUrl]);

  useEffect(() => () => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
    imageRevokeRef.current?.();
    imageRevokeRef.current = null;
  }, []);

  const handleBuild = async () => {
    setIsBuilding(true);
    setErrorMessage("");
    setSuccessMessage("");
    setPreviewSummary("");

    try {
      if (!coverImageUrl) throw new Error("작품 이미지를 불러올 수 없습니다. R2 이미지 CORS 설정을 확인해주세요.");
      if (!work.title?.trim() || !work.artistName?.trim()) {
        throw new Error("작품 제목과 작가명이 필요합니다.");
      }
      if (!work.widthCm || !work.heightCm) {
        throw new Error("작품의 가로/세로 크기가 필요합니다.");
      }
      let image = loadedImage;
      if (!image) {
        const loaded = await loadArtworkImageForArV2(coverImageUrl);
        imageRevokeRef.current?.();
        imageRevokeRef.current = loaded.revoke;
        image = loaded.image;
        setLoadedImage(loaded.image);
      }

      if (!image) {
        throw new Error("작품 이미지의 픽셀 크기를 읽을 수 없습니다.");
      }

      const result = await buildArtworkGlb({
        widthCm: work.widthCm,
        heightCm: work.heightCm,
        depthCm,
        buildMode: "production",
        sourceMode: "local-image",
        image,
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
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "AR v2 preview could not be built.");
      setPreviewDiagnostics([{ severity: "FAIL", code: "build", label: "Build failed", detail: error instanceof Error ? error.message : "AR v2 preview could not be built." }]);
      setPreviewBlob(null);
      setPreviewObjectUrl(null);
      setPreviewSignature("");
      setPreviewWorkId("");
      setPreviewSummary("");
    } finally {
      setIsBuilding(false);
    }
  };

  const handleApprove = async () => {
    if (!previewBlob || !previewObjectUrl || !canApprove) return;
    const confirmed = window.confirm("Approve this exact preview and upload it as the AR v2 model?");
    if (!confirmed) return;

    setIsUploading(true);
    setErrorMessage("");
    setSuccessMessage("");

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
      const uploadResult = await uploadGlbFileToR2({
        blob: previewBlob,
        filename,
        artistSlug: work.artistSlug,
        workSlug: work.slug || work.id,
      });
      uploadedUrl = uploadResult.publicUrl;
      asset.glbUrl = uploadResult.publicUrl;
      await saveWorkArV2ForAdmin(work.id, { config, asset });
      onUploaded?.(config, asset);
      setPreviewSummary("Approved and uploaded.");
      setSuccessMessage("AR v2 GLB uploaded and saved to Firestore.");
      if (previousGlbUrl && previousGlbUrl !== uploadedUrl) {
        void deleteR2ObjectsByPublicUrls([previousGlbUrl]).catch(() => undefined);
      }
    } catch (error) {
      if (uploadedUrl) {
        void deleteR2ObjectsByPublicUrls([uploadedUrl]).catch(() => undefined);
      }
      setErrorMessage(error instanceof Error ? error.message : "AR v2 upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const sourceStatusText = imageError || (imageRatio ? `Image ratio: ${formatRatio(imageRatio.differenceRatio)} (${imageRatio.status.toUpperCase()})` : "Loading artwork image...");
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
              {sourceStatusText}
            </p>
          </div>

          <div className="rounded-[1.6rem] border border-black/8 bg-[#fcfbf8] p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                  Build
                </p>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-neutral-600">
                  Build the preview, inspect the exact GLB, then approve the same Blob for upload.
                </p>
              </div>
              <Pill tone={previewBlob ? "green" : "gray"}>{previewBlob ? "Preview Ready" : "Not Built"}</Pill>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleBuild()}
                disabled={!canBuild}
                className="inline-flex h-12 items-center justify-center rounded-full border border-[#F37021]/35 bg-[#F37021]/10 px-5 text-sm font-medium text-[#b85d18] transition hover:border-[#F37021]/55 hover:bg-[#F37021]/16 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isBuilding ? "Building…" : "Build AR V2 Preview"}
              </button>
              <button
                type="button"
                onClick={() => void handleApprove()}
                disabled={!canApprove}
                className="inline-flex h-12 items-center justify-center rounded-full border border-emerald-400/25 bg-emerald-400/10 px-5 text-sm font-medium text-emerald-900 transition hover:border-emerald-400/40 hover:bg-emerald-400/14 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isUploading ? "Uploading…" : "Approve & Upload AR V2"}
              </button>
            </div>

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
              <p className="mt-4 rounded-[1.15rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-700">
                {successMessage}
              </p>
            ) : null}

            {previewSummary ? (
              <p className="mt-4 text-sm leading-6 text-neutral-600">
                {previewSummary}
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
              <Pill tone={previewBlob ? "green" : "gray"}>{previewObjectUrl ? "READY" : "IDLE"}</Pill>
            </div>

            <div className="mt-4 overflow-hidden rounded-[1.6rem] border border-black/8 bg-[#ece8df]">
              <ArtworkModelViewer
                objectUrl={previewObjectUrl}
                arDisabled={!previewObjectUrl || hasDiagnosticsFailure}
                onEvent={() => undefined}
              />
            </div>
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
    green: "border-emerald-400/25 bg-emerald-400/10 text-emerald-900",
    amber: "border-amber-400/25 bg-amber-400/10 text-amber-900",
    gray: "border-black/10 bg-white text-neutral-700",
    ready: "border-emerald-400/25 bg-emerald-400/10 text-emerald-900",
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
          done ? "bg-emerald-400/10 text-emerald-900" : "bg-slate-100 text-slate-400"
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
