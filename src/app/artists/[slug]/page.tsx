import Link from "next/link";
import { notFound } from "next/navigation";
import { getArtistBySlug } from "@/data/artists";
import { works } from "@/data/works";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function ArchiveSection({
  title,
  items,
}: {
  title: string;
  items?: {
    title: string;
    subtitle?: string;
    image?: string;
    href?: string;
  }[];
}) {
  if (!items || items.length === 0) return null;

  return (
    <section className="border-t border-black/5 py-10 md:py-14">
      <div className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
          Archive
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-neutral-950 md:text-5xl">
          {title}
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item, index) => {
          const content = (
            <div className="group overflow-hidden rounded-[1.6rem] border border-black/8 bg-white transition hover:-translate-y-0.5 hover:border-black/15 hover:shadow-[0_24px_60px_rgba(0,0,0,0.05)]">
              <div className="overflow-hidden bg-[#ece8df]">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.title}
                    className="h-[240px] w-full object-cover transition group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="flex h-[240px] items-center justify-center text-sm text-neutral-400">
                    No Image
                  </div>
                )}
              </div>

              <div className="p-5">
                <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-3 text-[1.3rem] font-medium tracking-[-0.03em] text-neutral-950">
                  {item.title}
                </h3>
                {item.subtitle ? (
                  <p className="mt-2 text-sm text-neutral-500">{item.subtitle}</p>
                ) : null}
              </div>
            </div>
          );

          if (item.href) {
            return (
              <a key={`${title}-${index}`} href={item.href} target="_blank" rel="noreferrer">
                {content}
              </a>
            );
          }

          return <div key={`${title}-${index}`}>{content}</div>;
        })}
      </div>
    </section>
  );
}

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

            <div className="flex items-center gap-2 md:gap-3">
              <Link
                href="/artists"
                className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm"
              >
                Artists
              </Link>
            </div>
          </header>

          <div className="py-10 md:py-12">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
                  Represented Artist
                </p>
                <h1 className="mt-4 text-5xl font-semibold tracking-[-0.045em] text-neutral-950 md:text-7xl md:leading-[0.95]">
                  {artist.name}
                </h1>
                {artist.nameKo ? (
                  <p className="mt-3 text-lg text-neutral-500">{artist.nameKo}</p>
                ) : null}
              </div>

              <Link
                href="/artists"
                className="hidden text-sm text-neutral-500 underline underline-offset-4 transition hover:text-neutral-900 md:block"
              >
                Back to artists
              </Link>
            </div>
          </div>

          <div className="border-t border-black/5 py-8 md:py-10">
            <div className="grid gap-4 md:grid-cols-4">
              {artistWorks.length > 0 ? (
                artistWorks.slice(0, 4).map((work, index) => (
                  <Link
                    key={work.slug}
                    href={`/ar/${work.slug}`}
                    className="group overflow-hidden rounded-[1.6rem] border border-black/8 bg-white transition hover:-translate-y-0.5 hover:border-black/15 hover:shadow-[0_24px_60px_rgba(0,0,0,0.05)]"
                  >
                    <div className="overflow-hidden bg-[#ece8df]">
                      {work.coverImage ? (
                        <img
                          src={work.coverImage}
                          alt={work.title}
                          className="h-[250px] w-full object-cover transition group-hover:scale-[1.02]"
                        />
                      ) : (
                        <div className="flex h-[250px] items-center justify-center text-sm text-neutral-400">
                          No Image
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                        Selected Artwork
                      </p>
                      <h3 className="mt-3 text-base font-medium tracking-[-0.02em] text-neutral-950">
                        {work.title}
                      </h3>
                      <p className="mt-2 text-sm text-neutral-500">
                        {index + 1}/{artistWorks.length}
                      </p>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="col-span-full rounded-[1.6rem] border border-dashed border-black/10 bg-white px-6 py-10 text-sm text-neutral-600">
                  아직 연결된 작품이 없습니다.
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-10 border-t border-black/5 py-10 md:grid-cols-[280px_minmax(0,1fr)] md:py-14">
            <aside className="space-y-6">
              <div className="overflow-hidden rounded-[1.75rem] bg-[#ece8df]">
                {artist.profileImage ? (
                  <img
                    src={artist.profileImage}
                    alt={artist.name}
                    className="h-[360px] w-full object-cover"
                  />
                ) : (
                  <div className="flex h-[360px] items-center justify-center text-sm text-neutral-400">
                    No Image
                  </div>
                )}
              </div>

              {artist.location ? (
                <div>
                  <p className="text-xl font-medium tracking-[-0.03em] text-neutral-950">
                    {artist.location}
                  </p>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {artist.links?.instagram ? (
                  <a
                    href={artist.links.instagram}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center rounded-full border border-black/10 bg-white px-4 text-sm text-neutral-800 transition hover:border-black/20"
                  >
                    Instagram
                  </a>
                ) : null}
                {artist.links?.youtube ? (
                  <a
                    href={artist.links.youtube}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center rounded-full border border-black/10 bg-white px-4 text-sm text-neutral-800 transition hover:border-black/20"
                  >
                    YouTube
                  </a>
                ) : null}
                {artist.links?.cv ? (
                  <a
                    href={artist.links.cv}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center rounded-full border border-black/10 bg-white px-4 text-sm text-neutral-800 transition hover:border-black/20"
                  >
                    CV
                  </a>
                ) : null}
                {artist.links?.artsy ? (
                  <a
                    href={artist.links.artsy}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center rounded-full border border-black/10 bg-white px-4 text-sm text-neutral-800 transition hover:border-black/20"
                  >
                    Artsy
                  </a>
                ) : null}
              </div>
            </aside>

            <div className="min-w-0">
              {artist.bio ? (
                <div className="max-w-4xl">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
                    Korean Text
                  </p>
                  <div className="mt-5 space-y-5 text-[15px] leading-8 text-neutral-700 md:text-[17px]">
                    {artist.bio.split("\n").map((paragraph, index) => (
                      <p key={`ko-${index}`}>{paragraph}</p>
                    ))}
                  </div>
                </div>
              ) : null}

              {artist.bioEn ? (
                <div className="mt-12 max-w-4xl">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
                    English Text
                  </p>
                  <div className="mt-5 space-y-5 text-[15px] leading-8 text-neutral-700 md:text-[17px]">
                    {artist.bioEn.split("\n").map((paragraph, index) => (
                      <p key={`en-${index}`}>{paragraph}</p>
                    ))}
                  </div>
                </div>
              ) : null}

              {artistWorks.length > 0 ? (
                <div className="mt-12 flex flex-wrap gap-3">
                  {artistWorks.map((work) => (
                    <Link
                      key={work.slug}
                      href={`/ar/${work.slug}`}
                      className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm"
                    >
                      {work.title}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <ArchiveSection title="Exhibitions" items={artist.archives?.exhibitions} />
          <ArchiveSection title="Art Fairs" items={artist.archives?.fairs} />
          <ArchiveSection title="Texts" items={artist.archives?.texts} />
          <ArchiveSection title="Media" items={artist.archives?.media} />
        </div>
      </section>
    </main>
  );
}