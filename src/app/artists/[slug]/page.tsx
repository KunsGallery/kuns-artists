import type { Metadata } from "next";
import { getArtistBySlug } from "@/data/artists";
import PublicArtistDetail from "@/components/public/PublicArtistDetail";
import { getPublicArtistBySlug } from "@/lib/firebase/firestore";
import { resolveProfileImageUrl } from "@/lib/artistCatalog";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const staticArtist = getArtistBySlug(slug);
  const firestoreArtist = await getPublicArtistBySlug(slug).catch(() => null);
  const artistName = firestoreArtist?.name ?? staticArtist?.name;
  const artistTagline = firestoreArtist?.tagline ?? staticArtist?.tagline;
  const artistBio = firestoreArtist?.bio ?? staticArtist?.bio;
  const profileImage = resolveProfileImageUrl(firestoreArtist, staticArtist);
  const title = artistName ? `${artistName} | Artist Archive` : "Artist Archive";
  const description =
    artistTagline ||
    artistBio ||
    "Official artist archive pages, selected works, and exhibition records for KÜN’S Gallery.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      images: profileImage ? [profileImage] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: profileImage ? [profileImage] : undefined,
    },
  };
}

export default async function ArtistDetailPage({ params }: PageProps) {
  const { slug } = await params;

  return <PublicArtistDetail slug={slug} />;
}
