"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getArtistBySlug } from "@/data/artists";
import { getWorkBySlug as getStaticWorkBySlug } from "@/data/works";
import {
  getPublicWorksForArtistId,
  getPublicWorksForArtistSlug,
  getWorkBySlugForPublicRoute,
  resolveArtistWorkSlug,
  type ArtistWorkDoc,
} from "@/lib/firebase/firestore";
import { hasArAsset, sortWorksForDisplay } from "@/lib/workDisplay";
import type { Work } from "@/types/work";

type PublicWork = Work & {
  id?: string;
};

type LoadState = "loading" | "ready" | "unpublished" | "missing" | "error";

function mapPublicWork(
  firestoreWork?: ArtistWorkDoc | null,
  fallbackWork?: Work
): PublicWork | null {
  const slug = firestoreWork
    ? resolveArtistWorkSlug(firestoreWork)
    : fallbackWork?.slug ?? "";
  const artistSlug = firestoreWork?.artistSlug ?? fallbackWork?.artistSlug ?? "";
  const artistName =
    firestoreWork?.artistName ?? fallbackWork?.artistName ?? "";
  const title = firestoreWork?.title ?? fallbackWork?.title ?? "";

  if (!slug || !artistSlug || !artistName || !title) {
    return null;
  }

  return {
    id: firestoreWork?.id,
    slug,
    artistSlug,
    artistName,
    title,
    year: firestoreWork?.year ?? fallbackWork?.year,
    medium: firestoreWork?.medium ?? fallbackWork?.medium,
    dimensions: firestoreWork?.dimensions ?? fallbackWork?.dimensions,
    description: firestoreWork?.description ?? fallbackWork?.description,
    coverImage: firestoreWork?.coverImageUrl ?? fallbackWork?.coverImage,
    coverImageUrl: firestoreWork?.coverImageUrl ?? fallbackWork?.coverImageUrl,
    modelGlb:
      firestoreWork?.generatedGlbUrl ??
      firestoreWork?.modelGlb ??
      fallbackWork?.modelGlb,
    modelUsdz:
      firestoreWork?.generatedUsdzUrl ??
      firestoreWork?.modelUsdz ??
      fallbackWork?.modelUsdz,
    generatedGlbUrl:
      firestoreWork?.generatedGlbUrl ?? fallbackWork?.generatedGlbUrl,
    generatedUsdzUrl:
      firestoreWork?.generatedUsdzUrl ?? fallbackWork?.generatedUsdzUrl,
    arV2Config:
      firestoreWork?.arV2Config ?? fallbackWork?.arV2Config,
    arV2Asset:
      firestoreWork?.arV2Asset ?? fallbackWork?.arV2Asset,
    widthCm: firestoreWork?.widthCm ?? fallbackWork?.widthCm,
    heightCm: firestoreWork?.heightCm ?? fallbackWork?.heightCm,
    depthCm: firestoreWork?.depthCm ?? fallbackWork?.depthCm,
    frontRotationXDeg:
      firestoreWork?.frontRotationXDeg ?? fallbackWork?.frontRotationXDeg,
    frontRotationYDeg:
      firestoreWork?.frontRotationYDeg ?? fallbackWork?.frontRotationYDeg,
    sideMode: firestoreWork?.sideMode ?? fallbackWork?.sideMode,
    showBackLabel:
      firestoreWork?.showBackLabel ?? fallbackWork?.showBackLabel,
    isPublished: firestoreWork?.isPublished ?? fallbackWork?.isPublished,
    archived: firestoreWork?.archived ?? fallbackWork?.archived,
  };
}

function getArtistHref(work?: PublicWork | null) {
  return work?.artistSlug ? `/artists/${work.artistSlug}` : "/artists";
}

function getWorkRouteSlug(work: PublicWork) {
  return work.slug
    ? work.slug
    : work.id
      ? resolveArtistWorkSlug({
          id: work.id,
          slug: work.slug,
          title: work.title,
          artistSlug: work.artistSlug,
        })
      : "";
}

function getWorkHref(work: PublicWork) {
  const routeSlug = getWorkRouteSlug(work);

  return routeSlug ? `/works/${routeSlug}` : "/works";
}

