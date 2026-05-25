import PublicArtistDetail from "@/components/public/PublicArtistDetail";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ArtistDetailPage({ params }: PageProps) {
  const { slug } = await params;

  return <PublicArtistDetail slug={slug} />;
}
