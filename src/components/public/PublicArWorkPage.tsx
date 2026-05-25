"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DeviceRedirect from "@/components/ar/DeviceRedirect";
import { getArtistBySlug } from "@/data/artists";
import { getWorkBySlug as getStaticWorkBySlug } from "@/data/works";
import {
  getWorkBySlugForPublicRoute,
  resolveArtistWorkSlug,
  type ArtistWorkDoc,
} from "@/lib/firebase/firestore";
import type { Work } from "@/types/work";

type PublicWork = Work & {
  id?: string;
};

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

function getResolvedWorkHref(work: PublicWork) {
  const routeSlug = work.slug
    ? work.slug
    : work.id
      ? resolveArtistWorkSlug({
          id: work.id,
          slug: work.slug,
          title: work.title,
          artistSlug: work.artistSlug,
        })
      : "";

  return `/ar/${routeSlug}`;
}

function PublicWorkContent({
  work,
  source,
  debugMessage,
}: {
  work: Work;
  source: "Firestore" | "Seed";
  debugMessage?: string;
}) {
  const artist = getArtistBySlug(work.artistSlug);
  const showDebugNote = process.env.NODE_ENV === "development";

  return (
    <main className="theme-dark min-h-screen bg-[#f5f3ee] text-neutral-950">
      <section className="border-b border-black/5">
        <div className="mx-auto max-w-7xl px-5 py-6 md:px-8 md:py-8">
          <header className="flex items-center justify-between">
            <Link
              href="/"
              className="text-[11px] uppercase tracking-[0.28em] text-neutral-500"
            >
              KÜN’S GALLERY
            </Link>

            <nav className="flex items-center gap-2 md:gap-3">
              {work.artistSlug ? (
                <Link
                  href={`/artists/${work.artistSlug}`}
                  className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm"
                >
                  작가 페이지
                </Link>
              ) : null}

              <Link
                href="/artists"
                className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm"
              >
                작가 목록
              </Link>
            </nav>
          </header>

          <div className="grid gap-12 py-12 md:grid-cols-[1.08fr_0.92fr] md:items-end md:py-16">
            <div className="max-w-4xl">
              <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
                AR Viewing Page
              </p>

              <h1 className="mt-5 text-5xl font-semibold tracking-[-0.04em] text-neutral-950 md:text-7xl md:leading-[0.95]">
                {work.title}
              </h1>

              <p className="mt-4 text-lg text-neutral-500 md:text-xl">
                {work.artistName}
              </p>

              <div className="mt-8 space-y-2 text-sm text-neutral-600 md:text-[15px]">
                {work.year ? <p>Year · {work.year}</p> : null}
                {work.medium ? <p>Medium · {work.medium}</p> : null}
                {work.dimensions ? <p>Size · {work.dimensions}</p> : null}
              </div>

              {work.description ? (
                <p className="mt-8 max-w-2xl text-base leading-8 text-neutral-700 md:text-[17px]">
                  {work.description}
                </p>
              ) : null}

              {showDebugNote && debugMessage ? (
                <details className="mt-6 rounded-[1.25rem] border border-black/8 bg-white/85 px-3 py-2 text-sm leading-6 text-neutral-600">
                  <summary className="cursor-pointer list-none text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                    개발 정보
                  </summary>
                  <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                    {debugMessage}
                  </p>
                </details>
              ) : null}
            </div>

            <div className="flex justify-start md:justify-end">
              <div className="w-full max-w-[420px] rounded-[2rem] border border-black/10 bg-white/80 p-5 backdrop-blur-sm md:p-6">
                <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
                  Access
                </p>

                <div className="mt-5 space-y-4">
                  {showDebugNote ? (
                    <details className="rounded-[1.5rem] bg-[#f7f6f2] px-4 py-4">
                      <summary className="cursor-pointer list-none text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                        개발 정보
                      </summary>
                      <p className="mt-2 text-sm leading-6 text-neutral-600">
                        {source}
                      </p>
                    </details>
                  ) : null}

                  <div className="rounded-[1.5rem] bg-[#f7f6f2] px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                      주소
                    </p>
                    <p className="mt-2 text-sm leading-6 text-neutral-600">
                      {getResolvedWorkHref(work)}
                    </p>
                  </div>

                  <div className="rounded-[1.5rem] bg-[#f7f6f2] px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                      작가
                    </p>
                    <p className="mt-2 text-sm leading-6 text-neutral-600">
                      {artist ? artist.name : work.artistName}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-black/5 py-8 md:py-10">
            <DeviceRedirect work={work} />
          </div>
        </div>
      </section>
    </main>
  );
}

