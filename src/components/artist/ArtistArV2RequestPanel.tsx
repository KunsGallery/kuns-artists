"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArV2SourceImageStatus,
  type ImageLoadStatus,
} from "@/components/ar-v2/ArV2SourceImageStatus";
import { ArtworkSourcePreview, BackLabelSourcePreview } from "@/components/ar-v2/ArtworkSourcePreview";
import { useProtectedArtist } from "@/hooks/useProtectedArtist";
import {
  cancelWorkArV2RequestForArtist,
  getWorkById,
  requestWorkArV2ForArtist,
  resolveArtistWorkSlug,
  type ArtistWorkDoc,
} from "@/lib/firebase/firestore";
import {
  getArtworkImageRatio,
  getCurrentArV2SourceSignature,
  getArV2WorkflowStatus,
  loadArtworkImageForArV2,
  type ArtworkOrientation,
  type ArtworkProductionMetadata,
  type PhysicalDimensions,
  type WorkArV2Config,
  ArtworkSourceLoadError,
} from "@/lib/ar-v2";

type ArtistArV2RequestPanelProps = {
  workId: string;
  created?: boolean;
};

const DEFAULT_SIDE_COLOR = "#111111";
const DEFAULT_DEPTH_CM = 3.5;
const ORIENTATION_CHOICES = [0, 90, 180, 270] as const;

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

function buildFallbackConfig(work?: ArtistWorkDoc | null): WorkArV2Config {
  return {
    version: 2,
    rotationDeg: normalizeRotationDeg(work?.arV2Config?.rotationDeg ?? work?.arTextureRotationDeg),
    flipX: work?.arV2Config?.flipX ?? work?.arTextureFlipX ?? false,
    flipY: work?.arV2Config?.flipY ?? work?.arTextureFlipY ?? false,
    sideColor: normalizeHexColor(work?.arV2Config?.sideColor ?? work?.arSideColor),
    depthCm: normalizeDepthCm(work?.arV2Config?.depthCm ?? work?.depthCm ?? work?.arDepthCm),
    backLabelEnabled: work?.arV2Config?.backLabelEnabled ?? work?.arBackLabelEnabled ?? work?.showBackLabel ?? true,
    allowRatioMismatch: false,
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

function buildDimensions(work?: ArtistWorkDoc | null, depthCm = DEFAULT_DEPTH_CM): PhysicalDimensions {
  return {
    widthCm: work?.widthCm || 0,
    heightCm: work?.heightCm || 0,
    depthCm,
  };
}

function getRequestStatusLabel(status: ReturnType<typeof getArV2WorkflowStatus>) {
  if (status === "not-requested") return "AR 요청 전";
  if (status === "requested") return "AR 요청됨";
  if (status === "changes-requested") return "수정 요청";
  if (status === "approved") return "AR 준비 완료";
  if (status === "outdated") return "재요청 필요";
  return "요청 취소됨";
}

function getRequestStatusMessage(status: ReturnType<typeof getArV2WorkflowStatus>) {
  if (status === "not-requested") {
    return "작품 정보와 크기를 확인한 뒤 AR 제작을 요청할 수 있습니다.";
  }

  if (status === "requested") {
    return "갤러리에서 모델을 검수하고 있습니다.";
  }

  if (status === "changes-requested") {
    return "작품 정보를 수정한 뒤 다시 요청해주세요.";
  }

  if (status === "approved") {
    return "승인된 AR 모델이 공개 준비되었습니다.";
  }

  if (status === "outdated") {
    return "요청 이후 작품 이미지 또는 정보가 변경되었습니다.";
  }

  return "요청이 취소되었습니다. 다시 요청할 수 있습니다.";
}

function formatDate(value: unknown) {
  if (!value) return "—";

  if (typeof value === "object" && value && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") {
    try {
      return (value as { toDate: () => Date }).toDate().toLocaleString();
    } catch {
      return "—";
    }
  }

  if (typeof value === "object" && value && "seconds" in value && typeof (value as { seconds?: unknown }).seconds === "number") {
    return new Date(((value as { seconds: number }).seconds ?? 0) * 1000).toLocaleString();
  }

  return "—";
}

function Badge({
  tone,
  children,
}: {
  tone: "green" | "amber" | "gray" | "orange";
  children: React.ReactNode;
}) {
  const toneClass = {
    green: "border-emerald-300/40 bg-emerald-500/20 text-emerald-950",
    amber: "border-amber-300/40 bg-amber-400/15 text-amber-950",
    gray: "border-slate-300 bg-slate-50 text-slate-700",
    orange: "border-[#F37021]/35 bg-[#F37021]/10 text-[#b85d18]",
  }[tone];

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.24em] ${toneClass}`}>
      {children}
    </span>
  );
}

function ControlButton({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-11 items-center justify-center rounded-full border px-4 text-sm transition ${
        active
          ? "border-[#F37021]/40 bg-[#F37021]/12 text-[#8f4600]"
          : "border-black/10 bg-white text-neutral-900 hover:border-black/20"
      }`}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.15rem] border border-black/8 bg-[#fcfbf8] px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">{label}</p>
      <p className="mt-2 break-words text-sm leading-6 text-neutral-600">{value || "—"}</p>
    </div>
  );
}

