"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import LogoutButton from "@/components/auth/LogoutButton";
import { getArtistBySlug } from "@/data/artists";
import { useProtectedArtist } from "@/hooks/useProtectedArtist";
import { getPublicArtistBySlug, type ArtistDoc } from "@/lib/firebase/firestore";
import {
  buildArtistPublicUrl,
  buildArtistShareCardFilename,
  captureElementAsPng,
  downloadBlob,
  imageUrlToDataUrl,
} from "@/lib/shareCards";

export default function ArtistSharePage() {
  const { artist, errorMessage, isLoading } = useProtectedArtist({
    fallbackErrorMessage: "작가 정보를 불러오는 중 오류가 발생했습니다.",
    redirectOnFail: false,
  });
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [template, setTemplate] = useState<"card" | "story">("card");
  const currentSlug = artist?.slug?.trim() || "";
  const staticArtist = useMemo(
    () => (currentSlug ? getArtistBySlug(currentSlug) : undefined),
    [currentSlug]
  );

  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrLoading, setQrLoading] = useState(true);
  const [qrError, setQrError] = useState("");
  const [publicArtist, setPublicArtist] = useState<ArtistDoc | null>(null);
  const [previewImageError, setPreviewImageError] = useState(false);
  const [downloadImageSrc, setDownloadImageSrc] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [copyError, setCopyError] = useState("");
  const [downloadMessage, setDownloadMessage] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    let isActive = true;

    if (!currentSlug) {
      setPublicArtist(null);
      return () => {
        isActive = false;
      };
    }

    setPublicArtist(null);

    void getPublicArtistBySlug(currentSlug)
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

    return () => {
      isActive = false;
    };
  }, [currentSlug]);

  const displayArtist = useMemo(() => {
    const displaySlug = publicArtist?.slug?.trim() || currentSlug;
    const protectedProfileImageUrl = artist?.profileImageUrl?.trim() || "";
    const publicProfileImageUrl = publicArtist?.profileImageUrl?.trim() || "";
    const staticProfileImageUrl = staticArtist?.profileImage?.trim() || "";

    return {
      slug: displaySlug,
      name:
        publicArtist?.name?.trim() ||
        artist?.name?.trim() ||
        staticArtist?.name?.trim() ||
        "Artist",
      nameKo:
        publicArtist?.nameKo?.trim() ||
        artist?.nameKo?.trim() ||
        staticArtist?.nameKo?.trim() ||
        "",
      tagline:
        publicArtist?.tagline?.trim() ||
        artist?.tagline?.trim() ||
        staticArtist?.tagline?.trim() ||
        "Represented Artist",
      protectedProfileImageUrl,
      publicProfileImageUrl,
      finalProfileImageUrl:
        publicProfileImageUrl || protectedProfileImageUrl || staticProfileImageUrl,
    };
  }, [artist, currentSlug, publicArtist, staticArtist]);

  const artistUrl = useMemo(() => {
    return displayArtist.slug ? buildArtistPublicUrl(displayArtist.slug) : "";
  }, [displayArtist.slug]);

  const hasSlug = Boolean(displayArtist.slug);
  const previewImageSrc = displayArtist.finalProfileImageUrl || "";
  const cardImageSrc = downloadImageSrc || previewImageSrc;
  const hasProfileImage = Boolean(previewImageSrc) && !previewImageError;
  const showDebugNote = process.env.NODE_ENV === "development";
  const isStoryTemplate = template === "story";
  const imageSourceKind = !previewImageSrc
    ? "placeholder"
    : previewImageError
      ? "placeholder"
      : downloadImageSrc
        ? "dataUrl"
        : "url";

  useEffect(() => {
    let isActive = true;

    if (!artistUrl) {
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

    void QRCode.toDataURL(artistUrl, {
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
  }, [artistUrl]);

  useEffect(() => {
    setPreviewImageError(false);
  }, [displayArtist.finalProfileImageUrl]);

  async function handleCopyLink() {
    if (!artistUrl) {
      setCopyError("링크 복사에 실패했습니다. URL을 직접 복사해주세요.");
      return;
    }

    try {
      await navigator.clipboard.writeText(artistUrl);
      setCopyMessage("링크가 복사되었습니다.");
      setCopyError("");
    } catch {
      setCopyError("링크 복사에 실패했습니다. URL을 직접 복사해주세요.");
    }
  }

  async function handleDownloadCard() {
    if (!cardRef.current) {
      setDownloadError("카드 이미지를 저장하지 못했습니다. 이미지 보안 설정 또는 네트워크 상태를 확인해주세요.");
      return;
    }

    if (!artistUrl) {
      setDownloadError("카드 이미지를 저장하지 못했습니다. 이미지 보안 설정 또는 네트워크 상태를 확인해주세요.");
      return;
    }

    setIsDownloading(true);
    setDownloadError("");
    setDownloadMessage("");

    try {
      const embeddedImageSrc = previewImageSrc
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
        buildArtistShareCardFilename(displayArtist.slug || "artist", template)
      );
      setDownloadMessage("카드 이미지 다운로드가 시작되었습니다.");
    } catch {
      setDownloadError("카드 이미지를 저장하지 못했습니다. 이미지 보안 설정 또는 네트워크 상태를 확인해주세요.");
    } finally {
      setDownloadImageSrc("");
      setIsDownloading(false);
    }
  }

  if (isLoading) {
    return (
      <main className="theme-dark min-h-screen bg-[#171717] text-[#F7F1E8]">
        <div className="mx-auto flex min-h-screen max-w-7xl items-center px-5 py-10 md:px-8">
          <div className="w-full rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 md:p-8">
            <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">
              Share Artist Card
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] md:text-5xl">
              작가 공유 카드를 불러오는 중입니다.
            </h1>
          </div>
        </div>
      </main>
    );
  }

  if (!artist) {
    if (errorMessage === "로그인이 필요합니다.") {
      return (
        <main className="theme-dark min-h-screen bg-[#171717] text-[#F7F1E8]">
          <div className="mx-auto flex min-h-screen max-w-4xl items-center px-5 py-10 md:px-8">
            <div className="w-full rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 md:p-8">
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">
                Share Artist Card
              </p>
              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] md:text-5xl">
                로그인이 필요합니다.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/65">
                작가 공유 카드를 만들려면 먼저 로그인해주세요.
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

    return (
      <main className="theme-dark min-h-screen bg-[#171717] text-[#F7F1E8]">
        <div className="mx-auto flex min-h-screen max-w-4xl items-center px-5 py-10 md:px-8">
          <div className="w-full rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 md:p-8">
            <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">
              Share Artist Card
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] md:text-5xl">
              작가 정보를 찾을 수 없습니다.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/65">
              {errorMessage || "공유 카드를 만들 수 있는 작가 정보를 찾지 못했습니다."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/artist/dashboard"
                className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] px-5 text-sm text-[#F7F1E8] transition hover:border-white/20 hover:bg-white/[0.1]"
              >
                대시보드
              </Link>
              <Link
                href="/artist/login"
                className="inline-flex h-11 items-center justify-center rounded-full border border-[#F37021]/45 bg-[#F37021] px-5 text-sm font-medium text-[#171717] transition hover:bg-[#ff7a2f]"
              >
                로그인
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
            <LogoutButton className="inline-flex h-11 items-center rounded-full border border-white/10 bg-white/[0.06] px-5 text-sm text-[#F7F1E8] transition hover:border-white/20 hover:bg-white/[0.1]">
              로그아웃
            </LogoutButton>
          </div>
        </header>

        <section className="grid gap-8 py-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:py-16">
          <div className="space-y-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">
                작가 공유 카드
              </p>
              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] md:text-6xl">
                작가 공유 카드
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-white/65 md:text-[15px]">
                공개 작가 페이지 링크와 QR 코드가 포함된 공유 카드를 생성합니다.
                인스타그램, 카카오톡, 포트폴리오 소개용으로 바로 사용할 수 있습니다.
              </p>
            </div>

            {!hasSlug ? (
              <div className="rounded-[1.5rem] border border-amber-200 bg-[rgba(243,112,33,0.1)] px-4 py-4 text-sm leading-7 text-[#F7F1E8]">
                공개 페이지 주소가 아직 준비되지 않았습니다. 프로필 정보를 먼저 확인해주세요.
              </div>
            ) : null}

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

            <div className="flex flex-wrap gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setTemplate("card")}
                className={`inline-flex h-10 shrink-0 items-center justify-center rounded-full border px-4 text-sm transition ${
                  template === "card"
                    ? "border-[#F37021]/45 bg-[#F37021] text-[#171717]"
                    : "border-white/10 bg-white/[0.06] text-[#F7F1E8] hover:border-white/20 hover:bg-white/[0.1]"
                }`}
              >
                Card 4:5
              </button>
              <button
                type="button"
                onClick={() => setTemplate("story")}
                className={`inline-flex h-10 shrink-0 items-center justify-center rounded-full border px-4 text-sm transition ${
                  template === "story"
                    ? "border-[#F37021]/45 bg-[#F37021] text-[#171717]"
                    : "border-white/10 bg-white/[0.06] text-[#F7F1E8] hover:border-white/20 hover:bg-white/[0.1]"
                }`}
              >
                Story 9:16
              </button>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleCopyLink}
                disabled={!hasSlug}
                className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] px-5 text-sm text-[#F7F1E8] transition hover:border-white/20 hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-60"
              >
                링크 복사
              </button>
              <button
                type="button"
                onClick={handleDownloadCard}
                disabled={!hasSlug || qrLoading || Boolean(qrError) || isDownloading}
                className="inline-flex h-11 items-center justify-center rounded-full border border-[#F37021]/45 bg-[#F37021] px-5 text-sm font-medium text-[#171717] transition hover:bg-[#ff7a2f] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDownloading ? "다운로드 중..." : "카드 이미지 다운로드"}
              </button>
              <Link
                href={artistUrl || "/artist/dashboard"}
                className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] px-5 text-sm text-[#F7F1E8] transition hover:border-white/20 hover:bg-white/[0.1]"
              >
                공개 페이지 열기
              </Link>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">
                Public URL
              </p>
              <div className="mt-2 space-y-1 text-sm leading-6 text-[#F7F1E8]">
                <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">
                  PUBLIC ARTIST PAGE
                </p>
                <p className="max-w-[24rem] break-words text-xs leading-relaxed text-white/70">
                  {artistUrl || "https://artists.kunsgallery.com/artists/"}
                </p>
              </div>
            </div>

            {showDebugNote ? (
              <details className="rounded-[1.25rem] border border-white/10 bg-black/18 px-3 py-2 text-[10px] leading-5 text-white/55">
                <summary className="cursor-pointer list-none text-[10px] uppercase tracking-[0.28em] text-[#F37021]">
                  개발 정보
                </summary>
                <div className="mt-2 space-y-1">
                  <p>
                    protected profileImageUrl:{" "}
                    {displayArtist.protectedProfileImageUrl ? "있음" : "없음"}
                  </p>
                  <p>
                    public profileImageUrl:{" "}
                    {displayArtist.publicProfileImageUrl ? "있음" : "없음"}
                  </p>
                  <p className="break-all">
                    final profileImageUrl:{" "}
                    {displayArtist.finalProfileImageUrl || "없음"}
                  </p>
                  <p>preview error: {previewImageError ? "true" : "false"}</p>
                  <p>image source: {imageSourceKind}</p>
                </div>
              </details>
            ) : null}
          </div>

          <div className="flex justify-center lg:justify-end">
            <div
              ref={cardRef}
              className={`relative w-full overflow-hidden rounded-[2rem] border border-white/10 bg-[#171717] text-[#F7F1E8] shadow-[0_30px_120px_rgba(0,0,0,0.45)] ${
                isStoryTemplate
                  ? "h-[640px] max-w-[360px]"
                  : "h-[540px] max-w-[432px]"
              }`}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(243,112,33,0.26),transparent_28%)]" />
              <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(255,255,255,0.05),transparent_35%)]" />

              {isStoryTemplate ? (
                <div className="relative flex h-full flex-col p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.34em] text-white/45">
                        KÜN’S Gallery
                      </p>
                      <p className="mt-3 text-[10px] uppercase tracking-[0.32em] text-[#F37021]">
                        전속 작가
                      </p>
                    </div>
                    <div className="shrink-0 rounded-[1.25rem] border border-white/10 bg-white p-2">
                      {qrLoading && hasSlug ? (
                        <div className="flex h-[92px] w-[92px] items-center justify-center rounded-[1rem] border border-dashed border-black/10 text-[10px] uppercase tracking-[0.2em] text-[#171717]/60">
                          QR 생성 중
                        </div>
                      ) : qrDataUrl ? (
                        <img
                          src={qrDataUrl}
                          alt="Artist page QR code"
                          className="h-[92px] w-[92px] rounded-[1rem]"
                        />
                      ) : (
                        <div className="flex h-[92px] w-[92px] items-center justify-center rounded-[1rem] border border-dashed border-black/10 text-center text-[10px] uppercase tracking-[0.2em] text-[#171717]/60">
                          QR 생성 불가
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 flex flex-1 flex-col">
                    <div className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                      <div className="overflow-hidden rounded-[1.6rem] bg-black/20">
                        {hasProfileImage ? (
                          <img
                            src={cardImageSrc}
                            alt={displayArtist.name}
                            referrerPolicy="no-referrer"
                            onLoad={() => setPreviewImageError(false)}
                            onError={() => setPreviewImageError(true)}
                            className="h-[300px] w-full object-cover object-center"
                          />
                        ) : (
                          <div className="flex h-[300px] flex-col justify-end bg-[radial-gradient(circle_at_20%_20%,rgba(243,112,33,0.24),transparent_34%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.09),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-5">
                            <p className="text-[10px] uppercase tracking-[0.3em] text-white/45">
                              KÜN’S Gallery
                            </p>
                            <p className="mt-3 text-base leading-7 text-[#F7F1E8]">
                              프로필 이미지를 업로드하면 카드에 표시됩니다.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 flex-1 rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-5">
                      <p className="text-[10px] uppercase tracking-[0.32em] text-white/45">
                        공개 페이지
                      </p>
                      <h2 className="mt-4 text-[2rem] font-semibold tracking-[-0.05em] text-[#F7F1E8]">
                        {displayArtist.name}
                      </h2>
                      {displayArtist.nameKo ? (
                        <p className="mt-2 text-base text-white/65">
                          {displayArtist.nameKo}
                        </p>
                      ) : null}
                      <p className="mt-4 text-sm leading-7 text-white/65">
                        {displayArtist.tagline}
                      </p>

                      <div className="mt-6 rounded-[1.25rem] border border-white/10 bg-black/20 p-4">
                        <p className="text-[10px] uppercase tracking-[0.3em] text-[#F37021]">
                          공개 페이지 확인
                        </p>
                        <p className="mt-3 break-words text-xs leading-relaxed text-white/70">
                          {artistUrl || "https://artists.kunsgallery.com/artists/"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative flex h-full flex-col p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.34em] text-white/45">
                        KÜN’S Gallery
                      </p>
                      <p className="mt-3 text-[10px] uppercase tracking-[0.32em] text-[#F37021]">
                        Represented Artist
                      </p>
                    </div>
                    <div className="shrink-0 rounded-[1.25rem] border border-white/10 bg-white p-2">
                      {qrLoading && hasSlug ? (
                        <div className="flex h-[108px] w-[108px] items-center justify-center rounded-[1rem] border border-dashed border-black/10 text-[10px] uppercase tracking-[0.2em] text-[#171717]/60">
                          QR 생성 중
                        </div>
                      ) : qrDataUrl ? (
                        <img
                          src={qrDataUrl}
                          alt="Artist page QR code"
                          className="h-[108px] w-[108px] rounded-[1rem]"
                        />
                      ) : (
                        <div className="flex h-[108px] w-[108px] items-center justify-center rounded-[1rem] border border-dashed border-black/10 text-center text-[10px] uppercase tracking-[0.2em] text-[#171717]/60">
                          QR 생성 불가
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 grid flex-1 gap-4">
                    <div className="relative overflow-hidden rounded-[1.9rem] border border-white/10 bg-white/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                      {hasProfileImage ? (
                        <img
                          src={cardImageSrc}
                          alt={displayArtist.name}
                          referrerPolicy="no-referrer"
                          onLoad={() => setPreviewImageError(false)}
                          onError={() => setPreviewImageError(true)}
                          className="h-[214px] w-full object-cover object-center"
                        />
                      ) : (
                        <div className="flex min-h-[214px] flex-col justify-between bg-[radial-gradient(circle_at_20%_20%,rgba(243,112,33,0.22),transparent_34%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.08),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.02))] p-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/25 text-sm font-medium tracking-[-0.03em] text-[#F7F1E8]">
                              {displayArtist.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-[0.3em] text-white/45">
                                KÜN’S Gallery
                              </p>
                              <p className="mt-2 text-sm text-white/65">
                                Portrait placeholder
                              </p>
                            </div>
                          </div>
                          <p className="max-w-[240px] text-base leading-7 text-[#F7F1E8]">
                            이미지를 업로드하면 카드 인상이 더 선명해집니다.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-[0.3em] text-[#F37021]">
                            Scan to view artist page
                          </p>
                          <p className="mt-3 text-[11px] uppercase tracking-[0.24em] text-white/45">
                            PUBLIC ARTIST PAGE
                          </p>
                          <p className="max-w-[20rem] break-words text-xs leading-relaxed text-white/70">
                            {artistUrl || "https://artists.kunsgallery.com/artists/"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase tracking-[0.24em] text-white/45">
                            KÜN’S Gallery
                          </p>
                          <p className="mt-2 text-sm leading-6 text-white/65">
                            Seoul, Korea
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {artistUrl ? (
          <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-white/[0.045] px-4 py-4 text-sm leading-7 text-white/65">
            카드와 QR은 공개 페이지 주소를 기준으로 생성됩니다.
          </div>
        ) : null}
      </div>
    </main>
  );
}
