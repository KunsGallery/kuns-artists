"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { getArtistBySlug, type Artist } from "@/data/artists";
import { works as staticWorks } from "@/data/works";
import { resolveProfileImageUrl } from "@/lib/artistCatalog";
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

type ArtistPageTheme = {
  page: string;
  panel: string;
  panelSoft: string;
  text: string;
  muted: string;
  accent: string;
  accentSoft: string;
  heroImage: string;
  moodLine: string;
};

const defaultArtistPageTheme: ArtistPageTheme = {
  page: "#ebe5db",
  panel: "rgba(255, 252, 246, 0.78)",
  panelSoft: "rgba(255, 252, 246, 0.56)",
  text: "#171411",
  muted: "rgba(23, 20, 17, 0.62)",
  accent: "#F37021",
  accentSoft: "rgba(243, 112, 33, 0.12)",
  heroImage: "rgba(23, 20, 17, 0.08)",
  moodLine: "Official artist archive",
};

const artistPageThemes: Record<string, ArtistPageTheme> = {
  "jessup-choi": {
    page: "#e7e1d8",
    panel: "rgba(252, 248, 241, 0.78)",
    panelSoft: "rgba(252, 248, 241, 0.54)",
    text: "#191512",
    muted: "rgba(25, 21, 18, 0.62)",
    accent: "#D95D2A",
    accentSoft: "rgba(217, 93, 42, 0.12)",
    heroImage: "rgba(31, 24, 20, 0.09)",
    moodLine: "Compressed emotion, trace, release",
  },
  "jung-boram": {
    page: "#eee9df",
    panel: "rgba(255, 252, 245, 0.8)",
    panelSoft: "rgba(255, 252, 245, 0.58)",
    text: "#171511",
    muted: "rgba(23, 21, 17, 0.62)",
    accent: "#B46A35",
    accentSoft: "rgba(180, 106, 53, 0.13)",
    heroImage: "rgba(30, 24, 18, 0.08)",
    moodLine: "Writing as rhythm and sensation",
  },
  "kim-hwan": {
    page: "#f0eadb",
    panel: "rgba(255, 252, 242, 0.82)",
    panelSoft: "rgba(255, 252, 242, 0.6)",
    text: "#19160f",
    muted: "rgba(25, 22, 15, 0.62)",
    accent: "#F37021",
    accentSoft: "rgba(243, 112, 33, 0.14)",
    heroImage: "rgba(91, 63, 28, 0.1)",
    moodLine: "Light, color, inner resonance",
  },
  "rosa-kang": {
    page: "#e5e2dc",
    panel: "rgba(250, 247, 241, 0.78)",
    panelSoft: "rgba(250, 247, 241, 0.54)",
    text: "#161513",
    muted: "rgba(22, 21, 19, 0.62)",
    accent: "#C65E46",
    accentSoft: "rgba(198, 94, 70, 0.12)",
    heroImage: "rgba(28, 25, 23, 0.08)",
    moodLine: "Instability, repetition, perception",
  },
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
    profileImage: resolveProfileImageUrl(firestoreArtist, staticArtist),
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
    arV2Config:
      firestoreWork?.arV2Config ?? fallbackWork?.arV2Config,
    arV2Asset:
      firestoreWork?.arV2Asset ?? fallbackWork?.arV2Asset,
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

  const [artistState, setArtist] = useState<PublicArtistDetail | null>(null);
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
  const [lightboxWork, setLightboxWork] = useState<PublicWork | null>(null);
  const shareMessageTimeoutRef = useRef<number | null>(null);
  const showDebugNote = process.env.NODE_ENV === "development";

  useEffect(() => {
    let isActive = true;
    setArtist(null);
    setArtistWorks([]);
    setArtistExhibitions([]);
    setIsLoading(true);
    setLoadErrorMessage("");
    setDebugSource("Seed");
    setPortfolioShareMessage("");

    const timeoutId = window.setTimeout(() => {
      if (isActive) {
        setLoadErrorMessage("작가 정보를 불러오는 데 시간이 걸리고 있습니다.");
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

  const hasStaleArtist = Boolean(artistState && artistState.slug !== slug);
  const artist = hasStaleArtist ? null : artistState;
  const artistExhibitionsForDisplay = hasStaleArtist ? [] : artistExhibitions;
  const artistWorksForDisplay = useMemo(
    () => (hasStaleArtist ? [] : artistWorks),
    [artistWorks, hasStaleArtist]
  );

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
        artistWorksForDisplay.filter(
          (work) => work.isPublished === true && work.archived !== true
        )
      ),
    [artistWorksForDisplay]
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
  const heroTagline =
    artist?.tagline?.trim() || "Selected works from the artist’s current archive.";
  const heroLocation = artist?.location?.trim() || "";
  const pageTheme = artist
    ? artistPageThemes[artist.slug] ?? defaultArtistPageTheme
    : defaultArtistPageTheme;
  const statementPreview =
    artist?.bio?.trim() || artist?.bioEn?.trim() || artist?.galleryNote?.trim() || "";
  const compactCvItems = displayCvItems.slice(0, 6);
  const compactArchiveLinks = displayArchiveLinks.slice(0, 5);
  const compactExhibitions = artistExhibitionsForDisplay.slice(0, 3);
  const heroWorks = visibleWorks.slice(0, 8);
  const lightboxImage =
    lightboxWork?.coverImageUrl ?? lightboxWork?.coverImage ?? "";

  useEffect(() => {
    return () => {
      if (shareMessageTimeoutRef.current !== null) {
        window.clearTimeout(shareMessageTimeoutRef.current);
      }
    };
  }, []);

  async function handleSharePortfolio() {
    const shareUrl = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: artist?.name
            ? `${artist.name} | KÜN’S Gallery`
            : "KÜN’S Gallery Artist Archive",
          url: shareUrl,
        });
        setPortfolioShareMessage("공유 창을 열었습니다.");
        return;
      } catch {
        // Continue to clipboard fallback when native share is cancelled or blocked.
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setPortfolioShareMessage("포트폴리오 링크를 복사했습니다.");
    } catch {
      setPortfolioShareMessage(
        `복사가 막혀 있습니다. 주소창의 URL을 복사해주세요: ${shareUrl}`
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

  if (isLoading || hasStaleArtist) {
    return (
      <main className="min-h-screen bg-[#eee6d9] text-[#171411]">
        <div className="mx-auto flex min-h-screen max-w-7xl items-center px-5 py-12 md:px-8">
          <div className="w-full rounded-[2.5rem] border border-black/10 bg-white/45 p-6 shadow-[0_30px_120px_rgba(58,42,24,0.12)] md:p-10">
            <div className="grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
              <div className="space-y-4">
                <div className="h-3 w-24 rounded-full bg-black/10" />
                <div className="h-16 w-4/5 rounded-[1.5rem] bg-black/10 md:w-3/4" />
                <div className="h-5 w-2/3 rounded-full bg-black/8" />
                <div className="h-5 w-1/2 rounded-full bg-black/8" />
                <div className="mt-8 flex flex-wrap gap-2">
                  <div className="h-11 w-28 rounded-full bg-black/10" />
                  <div className="h-11 w-24 rounded-full bg-black/8" />
                  <div className="h-11 w-32 rounded-full bg-black/8" />
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[2.3rem] border border-black/10 bg-white/35">
                <div className="aspect-[4/5] w-full animate-pulse bg-[linear-gradient(180deg,rgba(255,255,255,0.45),rgba(255,255,255,0.12)),radial-gradient(circle_at_20%_20%,rgba(217,121,61,0.14),transparent_36%)]" />
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!artist) {
    return (
      <main className="min-h-screen bg-[#eee6d9] text-[#171411]">
        <div className="mx-auto flex min-h-screen max-w-4xl items-center px-5 py-12 md:px-8">
          <div className="w-full rounded-[2.5rem] border border-black/10 bg-white/45 p-8 shadow-[0_30px_120px_rgba(58,42,24,0.12)] md:p-10">
            <p className="text-[11px] uppercase tracking-[0.34em] text-black/45">
              KÜN’S Gallery
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] md:text-5xl">
              작가 정보를 찾을 수 없습니다.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-black/65">
              등록된 작가 정보를 찾지 못했습니다.
            </p>
            <Link
              href="/artists"
              className="mt-8 inline-flex h-11 items-center rounded-full border border-black/10 bg-white/45 px-5 text-sm transition hover:border-black/20 hover:bg-white/75"
            >
              Back to Artists
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen overflow-x-hidden"
      style={{
        background:
          `radial-gradient(circle at 12% 8%, ${pageTheme.accentSoft}, transparent 28rem), ` +
          `linear-gradient(180deg, ${pageTheme.page} 0%, #f8f3ea 52%, ${pageTheme.page} 100%)`,
        color: pageTheme.text,
      }}
    >
      <div className="mx-auto max-w-[1720px] px-5 py-5 md:px-8">
        <header className="flex h-14 items-center justify-between border-b border-black/10">
          <Link
            href="/"
            className="gallery-wordmark text-[1.45rem] leading-none opacity-80 transition hover:opacity-100"
          >
            Kün&apos;s Gallery
          </Link>

          <div className="flex items-center gap-4">
            <a
              href="#works"
              className="hidden text-[11px] uppercase tracking-[0.22em] opacity-58 transition hover:opacity-100 md:inline-flex"
            >
              Works
            </a>
            <a
              href="#archive"
              className="hidden text-[11px] uppercase tracking-[0.22em] opacity-58 transition hover:opacity-100 md:inline-flex"
            >
              Archive
            </a>
            <Link
              href="/artists"
              className="text-[11px] uppercase tracking-[0.22em] opacity-58 transition hover:opacity-100"
            >
              Artists
            </Link>
          </div>
        </header>

        <section className="relative min-h-[calc(100vh-5.5rem)] py-6 md:py-8">
          <div className="grid min-h-[calc(100vh-8rem)] gap-6 lg:grid-cols-[8.5rem_minmax(0,1fr)]">
            <nav className="hidden border-r border-black/10 pr-5 pt-6 lg:block">
              <div className="sticky top-8 space-y-7">
                {["Intro", "Works", "Statement", "CV", "Press"].map((item) => (
                  <a
                    key={item}
                    href={item === "Intro" ? "#" : item === "Works" ? "#works" : "#archive"}
                    className="block text-[11px] uppercase tracking-[0.18em] opacity-52 transition hover:opacity-100"
                  >
                    {item}
                  </a>
                ))}
              </div>
            </nav>

            <div className="relative grid content-between gap-6">
              <div className="grid gap-8 lg:grid-cols-[0.42fr_0.58fr] lg:items-center">
                <div className="relative z-10 max-w-xl pt-5">
                  <h1 className="text-[4.4rem] font-normal leading-[0.9] tracking-[-0.04em] md:text-[6rem]">
                    {artist.name}
                  </h1>
                  {artist.nameKo ? (
                    <p className="mt-3 text-2xl leading-none opacity-78">
                      {artist.nameKo}
                    </p>
                  ) : null}
                  <div
                    className="mt-5 h-[3px] w-14"
                    style={{ backgroundColor: pageTheme.accent }}
                  />
                  <p className="mt-7 max-w-md text-[15px] leading-7 opacity-68">
                    {heroTagline}
                  </p>
                  {heroLocation ? (
                    <p className="mt-5 text-[11px] uppercase tracking-[0.26em] opacity-50">
                      {heroLocation}
                    </p>
                  ) : null}
                  <div className="mt-9 flex flex-wrap gap-5">
                    <Link
                      href="#works"
                      className="inline-flex h-11 items-center border-b border-current text-sm font-medium transition hover:opacity-60"
                      style={{ color: pageTheme.accent }}
                    >
                      View Works
                    </Link>
                    <button
                      type="button"
                      onClick={handleSharePortfolio}
                      className="inline-flex h-11 items-center border-b border-black/35 text-sm transition hover:border-black hover:opacity-70"
                    >
                      Share Portfolio
                    </button>
                    {portfolioPdfHref ? (
                      <a
                        href={portfolioPdfHref}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-11 items-center border-b border-black/35 text-sm transition hover:border-black hover:opacity-70"
                      >
                        {portfolioPdfLabel}
                      </a>
                    ) : null}
                  </div>
                  {portfolioShareMessage ? (
                    <p className="mt-4 max-w-md border-l border-black/20 pl-4 text-xs leading-6 opacity-65">
                      {portfolioShareMessage}
                    </p>
                  ) : null}
                </div>

                <div className="relative min-h-[28rem] md:min-h-[34rem]">
                  <div className="absolute left-[2%] top-[10%] h-[47%] w-[42%] overflow-hidden shadow-[0_28px_70px_rgba(58,42,24,0.16)] md:left-[4%]">
                    {artist.profileImage ? (
                      <img
                        src={artist.profileImage}
                        alt={artist.name}
                        className="h-full w-full object-cover grayscale-[0.15]"
                      />
                    ) : (
                      <div className="h-full w-full bg-white/35" />
                    )}
                  </div>

                  {featuredWork?.imageUrl ? (
                    <button
                      type="button"
                      onClick={() => {
                        const targetWork = visibleWorks.find(
                          (work) => getWorkRouteSlug(work) === featuredWork.slug
                        );
                        if (targetWork) {
                          setLightboxWork(targetWork);
                        }
                      }}
                      className="absolute right-[2%] top-[2%] h-[64%] w-[58%] overflow-hidden bg-white/45 text-left shadow-[0_34px_90px_rgba(58,42,24,0.2)] transition duration-700 hover:-translate-y-1 hover:shadow-[0_42px_110px_rgba(58,42,24,0.25)]"
                    >
                      <img
                        src={featuredWork.imageUrl}
                        alt={featuredWork.title || artist.name}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ) : null}

                  <div className="absolute bottom-[2%] left-[20%] w-[70%] border-t border-black/12 bg-[rgba(248,243,234,0.82)] px-5 py-4 backdrop-blur-sm">
                    <p className="text-[10px] uppercase tracking-[0.28em] opacity-48">
                      {pageTheme.moodLine}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 opacity-66">
                      {featuredWork?.title || "Official artist archive"}
                    </p>
                  </div>
                </div>
              </div>

              <div id="works" className="border-t border-black/10 pt-5">
                <div className="flex items-end justify-between gap-4">
                  <h2 className="text-3xl font-normal tracking-[-0.03em]">
                    Works
                  </h2>
                  <p className="text-[11px] uppercase tracking-[0.22em] opacity-45">
                    {visibleWorks.length} works
                  </p>
                </div>

                {heroWorks.length > 0 ? (
                  <div className="mt-5 grid auto-rows-[8rem] grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
                    {heroWorks.map((work, index) => {
                      const artworkImage =
                        work.coverImageUrl ?? work.coverImage ?? "";
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
                          featured={index === 1 || index === 4}
                          onOpen={() => setLightboxWork(work)}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-5 border border-black/10 bg-white/30 p-6 text-sm leading-7 opacity-62">
                    현재 공개된 작품을 준비 중입니다.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section
          id="archive"
          className="grid gap-8 border-t border-black/10 py-12 lg:min-h-screen lg:grid-cols-[1.05fr_0.95fr] lg:py-14"
        >
          <div className="grid gap-6">
            <article className="border-b border-black/10 pb-8">
              <h2 className="text-4xl font-normal tracking-[-0.03em]">
                Statement
              </h2>
              {statementPreview ? (
                <div className="mt-5 max-w-3xl space-y-4 text-[15px] leading-8 opacity-70">
                  {statementPreview
                    .split("\n")
                    .filter(Boolean)
                    .slice(0, 3)
                    .map((paragraph, index) => (
                      <p key={`statement-preview-${index}`}>{paragraph}</p>
                    ))}
                </div>
              ) : (
                <p className="mt-5 text-sm leading-7 opacity-56">
                  작가 노트를 준비 중입니다.
                </p>
              )}
            </article>

            <div className="grid gap-6 md:grid-cols-2">
              <article className="border-b border-black/10 pb-6 md:border-b-0 md:border-r md:pr-6">
                <h2 className="text-3xl font-normal tracking-[-0.03em]">CV</h2>
                {compactCvItems.length > 0 ? (
                  <div className="mt-5 divide-y divide-black/10">
                    {compactCvItems.map((item) => (
                      <div
                        key={item.id}
                        className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-4 py-3"
                      >
                        <p
                          className="text-xs font-medium"
                          style={{ color: pageTheme.accent }}
                        >
                          {item.year || "—"}
                        </p>
                        <div>
                          <p className="line-clamp-1 text-sm font-medium">
                            {item.title}
                          </p>
                          <p className="mt-1 line-clamp-1 text-xs opacity-52">
                            {[item.venue, item.location].filter(Boolean).join(", ")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-5 text-sm leading-7 opacity-56">
                    CV 항목을 준비 중입니다.
                  </p>
                )}
              </article>

              <article className="border-b border-black/10 pb-6 md:border-b-0">
                <h2 className="text-3xl font-normal tracking-[-0.03em]">
                  Press & Archive
                </h2>
                {compactArchiveLinks.length > 0 ? (
                  <div className="mt-5 divide-y divide-black/10">
                    {compactArchiveLinks.map((item) => {
                      const href = normalizeExternalUrl(item.url);
                      const content = (
                        <div className="flex items-center justify-between gap-4 py-3">
                          <div className="min-w-0">
                            <p className="line-clamp-1 text-sm font-medium">
                              {item.title}
                            </p>
                            <p className="mt-1 line-clamp-1 text-xs opacity-52">
                              {[item.source, item.year].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                          <span className="text-sm opacity-45">→</span>
                        </div>
                      );

                      return href ? (
                        <a
                          key={item.id}
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className="block transition hover:opacity-62"
                        >
                          {content}
                        </a>
                      ) : (
                        <div key={item.id}>{content}</div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-5 text-sm leading-7 opacity-56">
                    Press & Archive를 준비 중입니다.
                  </p>
                )}
              </article>
            </div>
          </div>

          <aside className="grid gap-6 content-start">
            <div className="grid grid-cols-2 gap-3">
              {heroLinks.slice(0, 4).map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="border border-black/10 bg-white/25 px-4 py-4 text-sm transition hover:bg-white/55"
                >
                  <span className="block text-[10px] uppercase tracking-[0.24em] opacity-45">
                    Link
                  </span>
                  <span className="mt-2 block">{item.label}</span>
                </a>
              ))}
              <button
                type="button"
                onClick={handleSharePortfolio}
                className="border border-black/10 bg-white/25 px-4 py-4 text-left text-sm transition hover:bg-white/55"
              >
                <span className="block text-[10px] uppercase tracking-[0.24em] opacity-45">
                  Share
                </span>
                <span className="mt-2 block">Portfolio</span>
              </button>
              <Link
                href="/artists"
                className="border border-black/10 bg-white/25 px-4 py-4 text-sm transition hover:bg-white/55"
              >
                <span className="block text-[10px] uppercase tracking-[0.24em] opacity-45">
                  Back
                </span>
                <span className="mt-2 block">Artists</span>
              </Link>
            </div>

            <article className="border-t border-black/10 pt-6">
              <h2 className="text-3xl font-normal tracking-[-0.03em]">
                Exhibitions
              </h2>
              {compactExhibitions.length > 0 ? (
                <div className="mt-5 divide-y divide-black/10">
                  {compactExhibitions.map((exhibition) => (
                    <div key={exhibition.id} className="grid grid-cols-[5rem_1fr] gap-4 py-4">
                      {exhibition.imageUrl ? (
                        <img
                          src={exhibition.imageUrl}
                          alt={exhibition.title || artist.name}
                          className="aspect-[4/3] h-full w-full object-cover"
                        />
                      ) : (
                        <div className="aspect-[4/3] bg-black/8" />
                      )}
                      <div>
                        <p className="line-clamp-1 text-sm font-medium">
                          {exhibition.title || "Untitled Exhibition"}
                        </p>
                        <p className="mt-1 text-xs opacity-52">
                          {formatExhibitionDateRange(
                            exhibition.startDate,
                            exhibition.endDate
                          )}
                        </p>
                        <p className="mt-1 line-clamp-1 text-xs opacity-52">
                          {[exhibition.venue, exhibition.location]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-5 text-sm leading-7 opacity-56">
                  전시 기록을 준비 중입니다.
                </p>
              )}
            </article>
          </aside>
        </section>
      </div>

      {lightboxWork && lightboxImage ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[#171411]/72 p-4 backdrop-blur-md md:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={`${lightboxWork.title} high resolution preview`}
          onClick={() => setLightboxWork(null)}
        >
          <div
            className="relative max-h-full w-full max-w-6xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxWork(null)}
              className="absolute right-0 top-0 z-10 -translate-y-12 text-sm uppercase tracking-[0.22em] text-white/80 transition hover:text-white"
            >
              Close
            </button>
            <div className="max-h-[82vh] overflow-hidden bg-[#f8f3ea] shadow-[0_40px_140px_rgba(0,0,0,0.42)]">
              <img
                src={lightboxImage}
                alt={lightboxWork.title}
                className="max-h-[82vh] w-full object-contain"
              />
            </div>
            <div className="mt-4 flex flex-col gap-3 text-white md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-normal tracking-[-0.03em]">
                  {lightboxWork.title}
                </h2>
                <p className="mt-1 text-sm text-white/65">
                  {[lightboxWork.year, lightboxWork.medium, lightboxWork.dimensions]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <Link
                href={getWorkHref(lightboxWork)}
                className="inline-flex w-fit border-b border-white/50 pb-1 text-sm transition hover:border-white hover:text-white"
              >
                View Artwork Detail
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {showDebugNote ? (
        <div className="fixed bottom-4 left-4 z-40 max-w-xs border border-black/10 bg-white/80 px-3 py-2 text-xs shadow-[0_10px_40px_rgba(58,42,24,0.12)]">
          source: {debugSource}
          {loadErrorMessage ? <span> · {loadErrorMessage}</span> : null}
        </div>
      ) : null}

    </main>
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
  featured = false,
  onOpen,
}: {
  href: string;
  secondaryHref?: string;
  image?: string;
  title: string;
  year?: string;
  medium?: string;
  dimensions?: string;
  featured?: boolean;
  onOpen: () => void;
}) {
  return (
    <article
      className={`group relative overflow-hidden bg-white/35 shadow-[0_16px_45px_rgba(58,42,24,0.1)] transition duration-500 hover:-translate-y-1 hover:bg-white/60 hover:shadow-[0_26px_72px_rgba(58,42,24,0.16)] ${
        featured ? "col-span-2 row-span-2" : ""
      }`}
    >
      {secondaryHref ? (
        <Link
          href={secondaryHref}
          className="absolute right-3 top-3 z-20 bg-black/45 px-2.5 py-1 text-[9px] uppercase tracking-[0.2em] text-white/85 backdrop-blur-sm transition hover:bg-black/70"
        >
          AR
        </Link>
      ) : null}

      <button
        type="button"
        onClick={onOpen}
        className="relative block h-full min-h-[8rem] w-full overflow-hidden bg-[#1a1a1a] text-left"
        aria-label={`${title} 이미지 크게 보기`}
      >
        {image ? (
          <img
            src={image}
            alt={title}
            className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
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
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_38%,rgba(0,0,0,0.58))] opacity-90 transition group-hover:opacity-100" />
        <div className="absolute left-3 top-3 bg-black/38 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white">
          {year || "Year"}
        </div>
        <div className="absolute inset-x-0 bottom-0 p-3 text-white">
          <h3 className="line-clamp-1 text-sm font-medium tracking-[-0.02em]">
            {title}
          </h3>
          <p className="mt-1 line-clamp-1 text-[11px] text-white/62">
            {[medium, dimensions].filter(Boolean).join(" · ")}
          </p>
        </div>
      </button>

      <Link
        href={href}
        className="absolute bottom-3 right-3 z-20 border-b border-white/50 text-[10px] uppercase tracking-[0.18em] text-white/85 transition hover:border-white hover:text-white"
      >
        Detail
      </Link>
    </article>
  );
}

function formatExhibitionDateRange(startDate?: string, endDate?: string) {
  const start = parseExhibitionDate(startDate);
  const end = endDate?.trim() ? parseExhibitionDate(endDate) : null;

  if (!start) {
    return end ? formatExhibitionDate(end) : "";
  }

  if (!end) {
    return formatExhibitionDate(start);
  }

  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const startLabel = sameYear
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }).format(start)
    : formatExhibitionDate(start);
  const endLabel = formatExhibitionDate(end);

  return sameYear
    ? `${startLabel} - ${endLabel}`
    : `${startLabel} - ${endLabel}`;
}

function parseExhibitionDate(value?: string) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = new Date(`${trimmed}T00:00:00Z`);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function formatExhibitionDate(value?: Date | null) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(value);
}
