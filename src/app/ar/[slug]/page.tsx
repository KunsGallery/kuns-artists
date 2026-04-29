import Link from "next/link";
import { notFound } from "next/navigation";
import DeviceRedirect from "@/components/ar/DeviceRedirect";
import { getArtistBySlug } from "@/data/artists";
import { getWorkBySlug as getStaticWorkBySlug } from "@/data/works";
import {
  getPublicWorkBySlug,
  resolveArtistWorkSlug,
  type ArtistWorkDoc,
} from "@/lib/firebase/firestore";
import type { Work } from "@/types/work";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function mapPublicWork(
  firestoreWork?: ArtistWorkDoc | null,
  fallbackWork?: Work
): Work | null {
  const slug = firestoreWork
    ? resolveArtistWorkSlug(firestoreWork)
    : fallbackWork?.slug ?? "";
  const artistSlug = firestoreWork?.artistSlug ?? fallbackWork?.artistSlug ?? "";
  const artistName =
    firestoreWork?.artistName ?? fallbackWork?.artistName ?? "";
  const title = firestoreWork?.title ?? fallbackWork?.title ?? "";

  if (!slug || !artistSlug || !artistName || !title) {
    return null;
  }

  return {
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

export default async function ArWorkPage({ params }: PageProps) {
  const { slug } = await params;
  const staticWork = getStaticWorkBySlug(slug);

  let firestoreWork: ArtistWorkDoc | null = null;

  try {
    firestoreWork = await getPublicWorkBySlug(slug);
  } catch {
    firestoreWork = null;
  }

  const work = mapPublicWork(firestoreWork, staticWork);

  if (!work) {
    notFound();
  }

  const artist = getArtistBySlug(work.artistSlug);

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
              {work.artistSlug ? (
                <Link
                  href={`/artists/${work.artistSlug}`}
                  className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm"
                >
                  Artist
                </Link>
              ) : null}

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
                AR Viewing Page
              </p>

              <h1 className="mt-5 text-5xl font-semibold tracking-[-0.04em] text-neutral-950 md:text-7xl md:leading-[0.95]">
                {work.title}
              </h1>

              <p className="mt-4 text-lg text-neutral-500 md:text-xl">
                {work.artistName}
              </p>

              <div className="mt-8 space-y-2 text-sm text-neutral-600 md:text-[15px]">
                {work.year ? <p>Year · {work.year}</p> : null}
                {work.medium ? <p>Medium · {work.medium}</p> : null}
                {work.dimensions ? <p>Size · {work.dimensions}</p> : null}
              </div>

              {work.description ? (
                <p className="mt-8 max-w-2xl text-base leading-8 text-neutral-700 md:text-[17px]">
                  {work.description}
                </p>
              ) : null}
            </div>

            <div className="flex justify-start md:justify-end">
              <div className="w-full max-w-[420px] rounded-[2rem] border border-black/10 bg-white/80 p-5 backdrop-blur-sm md:p-6">
                <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
                  Access
                </p>

                <div className="mt-5 space-y-4">
                  <div className="rounded-[1.5rem] bg-[#f7f6f2] px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                      Desktop
                    </p>
                    <p className="mt-2 text-sm leading-6 text-neutral-600">
                      Preview
                      <br />
                      QR access
                    </p>
                  </div>

                  <div className="rounded-[1.5rem] bg-[#f7f6f2] px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                      Mobile
                    </p>
                    <p className="mt-2 text-sm leading-6 text-neutral-600">
                      AR launch
                      <br />
                      device-based flow
                    </p>
                  </div>

                  <div className="rounded-[1.5rem] bg-[#f7f6f2] px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                      Artist
                    </p>
                    <p className="mt-2 text-sm leading-6 text-neutral-600">
                      {artist ? artist.name : work.artistName}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-black/5 py-8 md:py-10">
            <DeviceRedirect work={work} />
          </div>
        </div>
      </section>
    </main>
  );
}
