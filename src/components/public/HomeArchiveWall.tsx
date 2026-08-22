"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  buildPublicArtistCollections,
  type PublicArtistCard,
} from "@/lib/artistCatalog";
import {
  getPublicRepresentedArtists,
  getPublicWorksForArtistSlug,
} from "@/lib/firebase/firestore";
import { works as staticWorks } from "@/data/works";
import FeaturedArtistsPreview from "@/components/public/FeaturedArtistsPreview";

type ArchiveWorkTile = {
  id: string;
  artistSlug: string;
  artistName: string;
  title: string;
  imageUrl: string;
  isFallback?: boolean;
};

type WorkTileProps = {
  work: ArchiveWorkTile;
  className: string;
  priority?: boolean;
};

const workTileClasses = [
  "col-span-1 row-span-2 md:absolute md:left-[0.5%] md:top-[0%] md:h-[33%] md:w-[24.5%] md:z-10",
  "col-span-1 row-span-2 md:absolute md:left-[24.3%] md:top-[1.8%] md:h-[31.2%] md:w-[25.8%] md:z-20",
  "col-span-1 row-span-2 md:absolute md:left-[49.7%] md:top-[0.4%] md:h-[33.2%] md:w-[24.6%] md:z-10",
  "col-span-1 row-span-2 md:absolute md:right-[0.4%] md:top-[1.1%] md:h-[32.4%] md:w-[25.2%] md:z-10",
  "col-span-1 row-span-2 md:absolute md:left-[1.4%] md:top-[33.2%] md:h-[32.4%] md:w-[23.9%] md:z-20",
  "col-span-1 row-span-2 md:absolute md:left-[24.7%] md:top-[32.1%] md:h-[34.1%] md:w-[25.3%] md:z-30",
  "col-span-1 row-span-2 md:absolute md:left-[49.6%] md:top-[34%] md:h-[31.8%] md:w-[25.8%] md:z-20",
  "col-span-1 row-span-2 md:absolute md:right-[0.8%] md:top-[32.7%] md:h-[33.1%] md:w-[24.6%] md:z-30",
  "col-span-1 row-span-2 md:absolute md:left-[0.2%] md:bottom-[0.2%] md:h-[33.1%] md:w-[25%] md:z-10",
  "col-span-1 row-span-2 md:absolute md:left-[25.2%] md:bottom-[1.4%] md:h-[31.9%] md:w-[24.7%] md:z-20",
  "col-span-1 row-span-2 md:absolute md:left-[49.1%] md:bottom-[0%] md:h-[33.2%] md:w-[25.8%] md:z-10",
  "col-span-1 row-span-2 md:absolute md:right-[0%] md:bottom-[0.9%] md:h-[32.5%] md:w-[25.4%] md:z-20",
];

const seedRepresentedArtists =
  buildPublicArtistCollections([]).representedArtists.slice(0, 4);
const fallbackAbstractImages = [
  "/images/fallback-works/fallback-abstract-01.svg",
  "/images/fallback-works/fallback-abstract-02.svg",
  "/images/fallback-works/fallback-abstract-03.svg",
  "/images/fallback-works/fallback-abstract-04.svg",
  "/images/fallback-works/fallback-abstract-05.svg",
  "/images/fallback-works/fallback-abstract-06.svg",
];

const seedWorkTiles = fillWithFallbackWorks(
  getStaticWorkTiles(seedRepresentedArtists.map((artist) => artist.slug)),
  seedRepresentedArtists
);

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function hasUsableImageUrl(value?: string) {
  const imageUrl = value?.trim() ?? "";

  if (!imageUrl || imageUrl === "#") {
    return false;
  }

  return (
    imageUrl.startsWith("/") ||
    imageUrl.startsWith("https://") ||
    imageUrl.startsWith("http://")
  );
}

function getFallbackImageForId(id: string) {
  const hash = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0);

  return fallbackAbstractImages[hash % fallbackAbstractImages.length];
}

function getStaticWorkTiles(artistSlugs: string[]): ArchiveWorkTile[] {
  return staticWorks
    .filter((work) => artistSlugs.includes(work.artistSlug))
    .map((work) => ({
      id: work.slug,
      artistSlug: work.artistSlug,
      artistName: work.artistName,
      title: work.title,
      imageUrl: work.coverImageUrl ?? work.coverImage ?? "",
    }))
    .filter((work) => hasUsableImageUrl(work.imageUrl));
}