export default function ArtistArV2RequestPanel({
  workId,
  created = false,
}: ArtistArV2RequestPanelProps) {
  const searchParams = useSearchParams();
  const { artist, uid, isLoading, errorMessage } = useProtectedArtist({
    fallbackErrorMessage: "AR 제작 요청 정보를 불러오는 중 오류가 발생했습니다.",
  });
  const [work, setWork] = useState<ArtistWorkDoc | null>(null);
  const [loadErrorMessage, setLoadErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [rotationDeg, setRotationDeg] = useState<ArtworkOrientation["rotationDeg"]>(0);
  const [flipX, setFlipX] = useState(false);
  const [flipY, setFlipY] = useState(false);
  const [sideColor, setSideColor] = useState(DEFAULT_SIDE_COLOR);
  const [depthCm, setDepthCm] = useState(DEFAULT_DEPTH_CM);
  const [backLabelEnabled, setBackLabelEnabled] = useState(true);
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const [imageLoadStatus, setImageLoadStatus] = useState<ImageLoadStatus>("idle");
  const [imageLoadError, setImageLoadError] = useState<ArtworkSourceLoadError | null>(null);
  const [imageLoadAttempt, setImageLoadAttempt] = useState(0);
  const [siteOrigin, setSiteOrigin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [requestedAt, setRequestedAt] = useState<unknown>(null);
  const imageRevokeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let isActive = true;

    void (async () => {
      if (!uid) {
        if (isActive) {
          setWork(null);
          setLoadErrorMessage("");
        }
        return;
      }

      try {
        const workDoc = await getWorkById(workId);

        if (!isActive) {
          return;
        }

        if (!workDoc) {
          setWork(null);
          setLoadErrorMessage("작품 정보를 불러올 수 없습니다.");
          return;
        }

        if ((workDoc.artistId ?? "") !== uid) {
          setWork(null);
          setLoadErrorMessage("본인 작품만 AR 제작을 요청할 수 있습니다.");
          return;
        }

        setWork(workDoc);
        setLoadErrorMessage("");
      } catch (error) {
        if (!isActive) {
          return;
        }

        setWork(null);
        setLoadErrorMessage(
          error instanceof Error ? error.message : "작품 정보를 불러올 수 없습니다."
        );
      }
    })();

    return () => {
      isActive = false;
    };
  }, [uid, workId]);

  const currentConfig = useMemo(
    () => work?.arV2Request?.config ?? work?.arV2Config ?? buildFallbackConfig(work),
    [work]
  );
  const currentSignature = useMemo(
    () =>
      work
        ? getCurrentArV2SourceSignature({
            ...work,
            arV2Request: undefined,
            arV2Config: {
              version: 2,
              rotationDeg,
              flipX,
              flipY,
              sideColor,
              depthCm,
              backLabelEnabled,
              allowRatioMismatch: false,
            },
          })
        : "",
    [backLabelEnabled, depthCm, flipX, flipY, rotationDeg, sideColor, work]
  );
  const workflowStatus = useMemo(
    () => (work ? getArV2WorkflowStatus(work) : "not-requested"),
    [work]
  );
  const coverImageUrl = work?.coverImageUrl?.trim() || "";
  const dimensions = useMemo(
    () => buildDimensions(work, depthCm),
    [depthCm, work]
  );
  const ratio = useMemo(() => {
    if (!loadedImage) {
      return null;
    }

    return getArtworkImageRatio(loadedImage, dimensions, {
      rotationDeg,
      flipX,
      flipY,
    });
  }, [dimensions, flipX, flipY, loadedImage, rotationDeg]);
  const requestBlocked = Boolean(
    !work ||
      !coverImageUrl ||
      !work.title?.trim() ||
      !work.artistName?.trim() ||
      !work.widthCm ||
      !work.heightCm ||
      !depthCm ||
      imageLoadStatus !== "ready" ||
      !loadedImage ||
      workflowStatus === "requested" ||
      workflowStatus === "approved" ||
      (ratio?.status === "fail")
  );
  const requestButtonLabel =
    workflowStatus === "approved"
      ? "AR 준비 완료"
      : workflowStatus === "requested"
        ? "AR 요청됨"
        : workflowStatus === "cancelled"
          ? "AR 제작 요청"
          : workflowStatus === "changes-requested" || workflowStatus === "outdated"
            ? "변경 내용으로 다시 요청"
            : "AR 제작 요청";
  const requestButtonDisabledReason = useMemo(() => {
    if (!work) return "작품 정보를 불러오는 중입니다.";
    if (!coverImageUrl) return "작품 이미지를 먼저 등록해주세요.";
    if (!work.title?.trim()) return "작품명을 입력해주세요.";
    if (!work.artistName?.trim()) return "작가명이 필요합니다.";
    if (!work.widthCm || !work.heightCm) return "가로/세로 크기가 필요합니다.";
    if (!depthCm || depthCm <= 0) return "깊이 값을 확인해주세요.";
    if (imageLoadStatus === "loading") return "이미지를 불러오는 중입니다.";
    if (imageLoadStatus === "error") return "이미지 CORS 상태를 확인해주세요.";
    if (imageLoadStatus !== "ready" || !loadedImage) return "이미지 준비가 필요합니다.";
    if (workflowStatus === "requested") return "AR 제작 요청이 접수되었습니다.";
    if (workflowStatus === "approved") return "AR 모델이 이미 승인되었습니다.";
    if (ratio?.status === "fail") {
      return "업로드 이미지 비율과 실제 작품 크기가 다릅니다. 작품 이미지 또는 가로·세로 크기를 확인해주세요.";
    }
    return "";
  }, [coverImageUrl, depthCm, imageLoadStatus, loadedImage, ratio?.status, work, workflowStatus]);

  useEffect(() => {
    if (!work) {
      return;
    }

    const requestConfig = currentConfig;
    setRotationDeg(requestConfig.rotationDeg);
    setFlipX(requestConfig.flipX);
    setFlipY(requestConfig.flipY);
    setSideColor(requestConfig.sideColor);
    setDepthCm(requestConfig.depthCm);
    setBackLabelEnabled(requestConfig.backLabelEnabled);
    setRequestedAt(work.arV2Request?.requestedAt ?? null);
    setRequestMessage(work.arV2Request?.message?.trim() || "");
  }, [currentConfig, work]);

  const createdNotice = created || searchParams.get("created") === "1";

  useEffect(() => {
    setSiteOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    let cancelled = false;
    imageRevokeRef.current?.();
    imageRevokeRef.current = null;
    setLoadedImage(null);
    setImageLoadError(null);

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

  const handleRetryImage = () => {
    imageRevokeRef.current?.();
    imageRevokeRef.current = null;
    setLoadedImage(null);
    setImageLoadError(null);
    setImageLoadAttempt((current) => current + 1);
  };

  const handleRequest = async () => {
    if (!uid || !work || requestBlocked) {
      return;
    }

    const confirmed = window.confirm("현재 작품 정보와 AR 설정으로 제작을 요청할까요?");
    if (!confirmed) {
      return;
    }

    setIsSubmitting(true);
    setStatusMessage("");

    const config = {
      version: 2,
      rotationDeg,
      flipX,
      flipY,
      sideColor,
      depthCm,
      backLabelEnabled,
      allowRatioMismatch: false,
    } satisfies WorkArV2Config;

    try {
      await requestWorkArV2ForArtist(work.id, uid, {
        config,
        sourceSignature: currentSignature,
        message: requestMessage,
      });

      setWork((current) =>
        current
          ? {
              ...current,
              arV2Request: {
                status: "requested",
                config,
                sourceSignature: currentSignature,
                message: requestMessage.trim(),
                requestedBy: uid,
                requestedAt: current.arV2Request?.requestedAt ?? new Date().toISOString(),
              },
            }
          : current
      );
      setStatusMessage("AR 제작 요청이 접수되었습니다.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "AR 제작 요청에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!uid || !work || workflowStatus === "approved") {
      return;
    }

    const confirmed = window.confirm("현재 AR 제작 요청을 취소할까요?");
    if (!confirmed) {
      return;
    }

    setIsCancelling(true);
    setStatusMessage("");

    try {
      await cancelWorkArV2RequestForArtist(work.id, uid);
      setWork((current) =>
        current
          ? {
              ...current,
              arV2Request: current.arV2Request
                ? {
                    ...current.arV2Request,
                    status: "cancelled",
                  }
                : current.arV2Request,
            }
          : current
      );
      setStatusMessage("AR 제작 요청이 취소되었습니다.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "요청 취소에 실패했습니다.");
    } finally {
      setIsCancelling(false);
    }
  };

  const publicArHref = work && work.isPublished === true
    ? `/ar/${resolveArtistWorkSlug(work)}`
    : "";
  const canCancel = Boolean(
    work?.arV2Request &&
      (work.arV2Request.status === "requested" ||
        workflowStatus === "changes-requested")
  );
  const canRequest = Boolean(work && !isSubmitting && !isCancelling && !requestBlocked);

  if (isLoading) {
    return (
      <section className="rounded-[2rem] border border-black/8 bg-white px-6 py-8 text-sm leading-7 text-neutral-600">
        작품 정보를 불러오는 중입니다.
      </section>
    );
  }

  if (errorMessage || loadErrorMessage) {
    return (
      <section className="rounded-[2rem] border border-red-200 bg-white px-6 py-8 text-sm leading-7 text-red-600">
        {errorMessage || loadErrorMessage}
      </section>
    );
  }

  if (!work || !artist || !uid) {
    return (
      <section className="rounded-[2rem] border border-black/8 bg-white px-6 py-8 text-sm leading-7 text-neutral-600">
        작품 정보를 불러올 수 없습니다.
      </section>
    );
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
      <div className="space-y-6">
        <div className="rounded-[2rem] border border-black/8 bg-white p-6 shadow-sm md:p-7">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-400">
                AR 제작 요청
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-neutral-950">
                {work.title || "Untitled"}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-600">
                작품 이미지와 실제 크기를 확인한 뒤 AR 제작을 요청하세요. 갤러리에서 실제 모델을 검수한 후 공개됩니다.
              </p>
              {createdNotice ? (
                <p className="mt-4 rounded-[1.25rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
                  작품이 저장되었습니다. AR 제작을 요청하려면 아래 내용을 확인하세요.
                </p>
              ) : null}
            </div>
            <Badge tone={workflowStatus === "approved" ? "green" : workflowStatus === "changes-requested" ? "orange" : workflowStatus === "outdated" ? "amber" : "gray"}>
              {getRequestStatusLabel(workflowStatus)}
            </Badge>
          </div>

          <p className="mt-4 rounded-[1.25rem] border border-black/8 bg-[#fcfbf8] px-4 py-4 text-sm leading-7 text-neutral-600">
            {getRequestStatusMessage(workflowStatus)}
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Field label="Artist" value={artist.name || artist.slug || artist.id} />
            <Field label="Source signature" value={currentSignature ? "Current source computed" : "—"} />
            <Field label="Requested at" value={formatDate(requestedAt)} />
            <Field label="Review status" value={work.arV2Review?.status || "—"} />
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Field label="Requested config" value={`Rotation ${rotationDeg}°, X ${flipX ? "ON" : "OFF"}, Y ${flipY ? "ON" : "OFF"}`} />
            <Field label="Finish" value={`Side ${sideColor} · Depth ${depthCm.toFixed(1)} cm · Back label ${backLabelEnabled ? "ON" : "OFF"}`} />
          </div>

          <div className="mt-5 space-y-4 rounded-[1.4rem] border border-black/8 bg-[#fcfbf8] px-4 py-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                Front Direction
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <ControlButton onClick={() => setRotationDeg((value) => (((value + 270) % 360) as ArtworkOrientation["rotationDeg"]))}>
                  Rotate Left
                </ControlButton>
                <ControlButton onClick={() => setRotationDeg((value) => (((value + 90) % 360) as ArtworkOrientation["rotationDeg"]))}>
                  Rotate Right
                </ControlButton>
                <ControlButton onClick={() => setRotationDeg((value) => (((value + 180) % 360) as ArtworkOrientation["rotationDeg"]))}>
                  Rotate 180°
                </ControlButton>
                <ControlButton active={flipX} onClick={() => setFlipX((value) => !value)}>
                  Flip Horizontal
                </ControlButton>
                <ControlButton active={flipY} onClick={() => setFlipY((value) => !value)}>
                  Flip Vertical
                </ControlButton>
                <ControlButton onClick={() => {
                  setRotationDeg(0);
                  setFlipX(false);
                  setFlipY(false);
                }}>
                  Reset
                </ControlButton>
              </div>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                Finish
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <ControlButton active={sideColor === "#111111"} onClick={() => setSideColor("#111111")}>
                  Matte Black
                </ControlButton>
                <ControlButton active={sideColor === "#f2eadf"} onClick={() => setSideColor("#f2eadf")}>
                  Warm Ivory
                </ControlButton>
                <ControlButton active={sideColor === "#8e8e8e"} onClick={() => setSideColor("#8e8e8e")}>
                  Neutral Gray
                </ControlButton>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                    Depth cm
                  </span>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={depthCm}
                    onChange={(event) => setDepthCm(Number(event.target.value) || DEFAULT_DEPTH_CM)}
                    className="mt-2 h-12 w-full rounded-[1.1rem] border border-black/10 bg-white px-4 text-sm text-neutral-900 outline-none transition focus:border-black/20"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => setBackLabelEnabled((value) => !value)}
                  className={`rounded-[1.1rem] border px-4 py-4 text-left transition ${
                    backLabelEnabled
                      ? "border-[#F37021]/30 bg-[#F37021]/10 text-[#8f4600]"
                      : "border-black/10 bg-white text-neutral-700"
                  }`}
                >
                  <p className="text-[11px] uppercase tracking-[0.24em] opacity-75">
                    Back Label
                  </p>
                  <p className="mt-2 text-sm leading-6">
                    {backLabelEnabled ? "On" : "Off"}
                  </p>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                Request Message
              </span>
              <textarea
                value={requestMessage}
                onChange={(event) => setRequestMessage(event.target.value)}
                rows={4}
                className="mt-2 w-full rounded-[1.25rem] border border-black/10 bg-white px-4 py-4 text-sm leading-7 text-neutral-900 outline-none transition focus:border-black/20"
                placeholder="갤러리에 전달할 요청 메시지를 입력하세요."
                disabled={isSubmitting || isCancelling}
              />
            </label>

            {work.arV2Review?.message?.trim() ? (
              <div className="rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-900">
                <p className="text-[11px] uppercase tracking-[0.24em] text-amber-700/80">
                  Review Message
                </p>
                <p className="mt-2">{work.arV2Review?.message?.trim()}</p>
              </div>
            ) : null}

            {statusMessage ? (
              <div className="rounded-[1.25rem] border border-black/8 bg-[#fcfbf8] px-4 py-4 text-sm leading-7 text-neutral-700">
                {statusMessage}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleRequest}
                disabled={!canRequest}
                className="inline-flex h-12 items-center justify-center rounded-full bg-neutral-950 px-5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-400"
              >
                {isSubmitting ? "요청 중..." : requestButtonLabel}
              </button>

              {canCancel ? (
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isCancelling}
                  className="inline-flex h-12 items-center justify-center rounded-full border border-black/10 bg-white px-5 text-sm text-neutral-900 transition hover:border-black/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCancelling ? "취소 중..." : "요청 취소"}
                </button>
              ) : null}

              {publicArHref ? (
                <Link
                  href={publicArHref}
                  className="inline-flex h-12 items-center justify-center rounded-full border border-[#F37021]/30 bg-[#F37021]/10 px-5 text-sm font-medium text-[#b85d18] transition hover:border-[#F37021]/45 hover:bg-[#F37021]/15"
                >
                  공개 AR 보기
                </Link>
              ) : null}
            </div>

            {requestButtonDisabledReason ? (
              <p className="text-sm leading-7 text-neutral-500">
                {requestButtonDisabledReason}
              </p>
            ) : null}
          </div>
        </div>

        <div className="rounded-[2rem] border border-black/8 bg-[#111111] p-4 shadow-sm md:p-5">
          <ArV2SourceImageStatus
            status={imageLoadStatus}
            coverImageUrl={coverImageUrl}
            image={loadedImage}
            error={imageLoadError}
            siteOrigin={siteOrigin}
            onRetry={handleRetryImage}
          />
        </div>
      </div>

      <aside className="space-y-6">
        <div className="rounded-[2rem] border border-black/8 bg-white p-5 shadow-sm md:p-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
            Source review
          </p>
          <div className="mt-4 grid gap-3">
            <Field label="Image URL" value={coverImageUrl || "—"} />
            <Field label="Natural size" value={loadedImage ? `${loadedImage.naturalWidth} × ${loadedImage.naturalHeight}px` : "—"} />
            <Field label="Image ratio" value={ratio ? `${ratio.differenceRatio.toFixed(3)} / ${Math.round(ratio.differenceRatio * 100)}%` : "—"} />
            <Field label="Workflow" value={workflowStatus} />
          </div>
          <p className="mt-4 text-sm leading-7 text-neutral-600">
            이 화면은 제작 요청용 방향 확인입니다. 실제 3D 모델은 갤러리 검수 단계에서 생성됩니다.
          </p>
        </div>

        <div className="rounded-[2rem] border border-black/8 bg-white p-5 shadow-sm md:p-6">
          <ArtworkSourcePreview
            image={loadedImage ?? undefined}
            dimensions={dimensions}
            orientation={{ rotationDeg, flipX, flipY }}
          />
        </div>

        <div className="rounded-[2rem] border border-black/8 bg-white p-5 shadow-sm md:p-6">
          <BackLabelSourcePreview
            metadata={buildMetadata(work)}
            dimensions={dimensions}
            showBackLabel={backLabelEnabled}
          />
        </div>
      </aside>
    </section>
  );
}
