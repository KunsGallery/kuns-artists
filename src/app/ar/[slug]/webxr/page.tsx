import type { Metadata } from "next";
import { getArtistBySlug } from "@/data/artists";
import { getWorkBySlug as getStaticWorkBySlug } from "@/data/works";
import PublicArWebXrPage from "@/components/public/webxr/PublicArWebXrPage";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const work = getStaticWorkBySlug(slug);
  const artist = work ? getArtistBySlug(work.artistSlug) : undefined;
  const title = work ? `${work.title} | WebXR Beta` : "WebXR Beta | KÜN’S Gallery";
  const description =
    (work ? `Open ${work.title} by ${artist?.name ?? work.artistName} in the WebXR wall-placement beta.` : "") ||
    work?.description ||
    work?.medium ||
    "WebXR wall-placement beta for KÜN’S Gallery artwork.";
  const image = work?.coverImage ?? work?.coverImageUrl;

  return {
    title,
    description,
    alternates: {
      canonical: work ? `/ar/${work.slug}/webxr` : "/ar",
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

export default async function ArWebXrPage({ params }: PageProps) {
  const { slug } = await params;

  return <PublicArWebXrPage slug={slug} />;
}