function PendingWorkNotice({
  work,
  source,
  debugMessage,
}: {
  work: Work | null;
  source: "Firestore" | "Seed";
  debugMessage?: string;
}) {
  const artistHref = work?.artistSlug ? `/artists/${work.artistSlug}` : "/artists";
  const showDebugNote = process.env.NODE_ENV === "development";

  return (
    <main className="theme-dark min-h-screen bg-[#f5f3ee] text-neutral-950">
      <section className="border-b border-black/5">
        <div className="mx-auto max-w-7xl px-5 py-6 md:px-8 md:py-8">
          <header className="flex items-center justify-between">
            <Link
              href="/"
              className="text-[11px] uppercase tracking-[0.28em] text-neutral-500"
            >
              KÜN’S GALLERY
            </Link>

            <div className="flex items-center gap-2 md:gap-3">
              <Link
                href="/artists"
                className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm"
              >
                작가 목록
              </Link>
              <Link
                href={artistHref}
                className="inline-flex h-11 items-center rounded-full border border-black/10 bg-[#f7f6f2] px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm"
              >
                작가 페이지
              </Link>
            </div>
          </header>

          <div className="grid gap-12 py-16 md:grid-cols-[1.08fr_0.92fr] md:items-end md:py-20">
            <div className="max-w-4xl">
              <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
                AR Viewing Page
              </p>

              <h1 className="mt-5 text-5xl font-semibold tracking-[-0.04em] text-neutral-950 md:text-7xl md:leading-[0.95]">
                아직 공개
                <br />
                승인되지 않은 작품입니다.
              </h1>

              <p className="mt-8 max-w-2xl text-sm leading-7 text-neutral-600 md:text-[15px]">
                관리자에서 작품 정보는 확인할 수 있지만, 공개 승인 상태가 아니면
                이 공개 AR 페이지는 아직 열리지 않습니다.
              </p>

              {work?.title ? (
                <p className="mt-6 text-lg text-neutral-500">{work.title}</p>
              ) : null}
              {work?.artistName ? (
                <p className="mt-2 text-sm text-neutral-500">{work.artistName}</p>
              ) : null}

              {showDebugNote && debugMessage ? (
                <details className="mt-6 rounded-[1.25rem] border border-black/8 bg-white/85 px-3 py-2 text-sm leading-6 text-neutral-600">
                  <summary className="cursor-pointer list-none text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                    개발 정보
                  </summary>
                  <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                    {debugMessage}
                  </p>
                </details>
              ) : null}
            </div>

            <div className="flex justify-start md:justify-end">
              <div className="w-full max-w-[420px] rounded-[2rem] border border-black/10 bg-white/80 p-5 backdrop-blur-sm md:p-6">
                <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
                  Status
                </p>

                <div className="mt-5 space-y-4">
                  {showDebugNote ? (
                    <details className="rounded-[1.5rem] bg-[#f7f6f2] px-4 py-4">
                      <summary className="cursor-pointer list-none text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                        개발 정보
                      </summary>
                      <p className="mt-2 text-sm leading-6 text-neutral-600">
                        {source}
                      </p>
                    </details>
                  ) : null}

                  <div className="rounded-[1.5rem] bg-[#f7f6f2] px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                      공개 상태
                    </p>
                    <p className="mt-2 text-sm leading-6 text-neutral-600">
                      검수 대기
                    </p>
                  </div>

                  {work ? (
                    <div className="rounded-[1.5rem] bg-[#f7f6f2] px-4 py-4">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                        Route
                      </p>
                      <p className="mt-2 break-words text-sm leading-6 text-neutral-600">
                        {getResolvedWorkHref(work)}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function MissingWorkNotice({
  slug,
  debugMessage,
}: {
  slug: string;
  debugMessage?: string;
}) {
  const showDebugNote = process.env.NODE_ENV === "development";

  return (
    <main className="theme-dark min-h-screen bg-[#f5f3ee] text-neutral-950">
      <section className="border-b border-black/5">
        <div className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-20">
          <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
            AR Viewing Page
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-neutral-950 md:text-6xl">
            작품을 찾을 수 없습니다.
          </h1>
          <p className="mt-6 max-w-2xl text-sm leading-7 text-neutral-600">
            요청한 경로와 일치하는 작품을 찾지 못했습니다.
          </p>
          <p className="mt-4 text-[11px] uppercase tracking-[0.22em] text-neutral-400">
            요청 주소: {slug}
          </p>
          {showDebugNote && debugMessage ? (
            <details className="mt-2 rounded-[1.25rem] border border-black/8 bg-white/85 px-4 py-3 text-sm leading-6 text-neutral-600">
              <summary className="cursor-pointer list-none text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                개발 정보
              </summary>
              <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                {debugMessage}
              </p>
            </details>
          ) : null}
          <Link
            href="/artists"
            className="mt-8 inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-sm text-neutral-900 transition hover:border-black/20"
          >
            작가 목록
          </Link>
        </div>
      </section>
    </main>
  );
}

export default function PublicArWorkPage({ slug }: { slug: string }) {
  const staticWork = useMemo(() => getStaticWorkBySlug(slug), [slug]);
  const [work, setWork] = useState<PublicWork | null>(staticWork ?? null);
  const [source, setSource] = useState<"Firestore" | "Seed">(
    staticWork ? "Seed" : "Seed"
  );
  const [isLoading, setIsLoading] = useState(true);
  const [unpublished, setUnpublished] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState("");

  useEffect(() => {
    let isActive = true;
    const timeoutId = window.setTimeout(() => {
      if (isActive) {
        setIsLoading(false);
        setLoadErrorMessage("작품 정보를 불러오는 데 시간이 걸리고 있습니다. 기본 정보를 먼저 표시합니다.");
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
        setLoadErrorMessage("작품 정보를 불러오지 못해 기본 정보를 표시합니다.");
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
      <PublicWorkContent
        work={work}
        source={source}
        debugMessage={loadErrorMessage || undefined}
      />
    );
  }

  if (isLoading) {
    return (
    <main className="theme-dark min-h-screen bg-[#f5f3ee] text-neutral-950">
        <section className="border-b border-black/5">
          <div className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-20">
            <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
              AR Viewing Page
            </p>
            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-neutral-950 md:text-6xl">
              작품 정보를 확인하는 중입니다.
            </h1>
          </div>
        </section>
      </main>
    );
  }

  return (
    <MissingWorkNotice slug={slug} debugMessage={loadErrorMessage || undefined} />
  );
}
