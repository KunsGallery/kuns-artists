import type { Metadata } from "next";
import { getArtistBySlug } from "@/data/artists";
import { getWorkBySlug as getStaticWorkBySlug } from "@/data/works";
import PublicWorkDetailPage from "@/components/public/PublicWorkDetailPage";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const work = getStaticWorkBySlug(slug);
  const artist = work ? getArtistBySlug(work.artistSlug) : undefined;
  const title = work
    ? `${work.title} | ${artist?.name ?? work.artistName} | Artwork`
    : "Artwork | KÜN’S Gallery";
  const description =
    work?.description ||
    work?.medium ||
    "Official artwork detail page for KÜN’S Gallery selected works.";
  const image = work?.coverImage ?? work?.coverImageUrl;

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
