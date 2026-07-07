"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { getArtistBySlug, type Artist } from "@/data/artists";
import { works as staticWorks } from "@/data/works";
import {
  getPublicArtistBySlug,
  getPublicExhibitionsForArtistSlug,
  getPublicWorksForArtistSlug,
  resolveArtistWorkSlug,
  type ArtistDoc,
  type ArtistWorkDoc,
} from "@/lib/firebase/firestore";
import { normalizeExternalUrl } from "@/lib/url";
import { sortWorksForDisplay } from "@/lib/workDisplay";
import {
  ARTIST_CV_DISPLAY_ORDER,
  getArtistArchiveLinkTypeLabel,
  getArtistCvTypeDisplayLabel,
  sortArtistArchiveLinks,
  sortArtistCvItems,
  type ArtistArchiveLink,
  type ArtistCvItem,
} from "@/types/artist";
import type { ExhibitionDoc } from "@/types/exhibition";
import type { Work } from "@/types/work";

type PublicWork = Work & {
  id?: string;
  displayOrder?: number;
};

type PublicExhibition = ExhibitionDoc;

type PublicArtistDetail = {
  slug: string;
  name: string;
  nameKo?: string;
  type: Artist["type"];
  tagline?: string;
  bio?: string;
  bioEn?: string;
  location?: string;
  profileImage?: string;
  instagramUrl?: string;
  youtubeUrl?: string;
  cvUrl?: string;
  artsyUrl?: string;
  websiteUrl?: string;
  portfolioPdfUrl?: string;
  portfolioPdfLabel?: string;
  galleryNote?: string;
  galleryNoteEn?: string;
  featuredWorkId?: string;
  featuredWorkSlug?: string;
  featuredWorkTitle?: string;
  featuredWorkImageUrl?: string;
  cvItems?: ArtistCvItem[];
  archiveLinks?: ArtistArchiveLink[];
  archives?: Artist["archives"];
};

type SeedArtistWithCollections = Artist & {
  cvItems?: ArtistCvItem[];
  archiveLinks?: ArtistArchiveLink[];
  galleryNote?: string;
  galleryNoteEn?: string;
  portfolioPdfUrl?: string;
  portfolioPdfLabel?: string;
};

function pickArtistCollection<T>(
  firestoreItems?: T[] | null,
  seedItems?: T[] | null
): T[] {
  if (firestoreItems !== undefined && firestoreItems !== null) {
    return firestoreItems;
  }

  if (Array.isArray(seedItems) && seedItems.length > 0) {
    return seedItems;
  }

  return [];
}

function mergePublicArtist(
  staticArtist?: Artist,
  firestoreArtist?: ArtistDoc | null
): PublicArtistDetail | null {
  const seedArtist = staticArtist as SeedArtistWithCollections | undefined;
  const slug = firestoreArtist?.slug ?? staticArtist?.slug ?? "";
  const name = firestoreArtist?.name ?? staticArtist?.name ?? "";
  const type = firestoreArtist?.type ?? staticArtist?.type;

  if (!slug || !name || !type) {
    return null;
  }

  return {
    slug,
    name,
    nameKo: firestoreArtist?.nameKo ?? staticArtist?.nameKo,
    type,
    tagline: firestoreArtist?.tagline ?? staticArtist?.tagline,
    bio: firestoreArtist?.bio ?? staticArtist?.bio,
    bioEn: firestoreArtist?.bioEn ?? staticArtist?.bioEn,
    location: firestoreArtist?.location ?? staticArtist?.location,
    profileImage: firestoreArtist?.profileImageUrl ?? staticArtist?.profileImage,
    instagramUrl:
      firestoreArtist?.instagramUrl ?? staticArtist?.links?.instagram,
    youtubeUrl: firestoreArtist?.youtubeUrl ?? staticArtist?.links?.youtube,
    cvUrl: firestoreArtist?.cvUrl ?? staticArtist?.links?.cv,
    artsyUrl: firestoreArtist?.artsyUrl ?? staticArtist?.links?.artsy,
    websiteUrl: firestoreArtist?.websiteUrl,
    portfolioPdfUrl:
      firestoreArtist?.portfolioPdfUrl ?? seedArtist?.portfolioPdfUrl,
    portfolioPdfLabel:
      firestoreArtist?.portfolioPdfLabel ?? seedArtist?.portfolioPdfLabel,
    galleryNote: firestoreArtist?.galleryNote ?? seedArtist?.galleryNote ?? "",
    galleryNoteEn:
      firestoreArtist?.galleryNoteEn ?? seedArtist?.galleryNoteEn ?? "",
    featuredWorkId: firestoreArtist?.featuredWorkId,
    featuredWorkSlug: firestoreArtist?.featuredWorkSlug,
    featuredWorkTitle: firestoreArtist?.featuredWorkTitle,
    featuredWorkImageUrl: firestoreArtist?.featuredWorkImageUrl,
    cvItems: pickArtistCollection(
      firestoreArtist?.cvItems,
      seedArtist?.cvItems
    ),
    archiveLinks: pickArtistCollection(
      firestoreArtist?.archiveLinks,
      seedArtist?.archiveLinks
    ),
    archives: staticArtist?.archives,
  };
}

