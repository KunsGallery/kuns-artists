import Link from "next/link";
import { getRepresentedArtists } from "@/data/artists";

const representedArtists = getRepresentedArtists();

export default function ArtistsPage() {
  return (
    <main className="min-h-screen bg-[#f5f3ee] text-neutral-950">
      <section className="border-b border-black/5">
        <div className="mx-auto max-w-7xl px-5 py-6 md:px-8 md:py-8">
          <header className="flex items-center justify-between">
            <Link
              href="/"
              className="text-[11px] uppercase tracking-[0.28em] text-neutral-500"
            >
              KÜN’S GALLERY
            </Link>

            <Link
              href="/"
              className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm"
            >
              Home
            </Link>
          </header>

          <div className="grid gap-10 py-12 md:grid-cols-[0.95fr_1.05fr] md:items-end md:py-16">
            <div className="max-w-3xl">
              <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
                Artists
              </p>
              <h1 className="mt-5 text-5xl font-semibold tracking-[-0.045em] text-neutral-950 md:text-7xl md:leading-[0.95]">
                The artists
                <br />
                represented by
                <br />
                KÜN’S Gallery.
              </h1>
            </div>

            <div className="max-w-xl md:justify-self-end">
              <p className="text-sm leading-7 text-neutral-600 md:text-[15px]">
                현재 쿤스의 전속 작가 페이지는 작품, 작가 소개, 텍스트, 미디어와
                같은 아카이브를 중심으로 구성되어 있습니다. 새 시스템에서도 그
                감도는 유지하되, 작품별 AR 진입과 관리 구조가 자연스럽게 이어지도록
                설계합니다.
              </p>
            </div>
          </div>

          <div className="border-t border-black/5 py-8 md:py-10">
            <div className="space-y-4">
              {representedArtists.map((artist, index) => (
                <Link
                  key={artist.slug}
                  href={`/artists/${artist.slug}`}
                  className="group grid gap-5 rounded-[1.9rem] border border-black/8 bg-white p-5 transition hover:-translate-y-0.5 hover:border-black/15 hover:shadow-[0_24px_60px_rgba(0,0,0,0.05)] md:grid-cols-[180px_minmax(0,1fr)_120px] md:items-center md:p-6"
                >
                  <div className="overflow-hidden rounded-[1.35rem] bg-[#ece8df]">
                    {artist.profileImage ? (
                      <img
                        src={artist.profileImage}
                        alt={artist.name}
                        className="h-[180px] w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-[180px] items-center justify-center text-sm text-neutral-400">
                        No Image
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <h2 className="mt-3 text-[1.9rem] font-medium tracking-[-0.04em] text-neutral-950 md:text-[2.35rem]">
                      {artist.name}
                    </h2>
                    {artist.nameKo ? (
                      <p className="mt-2 text-sm text-neutral-500">
                        {artist.nameKo}
                      </p>
                    ) : null}
                    {artist.tagline ? (
                      <p className="mt-5 max-w-2xl text-sm leading-7 text-neutral-600">
                        {artist.tagline}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-end justify-between md:block md:text-right">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                      View Artist
                    </p>
                    <span className="mt-4 inline-flex h-11 items-center rounded-full border border-black/10 px-5 text-sm text-neutral-800 transition group-hover:border-black/20 group-hover:bg-[#f7f6f2]">
                      Enter
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}