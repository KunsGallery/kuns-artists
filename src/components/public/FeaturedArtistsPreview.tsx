"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  buildPublicArtistCollections,
  type PublicArtistCard,
} from "@/lib/artistCatalog";
import { getPublicRepresentedArtists } from "@/lib/firebase/firestore";

function FeaturedArtistCardSkeleton() {
  return (
    <article className="group overflow-hidden rounded-[1.6rem] border border-white/10 bg-white/[0.03]">
      <div className="relative aspect-[4/5] overflow-hidden bg-[var(--background-soft)]">
        <div className="h-full w-full animate-pulse bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02)),radial-gradient(circle_at_20%_20%,rgba(243,112,33,0.12),transparent_36%)]" />
        <div className="absolute left-5 top-5 h-7 w-10 rounded-full bg-black/20" />
      </div>

      <div className="space-y-4 p-5">
        <div className="h-3 w-24 rounded-full bg-white/10" />
        <div className="h-8 w-3/4 rounded-full bg-white/10" />
        <div className="h-4 w-1/2 rounded-full bg-white/10" />
        <div className="h-4 w-5/6 rounded-full bg-white/10" />
        <div className="flex items-center justify-between pt-1">
          <div className="h-3 w-28 rounded-full bg-white/10" />
          <div className="h-3 w-10 rounded-full bg-white/10" />
        </div>
      </div>
    </article>
  );
}

function FeaturedArtistCard({ artist, index }: { artist: PublicArtistCard; index: number }) {
  const profileImageUrl = artist.profileImage?.trim() || "";

  return (
    <Link
      href={`/artists/${artist.slug}`}
      className="group overflow-hidden rounded-[1.6rem] border border-white/10 bg-white/[0.03] transition duration-500 hover:-translate-y-1 hover:border-[var(--kuns-orange)]/35 hover:bg-[var(--kuns-orange)]/[0.05]"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-[var(--background-soft)]">
        {profileImageUrl ? (
          <Image
            key={`${artist.slug}-${profileImageUrl || "no-profile"}`}
            src={profileImageUrl}
            alt={`${artist.name} profile`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
            className="object-cover transition duration-700 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full flex-col justify-between bg-[radial-gradient(circle_at_20%_20%,rgba(243,112,33,0.16),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-5">
            <div className="text-[10px] uppercase tracking-[0.34em] text-white/45">
              KÜN’S Gallery
            </div>
            <p className="text-sm leading-6 text-white/60">
              프로필 이미지를 준비 중입니다.
            </p>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_42%,rgba(0,0,0,0.36))] opacity-90 transition group-hover:opacity-100" />
        <div className="absolute left-5 top-5 flex items-center gap-3">
          <span className="rounded-full border border-white/12 bg-black/18 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-white/70">
            {String(index + 1).padStart(2, "0")}
          </span>
        </div>

        <div className="absolute inset-x-5 bottom-5">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--kuns-orange)]">
            Represented Artist
          </p>
          <p className="mt-3 text-[1.8rem] leading-[1] tracking-[-0.055em] text-[var(--foreground)] transition group-hover:text-[var(--kuns-orange)]">
            {artist.name}
          </p>
        </div>
      </div>

      <div className="space-y-4 p-5">
        {artist.nameKo ? (
          <p className="text-sm text-white/46">{artist.nameKo}</p>
        ) : null}

        {artist.tagline ? (
          <p className="text-[14px] leading-7 text-white/60">{artist.tagline}</p>
        ) : (
          <p className="text-[14px] leading-7 text-white/60">
            Selected artist archive entry.
          </p>
        )}

        <div className="flex items-center justify-between pt-1 text-[11px] uppercase tracking-[0.22em] text-white/34">
          <span>{artist.location ?? "Seoul, Korea"}</span>
          <span className="transition duration-300 group-hover:translate-x-1 group-hover:text-[var(--kuns-orange)]">
            View
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function FeaturedArtistsPreview() {
  const [artists, setArtists] = useState<PublicArtistCard[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    void getPublicRepresentedArtists()
      .then((firestoreArtists) => {
        if (cancelled) {
          return;
        }

        const next =
          buildPublicArtistCollections(firestoreArtists).representedArtists.slice(
            0,
            4
          );

        setArtists(next);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        const fallback = buildPublicArtistCollections([]).representedArtists.slice(
          0,
          4
        );

        setArtists(fallback);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!artists) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <FeaturedArtistCardSkeleton key={`featured-artist-skeleton-${index}`} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {artists.map((artist, index) => (
        <FeaturedArtistCard key={`${artist.slug}-${artist.profileImage?.trim() || "no-profile"}`} artist={artist} index={index} />
      ))}
    </div>
  );
}
