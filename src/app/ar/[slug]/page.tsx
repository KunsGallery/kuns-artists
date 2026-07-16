import type { Metadata } from "next";
import { getArtistBySlug } from "@/data/artists";
import { getWorkBySlug as getStaticWorkBySlug } from "@/data/works";
import PublicArWorkPage from "@/components/public/PublicArWorkPage";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const work = getStaticWorkBySlug(slug);
  const artist = work ? getArtistBySlug(work.artistSlug) : undefined;
  const title = work ? `${work.title} | AR` : "AR | KÜN’S Gallery";
  const description =
    (work ? `View ${work.title} by ${artist?.name ?? work.artistName} in the mobile AR viewing room.` : "") ||
    work?.description ||
    work?.medium ||
    "Mobile-first AR viewing room for KÜN’S Gallery artwork.";
  const image = work?.coverImage ?? work?.coverImageUrl;

  return {
    title,
    description,
    alternates: {
      canonical: work ? `/ar/${work.slug}` : "/ar",
    },
    robots: {
      index: false,
      follow: true,
    },
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

export default async function ArWorkPage({ params }: PageProps) {
  const { slug } = await params;

  return <PublicArWorkPage slug={slug} />;
}
