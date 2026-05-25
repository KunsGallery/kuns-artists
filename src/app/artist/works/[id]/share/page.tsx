"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import QRCode from "qrcode";
import LogoutButton from "@/components/auth/LogoutButton";
import { useProtectedArtist } from "@/hooks/useProtectedArtist";
import {
  getArtistWorkForShareByIdOrSlug,
  getPublicArtistBySlug,
  resolveArtistWorkSlug,
  type ArtistDoc,
  type ArtistWorkDoc,
} from "@/lib/firebase/firestore";
import {
  buildWorkShareCardFilename,
  captureElementAsPng,
  downloadBlob,
  isLikelyR2PublicImageUrl,
  imageUrlToDataUrl,
} from "@/lib/shareCards";

const PUBLIC_BASE_URL = "https://artists.kunsgallery.com";
const WORK_NOT_FOUND_MESSAGE = "작품을 찾을 수 없습니다.";
const WORK_ACCESS_DENIED_MESSAGE = "이 작품의 공유 카드에 접근할 수 없습니다.";

function normalizeCardText(value?: string) {
  const normalized = value?.trim().replace(/\s+/g, " ") || "";

  if (!normalized) {
    return "";
  }

  if (/^year not set$/i.test(normalized)) {
    return "";
  }

  return normalized;
}

function formatMeasurement(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "";
  }

  return Number.isInteger(value) ? value.toFixed(1) : `${value}`;
}

function formatWorkDimensions(work: ArtistWorkDoc) {
  const explicitDimensions = normalizeCardText(work.dimensions);

  if (explicitDimensions) {
    return explicitDimensions;
  }

  if (
    typeof work.widthCm === "number" &&
    Number.isFinite(work.widthCm) &&
    typeof work.heightCm === "number" &&
    Number.isFinite(work.heightCm)
  ) {
    return `${formatMeasurement(work.widthCm)} × ${formatMeasurement(work.heightCm)} cm`;
  }

  return "";
}