function groupCvItemsByType(items: ArtistCvItem[]) {
  const grouped = new Map<string, ArtistCvItem[]>();

  for (const item of items) {
    const next = grouped.get(item.type) ?? [];
    next.push(item);
    grouped.set(item.type, next);
  }

  return ARTIST_CV_DISPLAY_ORDER.map((type) => ({
    type,
    items: sortArtistCvItems(grouped.get(type) ?? []),
  })).filter((entry) => entry.items.length > 0);
}

const ARCHIVE_LINK_DISPLAY_ORDER: ArtistArchiveLink["type"][] = [
  "interview",
  "article",
  "video",
  "catalog",
  "press",
  "website",
  "other",
];

function groupArchiveLinksByType(items: ArtistArchiveLink[]) {
  const grouped = new Map<string, ArtistArchiveLink[]>();

  for (const item of items) {
    const next = grouped.get(item.type) ?? [];
    next.push(item);
    grouped.set(item.type, next);
  }

  return ARCHIVE_LINK_DISPLAY_ORDER.map((type) => ({
    type,
    items: sortArtistArchiveLinks(grouped.get(type) ?? []),
  })).filter((entry) => entry.items.length > 0);
}

function findStaticFallbackWork(
  artistSlug: string,
  firestoreWork: ArtistWorkDoc
) {
  const normalizedTitle = firestoreWork.title?.trim().toLowerCase() ?? "";
  const normalizedCover = firestoreWork.coverImageUrl?.trim() ?? "";

  return staticWorks.find((work) => {
    if (work.artistSlug !== artistSlug) {
      return false;
    }

    if (firestoreWork.slug && work.slug === firestoreWork.slug) {
      return true;
    }

    if (normalizedTitle && work.title.trim().toLowerCase() === normalizedTitle) {
      return true;
    }

    if (normalizedCover && work.coverImage === normalizedCover) {
      return true;
    }

    return false;
  });
}

