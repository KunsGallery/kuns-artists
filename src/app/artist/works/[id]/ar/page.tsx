import Link from "next/link";
import LogoutButton from "@/components/auth/LogoutButton";
import ArtistArV2RequestPanel from "@/components/artist/ArtistArV2RequestPanel";

type ArtistWorkArRequestPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ArtistWorkArRequestPage({
  params,
}: ArtistWorkArRequestPageProps) {
  const { id } = await params;
  const shareTarget = id.trim();

  return (
    <main className="theme-dark min-h-screen bg-[#f5f3ee] text-neutral-950">
      <div className="mx-auto max-w-7xl px-5 py-6 md:px-8 md:py-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Link
            href="/"
            className="text-[11px] uppercase tracking-[0.28em] text-neutral-500"
          >
            KÜN’S GALLERY
          </Link>

          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <Link
              href="/artist/works"
              className="inline-flex h-11 items-center rounded-full border border-black/10 bg-[#faf8f3] px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm"
            >
              작품 목록
            </Link>

            <Link
              href={`/artist/works/${shareTarget}/edit`}
              className="inline-flex h-11 items-center rounded-full border border-black/10 bg-[#faf8f3] px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm"
            >
              작품 정보 수정
            </Link>

            <Link
              href={`/artist/works/${shareTarget}/share`}
              className="inline-flex h-11 items-center rounded-full border border-black/10 bg-[#faf8f3] px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm"
            >
              공유 카드
            </Link>

            <LogoutButton className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm">
              로그아웃
            </LogoutButton>
          </div>
        </header>

        <section className="grid gap-8 py-12 md:grid-cols-[1.05fr_0.95fr] md:items-end md:py-16">
          <div className="max-w-4xl">
            <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
              AR 제작 요청
            </p>

            <h1 className="mt-5 text-5xl font-semibold tracking-[-0.04em] text-neutral-950 md:text-7xl md:leading-[0.95]">
              AR 제작
              <br />
              요청.
            </h1>

            <p className="mt-8 max-w-2xl text-sm leading-7 text-neutral-600 md:text-[15px]">
              작품 이미지와 실제 크기를 확인한 뒤 AR 제작을 요청하세요. 갤러리에서 실제 모델을 검수한 후 공개됩니다.
            </p>
          </div>

          <aside className="rounded-[2rem] border border-black/10 bg-white/85 p-5 backdrop-blur-sm md:p-6">
            <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
              요청 안내
            </p>
            <p className="mt-4 text-sm leading-7 text-neutral-600">
              작품을 저장한 뒤에는 이 화면에서 AR 설정을 확인하고 제작을 요청할 수 있습니다. 요청과 실제 모델 승인 단계는 분리되어 있습니다.
            </p>
          </aside>
        </section>

        <ArtistArV2RequestPanel workId={id} />
      </div>
    </main>
  );
}
