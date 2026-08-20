import type { Metadata } from "next";
import { getArtistBySlug } from "@/data/artists";
import { getWorkBySlug as getStaticWorkBySlug } from "@/data/works";
import PublicWorkDetailPage from "@/components/public/PublicWorkDetailPage";
import { getWorkBySlugForPublicRoute } from "@/lib/firebase/firestore";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const staticWork = getStaticWorkBySlug(slug);
  const firestoreResult = await getWorkBySlugForPublicRoute(slug).catch(
    () => null
  );
  const firestoreWork =
    firestoreResult?.work && !firestoreResult.unpublished
      ? firestoreResult.work
      : null;
  const work = firestoreWork ?? staticWork;
  const artistSlug = firestoreWork?.artistSlug ?? staticWork?.artistSlug;
  const artist = artistSlug ? getArtistBySlug(artistSlug) : undefined;
  const artistName = firestoreWork?.artistName ?? artist?.name ?? staticWork?.artistName;
  const title = work
    ? `${work.title} | ${artistName ?? "KÜN’S Gallery"} | Artwork`
    : "Artwork | KÜN’S Gallery";
  const description =
    work?.description ||
    work?.medium ||
    "Official artwork detail page for KÜN’S Gallery selected works.";
  const image = firestoreWork?.coverImageUrl ?? staticWork?.coverImage ?? staticWork?.coverImageUrl;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      images: image ? [image] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function WorkDetailPage({ params }: PageProps) {
  const { slug } = await params;

  return <PublicWorkDetailPage slug={slug} />;
}