function createFallbackWorkTiles(artists: PublicArtistCard[]) {
  return Array.from({ length: workTileClasses.length }, (_, index) => {
    const artist = artists[index % Math.max(artists.length, 1)];

    return {
      id: `fallback-abstract-${index + 1}`,
      artistSlug: artist?.slug ?? "artists",
      artistName: artist?.name ?? "KÜN’S Gallery",
      title: "Temporary Artwork Image",
      imageUrl: fallbackAbstractImages[index % fallbackAbstractImages.length],
      isFallback: true,
    };
  });
}

function fillWithFallbackWorks(
  sourceWorks: ArchiveWorkTile[],
  artists: PublicArtistCard[]
) {
  const fallbackWorks = createFallbackWorkTiles(artists);
  const mergedWorks = [...sourceWorks, ...fallbackWorks];

  return mergedWorks.slice(0, Math.max(workTileClasses.length, mergedWorks.length));
}

function WorkTile({ work, className, priority = false }: WorkTileProps) {
  const [failedImageId, setFailedImageId] = useState("");
  const fallbackImageUrl = getFallbackImageForId(work.id);
  const imageUrl =
    failedImageId === work.id || !hasUsableImageUrl(work.imageUrl)
      ? fallbackImageUrl
      : work.imageUrl;

  return (
    <Link
      href={`/artists/${work.artistSlug}`}
      className={`group relative isolate min-h-[10rem] border border-[#1d1710]/20 bg-[#17110b] p-[5px] shadow-[0_20px_48px_rgba(77,55,31,0.22)] transition duration-500 hover:z-40 md:min-h-0 md:p-[7px] ${className}`}
    >
      <div className="pointer-events-none absolute inset-y-2 left-1 hidden w-px bg-[repeating-linear-gradient(to_bottom,rgba(217,121,61,0.48)_0_2px,transparent_2px_10px)] md:block" />
      <div className="pointer-events-none absolute inset-y-2 right-1 hidden w-px bg-[repeating-linear-gradient(to_bottom,rgba(217,121,61,0.34)_0_2px,transparent_2px_10px)] md:block" />
      <div className="pointer-events-none absolute bottom-1 left-1/2 hidden h-px w-12 -translate-x-1/2 bg-[#D9793D]/45 md:block" />
      <div className="relative h-full min-h-[calc(10rem-14px)] overflow-hidden bg-[#efe7dc] md:min-h-0">
        <Image
          src={imageUrl}
          alt={work.title}
          fill
          priority={priority}
          sizes="(max-width: 768px) 50vw, 24vw"
          className="object-cover grayscale transition duration-700 ease-out group-hover:scale-[1.04] group-hover:grayscale-0"
          onError={() => setFailedImageId(work.id)}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.02),rgba(0,0,0,0.46))] opacity-80 transition group-hover:opacity-45" />
        <div className="absolute inset-x-3 bottom-3 translate-y-2 opacity-0 transition duration-500 group-hover:translate-y-0 group-hover:opacity-100">
          <p className="truncate text-[11px] uppercase tracking-[0.18em] text-white/74">
            {work.isFallback ? "Temporary Image" : work.artistName}
          </p>
        </div>
      </div>
    </Link>
  );
}

