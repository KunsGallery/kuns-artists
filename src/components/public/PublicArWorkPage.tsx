"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getWorkBySlug as getStaticWorkBySlug } from "@/data/works";
import {
  getWorkBySlugForPublicRoute,
  resolveArtistWorkSlug,
  type ArtistWorkDoc,
} from "@/lib/firebase/firestore";
import { getArGlbUrl } from "@/lib/workDisplay";
import type { Work } from "@/types/work";
import { PublicArResponsiveLayout } from "./ar/PublicArResponsiveLayout";
import type { PublicArSource, PublicArWork } from "./ar/types";

function mapPublicWork(
  firestoreWork?: ArtistWorkDoc | null,
  fallbackWork?: Work
): PublicArWork | null {
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
    arV2Config: firestoreWork?.arV2Config ?? fallbackWork?.arV2Config,
    arV2Asset: firestoreWork?.arV2Asset ?? fallbackWork?.arV2Asset,
    docentAudioEnabled:
      firestoreWork?.docentAudioEnabled ?? fallbackWork?.docentAudioEnabled,
    docentAudioUrl:
      firestoreWork?.docentAudioUrl ?? fallbackWork?.docentAudioUrl,
    docentAudioTitle:
      firestoreWork?.docentAudioTitle ?? fallbackWork?.docentAudioTitle,
    docentAudioDescription:
      firestoreWork?.docentAudioDescription ??
      fallbackWork?.docentAudioDescription,
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

function getWorkRouteSlug(work: PublicArWork) {
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

function getWorkHref(work: PublicArWork) {
  const routeSlug = getWorkRouteSlug(work);

  return routeSlug ? `/works/${routeSlug}` : "/works";
}

function getArtistHref(work?: PublicArWork | null) {
  return work?.artistSlug ? `/artists/${work.artistSlug}` : "/artists";
}

function ArNoticeScreen({
  title,
  description,
  action,
  meta,
  source,
  debugMessage,
}: {
  title: string;
  description: string;
  action?: {
    href: string;
    label: string;
  };
  meta?: string;
  source?: PublicArSource;
  debugMessage?: string;
}) {
  const showDebugNote = process.env.NODE_ENV === "development";

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#111111] text-[#F7F1E8]">
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(243,112,33,0.16),transparent_28%),radial-gradient(circle_at_84%_12%,rgba(255,255,255,0.05),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.015),transparent_28%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/5" />

        <div className="mx-auto flex min-h-screen max-w-4xl items-center px-5 py-8 md:px-8">
          <section className="w-full rounded-[2.4rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.018)),#161616] p-6 shadow-[0_26px_100px_rgba(0,0,0,0.3)] md:p-8">
            <div className="mb-6 h-px w-24 bg-gradient-to-r from-[#F37021]/80 to-transparent" />
            <p className="text-[11px] uppercase tracking-[0.34em] text-white/42">
              KÜN’S GALLERY
            </p>

            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[#F7F1E8] md:text-5xl">
              {title}
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/66 md:text-[15px]">
              {description}
            </p>

            {meta ? (
              <p className="mt-4 text-[11px] uppercase tracking-[0.24em] text-white/40">
                {meta}
              </p>
            ) : null}

            {showDebugNote && debugMessage ? (
              <details className="mt-6 rounded-[1.25rem] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-white/62">
                <summary className="cursor-pointer list-none text-[11px] uppercase tracking-[0.22em] text-white/40">
                  Development
                </summary>
                <p className="mt-3 text-[11px] uppercase tracking-[0.22em] text-white/42">
                  Source: {source}
                </p>
                <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-white/42">
                  {debugMessage}
                </p>
              </details>
            ) : null}

            {action ? (
              <div className="mt-8">
                <Link
                  href={action.href}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-[#F37021]/35 bg-[#F37021]/10 px-4 text-sm text-[#F7F1E8] transition hover:border-[#F37021]/55 hover:bg-[#F37021]/16"
                >
                  {action.label}
                </Link>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}

function PendingWorkNotice({
  work,
  source,
  debugMessage,
}: {
  work: PublicArWork | null;
  source: PublicArSource;
  debugMessage?: string;
}) {
  const artistHref = work?.artistSlug ? `/artists/${work.artistSlug}` : "/artists";

  return (
    <ArNoticeScreen
      title="아직 공개 승인되지 않은 작품입니다."
      description="작품 정보는 확인되지만, 공개 승인 전이라 AR 페이지를 아직 볼 수 없습니다."
      action={{ href: artistHref, label: "작가 소개 보기" }}
      meta={work ? `${work.title} · ${work.artistName}` : undefined}
      source={source}
      debugMessage={debugMessage}
    />
  );
}

function MissingWorkNotice({
  slug,
  debugMessage,
}: {
  slug: string;
  debugMessage?: string;
}) {
  return (
    <ArNoticeScreen
      title="작품을 찾을 수 없습니다."
      description="요청한 경로와 일치하는 작품을 찾지 못했습니다."
      action={{ href: "/artists", label: "작품 목록 보기" }}
      meta={`요청 경로: ${slug}`}
      debugMessage={debugMessage}
    />
  );
}

export default function PublicArWorkPage({ slug }: { slug: string }) {
  const staticWork = useMemo(() => getStaticWorkBySlug(slug), [slug]);
  const [work, setWork] = useState<PublicArWork | null>(staticWork ?? null);
  const [source, setSource] = useState<PublicArSource>("Seed");
  const [isLoading, setIsLoading] = useState(true);
  const [unpublished, setUnpublished] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState("");
  const [publicArUrl, setPublicArUrl] = useState("");

  const artistHref = getArtistHref(work ?? staticWork);
  const workHref = work ? getWorkHref(work) : staticWork ? getWorkHref(staticWork) : "/works";
  const arMediaUrl = work ? getArGlbUrl(work) : "";
  const docentAudioEnabled =
    work?.docentAudioEnabled === true && Boolean(work.docentAudioUrl?.trim());
  const docentAudioUrl = work?.docentAudioUrl?.trim() || "";
  const docentAudioTitle = work?.docentAudioTitle?.trim() || "작품 도슨트";
  const docentAudioDescription = work?.docentAudioDescription?.trim() || "";

  useEffect(() => {
    let isActive = true;

    if (typeof window !== "undefined") {
      setPublicArUrl(new URL(`/ar/${slug}`, window.location.origin).toString());
    }

    const timeoutId = window.setTimeout(() => {
      if (isActive) {
        setIsLoading(false);
        setLoadErrorMessage(
          "작품 정보를 불러오는 데 시간이 걸리고 있습니다. 기본 정보를 먼저 표시합니다."
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
          const merged = mapPublicWork(result.work, staticWork ?? undefined);

          if (merged) {
            setWork(merged);
          }

          setUnpublished(result.unpublished);
          setSource("Firestore");
          setLoadErrorMessage("");
        } else if (staticWork) {
          setWork(staticWork);
          setUnpublished(false);
          setSource("Seed");
          setLoadErrorMessage("");
        } else {
          setWork(null);
          setUnpublished(false);
          setSource("Seed");
          setLoadErrorMessage("");
        }
      } catch {
        if (!isActive) {
          return;
        }

        setWork(staticWork ?? null);
        setUnpublished(false);
        setSource("Seed");
        setLoadErrorMessage(
          "작품 정보를 불러오지 못해 기본 정보를 먼저 표시합니다."
        );
      } finally {
        if (isActive) {
          window.clearTimeout(timeoutId);
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [slug, staticWork]);

  if (unpublished) {
    return (
      <PendingWorkNotice
        work={work}
        source={source}
        debugMessage={loadErrorMessage || undefined}
      />
    );
  }

  if (work) {
    return (
      <PublicArResponsiveLayout
        work={work}
        workHref={workHref}
        artistHref={artistHref}
        publicArUrl={publicArUrl}
        arMediaUrl={arMediaUrl}
        source={source}
        debugMessage={loadErrorMessage || undefined}
        docentAudioEnabled={docentAudioEnabled}
        docentAudioUrl={docentAudioUrl}
        docentAudioTitle={docentAudioTitle}
        docentAudioDescription={docentAudioDescription}
      />
    );
  }

  if (isLoading) {
    return (
      <ArNoticeScreen
        title="작품 정보를 불러오는 중입니다."
        description="공개 아카이브와 작품 레코드를 확인하고 있습니다."
        meta={loadErrorMessage || undefined}
        debugMessage={loadErrorMessage || undefined}
      />
    );
  }

  return (
    <MissingWorkNotice
      slug={slug}
      debugMessage={loadErrorMessage || undefined}
    />
  );
}