function getArHref(work: PublicWork) {
  const routeSlug = getWorkRouteSlug(work);

  return routeSlug ? `/ar/${routeSlug}` : "/ar";
}

function RelatedWorkCard({ work }: { work: PublicWork }) {
  const href = getWorkHref(work);
  const imageUrl = work.coverImageUrl ?? work.coverImage ?? "";

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[1.55rem] border border-white/10 bg-white/[0.04] transition hover:-translate-y-0.5 hover:border-[#F37021]/40 hover:shadow-[0_20px_70px_rgba(0,0,0,0.24)]">
      <Link href={href} aria-label={`${work.title} View Artwork`} className="absolute inset-0 z-10">
        <span className="sr-only">{work.title}</span>
      </Link>

      <div className="relative aspect-[5/6] overflow-hidden bg-[#161616]">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={work.title}
            className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full flex-col justify-between bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02)),radial-gradient(circle_at_18%_18%,rgba(243,112,33,0.16),transparent_34%)] p-5">
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-[0.34em] text-white/42">
                Artwork placeholder
              </p>
              <p className="text-sm leading-7 text-white/62">
                작품 이미지를 준비 중입니다.
              </p>
            </div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-white/42">
              KÜN’S Gallery
            </p>
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgba(0,0,0,0.42))] opacity-90 transition group-hover:opacity-100" />
        <div className="absolute left-4 top-4 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-[10px] uppercase tracking-[0.26em] text-white">
          {work.year || "Year"}
        </div>
        <div className="absolute bottom-4 left-4 rounded-full border border-[#F37021]/35 bg-[#F37021]/15 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-[#FFB37B] transition group-hover:border-[#F37021]/55 group-hover:bg-[#F37021]/22 group-hover:text-[#F7F1E8]">
          View Artwork
        </div>
      </div>

      <div className="flex flex-1 flex-col space-y-3 p-5 md:p-6">
        <h3 className="text-[1.18rem] font-semibold tracking-[-0.04em] text-[#F7F1E8] md:text-[1.28rem]">
          {work.title}
        </h3>
        <p className="text-sm leading-6 text-white/60">{work.medium || "Medium not set"}</p>
        <p className="text-sm leading-6 text-white/60">{work.dimensions || "Dimensions not set"}</p>
      </div>
    </article>
  );
}

