import type { Metadata } from "next";
import PublicWorkDetailPage from "@/components/public/PublicWorkDetailPage";

export const metadata: Metadata = {
  title: "Artwork | KÜN’S Gallery",
};

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function WorkDetailPage({ params }: PageProps) {
  const { slug } = await params;

  return <PublicWorkDetailPage slug={slug} />;
}
