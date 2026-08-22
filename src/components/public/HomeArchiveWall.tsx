"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
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
  index: number;
  ratio: CardRatio;
  ringStyle: CSSProperties;
  onSelect: () => void;
  canSelect: boolean;
  isRingHovering: boolean;
  isSelected: boolean;
  priority?: boolean;
};

type CardRatio = "fourThree" | "threeFour" | "sixteenNine" | "nineSixteen";

const RING_CARD_COUNT = 18;
const cardRatios: CardRatio[] = [
  "threeFour",
  "sixteenNine",
  "fourThree",
  "nineSixteen",
  "sixteenNine",
  "threeFour",
  "fourThree",
  "sixteenNine",
  "nineSixteen",
  "fourThree",
  "threeFour",
  "sixteenNine",
  "fourThree",
  "nineSixteen",
  "sixteenNine",
  "threeFour",
  "fourThree",
  "nineSixteen",
];
const cardRatioClasses: Record<CardRatio, string> = {
  fourThree: "md:h-[29%] md:w-[28%]",
  threeFour: "md:h-[39%] md:w-[20%]",
  sixteenNine: "md:h-[24%] md:w-[32%]",
  nineSixteen: "md:h-[42%] md:w-[16%]",
};

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
  return Array.from({ length: RING_CARD_COUNT }, (_, index) => {
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

  return mergedWorks.slice(0, Math.max(RING_CARD_COUNT, mergedWorks.length));
}

function getRingCardStyle(
  index: number,
  selectedIndex: number,
  total: number
): CSSProperties {
  const angleStep = 360 / Math.max(total, 1);
  const angle = (index - selectedIndex) * angleStep;
  const radians = (angle * Math.PI) / 180;
  const frontness = (Math.cos(radians) + 1) / 2;
  const focus = Math.pow(frontness, 1.75);
  const xFactor = Math.sin(radians).toFixed(4);
  const yFactor = Math.cos(radians).toFixed(4);
  const z = Math.round((focus - 0.5) * 460);
  const scale = (0.48 + focus * 0.56).toFixed(3);
  const tilt = (-angle * 0.055).toFixed(2);

  return {
    zIndex: Math.round(frontness * 100),
    opacity: 0.42 + focus * 0.58,
    ["--ring-transform" as string]: `translate(-50%, -50%) translate3d(calc(${xFactor} * min(34vw, 540px)), calc(${yFactor} * min(13vw, 175px)), ${z}px) rotateY(${tilt}deg) scale(${scale})`,
    ["--ring-frontness" as string]: focus.toFixed(3),
  };
}

function getCircularDistance(index: number, selectedIndex: number, total: number) {
  const rawDistance = Math.abs(index - selectedIndex);

  return Math.min(rawDistance, Math.max(total - rawDistance, 0));
}

function WorkTile({
  work,
  index,
  ratio,
  ringStyle,
  onSelect,
  canSelect,
  isRingHovering,
  isSelected,
  priority = false,
}: WorkTileProps) {
  const [failedImageId, setFailedImageId] = useState("");
  const fallbackImageUrl = getFallbackImageForId(work.id);
  const imageUrl =
    failedImageId === work.id || !hasUsableImageUrl(work.imageUrl)
      ? fallbackImageUrl
      : work.imageUrl;

  return (
    <Link
      href={`/artists/${work.artistSlug}`}
      className={`archive-ring-card group relative isolate col-span-1 row-span-2 min-h-[10rem] overflow-hidden rounded-[1.05rem] bg-[#f8f1e7] shadow-[0_24px_60px_rgba(83,58,31,0.16)] transition duration-700 hover:shadow-[0_34px_90px_rgba(83,58,31,0.24)] md:absolute md:left-[46%] md:top-[43%] md:min-h-0 ${cardRatioClasses[ratio]}`}
      style={{
        ...ringStyle,
        ["--archive-delay" as string]: `${index * -0.45}s`,
        ["--archive-grayscale" as string]:
          isRingHovering && !isSelected ? "1" : "0",
        ["--archive-image-opacity" as string]:
          isRingHovering && !isSelected ? "0.54" : "1",
        pointerEvents: canSelect ? "auto" : "none",
      }}
      onMouseEnter={() => {
        if (canSelect) {
          onSelect();
        }
      }}
      onFocus={() => {
        if (canSelect) {
          onSelect();
        }
      }}
    >
      <div className="archive-card-inner relative h-full min-h-[10rem] overflow-hidden bg-[#efe7dc] md:min-h-0">
        <Image
          key={`${work.id}-${imageUrl}`}
          src={imageUrl}
          alt={work.title}
          fill
          priority={priority}
          sizes="(max-width: 768px) 50vw, 30vw"
          className="archive-image-current object-cover transition duration-[900ms] ease-out group-hover:scale-[1.035]"
          onError={() => setFailedImageId(work.id)}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,248,238,0.02),rgba(23,17,11,0.32))] opacity-70 transition duration-700 group-hover:opacity-35" />
        <div className="pointer-events-none absolute inset-0 rounded-[1.2rem] ring-1 ring-white/28" />
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
  const [visibleWorks, setVisibleWorks] = useState<ArchiveWorkTile[]>(
    seedWorkTiles.slice(0, RING_CARD_COUNT)
  );
  const [selectedRingIndex, setSelectedRingIndex] = useState(0);
  const [isRingHovering, setIsRingHovering] = useState(false);

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
      setVisibleWorks(shuffle(filledWorks).slice(0, RING_CARD_COUNT));
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isRingHovering || visibleWorks.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setSelectedRingIndex((currentIndex) =>
        (currentIndex + 1) % Math.min(visibleWorks.length, RING_CARD_COUNT)
      );
    }, 4600);

    return () => window.clearInterval(intervalId);
  }, [isRingHovering, visibleWorks.length]);

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
      ? visibleWorks.slice(0, RING_CARD_COUNT)
      : fallbackWorkTiles.slice(0, RING_CARD_COUNT);
  const normalizedSelectedIndex =
    selectedRingIndex % Math.max(displayWorks.length, 1);

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

          <div className="flex flex-1 flex-col gap-5 py-8 md:min-h-0 md:py-6">
            <div
              className="archive-ring-stage relative grid auto-rows-[6.2rem] grid-cols-2 gap-2 md:block md:min-h-0 md:flex-1 md:overflow-hidden"
              onMouseEnter={() => setIsRingHovering(true)}
              onMouseLeave={() => setIsRingHovering(false)}
            >
              {displayWorks.map((work, index) => (
                <WorkTile
                  key={`${work.id}-${index}`}
                  work={work}
                  index={index}
                  ratio={cardRatios[index % cardRatios.length]}
                  ringStyle={getRingCardStyle(
                    index,
                    normalizedSelectedIndex,
                    displayWorks.length
                  )}
                  onSelect={() => setSelectedRingIndex(index)}
                  canSelect={
                    getCircularDistance(
                      index,
                      normalizedSelectedIndex,
                      displayWorks.length
                    ) <= 2
                  }
                  isRingHovering={isRingHovering}
                  isSelected={normalizedSelectedIndex === index}
                  priority={index < 4}
                />
              ))}
            </div>

            <div className="mx-auto grid w-full max-w-[36rem] gap-3 sm:grid-cols-2">
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