function mergePublicWork(
  artistSlug: string,
  firestoreWork?: ArtistWorkDoc | null,
  staticWork?: Work
): PublicWork | null {
  const fallbackWork =
    staticWork ??
    (firestoreWork ? findStaticFallbackWork(artistSlug, firestoreWork) : undefined);
  const slug = firestoreWork
    ? resolveArtistWorkSlug(firestoreWork)
    : fallbackWork?.slug ?? "";
  const title = firestoreWork?.title ?? fallbackWork?.title ?? "";
  const artistName =
    firestoreWork?.artistName ?? fallbackWork?.artistName ?? "";

  if (!slug || !title || !artistSlug || !artistName) {
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
    displayOrder: firestoreWork?.displayOrder ?? fallbackWork?.displayOrder,
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

  return `/works/${routeSlug}`;
}

function getArHref(work: PublicWork) {
  const routeSlug = getWorkRouteSlug(work);

  return `/ar/${routeSlug}`;
}

export default function PublicArtistDetail({ slug }: { slug: string }) {
  const staticArtist = getArtistBySlug(slug);
  const staticArtistWorks = useMemo(
    () => staticWorks.filter((work) => work.artistSlug === slug),
    [slug]
  );

  const [artist, setArtist] = useState<PublicArtistDetail | null>(
    mergePublicArtist(staticArtist)
  );
  const [artistWorks, setArtistWorks] = useState<PublicWork[]>(staticArtistWorks);
  const [artistExhibitions, setArtistExhibitions] = useState<PublicExhibition[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [debugSource, setDebugSource] = useState<"Seed" | "Firestore">(
    staticArtist ? "Seed" : "Seed"
  );
  const [loadErrorMessage, setLoadErrorMessage] = useState("");
  const [portfolioShareMessage, setPortfolioShareMessage] = useState("");
  const shareMessageTimeoutRef = useRef<number | null>(null);
  const showDebugNote = process.env.NODE_ENV === "development";

  useEffect(() => {
    let isActive = true;
    const timeoutId = window.setTimeout(() => {
      if (isActive) {
        setIsLoading(false);
        setLoadErrorMessage(
          "작가 정보를 불러오는 데 시간이 걸리고 있습니다. 기본 정보를 먼저 표시합니다."
        );
      }
    }, 6000);

    void (async () => {
      try {
        const [firestoreArtist, firestoreWorks, firestoreExhibitions] =
          await Promise.all([
            getPublicArtistBySlug(slug),
            getPublicWorksForArtistSlug(slug),
            getPublicExhibitionsForArtistSlug(slug),
          ]);

        if (!isActive) {
          return;
        }

        const nextArtist = mergePublicArtist(staticArtist, firestoreArtist);
        if (nextArtist) {
          setArtist(nextArtist);
        }

        if (firestoreWorks.length > 0) {
          const nextWorks = firestoreWorks
            .map((work) => mergePublicWork(slug, work))
            .filter((work): work is PublicWork => work !== null);

          if (nextWorks.length > 0) {
            setArtistWorks(nextWorks);
          }
        } else {
          setArtistWorks(staticArtistWorks);
        }

        setArtistExhibitions(firestoreExhibitions);

        setDebugSource(
          firestoreArtist || firestoreWorks.length > 0 ? "Firestore" : "Seed"
        );
        setLoadErrorMessage("");
      } catch {
        if (!isActive) {
          return;
        }

        setArtist(mergePublicArtist(staticArtist));
        setArtistWorks(staticArtistWorks);
        setArtistExhibitions([]);
        setDebugSource("Seed");
        setLoadErrorMessage("작가 정보를 불러오지 못해 기본 정보를 표시합니다.");
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
  }, [slug, staticArtist, staticArtistWorks]);

  const instagramHref = normalizeExternalUrl(artist?.instagramUrl);
  const youtubeHref = normalizeExternalUrl(artist?.youtubeUrl);
  const cvHref = normalizeExternalUrl(artist?.cvUrl);
  const artsyHref = normalizeExternalUrl(artist?.artsyUrl);
  const websiteHref = normalizeExternalUrl(artist?.websiteUrl);
  const portfolioPdfHref = normalizeExternalUrl(artist?.portfolioPdfUrl);
  const portfolioPdfLabel =
    artist?.portfolioPdfLabel?.trim() || "Download Portfolio";
  const displayCvItems = useMemo(
    () => sortArtistCvItems(artist?.cvItems ?? []),
    [artist?.cvItems]
  );
  const displayArchiveLinks = useMemo(
    () => sortArtistArchiveLinks(artist?.archiveLinks ?? []),
    [artist?.archiveLinks]
  );
  const visibleWorks = useMemo(
    () =>
      sortWorksForDisplay(
        artistWorks.filter(
          (work) => work.isPublished === true && work.archived !== true
        )
      ),
    [artistWorks]
  );
  const hasGalleryNote = Boolean(
    artist?.galleryNote?.trim() || artist?.galleryNoteEn?.trim()
  );
  const featuredWork = useMemo(() => {
    const featuredWorkId = artist?.featuredWorkId?.trim() || "";
    const featuredWorkSlug = artist?.featuredWorkSlug?.trim() || "";
    const featuredWorkTitle = artist?.featuredWorkTitle?.trim() || "";

    const matchingVisibleWork = visibleWorks.find((work) => {
      const workSlug = getWorkRouteSlug(work);

      return (
        (featuredWorkId && work.id === featuredWorkId) ||
        (featuredWorkSlug && workSlug === featuredWorkSlug) ||
        (featuredWorkTitle && (work.title ?? "").trim() === featuredWorkTitle)
      );
    });

    const imageUrl =
      artist?.featuredWorkImageUrl?.trim() ||
      matchingVisibleWork?.coverImageUrl?.trim() ||
      "";
    const title =
      featuredWorkTitle ||
      matchingVisibleWork?.title?.trim() ||
      "";
    const slug =
      featuredWorkSlug ||
      (matchingVisibleWork ? getWorkRouteSlug(matchingVisibleWork) : "");

    if (!imageUrl && !title && !slug) {
      return null;
    }

    return {
      imageUrl,
      title,
      slug,
    };
  }, [
    artist?.featuredWorkId,
    artist?.featuredWorkImageUrl,
    artist?.featuredWorkSlug,
    artist?.featuredWorkTitle,
    visibleWorks,
  ]);
  const heroLinks = useMemo(
    () =>
      [
        instagramHref
          ? { label: "Instagram", href: instagramHref }
          : null,
        youtubeHref ? { label: "YouTube", href: youtubeHref } : null,
        cvHref ? { label: "CV", href: cvHref } : null,
        artsyHref ? { label: "Artsy", href: artsyHref } : null,
        websiteHref ? { label: "Website", href: websiteHref } : null,
      ].filter((entry): entry is { label: string; href: string } => Boolean(entry)),
    [artsyHref, cvHref, instagramHref, websiteHref, youtubeHref]
  );
  const hasStatement = Boolean(artist?.bio || artist?.bioEn);
  const hasExhibitions = artistExhibitions.length > 0;
  const heroTagline =
    artist?.tagline?.trim() || "Selected works from the artist’s current archive.";
  const heroLocation = artist?.location?.trim() || "";

  useEffect(() => {
    return () => {
      if (shareMessageTimeoutRef.current !== null) {
        window.clearTimeout(shareMessageTimeoutRef.current);
      }
    };
  }, []);

  async function handleSharePortfolio() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setPortfolioShareMessage("Portfolio link copied.");
    } catch {
      setPortfolioShareMessage(
        "링크 복사에 실패했습니다. URL을 직접 복사해주세요."
      );
    } finally {
      if (shareMessageTimeoutRef.current !== null) {
        window.clearTimeout(shareMessageTimeoutRef.current);
      }

      shareMessageTimeoutRef.current = window.setTimeout(() => {
        setPortfolioShareMessage("");
        shareMessageTimeoutRef.current = null;
      }, 3000);
    }
  }

  if (!artist && isLoading) {
    return (
      <main className="theme-dark min-h-screen bg-[#111111] text-[#F7F1E8]">
        <div className="mx-auto flex min-h-screen max-w-4xl items-center px-5 py-12 md:px-8">
          <div className="w-full rounded-[2.5rem] border border-white/10 bg-white/[0.045] p-8 md:p-10">
            <p className="text-[11px] uppercase tracking-[0.34em] text-white/45">
              KÜN’S Gallery
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] md:text-5xl">
              작가 정보를 확인하는 중입니다.
            </h1>
          </div>
        </div>
      </main>
    );
  }

  if (!artist) {
    return (
      <main className="theme-dark min-h-screen bg-[#111111] text-[#F7F1E8]">
        <div className="mx-auto flex min-h-screen max-w-4xl items-center px-5 py-12 md:px-8">
          <div className="w-full rounded-[2.5rem] border border-white/10 bg-white/[0.045] p-8 md:p-10">
            <p className="text-[11px] uppercase tracking-[0.34em] text-white/45">
              KÜN’S Gallery
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] md:text-5xl">
              작가 정보를 찾을 수 없습니다.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/65">
              등록된 작가 정보를 찾지 못했습니다.
            </p>
            <Link
              href="/artists"
              className="mt-8 inline-flex h-11 items-center rounded-full border border-white/10 bg-white/[0.06] px-5 text-sm text-[#F7F1E8] transition hover:border-white/20 hover:bg-white/[0.1]"
            >
              Back to Artists
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="theme-dark min-h-screen bg-[#111111] text-[#F7F1E8]">
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
              Back to Artists
            </Link>
          </div>
        </header>
      </div>

      <div className="mx-auto max-w-7xl px-5 pb-20 md:px-8">
        <section className="relative overflow-hidden rounded-[2.6rem] border border-white/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03)),radial-gradient(circle_at_80%_10%,rgba(243,112,33,0.22),transparent_28%),radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.08),transparent_24%),#171717] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.35)] md:p-10 lg:p-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(243,112,33,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.05),transparent_28%)]" />

          <div className="relative grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[10px] uppercase tracking-[0.34em] text-white/50">
                  KÜN’S GALLERY
                </span>
              </div>

              <div className="max-w-4xl">
                <h1 className="text-5xl font-semibold tracking-[-0.05em] text-[#F7F1E8] md:text-7xl md:leading-[0.92]">
                  {artist.name}
                </h1>
                {artist.nameKo ? (
                  <p className="mt-4 text-lg text-white/62 md:text-xl">
                    {artist.nameKo}
                  </p>
                ) : null}
              </div>

              <div className="max-w-3xl space-y-4">
                <p className="text-lg leading-8 text-white/76 md:text-[1.15rem] md:leading-9">
                  {heroTagline}
                </p>

                {heroLocation ? (
                  <p className="text-sm uppercase tracking-[0.22em] text-white/48">
                    {heroLocation}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="#works"
                  className="inline-flex h-11 items-center rounded-full border border-[#F37021]/45 bg-[#F37021] px-5 text-sm font-medium text-[#171717] transition hover:bg-[#ff7a2f]"
                >
                  View Works
                </Link>
                {portfolioPdfHref ? (
                  <a
                    href={portfolioPdfHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 items-center rounded-full border border-white/10 bg-white/[0.045] px-5 text-sm text-white/76 transition hover:border-[#F37021]/40 hover:bg-[#F37021]/12 hover:text-[#F7F1E8]"
                  >
                    {portfolioPdfLabel}
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={handleSharePortfolio}
                  className="inline-flex h-11 items-center rounded-full border border-white/10 bg-white/[0.045] px-5 text-sm text-white/76 transition hover:border-[#F37021]/40 hover:bg-[#F37021]/12 hover:text-[#F7F1E8]"
                >
                  Share Portfolio
                </button>
                <Link
                  href="/artists"
                  className="inline-flex h-11 items-center rounded-full border border-white/10 bg-white/[0.06] px-5 text-sm text-[#F7F1E8] transition hover:border-white/20 hover:bg-white/[0.1]"
                >
                  Back to Artists
                </Link>
                {websiteHref ? (
                  <a
                    href={websiteHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 items-center rounded-full border border-white/10 bg-white/[0.045] px-5 text-sm text-white/76 transition hover:border-[#F37021]/40 hover:bg-[#F37021]/12 hover:text-[#F7F1E8]"
                  >
                    Website
                  </a>
                ) : null}
              </div>

              {heroLinks.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-2">
                  {heroLinks.map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-10 items-center rounded-full border border-white/10 bg-white/[0.045] px-4 text-[11px] uppercase tracking-[0.22em] text-white/70 transition hover:border-[#F37021]/40 hover:bg-[#F37021]/12 hover:text-[#F7F1E8]"
                    >
                      {item.label}
                    </a>
                  ))}
                </div>
              ) : null}

              {portfolioShareMessage ? (
                <p className="max-w-2xl text-xs leading-6 text-white/55">
                  {portfolioShareMessage}
                </p>
              ) : null}

              {showDebugNote ? (
                <details className="max-w-2xl rounded-[1.35rem] border border-white/10 bg-black/20 px-3 py-2 text-sm leading-6 text-white/60">
                  <summary className="cursor-pointer list-none text-[10px] uppercase tracking-[0.28em] text-[#F37021]">
                    개발 정보
                  </summary>
                  <div className="mt-2 space-y-1">
                    <p>source: {debugSource}</p>
                    {loadErrorMessage ? <p>{loadErrorMessage}</p> : null}
                  </div>
                </details>
              ) : null}
            </div>

            <div className="lg:justify-self-end">
              {featuredWork?.imageUrl ? (
                <div className="relative overflow-hidden rounded-[2.3rem] border border-white/10 bg-white/[0.05] shadow-[0_28px_100px_rgba(0,0,0,0.45)]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(243,112,33,0.18),transparent_28%),radial-gradient(circle_at_80%_8%,rgba(255,255,255,0.08),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_38%,rgba(0,0,0,0.16))]" />
                  <div className="relative aspect-[4/5] w-full min-w-0 max-w-none lg:w-[430px]">
                    <img
                      src={featuredWork.imageUrl}
                      alt={featuredWork.title || artist.name}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.72))] p-5">
                      <p className="text-[10px] uppercase tracking-[0.36em] text-white/50">
                        Featured Work
                      </p>
                      <p className="mt-2 text-lg font-medium tracking-[-0.03em] text-[#F7F1E8]">
                        {featuredWork.title || "Untitled"}
                      </p>
                      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                        {artist.profileImage ? (
                          <img
                            src={artist.profileImage}
                            alt={artist.name}
                            className="h-14 w-14 rounded-full border border-white/12 object-cover shadow-[0_8px_20px_rgba(0,0,0,0.25)]"
                          />
                        ) : (
                          <div className="h-14 w-14 rounded-full border border-white/10 bg-white/[0.06]" />
                        )}

                        {featuredWork.slug ? (
                          <Link
                            href={`/works/${featuredWork.slug}`}
                            className="inline-flex h-10 items-center rounded-full border border-[#F37021]/45 bg-[#F37021] px-4 text-xs font-medium text-[#171717] transition hover:bg-[#ff7a2f]"
                          >
                            View Artwork
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative overflow-hidden rounded-[2.3rem] border border-white/10 bg-white/[0.05] shadow-[0_28px_100px_rgba(0,0,0,0.45)]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(243,112,33,0.18),transparent_28%),radial-gradient(circle_at_80%_8%,rgba(255,255,255,0.08),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_38%,rgba(0,0,0,0.16))]" />
                  <div className="relative aspect-[4/5] w-full min-w-0 max-w-none lg:w-[430px]">
                    {artist.profileImage ? (
                      <img
                        src={artist.profileImage}
                        alt={artist.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col justify-between bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02)),radial-gradient(circle_at_20%_20%,rgba(243,112,33,0.15),transparent_36%)] p-6">
                        <div className="space-y-2">
                          <p className="text-[10px] uppercase tracking-[0.34em] text-white/45">
                            Portrait placeholder
                          </p>
                          <p className="text-sm leading-6 text-white/62">
                            프로필 이미지를 등록하면 공식 페이지의 인상이 더 선명해집니다.
                          </p>
                        </div>
                        <div className="flex items-end justify-between gap-4">
                          <div className="h-16 w-16 rounded-full border border-white/10 bg-white/[0.06]" />
                          <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">
                            KÜN’S Gallery
                          </p>
                        </div>
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.55))] p-5">
                      <p className="text-[10px] uppercase tracking-[0.36em] text-white/50">
                        Official artist archive
                      </p>
                      <p className="mt-2 text-sm leading-6 text-white/72">
                        프라이빗 아카이브와 공개 포트폴리오 사이의 균형을 맞춘 공식 작가 페이지입니다.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {hasGalleryNote ? (
          <section className="border-t border-white/10 py-16 md:py-24">
            <div className="grid gap-10 rounded-[2rem] border border-white/10 px-6 py-8 md:px-8 md:py-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-12">
              <div className="space-y-4">
                <p className="text-[11px] uppercase tracking-[0.34em] text-white/45">
                  GALLERY NOTE
                </p>
                <h2 className="text-3xl font-semibold tracking-[-0.04em] text-[#F7F1E8] md:text-5xl">
                  Curatorial Note
                </h2>
                <div className="h-px w-16 bg-[#F37021]/55" />
                <p className="max-w-md text-sm leading-7 text-white/62 md:text-[15px]">
                  KÜN’S Gallery가 바라보는 작가의 작업 세계를 공식적으로 정리한 큐레이토리얼 코멘트입니다.
                </p>
              </div>

              <div
                className={`grid gap-8 ${
                  artist?.galleryNote && artist?.galleryNoteEn
                    ? "md:grid-cols-2"
                    : "md:grid-cols-1"
                }`}
              >
                {artist?.galleryNote ? (
                  <article className="space-y-4 border-l border-[#F37021]/35 pl-5 md:pl-6">
                    <p className="text-[10px] uppercase tracking-[0.32em] text-[#F37021]">
                      Korean Text
                    </p>
                    <div className="space-y-5 text-[16px] leading-8 text-white/76 md:text-[17px]">
                      {artist.galleryNote.split("\n").map((paragraph, index) => (
                        <p key={`gallery-note-ko-${index}`}>{paragraph}</p>
                      ))}
                    </div>
                  </article>
                ) : null}

                {artist?.galleryNoteEn ? (
                  <article className="space-y-4 border-l border-white/10 pl-5 md:pl-6">
                    <p className="text-[10px] uppercase tracking-[0.32em] text-white/45">
                      English Text
                    </p>
                    <div className="space-y-5 text-[16px] leading-8 text-white/76 md:text-[17px]">
                      {artist.galleryNoteEn.split("\n").map((paragraph, index) => (
                        <p key={`gallery-note-en-${index}`}>{paragraph}</p>
                      ))}
                    </div>
                  </article>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        <section id="works" className="border-t border-white/10 py-16 md:py-24">
          <SectionHeading
            label="SELECTED WORKS"
            title="Works"
            description="Selected works from the artist’s current archive."
          />

          <div className="mt-10">
            {visibleWorks.length > 0 ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {visibleWorks.map((work) => {
                  const artworkImage = work.coverImageUrl ?? work.coverImage ?? "";
                  const workHref = getWorkHref(work);
                  const arHref = getArHref(work);

                  return (
                    <WorkCard
                      key={workHref}
                      href={workHref}
                      secondaryHref={arHref}
                      image={artworkImage}
                      title={work.title}
                      year={work.year}
                      medium={work.medium}
                      dimensions={work.dimensions}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-8 text-sm leading-7 text-white/60">
                현재 공개된 작품을 준비 중입니다.
              </div>
            )}
          </div>
        </section>

        {hasExhibitions ? (
          <section id="exhibitions" className="border-t border-white/10 py-16 md:py-24">
            <SectionHeading
              label="EXHIBITIONS"
              title="Exhibitions"
              description="Recent exhibitions listed in reverse chronological order."
            />

            <div className="mt-10 space-y-4">
              {artistExhibitions.map((exhibition) => (
                <article
                  key={exhibition.id}
                  className="grid gap-5 overflow-hidden rounded-[1.7rem] border border-white/10 bg-white/[0.04] p-4 transition hover:border-[#F37021]/35 hover:bg-white/[0.055] md:grid-cols-[280px_minmax(0,1fr)] md:p-5"
                >
                  <div className="overflow-hidden rounded-[1.35rem] border border-white/10 bg-white/[0.04]">
                    {exhibition.imageUrl ? (
                      <img
                        src={exhibition.imageUrl}
                        alt={exhibition.title || artist.name}
                        className="aspect-[4/5] h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex aspect-[4/5] items-center justify-center bg-[radial-gradient(circle_at_20%_20%,rgba(243,112,33,0.15),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] px-6 text-center text-sm leading-7 text-white/55">
                        전시 이미지를 준비 중입니다.
                      </div>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-col justify-between gap-5 p-1 md:p-2">
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex rounded-full border border-[#F37021]/35 bg-[#F37021]/10 px-3 py-1 text-[10px] uppercase tracking-[0.26em] text-[#FF9B5A]">
                          {formatExhibitionDateRange(
                            exhibition.startDate,
                            exhibition.endDate
                          )}
                        </span>
                        {exhibition.venue ? (
                          <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-white/50">
                            {exhibition.venue}
                          </span>
                        ) : null}
                      </div>

                      <div className="space-y-2">
                        <h3 className="text-[1.45rem] font-semibold tracking-[-0.04em] text-[#F7F1E8] md:text-[1.8rem]">
                          {exhibition.title || "Untitled Exhibition"}
                        </h3>
                        <p className="text-sm uppercase tracking-[0.22em] text-white/48">
                          {exhibition.location || "Location not specified"}
                        </p>
                      </div>

                      {exhibition.description ? (
                        <p className="max-w-3xl text-sm leading-7 text-white/68 md:text-[15px]">
                          {exhibition.description}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex rounded-full border border-white/10 bg-white/[0.045] px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-white/45">
                        {exhibition.isPublished === true ? "Published" : "Draft"}
                      </span>
                      {exhibition.archived === true ? (
                        <span className="inline-flex rounded-full border border-white/10 bg-white/[0.045] px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-white/45">
                          Archived
                        </span>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {hasStatement ? (
          <section id="statement" className="border-t border-white/10 py-16 md:py-24">
            <SectionHeading
              label="ARTIST STATEMENT"
              title="Statement"
              description="Artist notes and short-form biography for the public archive."
            />

            <div
              className={`mt-10 grid gap-10 ${
                artist.bio && artist.bioEn ? "lg:grid-cols-2" : "lg:grid-cols-1"
              }`}
            >
              {artist.bio ? (
                <article className="max-w-3xl space-y-4">
                  <p className="text-[10px] uppercase tracking-[0.32em] text-white/45">
                    Korean Text
                  </p>
                  <div className="space-y-5 text-[16px] leading-8 text-white/76 md:text-[17px]">
                    {artist.bio.split("\n").map((paragraph, index) => (
                      <p key={`ko-${index}`}>{paragraph}</p>
                    ))}
                  </div>
                </article>
              ) : null}

              {artist.bioEn ? (
                <article className="max-w-3xl space-y-4">
                  <p className="text-[10px] uppercase tracking-[0.32em] text-white/45">
                    English Text
                  </p>
                  <div className="space-y-5 text-[16px] leading-8 text-white/76 md:text-[17px]">
                    {artist.bioEn.split("\n").map((paragraph, index) => (
                      <p key={`en-${index}`}>{paragraph}</p>
                    ))}
                  </div>
                </article>
              ) : null}
            </div>
          </section>
        ) : null}

        <CvHistorySection items={displayCvItems} />
        <PressArchiveSection items={displayArchiveLinks} />

        <footer className="border-t border-white/10 py-16 md:py-20">
          <div className="rounded-[2.4rem] border border-white/10 bg-white/[0.045] p-6 md:p-8">
            <p className="text-[11px] uppercase tracking-[0.34em] text-white/45">
              KÜN’S GALLERY
            </p>
            <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[#F7F1E8] md:text-4xl">
              Official artist archive
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/62 md:text-[15px]">
              전속 작가의 작품, 기록, 외부 링크를 한곳에서 보도록 정리한 공식 공개 페이지입니다.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                href="/artists"
                className="inline-flex h-11 items-center rounded-full border border-[#F37021]/45 bg-[#F37021] px-5 text-sm font-medium text-[#171717] transition hover:bg-[#ff7a2f]"
              >
                Back to Artists
              </Link>
              {heroLinks.slice(0, 3).map((item) => (
                <a
                  key={`footer-${item.label}`}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center rounded-full border border-white/10 bg-white/[0.06] px-5 text-sm text-[#F7F1E8] transition hover:border-[#F37021]/40 hover:bg-[#F37021]/12"
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}

function SectionHeading({
  label,
  title,
  description,
}: {
  label: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-3xl space-y-4">
      <p className="text-[11px] uppercase tracking-[0.34em] text-white/45">
        {label}
      </p>
      <h2 className="text-3xl font-semibold tracking-[-0.04em] text-[#F7F1E8] md:text-5xl">
        {title}
      </h2>
      <p className="text-sm leading-7 text-white/62 md:text-[15px]">
        {description}
      </p>
    </div>
  );
}

function WorkCard({
  href,
  secondaryHref,
  image,
  title,
  year,
  medium,
  dimensions,
}: {
  href: string;
  secondaryHref?: string;
  image?: string;
  title: string;
  year?: string;
  medium?: string;
  dimensions?: string;
}) {
  return (
    <article className="group relative overflow-hidden rounded-[1.7rem] border border-white/10 bg-white/[0.04] transition hover:-translate-y-0.5 hover:border-[#F37021]/40 hover:shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
      <Link
        href={href}
        aria-label={`${title} View Artwork`}
        className="absolute inset-0 z-10"
      >
        <span className="sr-only">{title}</span>
      </Link>

      {secondaryHref ? (
        <Link
          href={secondaryHref}
          className="absolute right-4 top-4 z-20 rounded-full border border-white/12 bg-black/40 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-white/85 transition hover:border-[#F37021]/40 hover:bg-[#F37021]/12 hover:text-[#F7F1E8]"
        >
          View AR
        </Link>
      ) : null}

      <div className="relative aspect-[4/5] overflow-hidden bg-[#1a1a1a]">
        {image ? (
          <img
            src={image}
            alt={title}
            className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full flex-col justify-between bg-[radial-gradient(circle_at_20%_20%,rgba(243,112,33,0.15),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-5">
            <div className="text-[10px] uppercase tracking-[0.34em] text-white/45">
              KÜN’S Gallery
            </div>
            <p className="text-sm leading-6 text-white/65">
              이미지를 준비 중입니다.
            </p>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgba(0,0,0,0.42))] opacity-90 transition group-hover:opacity-100" />
        <div className="absolute left-4 top-4 rounded-full border border-white/15 bg-black/35 px-3 py-1 text-[10px] uppercase tracking-[0.26em] text-white">
          {year || "Year"}
        </div>
        <div className="absolute bottom-4 left-4 rounded-full border border-white/10 bg-white/[0.08] px-3 py-1 text-[10px] uppercase tracking-[0.26em] text-white/85">
          View Artwork
        </div>
      </div>

      <div className="space-y-3 p-5 md:p-6">
        <h3 className="text-[1.28rem] font-semibold tracking-[-0.04em] text-[#F7F1E8] md:text-[1.42rem]">
          {title}
        </h3>
        <div className="flex flex-wrap gap-x-3 gap-y-2 text-sm leading-6 text-white/60">
          {year ? <span>{year}</span> : null}
          {medium ? <span>{medium}</span> : null}
          {dimensions ? <span>{dimensions}</span> : null}
        </div>
      </div>
    </article>
  );
}

function formatExhibitionDateRange(startDate?: string, endDate?: string) {
  const start = formatExhibitionDate(startDate);
  const end = endDate?.trim() ? formatExhibitionDate(endDate) : "";

  if (!end) {
    return start;
  }

  return `${start} - ${end}`;
}

function formatExhibitionDate(value?: string) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return "Date TBA";
  }

  const parsed = new Date(`${trimmed}T00:00:00Z`);

  if (Number.isNaN(parsed.getTime())) {
    return trimmed;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

function CvHistorySection({ items }: { items: ArtistCvItem[] }) {
  const groupedItems = groupCvItemsByType(items);

  if (groupedItems.length === 0) {
    return null;
  }

  return (
    <section className="border-t border-white/10 py-16 md:py-24">
      <SectionHeading
        label="CV / SELECTED HISTORY"
        title="Selected History"
        description="Official CV highlights arranged for public viewing."
      />

      <div className="mt-10 space-y-12">
        {groupedItems.map((group) => (
          <div key={group.type} className="border-t border-white/10 pt-6 md:pt-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.32em] text-white/45">
                  Category
                </p>
                <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[#F7F1E8] md:text-2xl">
                  {getArtistCvTypeDisplayLabel(group.type)}
                </h3>
              </div>
              <span className="inline-flex w-fit rounded-full border border-[#f3c49d]/40 bg-[#fef4ea]/10 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-[#FF9B5A]">
                KÜN’S Orange
              </span>
            </div>

            <div className="mt-6 divide-y divide-white/10 border-t border-white/10">
              {group.items.map((item) => (
                <article
                  key={item.id}
                  className="grid gap-4 py-4 md:grid-cols-[108px_minmax(0,1fr)] md:gap-8 md:py-5"
                >
                  <div className="flex items-start gap-3 md:flex-col md:gap-2">
                    <p className="text-[11px] font-medium uppercase tracking-[0.26em] text-[#FF9B5A] md:text-sm md:normal-case md:tracking-[0.02em]">
                      {item.year || "—"}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <h4 className="text-[1.05rem] font-medium tracking-[-0.03em] text-[#F7F1E8] md:text-[1.08rem]">
                      {item.title}
                    </h4>
                    <p className="mt-2 text-sm leading-7 text-white/62">
                      {[item.venue, item.location].filter(Boolean).join(", ")}
                    </p>
                    {item.note ? (
                      <p className="mt-2 text-sm leading-6 text-white/48">
                        {item.note}
                      </p>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function PressArchiveSection({ items }: { items: ArtistArchiveLink[] }) {
  const groupedItems = groupArchiveLinksByType(items);

  if (groupedItems.length === 0) {
    return null;
  }

  return (
    <section className="border-t border-white/10 py-16 md:py-24">
      <SectionHeading
        label="PRESS & ARCHIVE"
        title="Press & Archive"
        description="External references and selected press materials."
      />

      <div className="mt-10 space-y-4">
        {groupedItems.map((group) => (
          <div key={group.type} className="space-y-3">
            <h3 className="text-[11px] uppercase tracking-[0.32em] text-white/45">
              {getArtistArchiveLinkTypeLabel(group.type)}
            </h3>
            <div className="space-y-3">
              {group.items.map((item) => {
                const href = normalizeExternalUrl(item.url);

                const content = (
                  <article className="group rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4 transition hover:border-[#F37021]/35 hover:bg-white/[0.055] md:p-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-[1.05rem] font-medium tracking-[-0.03em] text-[#F7F1E8]">
                            {item.title}
                          </h4>
                          {item.year ? (
                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-white/45">
                              {item.year}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 text-sm leading-7 text-white/62">
                          {item.source}
                        </p>
                        {item.description ? (
                          <p className="mt-2 max-w-3xl text-sm leading-7 text-white/48">
                            {item.description}
                          </p>
                        ) : null}
                      </div>

                      <div className="shrink-0 text-[11px] uppercase tracking-[0.28em] text-[#FF9B5A]">
                        {href ? "External Link ↗" : "Reference"}
                      </div>
                    </div>
                  </article>
                );

                if (!href) {
                  return <div key={item.id}>{content}</div>;
                }

                return (
                  <a key={item.id} href={href} target="_blank" rel="noreferrer">
                    {content}
                  </a>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
