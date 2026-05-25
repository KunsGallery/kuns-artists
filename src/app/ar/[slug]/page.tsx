import PublicArWorkPage from "@/components/public/PublicArWorkPage";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ArWorkPage({ params }: PageProps) {
  const { slug } = await params;

  return <PublicArWorkPage slug={slug} />;
}