export default function ArtistWorkSharePage() {
  const params = useParams<{ id: string | string[] }>();
  const workId =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0] || ""
        : "";

  const { artist, errorMessage, isLoading: isLoadingArtist, uid } =
    useProtectedArtist({
      fallbackErrorMessage: "작가 정보를 불러오는 중 오류가 발생했습니다.",
      redirectOnFail: false,
    });
  const [work, setWork] = useState<ArtistWorkDoc | null>(null);
  const [publicArtist, setPublicArtist] = useState<ArtistDoc | null>(null);
  const [isLoadingWork, setIsLoadingWork] = useState(true);
  const [workErrorMessage, setWorkErrorMessage] = useState("");
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrLoading, setQrLoading] = useState(true);
  const [qrError, setQrError] = useState("");
  const [imageError, setImageError] = useState(false);
  const [downloadImageSrc, setDownloadImageSrc] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [copyError, setCopyError] = useState("");
  const [downloadMessage, setDownloadMessage] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function loadWork() {
      if (!uid || !workId) {
        if (isActive) {
          setWork(null);
          setPublicArtist(null);
          setIsLoadingWork(false);
        }
        return;
      }

      try {
        setIsLoadingWork(true);
        setWorkErrorMessage("");

        const nextWork = await getArtistWorkForShareByIdOrSlug(workId);

        if (!isActive) {
          return;
        }

        if (!nextWork) {
          setWork(null);
          setPublicArtist(null);
          setWorkErrorMessage(WORK_NOT_FOUND_MESSAGE);
          return;
        }

        const ownerId = artist?.id?.trim() || uid;
        const isOwner =
          (nextWork.artistId ?? "").trim() === uid ||
          (nextWork.artistId ?? "").trim() === ownerId;

        if (!isOwner) {
          setWork(null);
          setPublicArtist(null);
          setWorkErrorMessage(WORK_ACCESS_DENIED_MESSAGE);
          return;
        }

        setWork(nextWork);
        setWorkErrorMessage("");

        if (nextWork.artistSlug) {
          void getPublicArtistBySlug(nextWork.artistSlug)
            .then((artistDoc) => {
              if (isActive) {
                setPublicArtist(artistDoc);
              }
            })
            .catch(() => {
              if (isActive) {
                setPublicArtist(null);
              }
            });
        } else {
          setPublicArtist(null);
        }
      } catch (error) {
        if (!isActive) {
          return;
        }

        setWork(null);
        setPublicArtist(null);
        setWorkErrorMessage(
          error instanceof Error
            ? error.message
            : "작품 정보를 불러오는 중 오류가 발생했습니다."
        );
      } finally {
        if (isActive) {
          setIsLoadingWork(false);
        }
      }
    }

    void loadWork();

    return () => {
      isActive = false;
    };
  }, [artist?.id, uid, workId]);

  const displayWork = useMemo(() => {
    if (!work) {
      return null;
    }

    const workSlug =
      work.slug?.trim() || resolveArtistWorkSlug(work) || work.id?.trim();
    const workUrl = workSlug ? `${PUBLIC_BASE_URL}/ar/${workSlug}` : "";

    return {
      title: work.title?.trim() || "Untitled",
      artistName:
        work.artistName?.trim() ||
        artist?.name?.trim() ||
        publicArtist?.name?.trim() ||
        "",
      year: normalizeCardText(work.year),
      medium: normalizeCardText(work.medium),
      dimensions: formatWorkDimensions(work),
      coverImageUrl: work.coverImageUrl?.trim() || "",
      workSlug: workSlug || "",
      workUrl,
    };
  }, [artist?.name, artist?.nameKo, publicArtist, work]);

  const previewImageSrc = displayWork?.coverImageUrl || "";
  const cardImageSrc = downloadImageSrc || previewImageSrc;
  const hasImage = Boolean(cardImageSrc) && (!imageError || Boolean(downloadImageSrc));
  const hasWorkUrl = Boolean(displayWork?.workUrl);
  const showDebugNote = process.env.NODE_ENV === "development";
  const displayWorkUrlSegments = useMemo(() => {
    if (!displayWork?.workUrl) {
      return [];
    }

    try {
      const parsedUrl = new URL(displayWork.workUrl);
      return [parsedUrl.host, `${parsedUrl.pathname}${parsedUrl.search}`];
    } catch {
      return [displayWork.workUrl];
    }
  }, [displayWork?.workUrl]);

  useEffect(() => {
    let isActive = true;

    if (!displayWork?.workUrl) {
      setQrDataUrl("");
      setQrLoading(false);
      setQrError("");
      return () => {
        isActive = false;
      };
    }

    setQrLoading(true);
    setQrError("");
    setQrDataUrl("");

    void QRCode.toDataURL(displayWork.workUrl, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 512,
      color: {
        dark: "#171717",
        light: "#FFFFFF",
      },
    })
      .then((dataUrl) => {
        if (isActive) {
          setQrDataUrl(dataUrl);
        }
      })
      .catch(() => {
        if (isActive) {
          setQrError("QR 코드를 생성하지 못했습니다. 잠시 후 다시 시도해주세요.");
          setQrDataUrl("");
        }
      })
      .finally(() => {
        if (isActive) {
          setQrLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [displayWork?.workUrl]);

  useEffect(() => {
    setImageError(false);
    setDownloadImageSrc("");
  }, [displayWork?.coverImageUrl]);

  async function handleCopyLink() {
    if (!displayWork?.workUrl) {
      setCopyError("링크 복사에 실패했습니다. URL을 직접 복사해주세요.");
      return;
    }

    try {
      await navigator.clipboard.writeText(displayWork.workUrl);
      setCopyMessage("링크가 복사되었습니다.");
      setCopyError("");
    } catch {
      setCopyError("링크 복사에 실패했습니다. URL을 직접 복사해주세요.");
    }
  }

  async function handleDownloadCard() {
    if (!cardRef.current || !displayWork) {
      setDownloadError("작품 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    setIsDownloading(true);
    setDownloadMessage("");
    setDownloadError("");

    try {
      const embeddedImageSrc =
        previewImageSrc && !isLikelyR2PublicImageUrl(previewImageSrc)
          ? await imageUrlToDataUrl(previewImageSrc)
          : null;

      if (embeddedImageSrc) {
        setDownloadImageSrc(embeddedImageSrc);
        await new Promise<void>((resolve) =>
          window.requestAnimationFrame(() => resolve())
        );
        await new Promise<void>((resolve) =>
          window.requestAnimationFrame(() => resolve())
        );
      }

      const blob = await captureElementAsPng(cardRef.current, {
        backgroundColor: "#171717",
        pixelRatio: 3,
      });

      downloadBlob(
        blob,
        buildWorkShareCardFilename({
          slug: displayWork.workSlug,
          id: work?.id ?? "",
        })
      );
      setDownloadMessage("카드 이미지 다운로드가 시작되었습니다.");
    } catch {
      setDownloadError("카드 이미지를 저장하지 못했습니다. 이미지 보안 설정 또는 네트워크 상태를 확인해주세요.");
    } finally {
      setDownloadImageSrc("");
      setIsDownloading(false);
    }
  }

  const isAccessDenied = workErrorMessage === WORK_ACCESS_DENIED_MESSAGE;
  const isMissingWork = workErrorMessage === WORK_NOT_FOUND_MESSAGE;
  const hasPublishedStatus = work?.isPublished === true;
  const canInteract = Boolean(displayWork?.workUrl);
  const ownsLoadedWork = Boolean(
    work &&
      (((work.artistId ?? "").trim() === uid) ||
        ((work.artistId ?? "").trim() === (artist?.id?.trim() || uid)))
  );

  if (isLoadingArtist || isLoadingWork) {
    return (
      <main className="theme-dark min-h-screen bg-[#171717] text-[#F7F1E8]">
        <div className="mx-auto flex min-h-screen max-w-7xl items-center px-5 py-10 md:px-8">
          <div className="w-full rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 md:p-8">
            <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">
              Share Work Card
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] md:text-5xl">
              작품 공유 카드를 불러오는 중입니다.
            </h1>
          </div>
        </div>
      </main>
    );
  }

  if (!artist) {
    return (
      <main className="theme-dark min-h-screen bg-[#171717] text-[#F7F1E8]">
        <div className="mx-auto flex min-h-screen max-w-4xl items-center px-5 py-10 md:px-8">
          <div className="w-full rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 md:p-8">
            <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">
              Share Work Card
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] md:text-5xl">
              로그인이 필요합니다.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/65">
              작품 공유 카드를 만들려면 먼저 로그인해주세요.
            </p>
            <Link
              href="/artist/login"
              className="mt-8 inline-flex h-11 items-center justify-center rounded-full border border-[#F37021]/45 bg-[#F37021] px-5 text-sm font-medium text-[#171717] transition hover:bg-[#ff7a2f]"
            >
              로그인하기
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (workErrorMessage && (isAccessDenied || isMissingWork)) {
    return (
      <main className="theme-dark min-h-screen bg-[#171717] text-[#F7F1E8]">
        <div className="mx-auto flex min-h-screen max-w-4xl items-center px-5 py-10 md:px-8">
          <div className="w-full rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 md:p-8">
            <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">
              Share Work Card
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] md:text-5xl">
              {isMissingWork ? "작품을 찾을 수 없습니다." : "접근할 수 없습니다."}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/65">
              {workErrorMessage}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/artist/works"
                className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] px-5 text-sm text-[#F7F1E8] transition hover:border-white/20 hover:bg-white/[0.1]"
              >
                작품 목록으로 돌아가기
              </Link>
              <Link
                href="/artist/dashboard"
                className="inline-flex h-11 items-center justify-center rounded-full border border-[#F37021]/45 bg-[#F37021] px-5 text-sm font-medium text-[#171717] transition hover:bg-[#ff7a2f]"
              >
                대시보드
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="theme-dark min-h-screen bg-[#171717] text-[#F7F1E8]">
      <div className="mx-auto max-w-7xl px-5 py-6 md:px-8 md:py-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Link
            href="/"
            className="text-[11px] uppercase tracking-[0.28em] text-white/45"
          >
            KÜN’S GALLERY
          </Link>

          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <Link
              href="/artist/dashboard"
              className="inline-flex h-11 items-center rounded-full border border-white/10 bg-white/[0.06] px-5 text-sm text-[#F7F1E8] transition hover:border-white/20 hover:bg-white/[0.1]"
            >
              대시보드
            </Link>
            <Link
              href="/artist/works"
              className="inline-flex h-11 items-center rounded-full border border-white/10 bg-white/[0.06] px-5 text-sm text-[#F7F1E8] transition hover:border-white/20 hover:bg-white/[0.1]"
            >
              작품 목록
            </Link>
            <LogoutButton className="inline-flex h-11 items-center rounded-full border border-white/10 bg-white/[0.06] px-5 text-sm text-[#F7F1E8] transition hover:border-white/20 hover:bg-white/[0.1]">
              로그아웃
            </LogoutButton>
          </div>
        </header>

        <section className="grid gap-8 py-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:py-16">
          <div className="space-y-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">
                작품 공유 카드
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] md:text-6xl">
                작품 공유 카드
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-white/65 md:text-[15px]">
                작품 이미지와 QR 코드가 포함된 공유 카드를 생성합니다. 공개
                페이지 링크를 함께 확인할 수 있어 포트폴리오와 메시지 공유에
                바로 사용할 수 있습니다.
              </p>
            </div>

            {copyMessage ? (
              <div className="rounded-[1.5rem] border border-emerald-200 bg-[rgba(243,112,33,0.08)] px-4 py-4 text-sm leading-7 text-[#F7F1E8]">
                {copyMessage}
              </div>
            ) : null}

            {copyError ? (
              <div className="rounded-[1.5rem] border border-red-200 bg-[rgba(127,29,29,0.28)] px-4 py-4 text-sm leading-7 text-[#F7F1E8]">
                {copyError}
              </div>
            ) : null}

            {downloadMessage ? (
              <div className="rounded-[1.5rem] border border-emerald-200 bg-[rgba(243,112,33,0.08)] px-4 py-4 text-sm leading-7 text-[#F7F1E8]">
                {downloadMessage}
              </div>
            ) : null}

            {downloadError ? (
              <div className="rounded-[1.5rem] border border-red-200 bg-[rgba(127,29,29,0.28)] px-4 py-4 text-sm leading-7 text-[#F7F1E8]">
                {downloadError}
              </div>
            ) : null}

            {qrError ? (
              <div className="rounded-[1.5rem] border border-red-200 bg-[rgba(127,29,29,0.28)] px-4 py-4 text-sm leading-7 text-[#F7F1E8]">
                {qrError}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleCopyLink}
                disabled={!canInteract}
                className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] px-5 text-sm text-[#F7F1E8] transition hover:border-white/20 hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-60"
              >
                링크 복사
              </button>
              <button
                type="button"
                onClick={handleDownloadCard}
                disabled={!canInteract || qrLoading || Boolean(qrError) || isDownloading}
                className="inline-flex h-11 items-center justify-center rounded-full border border-[#F37021]/45 bg-[#F37021] px-5 text-sm font-medium text-[#171717] transition hover:bg-[#ff7a2f] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDownloading ? "다운로드 중..." : "카드 이미지 다운로드"}
              </button>
              <Link
                href={`/artist/works/${workId}/edit`}
                className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] px-5 text-sm text-[#F7F1E8] transition hover:border-white/20 hover:bg-white/[0.1]"
              >
                작품 수정으로 돌아가기
              </Link>
              <Link
                href="/artist/works"
                className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] px-5 text-sm text-[#F7F1E8] transition hover:border-white/20 hover:bg-white/[0.1]"
              >
                작품 목록으로 돌아가기
              </Link>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">
                Public URL
              </p>
              <div className="mt-2 space-y-1 text-sm leading-6 text-[#F7F1E8]">
                <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">
                  작품 공개 페이지
                </p>
                <p className="max-w-[24rem] break-words text-xs leading-relaxed text-white/70">
                  {displayWork?.workUrl || "공유 링크를 준비 중입니다."}
                </p>
                {work && !hasPublishedStatus ? (
                  <p className="text-xs leading-6 text-white/50">
                    공개 승인 전 작품은 외부에서 제한적으로 보일 수 있습니다.
                  </p>
                ) : null}
              </div>
            </div>

            {showDebugNote ? (
              <details className="rounded-[1.25rem] border border-white/10 bg-black/18 px-3 py-2 text-[10px] leading-5 text-white/55">
                <summary className="cursor-pointer list-none text-[10px] uppercase tracking-[0.28em] text-[#F37021]">
                  개발 정보
                </summary>
                <div className="mt-2 space-y-1">
                  <p>route id: {workId || "none"}</p>
                  <p>loaded work id: {work?.id || "none"}</p>
                  <p>computed workSlug: {displayWork?.workSlug || "none"}</p>
                  <p className="break-all">workUrl: {displayWork?.workUrl || "none"}</p>
                  <p>owner check result: {ownsLoadedWork ? "true" : "false"}</p>
                </div>
              </details>
            ) : null}
          </div>

          <div className="flex justify-center lg:justify-end">
            <div
              ref={cardRef}
              className="relative aspect-[9/16] w-full max-w-[390px] overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#171717] text-[#F7F1E8] shadow-[0_30px_120px_rgba(0,0,0,0.48)]"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(243,112,33,0.28),transparent_28%),radial-gradient(circle_at_85%_20%,rgba(247,241,232,0.12),transparent_18%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_28%,rgba(0,0,0,0.2))]" />
              <div className="absolute left-[-48px] top-[104px] h-[220px] w-[220px] rotate-[-9deg] rounded-[2rem] bg-[#F37021]/20 blur-[1px]" />
              <div className="absolute right-[-28px] top-[318px] h-[132px] w-[132px] rotate-[14deg] rounded-[1.75rem] border border-white/10 bg-white/[0.05]" />
              <div className="absolute bottom-[186px] left-5 right-5 h-px bg-gradient-to-r from-transparent via-white/16 to-transparent" />

              <div className="relative flex h-full flex-col p-5">
                <div className="flex flex-none items-start justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-[0.38em] text-white/45">
                      KÜN’S GALLERY
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <p className="text-[11px] font-medium uppercase tracking-[0.42em] text-[#F7F1E8]">
                        작품 패스
                      </p>
                      <span className="h-px w-10 bg-[#F37021]/80" />
                      <p className="text-[9px] uppercase tracking-[0.28em] text-white/44">
                        KUNS ARCHIVE
                      </p>
                    </div>
                  </div>

                  <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-[9px] uppercase tracking-[0.26em] text-white/50">
                    ARTWORK / QR PASS
                  </div>
                </div>

                <div className="relative mt-5 flex-none">
                  <div className="absolute left-4 top-4 h-full w-[calc(100%-1rem)] rounded-[2rem] bg-[#F37021]/22" />
                  <div className="absolute -right-2 bottom-6 h-11 w-24 rounded-full bg-[#F7F1E8]/10 blur-[0.5px]" />
                  <div className="relative overflow-hidden rounded-[1.85rem] border border-white/10 bg-white/[0.06] shadow-[0_24px_80px_rgba(0,0,0,0.38)]">
                    {hasImage ? (
                      <img
                        src={cardImageSrc}
                        alt={displayWork?.title || "Artwork cover"}
                        onLoad={() => {
                          if (!downloadImageSrc) {
                            setImageError(false);
                          }
                        }}
                        onError={() => {
                          if (downloadImageSrc) {
                            setDownloadError(
                              "카드 이미지를 저장하지 못했습니다. 이미지 보안 설정 또는 네트워크 상태를 확인해주세요."
                            );
                            return;
                          }

                          setImageError(true);
                        }}
                        className="block h-[340px] w-full object-cover object-center sm:h-[360px]"
                      />
                    ) : (
                      <div className="flex h-[340px] w-full flex-col justify-between bg-[radial-gradient(circle_at_20%_20%,rgba(243,112,33,0.18),transparent_34%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.12),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-5 sm:h-[360px]">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-black/25 text-sm font-medium tracking-[-0.03em] text-[#F7F1E8]">
                            {displayWork?.title?.charAt(0).toUpperCase() || "A"}
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.3em] text-white/45">
                              KÜN’S Gallery
                            </p>
                            <p className="mt-2 text-sm text-white/65">
                              작품 이미지를 업로드하면 카드에 표시됩니다.
                            </p>
                          </div>
                        </div>
                        <div className="max-w-[240px] space-y-3">
                          <p className="text-[10px] uppercase tracking-[0.3em] text-white/45">
                            세로 카드 레이아웃
                          </p>
                          <p className="text-base leading-7 text-[#F7F1E8]">
                            작품 이미지를 업로드하면 카드의 중심 비주얼로 표시됩니다.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex-none overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#F7F1E8] text-[#171717] shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
                  <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_96px] gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_104px] sm:p-5">
                    <div className="min-w-0 border-l-2 border-[#F37021] pl-3 sm:pl-4">
                      <p className="text-[10px] uppercase tracking-[0.34em] text-[#F37021]">
                        작품 공개 페이지
                      </p>
                      <h3 className="mt-2 break-words text-[1.56rem] font-semibold leading-[1.02] tracking-[-0.05em] text-[#171717] sm:text-[1.72rem]">
                        {displayWork?.title || "Untitled"}
                      </h3>
                      <p className="mt-2 text-[13px] leading-5 text-[#171717]/78">
                        {displayWork?.artistName || "Artist"}
                      </p>

                      <div className="mt-3 space-y-1 text-[11px] leading-5 text-[#171717]/72">
                        {displayWork?.year ? (
                          <p className="uppercase tracking-[0.24em]">
                            {displayWork.year}
                          </p>
                        ) : null}
                        {displayWork?.medium ? (
                          <p>{displayWork.medium}</p>
                        ) : null}
                        {displayWork?.dimensions ? (
                          <p>{displayWork.dimensions}</p>
                        ) : null}
                      </div>

                      <div className="mt-3 space-y-0.5 text-[10px] leading-4 text-[#171717]/56">
                        {displayWorkUrlSegments.map((segment) => (
                          <p key={segment} className="break-words">
                            {segment}
                          </p>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col items-end justify-between gap-3">
                      <div className="rounded-full border border-[#F37021]/18 bg-[#F37021]/8 px-3 py-1 text-[9px] uppercase tracking-[0.26em] text-[#B45A12]">
                        공개 페이지 확인
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="rounded-[1.25rem] bg-white p-2 shadow-[0_12px_28px_rgba(0,0,0,0.12)] ring-1 ring-black/5">
                          <div className="flex h-[92px] w-[92px] items-center justify-center overflow-hidden rounded-[1rem]">
                            {!hasWorkUrl ? (
                              <div className="flex h-full w-full items-center justify-center rounded-[1rem] border border-dashed border-black/10 text-center text-[10px] uppercase tracking-[0.2em] text-[#171717]/60">
                                QR 생성 불가
                              </div>
                            ) : qrLoading ? (
                              <div className="flex h-full w-full items-center justify-center rounded-[1rem] border border-dashed border-black/10 text-[10px] uppercase tracking-[0.24em] text-[#171717]/60">
                                QR 생성 중
                              </div>
                            ) : qrDataUrl ? (
                              <img
                                src={qrDataUrl}
                                alt="Artwork page QR code"
                                className="h-full w-full"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center rounded-[1rem] border border-dashed border-black/10 text-center text-[10px] uppercase tracking-[0.2em] text-[#171717]/60">
                                QR 생성 불가
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
