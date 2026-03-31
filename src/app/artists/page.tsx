import Link from "next/link";
import { artists } from "@/data/artists";

const representedArtists = [...artists]
  .filter((artist) => artist.type === "represented")
  .sort((a, b) => a.name.localeCompare(b.name));

function ArtistCard({
  slug,
  name,
  nameKo,
  tagline,
  index,
}: {
  slug: string;
  name: string;
  nameKo?: string;
  tagline?: string;
  index: number;
}) {
  return (
    <Link
      href={`/artists/${slug}`}
      className="group rounded-[1.75rem] border border-black/8 bg-white p-6 transition hover:-translate-y-0.5 hover:border-black/15 hover:shadow-[0_20px_50px_rgba(0,0,0,0.04)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
            {String(index + 1).padStart(2, "0")}
          </p>
          <h2 className="mt-3 text-[1.6rem] font-medium tracking-[-0.03em] text-neutral-950 md:text-[1.8rem]">
            {name}
          </h2>
          {nameKo ? (
            <p className="mt-2 text-sm text-neutral-500">{nameKo}</p>
          ) : null}
        </div>

        <span className="mt-1 text-sm text-neutral-400 transition group-hover:translate-x-0.5 group-hover:text-neutral-700">
          View
        </span>
      </div>

      {tagline ? (
        <p className="mt-8 max-w-[32rem] text-sm leading-7 text-neutral-600">
          {tagline}
        </p>
      ) : null}
    </Link>
  );
}

export default function ArtistsPage() {
  return (
    <main className="min-h-screen bg-[#f5f3ee] text-neutral-950">
      <section className="border-b border-black/5">
        <div className="mx-auto max-w-7xl px-5 py-6 md:px-8 md:py-8">
          <header className="flex items-center justify-between">
            <Link href="/" className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
              KÜN’S GALLERY
            </Link>

            <nav className="flex items-center gap-2 md:gap-3">
              <Link
                href="/"
                className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm"
              >
                Home
              </Link>
            </nav>
          </header>

          <div className="grid gap-12 py-12 md:grid-cols-[1.1fr_0.9fr] md:items-end md:py-16">
            <div className="max-w-4xl">
              <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
                Represented Artists
              </p>

              <h1 className="mt-5 text-5xl font-semibold tracking-[-0.04em] text-neutral-950 md:text-7xl md:leading-[0.95]">
                The artists
                <br />
                at KÜN’S
                <br />
                Gallery.
              </h1>

              <p className="mt-8 max-w-xl text-sm leading-7 text-neutral-600 md:text-[15px]">
                KÜN’S GALLERY의 전속 작가를 한 곳에서 볼 수 있는 페이지입니다.
                각 작가의 상세 페이지를 통해 소개와 작품, 그리고 AR 진입 구조까지
                순차적으로 연결됩니다.
              </p>
            </div>

            <div className="flex justify-start md:justify-end">
              <div className="w-full max-w-[420px] rounded-[2rem] border border-black/10 bg-white/80 p-5 backdrop-blur-sm md:p-6">
                <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
                  Overview
                </p>

                <div className="mt-5 space-y-4">
                  <div className="rounded-[1.5rem] bg-[#f7f6f2] px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                      Count
                    </p>
                    <p className="mt-2 text-2xl font-medium tracking-[-0.03em] text-neutral-950">
                      {representedArtists.length}
                    </p>
                  </div>

                  <div className="rounded-[1.5rem] bg-[#f7f6f2] px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                      Order
                    </p>
                    <p className="mt-2 text-sm leading-6 text-neutral-600">
                      English name
                      <br />
                      alphabetical order
                    </p>
                  </div>

                  <div className="rounded-[1.5rem] bg-[#f7f6f2] px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                      Structure
                    </p>
                    <p className="mt-2 text-sm leading-6 text-neutral-600">
                      Artist detail
                      <br />
                      Work detail
                      <br />
                      AR access
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 pb-10 md:grid-cols-2 xl:grid-cols-2">
            {representedArtists.map((artist, index) => (
              <ArtistCard
                key={artist.slug}
                slug={artist.slug}
                name={artist.name}
                nameKo={artist.nameKo}
                tagline={artist.tagline}
                index={index}
              />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}