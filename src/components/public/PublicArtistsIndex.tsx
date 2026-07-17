"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  buildPublicArtistCollections,
  type PublicArtistCard,
} from "@/lib/artistCatalog";
import { getAllArtistsForPublicDisplay } from "@/lib/firebase/firestore";

type PublicArtistCollections = ReturnType<typeof buildPublicArtistCollections>;

type ArtistRosterCardProps = {
  artist: PublicArtistCard;
  label: string;
  tone: "represented" | "project";
};

function ArtistRosterCard({ artist, label, tone }: ArtistRosterCardProps) {
  const href = artist.slug ? `/artists/${artist.slug}` : "";
  const isProject = tone === "project";
  const cardImageUrl =
    artist.featuredWorkImageUrl?.trim() || artist.profileImage?.trim() || "";

  const card = (
    <article
      className={`group flex h-full flex-col overflow-hidden rounded-[1.75rem] border transition duration-300 ${
        isProject
          ? "border-white/8 bg-white/[0.035] hover:border-[#F37021]/28"
          : "border-white/10 bg-white/[0.045] hover:border-[#F37021]/40"
      } hover:-translate-y-0.5 hover:shadow-[0_26px_80px_rgba(0,0,0,0.28)]`}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-[#1a1a1a]">
        {cardImageUrl ? (
          <img
            src={cardImageUrl}
            alt={artist.name}
            className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.025]"
          />
        ) : (
          <div className="flex h-full w-full flex-col justify-between bg-[radial-gradient(circle_at_20%_20%,rgba(243,112,33,0.14),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-5">
            <div className="text-[10px] uppercase tracking-[0.34em] text-white/45">
              KÜN’S Gallery
            </div>
            <p className="text-sm leading-6 text-white/60">
              프로필 이미지를 준비 중입니다.
            </p>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_42%,rgba(0,0,0,0.36))] opacity-90 transition group-hover:opacity-100" />
        <div className="absolute left-4 top-4 rounded-full border border-white/12 bg-black/30 px-3 py-1 text-[10px] uppercase tracking-[0.26em] text-white/90">
          {label}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.26em] text-white/42">
              {isProject ? "Project Artist" : "Represented Artist"}
            </p>
            <h2
              className={`mt-3 font-semibold tracking-[-0.04em] text-[#F7F1E8] ${
                isProject ? "text-[1.55rem]" : "text-[1.7rem] md:text-[1.9rem]"
              }`}
            >
              {artist.name}
            </h2>
            {artist.nameKo ? (
              <p className="mt-2 text-sm text-white/58">{artist.nameKo}</p>
            ) : null}
          </div>

          <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.045] px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-white/65 transition group-hover:border-[#F37021]/35 group-hover:bg-[#F37021]/12 group-hover:text-[#F7F1E8]">
            View Artist
          </span>
        </div>

        {artist.tagline ? (
          <p className="mt-5 max-w-xl text-sm leading-7 text-white/68">
            {artist.tagline}
          </p>
        ) : (
          <p className="mt-5 max-w-xl text-sm leading-7 text-white/52">
            Official archive entry.
          </p>
        )}

        {artist.featuredWorkTitle ? (
          <div className="mt-5 rounded-[1.2rem] border border-white/10 bg-black/15 px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.28em] text-white/42">
              Featured Work
            </p>
            <p className="mt-2 text-sm leading-6 text-white/76">
              {artist.featuredWorkTitle}
            </p>
          </div>
        ) : null}

        <div className="mt-auto pt-6">
          <div className="inline-flex items-center gap-2 text-sm text-white/72 transition group-hover:text-[#F7F1E8]">
            <span>View Artist</span>
            <span className="text-[#FF9B5A] transition group-hover:translate-x-0.5">
              ↗
            </span>
          </div>
        </div>
      </div>
    </article>
  );

  if (!href) {
    return card;
  }

  return (
    <Link href={href} className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F37021]/50">
      {card}
    </Link>
  );
}

