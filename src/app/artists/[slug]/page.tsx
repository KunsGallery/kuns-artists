import type { Metadata } from "next";
import { getArtistBySlug } from "@/data/artists";
import PublicArtistDetail from "@/components/public/PublicArtistDetail";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const artist = getArtistBySlug(slug);
  const title = artist ? `${artist.name} | Artist Archive` : "Artist Archive";
  const description =
    artist?.tagline ||
    artist?.bio ||
    "Official artist archive pages, selected works, and exhibition records for KÜN’S Gallery.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      images: artist?.profileImage ? [artist.profileImage] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: artist?.profileImage ? [artist.profileImage] : undefined,
    },
  };
}

export default async function ArtistDetailPage({ params }: PageProps) {
  const { slug } = await params;

  return <PublicArtistDetail slug={slug} />;
}