export default function HomeArchiveWall() {
  const [artists, setArtists] = useState<PublicArtistCard[]>(
    seedRepresentedArtists
  );
  const [works, setWorks] = useState<ArchiveWorkTile[]>(seedWorkTiles);
  const [visibleWorks, setVisibleWorks] = useState<ArchiveWorkTile[]>(
    seedWorkTiles.slice(0, workTileClasses.length)
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const firestoreArtists = await getPublicRepresentedArtists().catch(
        () => []
      );
      const representedArtists =
        buildPublicArtistCollections(firestoreArtists).representedArtists.slice(
          0,
          4
        );
      const nextArtists =
        representedArtists.length > 0
          ? representedArtists
          : seedRepresentedArtists;
      const artistSlugs = nextArtists.map((artist) => artist.slug);
      const firestoreWorks = (
        await Promise.all(
          artistSlugs.map((slug) =>
            getPublicWorksForArtistSlug(slug).catch(() => [])
          )
        )
      )
        .flat()
        .map((work) => ({
          id: work.id,
          artistSlug: work.artistSlug ?? "",
          artistName: work.artistName ?? "",
          title: work.title ?? "",
          imageUrl: work.coverImageUrl ?? "",
        }))
        .filter(
          (work): work is ArchiveWorkTile =>
            Boolean(work.artistSlug && work.artistName && work.title && work.imageUrl)
        );

      const nextWorks =
        firestoreWorks.length > 0
          ? firestoreWorks
          : getStaticWorkTiles(nextArtists.map((artist) => artist.slug));
      const filledWorks = fillWithFallbackWorks(nextWorks, nextArtists);

      if (cancelled) {
        return;
      }

      setArtists(nextArtists);
      setWorks(filledWorks);
      setVisibleWorks(shuffle(filledWorks).slice(0, workTileClasses.length));
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (works.length <= workTileClasses.length) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setVisibleWorks((currentWorks) => {
        const currentIds = new Set(currentWorks.map((work) => work.id));
        const candidates = works.filter((work) => !currentIds.has(work.id));
        const replacement = shuffle(candidates.length > 0 ? candidates : works)[0];
        const replaceIndex = Math.floor(Math.random() * workTileClasses.length);
        const nextWorks = [...currentWorks];
        nextWorks[replaceIndex] = replacement;

        return nextWorks;
      });
    }, 3600);

    return () => window.clearInterval(intervalId);
  }, [works]);

  const fallbackWorkTiles = useMemo(
    () =>
      fillWithFallbackWorks(
        getStaticWorkTiles(artists.map((artist) => artist.slug)),
        artists
      ),
    [artists]
  );
  const displayWorks =
    visibleWorks.length > 0
      ? visibleWorks
      : fallbackWorkTiles.slice(0, workTileClasses.length);

  return (
    <main className="min-h-screen bg-[#eee6d9] text-[#171411]">
      <section className="relative min-h-screen border-b border-[#1d1710]/10 md:h-screen md:min-h-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(217,121,61,0.16),transparent_26rem),linear-gradient(180deg,#f6efe5_0%,#eadfce_100%)]" />
        <div className="relative mx-auto flex min-h-screen max-w-[1720px] flex-col px-5 py-5 md:h-full md:min-h-0 md:px-8">
          <header className="flex h-14 items-center justify-between border-b border-[#1d1710]/12">
            <Link
              href="/"
              className="gallery-wordmark text-[1.45rem] leading-none text-[#171411] transition hover:text-[#A85025]"
            >
              Kün&apos;s Gallery
            </Link>

            <nav className="flex items-center gap-3">
              <Link
                href="/artists"
                className="hidden text-[11px] uppercase tracking-[0.18em] text-[#171411]/58 transition hover:text-[#171411] md:inline-flex"
              >
                Artists
              </Link>
              <Link
                href="/artist/login"
                className="hidden text-[11px] uppercase tracking-[0.18em] text-[#171411]/58 transition hover:text-[#171411] md:inline-flex"
              >
                Login
              </Link>
            </nav>
          </header>

          <div className="grid flex-1 gap-6 py-8 md:min-h-0 md:grid-cols-[24rem_1fr] md:items-stretch md:py-6 lg:grid-cols-[26rem_1fr]">
            <aside className="flex flex-col justify-end md:border-r md:border-[#1d1710]/10 md:pr-8">
              <h1 className="max-w-[12rem] text-[5.2rem] font-normal leading-[0.78] tracking-[-0.04em] text-[#171411] md:[writing-mode:vertical-rl] md:rotate-180 md:text-[8.6rem] lg:text-[10rem]">
                Artists
              </h1>

              <div className="mt-8 grid gap-3 md:mt-10">
                <Link
                  href="/artists"
                  className="group inline-flex h-16 items-center justify-between bg-[#D9793D] px-7 text-[1.05rem] font-medium text-white shadow-[0_14px_40px_rgba(112,73,39,0.18)] transition hover:bg-[#e8874e]"
                >
                  <span>View Artists</span>
                  <span className="transition group-hover:translate-x-1">→</span>
                </Link>
                <Link
                  href="/artist/login"
                  className="group inline-flex h-16 items-center justify-between border border-[#1d1710]/20 bg-white/30 px-7 text-[1.05rem] font-medium text-[#171411] transition hover:border-[#D9793D] hover:bg-white/60 hover:text-[#A85025]"
                >
                  <span>Artist Login</span>
                  <span className="transition group-hover:translate-x-1">→</span>
                </Link>
              </div>
            </aside>

            <div className="relative grid auto-rows-[6.2rem] grid-cols-2 gap-2 md:block md:h-full md:min-h-[40rem] md:overflow-visible">
              {displayWorks.map((work, index) => (
                <WorkTile
                  key={`${work.id}-${index}`}
                  work={work}
                  className={workTileClasses[index] ?? workTileClasses[0]}
                  priority={index < 4}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#1d1710]/10 bg-[#f6efe5]">
        <div className="mx-auto grid max-w-[1720px] gap-10 px-5 py-16 md:grid-cols-[0.9fr_1.1fr] md:px-8 md:py-20">
          <h2 className="max-w-xl text-5xl font-normal leading-[0.9] tracking-[-0.04em] text-[#171411] md:text-7xl">
            One archive,
            <br />
            many entries.
          </h2>

          <div className="space-y-6">
            <p className="max-w-3xl text-[15px] leading-8 text-[#171411]/62 md:text-[16px] md:leading-9">
              KÜN’S Gallery Artists는 갤러리 전속 작가의 작품과 기록을 한곳에
              모아 보여주는 공식 아카이브 페이지입니다. 관람자는 홈에서 작품의
              분위기를 먼저 감각하고, 이어지는 작가 페이지에서 작품, 이력,
              Press & Archive를 자연스럽게 확인할 수 있습니다.
            </p>

            <p className="max-w-3xl text-[15px] leading-8 text-[#171411]/62 md:text-[16px] md:leading-9">
              작가별 페이지는 같은 기준으로 정돈되어 갤러리의 일관된 인상을
              유지하고, 갤러리는 필요한 소개, 기록, 공유용 자료를 한 흐름 안에서
              관리할 수 있습니다. 기술 설명보다 작품의 첫인상과 아카이브의
              질서가 먼저 드러나도록 구성했습니다.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-[#1d1710]/10 bg-[#eee6d9]">
        <div className="mx-auto max-w-[1720px] px-5 py-16 md:px-8 md:py-20">
          <div className="grid gap-10 md:grid-cols-[0.95fr_1.05fr] md:items-end">
            <h2 className="max-w-3xl text-5xl font-normal leading-[0.9] tracking-[-0.04em] text-[#171411] md:text-7xl">
              Represented
              <br />
              artists preview
            </h2>
            <p className="max-w-2xl text-[15px] leading-8 text-[#171411]/62 md:text-[16px] md:leading-9">
              전속 작가 4명을 미리 보여주는 영역입니다. 각 카드에서 바로
              상세 페이지로 이동할 수 있어, 홈에서 아카이브로의 흐름이
              자연스럽게 이어집니다.
            </p>
          </div>

          <div className="mt-10">
            <FeaturedArtistsPreview />
          </div>
        </div>
      </section>

      <footer className="bg-[#f6efe5]">
        <div className="mx-auto grid max-w-[1720px] gap-8 px-5 py-16 md:grid-cols-[1fr_auto] md:items-end md:px-8 md:py-20">
          <div>
            <h2 className="max-w-2xl text-4xl font-normal leading-[0.92] tracking-[-0.04em] text-[#171411] md:text-6xl">
              View represented
              <br />
              artists or log in.
            </h2>
            <p className="mt-5 max-w-xl text-[15px] leading-8 text-[#171411]/58 md:text-[16px] md:leading-9">
              가장 중요한 진입점만 남겨, 홈에서 바로 아카이브와 작가 관리
              흐름으로 이어집니다.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/artists"
              className="inline-flex h-12 items-center justify-center bg-[#D9793D] px-6 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-[#e8874e]"
            >
              View Artists
            </Link>
            <Link
              href="/artist/login"
              className="inline-flex h-12 items-center justify-center border border-[#1d1710]/20 bg-white/30 px-6 text-sm font-semibold uppercase tracking-[0.12em] text-[#171411] transition hover:border-[#D9793D] hover:bg-white/60 hover:text-[#A85025]"
            >
              Artist Login
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