function ArtistRosterCardSkeleton({ tone }: { tone: "represented" | "project" }) {
  const isProject = tone === "project";

  return (
    <article
      className={`flex h-full flex-col overflow-hidden rounded-[1.75rem] border ${
        isProject
          ? "border-white/8 bg-white/[0.035]"
          : "border-white/10 bg-white/[0.045]"
      }`}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-[#1a1a1a]">
        <div className="h-full w-full animate-pulse bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.02)),radial-gradient(circle_at_20%_20%,rgba(243,112,33,0.12),transparent_36%)]" />
        <div className="absolute left-4 top-4 h-7 w-24 rounded-full bg-white/8" />
      </div>

      <div className="flex flex-1 flex-col p-5 md:p-6">
        <div className="space-y-3">
          <div className="h-3 w-24 rounded-full bg-white/8" />
          <div className={`h-8 rounded-full bg-white/10 ${isProject ? "w-3/4" : "w-4/5"}`} />
          <div className="h-4 w-1/2 rounded-full bg-white/8" />
        </div>

        <div className="mt-5 space-y-3">
          <div className="h-4 w-5/6 rounded-full bg-white/8" />
          <div className="h-4 w-2/3 rounded-full bg-white/8" />
        </div>

        <div className="mt-auto pt-6">
          <div className="h-4 w-28 rounded-full bg-white/8" />
        </div>
      </div>
    </article>
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

export default function PublicArtistsIndex() {
  const [collections, setCollections] = useState<PublicArtistCollections | null>(
    null
  );
  const [loadErrorMessage, setLoadErrorMessage] = useState("");

  useEffect(() => {
    let isActive = true;
    let resolved = false;
    const timeoutId = window.setTimeout(() => {
      if (isActive && !resolved) {
        setLoadErrorMessage(
          "작가 정보를 불러오는 데 시간이 걸리고 있습니다."
        );
      }
    }, 6000);

    void (async () => {
      try {
        const publicArtists = await getAllArtistsForPublicDisplay();

        if (!isActive) {
          return;
        }

        setCollections(buildPublicArtistCollections(publicArtists));
        setLoadErrorMessage("");
        resolved = true;
      } catch {
        if (!isActive) {
          return;
        }

        setCollections(buildPublicArtistCollections([]));
        setLoadErrorMessage("작가 정보를 불러오지 못해 기본 목록을 표시합니다.");
        resolved = true;
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
  }, []);

  const representedArtists = collections?.representedArtists ?? [];
  const projectArtists = collections?.projectArtists ?? [];
  const representedCount = collections?.representedArtists.length ?? 0;
  const projectCount = collections?.projectArtists.length ?? 0;
  const isLoading = collections === null;

  return (
    <main className="theme-dark min-h-screen bg-[#111111] text-[#F7F1E8]">
      <div className="mx-auto max-w-7xl px-5 py-6 md:px-8 md:py-8">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="text-[11px] uppercase tracking-[0.34em] text-white/45 transition hover:text-white/60"
          >
            KÜN’S GALLERY
          </Link>

          <Link
            href="/"
            className="inline-flex h-11 items-center rounded-full border border-white/10 bg-white/[0.05] px-5 text-sm text-[#F7F1E8] transition hover:border-white/20 hover:bg-white/[0.08]"
          >
            Home
          </Link>
        </header>

        <section className="relative mt-6 overflow-hidden rounded-[2.75rem] border border-white/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03)),radial-gradient(circle_at_85%_10%,rgba(243,112,33,0.16),transparent_24%),radial-gradient(circle_at_15%_0%,rgba(255,255,255,0.08),transparent_22%),#171717] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.35)] md:p-10 lg:p-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(243,112,33,0.14),transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.06),transparent_28%)]" />

          <div className="relative grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] uppercase tracking-[0.34em] text-white/50">
                  KÜN’S GALLERY
                </span>
              </div>

              <div className="max-w-4xl space-y-4">
                <h1 className="text-5xl font-semibold tracking-[-0.05em] text-[#F7F1E8] md:text-7xl md:leading-[0.92]">
                  Represented Artists
                </h1>
                <p className="max-w-3xl text-lg leading-8 text-white/70 md:text-[1.08rem] md:leading-9">
                  An official archive of artists represented and presented by KÜN’S Gallery.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="#represented"
                  className="inline-flex h-11 items-center rounded-full border border-[#F37021]/45 bg-[#F37021] px-5 text-sm font-medium text-[#171717] transition hover:bg-[#ff7a2f]"
                >
                  View Artists
                </Link>
                <Link
                  href="#project-artists"
                  className="inline-flex h-11 items-center rounded-full border border-white/10 bg-white/[0.05] px-5 text-sm text-[#F7F1E8] transition hover:border-white/20 hover:bg-white/[0.08]"
                >
                  Project Artists
                </Link>
              </div>

              {loadErrorMessage ? (
                <div className="max-w-2xl rounded-[1.35rem] border border-white/10 bg-black/20 px-4 py-3 text-sm leading-6 text-white/55">
                  {loadErrorMessage}
                </div>
              ) : null}
            </div>

            <div className="lg:justify-self-end">
              <div className="w-full max-w-[380px] rounded-[2rem] border border-white/10 bg-white/[0.045] p-5 shadow-[0_22px_80px_rgba(0,0,0,0.28)]">
                <p className="text-[10px] uppercase tracking-[0.34em] text-white/45">
                  Roster Snapshot
                </p>

                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3">
                    <span className="text-sm text-white/60">Represented</span>
                    <span className="text-2xl font-semibold tracking-[-0.04em] text-[#F7F1E8]">
                      {isLoading ? "—" : representedCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-3">
                    <span className="text-sm text-white/60">Project</span>
                    <span className="text-2xl font-semibold tracking-[-0.04em] text-[#F7F1E8]">
                      {isLoading ? "—" : projectCount}
                    </span>
                  </div>
                  <p className="pt-2 text-sm leading-7 text-white/58">
                    Firestore artist data is prioritized, with neutral loading states before any fallback appears.
                  </p>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-[#FF9B5A]">
                    Public roster
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="represented" className="border-t border-white/10 py-16 md:py-24">
          <SectionHeading
            label="REPRESENTED ARTISTS"
            title="Represented Artists"
            description="The four represented artists are always shown first, with Firestore taking priority when updated information is available."
          />

          <div className="mt-10">
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {isLoading
                ? Array.from({ length: 4 }, (_, index) => (
                    <ArtistRosterCardSkeleton
                      key={`represented-skeleton-${index}`}
                      tone="represented"
                    />
                  ))
                : representedArtists.map((artist) => (
                    <ArtistRosterCard
                      key={artist.slug}
                      artist={artist}
                      label="Represented"
                      tone="represented"
                    />
                  ))}
            </div>

            {isLoading ? (
              <p className="mt-5 text-sm leading-7 text-white/45">
                작가 정보를 불러오는 중입니다.
              </p>
            ) : null}
          </div>
        </section>

        {isLoading || projectArtists.length > 0 ? (
          <section
            id="project-artists"
            className="border-t border-white/10 py-16 md:py-24"
          >
            <SectionHeading
              label="PROJECT ARTISTS"
              title="Project Artists"
              description="Active project artists are presented with a quieter visual weight so the represented roster remains the primary focus."
            />

            <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {isLoading
                ? Array.from({ length: 3 }, (_, index) => (
                    <ArtistRosterCardSkeleton
                      key={`project-skeleton-${index}`}
                      tone="project"
                    />
                  ))
                : projectArtists.map((artist) => (
                    <ArtistRosterCard
                      key={artist.slug}
                      artist={artist}
                      label="Project"
                      tone="project"
                    />
                  ))}
            </div>
          </section>
        ) : null}

        <footer className="border-t border-white/10 py-16 md:py-20">
          <div className="rounded-[2.4rem] border border-white/10 bg-white/[0.045] p-6 md:p-8">
            <p className="text-[11px] uppercase tracking-[0.34em] text-white/45">
              KÜN’S GALLERY
            </p>
            <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[#F7F1E8] md:text-4xl">
              Official artist archive
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-white/62 md:text-[15px]">
              A refined index of represented artists, selected projects, and the broader gallery archive.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                href="/"
                className="inline-flex h-11 items-center rounded-full border border-[#F37021]/45 bg-[#F37021] px-5 text-sm font-medium text-[#171717] transition hover:bg-[#ff7a2f]"
              >
                Gallery Home
              </Link>
              <Link
                href="#represented"
                className="inline-flex h-11 items-center rounded-full border border-white/10 bg-white/[0.05] px-5 text-sm text-[#F7F1E8] transition hover:border-white/20 hover:bg-white/[0.08]"
              >
                Back to Artists
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