function MoreWorksSection({
  artistName,
  artistHref,
  works,
}: {
  artistName: string;
  artistHref: string;
  works: PublicWork[];
}) {
  if (works.length === 0) {
    return null;
  }

  return (
    <section className="border-t border-white/10 py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl space-y-4">
            <p className="text-[11px] uppercase tracking-[0.34em] text-white/45">
              MORE WORKS BY ARTIST
            </p>
            <h2 className="text-3xl font-semibold tracking-[-0.04em] text-[#F7F1E8] md:text-5xl">
              More Works by {artistName}
            </h2>
            <p className="text-sm leading-7 text-white/62 md:text-[15px]">
              Explore selected works from the same artist.
            </p>
          </div>

          <Link
            href={artistHref}
            className="inline-flex h-11 items-center justify-center rounded-full border border-white/12 bg-white/[0.035] px-5 text-sm text-[#F7F1E8] transition hover:border-[#F37021]/40 hover:bg-[#F37021]/10"
          >
            View Artist Page
          </Link>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {works.map((relatedWork) => (
            <RelatedWorkCard key={relatedWork.slug} work={relatedWork} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ActionButton({
  href,
  children,
  outline = false,
}: {
  href: string;
  children: string;
  outline?: boolean;
}) {
  const base =
    "inline-flex h-11 items-center justify-center rounded-full px-4 text-sm transition";
  const tone = outline
    ? "border border-white/12 bg-white/[0.035] text-[#F7F1E8] hover:border-[#F37021]/40 hover:bg-[#F37021]/10"
    : "border border-[#F37021]/45 bg-[#F37021] text-[#171717] hover:bg-[#ff7a2f]";

  return (
    <Link href={href} className={`${base} ${tone}`}>
      {children}
    </Link>
  );
}

function CopyButton({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-11 items-center justify-center rounded-full border border-white/12 bg-white/[0.035] px-4 text-sm text-[#F7F1E8] transition hover:border-[#F37021]/40 hover:bg-[#F37021]/10"
    >
      Share Artwork
    </button>
  );
}

function PublicWorkDetailShell({
  work,
  moreWorks,
  onCopyLink,
  copyMessage,
}: {
  work: PublicWork;
  moreWorks: PublicWork[];
  onCopyLink: () => void;
  copyMessage: string;
}) {
  const artist = getArtistBySlug(work.artistSlug);
  const artistHref = getArtistHref(work);
  const artistPageHref = work.artistSlug ? `/artists/${work.artistSlug}` : "";
  const arHref = getArHref(work);
  const arReady = hasArAsset(work);
  const hasImage = Boolean(work.coverImageUrl || work.coverImage);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const imageUrl = work.coverImageUrl ?? work.coverImage ?? "";

  useEffect(() => {
    if (!isImageViewerOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsImageViewerOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isImageViewerOpen]);

  const detailRows = [
    { label: "YEAR", value: work.year },
    { label: "MEDIUM", value: work.medium },
    { label: "DIMENSIONS", value: work.dimensions },
  ].filter((entry) => Boolean(entry.value));

  return (
    <>
      <div className="mx-auto max-w-7xl px-5 py-6 md:px-8 md:py-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Link
            href="/"
            className="text-[11px] uppercase tracking-[0.34em] text-white/45"
          >
            KÜN’S GALLERY
          </Link>

          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <Link
              href="/artists"
              className="inline-flex h-11 items-center rounded-full border border-white/10 bg-white/[0.06] px-5 text-sm text-[#F7F1E8] transition hover:border-white/20 hover:bg-white/[0.1]"
            >
              View Artists
            </Link>
            <Link
              href={artistHref}
              className="inline-flex h-11 items-center rounded-full border border-white/10 bg-white/[0.04] px-5 text-sm text-[#F7F1E8] transition hover:border-white/20 hover:bg-white/[0.08]"
            >
              View Artist Page
            </Link>
          </div>
        </header>
      </div>

      <div className="mx-auto max-w-7xl px-5 pb-20 md:px-8">
        <section className="relative overflow-hidden rounded-[2.6rem] border border-white/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02)),radial-gradient(circle_at_84%_12%,rgba(243,112,33,0.2),transparent_28%),radial-gradient(circle_at_18%_0%,rgba(255,255,255,0.06),transparent_22%),#171717] p-5 shadow-[0_30px_120px_rgba(0,0,0,0.42)] md:p-8 lg:p-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(243,112,33,0.16),transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.05),transparent_28%)]" />

          <div className="relative grid gap-8 lg:grid-cols-[0.94fr_1.06fr] lg:items-start">
            <div className="order-2 space-y-5 lg:order-1 lg:sticky lg:top-8">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[10px] uppercase tracking-[0.34em] text-white/52">
                  KÜN’S GALLERY
                </span>
                <span className="inline-flex rounded-full border border-[#F37021]/30 bg-[#F37021]/12 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-[#FF9B5A]">
                  ARTWORK ARCHIVE
                </span>
              </div>

              <div className="max-w-4xl">
                <h1 className="text-4xl font-semibold tracking-[-0.05em] text-[#F7F1E8] md:text-6xl md:leading-[0.95]">
                  {work.title}
                </h1>
                <div className="mt-4">
                  {artistPageHref ? (
                    <Link
                      href={artistPageHref}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-lg text-white/72 transition hover:border-[#F37021]/40 hover:bg-[#F37021]/10 hover:text-[#F7F1E8] md:text-xl"
                    >
                      <span>{work.artistName}</span>
                      <span className="text-[#FF9B5A]">↗</span>
                    </Link>
                  ) : (
                    <p className="text-lg text-white/68 md:text-xl">
                      {work.artistName}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {detailRows.map((row) => (
                  <div
                    key={row.label}
                    className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] px-4 py-4"
                  >
                    <p className="text-[10px] uppercase tracking-[0.28em] text-white/42">
                      {row.label}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/78 md:text-[15px]">
                      {row.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="max-w-3xl rounded-[1.35rem] border border-white/10 bg-white/[0.035] p-4 md:p-5">
                <p className="text-[10px] uppercase tracking-[0.32em] text-white/42">
                  DESCRIPTION
                </p>
                {work.description ? (
                  <div className="mt-3 space-y-4 text-[15px] leading-8 text-white/72 md:text-[16px]">
                    {work.description.split("\n").map((paragraph, index) => (
                      <p key={`description-${index}`}>{paragraph}</p>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm leading-7 text-white/48">
                    작품 설명이 준비 중입니다.
                  </p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[10px] uppercase tracking-[0.32em] text-white/42">
                    Artist
                  </p>
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-lg font-medium tracking-[-0.03em] text-[#F7F1E8]">
                        {artist?.name ?? work.artistName}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-white/55">
                        {work.artistSlug ? "Artist page available" : "Artist page coming soon"}
                      </p>
                    </div>
                    {work.artistSlug ? (
                      <Link
                        href={artistHref}
                        className="inline-flex h-10 items-center rounded-full border border-white/12 bg-white/[0.035] px-4 text-sm text-[#F7F1E8] transition hover:border-[#F37021]/40 hover:bg-[#F37021]/10"
                      >
                        View Artist Page
                      </Link>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 md:justify-end">
                  {arReady ? (
                    <ActionButton href={arHref} outline>
                      View AR
                    </ActionButton>
                  ) : (
                    <span className="inline-flex h-11 items-center rounded-full border border-amber-200 bg-amber-50 px-4 text-xs uppercase tracking-[0.24em] text-amber-900">
                      AR Preview Preparing
                    </span>
                  )}
                  <CopyButton onClick={onCopyLink} />
                </div>
              </div>

              <p className="text-[11px] uppercase tracking-[0.24em] text-white/38">
                {arReady ? "AR Preview Available" : "AR Preview Preparing"}
              </p>

              {copyMessage ? (
                <p className="text-sm leading-6 text-white/60">{copyMessage}</p>
              ) : null}
            </div>

            <div className="order-1 lg:order-2 lg:sticky lg:top-8">
              <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#141414] shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
                <div className="relative bg-[#151515] p-4 md:p-6">
                  {hasImage ? (
                    <button
                      type="button"
                      onClick={() => setIsImageViewerOpen(true)}
                      className="group relative block w-full overflow-hidden rounded-[1.2rem] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F37021]/50"
                      aria-label="View artwork image larger"
                    >
                      <img
                        src={imageUrl}
                        alt={work.title}
                        className="max-h-[68vh] w-full object-contain md:max-h-[760px]"
                      />
                      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_50%,rgba(0,0,0,0.36))] opacity-100" />
                      <div className="absolute bottom-4 left-4 rounded-full border border-white/12 bg-black/45 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-white/88 transition group-hover:border-[#F37021]/45 group-hover:bg-[#F37021]/12">
                        View Larger
                      </div>
                    </button>
                  ) : (
                    <div className="flex h-full w-full min-h-[420px] flex-col justify-between rounded-[1.15rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02)),radial-gradient(circle_at_18%_18%,rgba(243,112,33,0.16),transparent_34%)] p-5 md:min-h-[720px] md:p-6">
                      <div className="space-y-2">
                        <p className="text-[10px] uppercase tracking-[0.34em] text-white/42">
                          Artwork placeholder
                        </p>
                        <p className="max-w-sm text-sm leading-7 text-white/62">
                          작품 이미지를 준비 중입니다.
                        </p>
                      </div>
                      <p className="text-[11px] uppercase tracking-[0.28em] text-white/42">
                        KÜN’S Gallery
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="relative mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-white/62">
              공개 작품 상세 페이지
            </div>
            <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-white/62">
              공개 URL: {getWorkHref(work)}
            </div>
            <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-white/62">
              AR URL: {arHref}
            </div>
          </div>
        </section>
      </div>

      <MoreWorksSection
        artistName={artist?.name ?? work.artistName}
        artistHref={artistHref}
        works={moreWorks}
      />

      {isImageViewerOpen && hasImage ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/82 p-4 backdrop-blur-md"
          onClick={() => setIsImageViewerOpen(false)}
        >
          <div
            className="relative flex h-full w-full max-w-[min(96vw,90rem)] items-center justify-center"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="absolute right-2 top-2 z-10 md:right-4 md:top-4">
              <button
                type="button"
                onClick={() => setIsImageViewerOpen(false)}
                className="inline-flex h-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.05] px-4 text-sm text-[#F7F1E8] transition hover:border-white/25 hover:bg-white/[0.09]"
              >
                Close
              </button>
            </div>
            <div className="flex w-full items-center justify-center rounded-[2rem] border border-white/10 bg-[#151515]/95 p-3 shadow-[0_30px_80px_rgba(0,0,0,0.45)] md:p-5">
              <img
                src={imageUrl}
                alt={work.title}
                className="max-h-[calc(100vh-2.5rem)] w-full object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function PublicWorkNotice({
  title,
  description,
  actionHref,
  actionLabel,
  meta,
}: {
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
  meta?: string;
}) {
  return (
    <>
      <div className="mx-auto max-w-7xl px-5 py-6 md:px-8 md:py-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Link
            href="/"
            className="text-[11px] uppercase tracking-[0.34em] text-white/45"
          >
            KÜN’S GALLERY
          </Link>

          <Link
            href="/artists"
            className="inline-flex h-11 items-center rounded-full border border-white/10 bg-white/[0.06] px-5 text-sm text-[#F7F1E8] transition hover:border-white/20 hover:bg-white/[0.1]"
          >
            View Artists
          </Link>
        </header>
      </div>

      <div className="mx-auto flex min-h-[calc(100vh-120px)] max-w-4xl items-center px-5 pb-20 md:px-8">
        <section className="w-full rounded-[2.4rem] border border-white/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02)),radial-gradient(circle_at_82%_12%,rgba(243,112,33,0.16),transparent_30%),#171717] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.35)] md:p-10">
          <p className="text-[11px] uppercase tracking-[0.34em] text-white/45">
            KÜN’S GALLERY
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[#F7F1E8] md:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/68 md:text-[15px]">
            {description}
          </p>
          {meta ? (
            <p className="mt-4 text-[11px] uppercase tracking-[0.28em] text-white/42">
              {meta}
            </p>
          ) : null}
          <div className="mt-8 flex flex-wrap gap-2">
            <ActionButton href={actionHref}>{actionLabel}</ActionButton>
            <ActionButton href="/artists" outline>
              Back to Artists
            </ActionButton>
          </div>
        </section>
      </div>
    </>
  );
}

export default function PublicWorkDetailPage({ slug }: { slug: string }) {
  const staticWork = useMemo(() => getStaticWorkBySlug(slug), [slug]);
  const [work, setWork] = useState<PublicWork | null>(null);
  const [moreWorks, setMoreWorks] = useState<PublicWork[]>([]);
  const [status, setStatus] = useState<LoadState>("loading");
  const [loadErrorMessage, setLoadErrorMessage] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  useEffect(() => {
    let isActive = true;
    setWork(null);
    setStatus("loading");
    setLoadErrorMessage("");
    setCopyMessage("");
    const timeoutId = window.setTimeout(() => {
      if (isActive) {
        setLoadErrorMessage(
          "Loading artwork details is taking longer than usual."
        );
      }
    }, 6000);

    void (async () => {
      try {
        const result = await getWorkBySlugForPublicRoute(slug);

        if (!isActive) {
          return;
        }

        if (result.work) {
          const mergedWork = mapPublicWork(result.work, staticWork ?? undefined);

          if (mergedWork) {
            setWork(mergedWork);
            setStatus(result.unpublished ? "unpublished" : "ready");
            setLoadErrorMessage("");
            return;
          }

          setWork(null);
          setStatus(result.unpublished ? "unpublished" : "missing");
          setLoadErrorMessage("");
          return;
        }

        setWork(null);
        setStatus(result.work ? "unpublished" : "missing");
        setLoadErrorMessage("");
      } catch {
        if (!isActive) {
          return;
        }

        setWork(null);
        setStatus("error");
        setLoadErrorMessage("We couldn't load the artwork details.");
      } finally {
        if (isActive) {
          window.clearTimeout(timeoutId);
        }
      }
    })();

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [slug, staticWork]);

  useEffect(() => {
    let isActive = true;

    if (!work || status !== "ready") {
      setMoreWorks([]);
      return () => {
        isActive = false;
      };
    }

    void (async () => {
      try {
        const artistWorks = work.artistSlug
          ? await getPublicWorksForArtistSlug(work.artistSlug)
          : work.artistId
            ? await getPublicWorksForArtistId(work.artistId)
            : [];

        if (!isActive) {
          return;
        }

        const currentRouteSlug = getWorkRouteSlug(work);
        const filteredWorks = artistWorks.filter((candidate) => {
          const candidateRouteSlug = resolveArtistWorkSlug(candidate);

          return (
            candidate.id !== work.id &&
            candidate.slug !== work.slug &&
            candidateRouteSlug !== currentRouteSlug
          );
        });

        const sortedWorks = sortWorksForDisplay(filteredWorks)
          .map((candidate) => mapPublicWork(candidate, undefined))
          .filter((candidate): candidate is PublicWork => candidate !== null)
          .slice(0, 4);

        setMoreWorks(sortedWorks);
      } catch {
        if (!isActive) {
          return;
        }

        setMoreWorks([]);
      }
    })();

    return () => {
      isActive = false;
    };
  }, [status, work]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyMessage("Artwork link copied.");
    } catch {
      setCopyMessage("링크 복사에 실패했습니다. URL을 직접 복사해주세요.");
    }
  };

  if (status === "loading") {
    return (
      <main className="theme-dark min-h-screen bg-[#111111] text-[#F7F1E8]">
        <div className="mx-auto flex min-h-screen max-w-4xl items-center px-5 py-12 md:px-8">
          <div className="w-full rounded-[2.5rem] border border-white/10 bg-white/[0.045] p-8 md:p-10">
            <p className="text-[11px] uppercase tracking-[0.34em] text-white/45">
              KÜN’S GALLERY
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] md:text-5xl">
              Loading artwork details.
            </h1>
            {loadErrorMessage ? (
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/60">
                {loadErrorMessage}
              </p>
            ) : null}
          </div>
        </div>
      </main>
    );
  }

  if (status === "unpublished") {
    return (
      <main className="theme-dark min-h-screen bg-[#111111] text-[#F7F1E8]">
        <PublicWorkNotice
          title="This artwork has not been approved for public view yet."
          description="The artwork is available internally, but it has not been approved for public display yet."
          actionHref={getArtistHref(work)}
          actionLabel="View Artist Page"
          meta={work ? `${work.title} · ${work.artistName}` : undefined}
        />
      </main>
    );
  }

  if (status === "missing") {
    return (
      <main className="theme-dark min-h-screen bg-[#111111] text-[#F7F1E8]">
        <PublicWorkNotice
          title="Artwork not found."
          description="We couldn't find a public artwork that matches the requested path."
          actionHref="/artists"
          actionLabel="Back to Artists"
        />
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="theme-dark min-h-screen bg-[#111111] text-[#F7F1E8]">
        <PublicWorkNotice
          title="We couldn't load the artwork details."
          description={
            loadErrorMessage ||
            "Please try again in a moment. A problem occurred while loading the public artwork archive."
          }
          actionHref="/artists"
          actionLabel="Back to Artists"
        />
      </main>
    );
  }

  if (!work) {
    return (
      <main className="theme-dark min-h-screen bg-[#111111] text-[#F7F1E8]">
        <PublicWorkNotice
          title="Artwork not found."
          description="We couldn't find a public artwork that matches the requested path."
          actionHref="/artists"
          actionLabel="Back to Artists"
        />
      </main>
    );
  }

  return (
    <main className="theme-dark min-h-screen bg-[#111111] text-[#F7F1E8]">
      <PublicWorkDetailShell
        work={work}
        moreWorks={moreWorks}
        onCopyLink={handleCopyLink}
        copyMessage={copyMessage}
      />
    </main>
  );
}
