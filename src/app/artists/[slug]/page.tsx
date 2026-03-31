import Link from "next/link";
import { notFound } from "next/navigation";
import { getArtistBySlug } from "@/data/artists";
import { works } from "@/data/works";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ArtistDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const artist = getArtistBySlug(slug);

  if (!artist || artist.type !== "represented") {
    notFound();
  }

  const artistWorks = works.filter((work) => work.artistSlug === artist.slug);

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

            <nav className="flex items-center gap-2 md:gap-3">
              <Link
                href="/artists"
                className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm"
              >
                Artists
              </Link>
            </nav>
          </header>

          <div className="grid gap-12 py-12 md:grid-cols-[1.08fr_0.92fr] md:items-end md:py-16">
            <div className="max-w-4xl">
              <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
                Represented Artist
              </p>

              <h1 className="mt-5 text-5xl font-semibold tracking-[-0.04em] text-neutral-950 md:text-7xl md:leading-[0.95]">
                {artist.name}
              </h1>

              {artist.nameKo ? (
                <p className="mt-4 text-lg text-neutral-500 md:text-xl">
                  {artist.nameKo}
                </p>
              ) : null}

              {artist.tagline ? (
                <p className="mt-8 max-w-2xl text-base leading-8 text-neutral-700 md:text-[17px]">
                  {artist.tagline}
                </p>
              ) : null}
            </div>

            <div className="flex justify-start md:justify-end">
              <div className="w-full max-w-[420px] rounded-[2rem] border border-black/10 bg-white/80 p-5 backdrop-blur-sm md:p-6">
                <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
                  Overview
                </p>

                <div className="mt-5 space-y-4">
                  <div className="rounded-[1.5rem] bg-[#f7f6f2] px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                      Type
                    </p>
                    <p className="mt-2 text-sm leading-6 text-neutral-600">
                      KÜN’S Gallery
                      <br />
                      represented artist
                    </p>
                  </div>

                  <div className="rounded-[1.5rem] bg-[#f7f6f2] px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                      Works
                    </p>
                    <p className="mt-2 text-2xl font-medium tracking-[-0.03em] text-neutral-950">
                      {artistWorks.length}
                    </p>
                  </div>

                  <div className="rounded-[1.5rem] bg-[#f7f6f2] px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                      Access
                    </p>
                    <p className="mt-2 text-sm leading-6 text-neutral-600">
                      Artist detail
                      <br />
                      Work detail
                      <br />
                      AR experience
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {artist.bio ? (
            <div className="border-t border-black/5 py-8 md:py-10">
              <div className="max-w-3xl">
                <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
                  Biography
                </p>
                <p className="mt-5 text-sm leading-8 text-neutral-600 md:text-[15px]">
                  {artist.bio}
                </p>
              </div>
            </div>
          ) : null}

          <div className="border-t border-black/5 py-8 md:py-10">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
                  Works
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-neutral-950 md:text-5xl">
                  Selected works
                </h2>
              </div>

              <Link
                href="/artists"
                className="text-sm text-neutral-500 underline underline-offset-4 transition hover:text-neutral-900"
              >
                전체 아티스트 보기
              </Link>
            </div>

            {artistWorks.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {artistWorks.map((work, index) => (
                  <Link
                    key={work.slug}
                    href={`/ar/${work.slug}`}
                    className="group rounded-[1.75rem] border border-black/8 bg-white p-6 transition hover:-translate-y-0.5 hover:border-black/15 hover:shadow-[0_20px_50px_rgba(0,0,0,0.04)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                          {String(index + 1).padStart(2, "0")}
                        </p>
                        <h3 className="mt-3 text-[1.5rem] font-medium tracking-[-0.03em] text-neutral-950 md:text-[1.7rem]">
                          {work.title}
                        </h3>
                      </div>

                      <span className="mt-1 text-sm text-neutral-400 transition group-hover:translate-x-0.5 group-hover:text-neutral-700">
                        View
                      </span>
                    </div>

                    <div className="mt-8 space-y-2 text-sm text-neutral-600">
                      {work.year ? <p>Year · {work.year}</p> : null}
                      {work.medium ? <p>Medium · {work.medium}</p> : null}
                      {work.dimensions ? <p>Size · {work.dimensions}</p> : null}
                    </div>

                    {work.description ? (
                      <p className="mt-6 text-sm leading-7 text-neutral-600">
                        {work.description}
                      </p>
                    ) : null}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-[1.75rem] border border-dashed border-black/10 bg-white px-6 py-8 text-sm leading-7 text-neutral-600">
                아직 연결된 작품이 없습니다. 작품 데이터가 추가되면 이 영역에
                자동으로 표시됩니다.
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}