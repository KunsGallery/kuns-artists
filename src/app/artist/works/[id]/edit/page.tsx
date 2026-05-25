import Link from "next/link";
import LogoutButton from "@/components/auth/LogoutButton";
import ArtistWorkEditor from "@/components/artist/ArtistWorkEditor";

type EditArtistWorkPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditArtistWorkPage({
  params,
}: EditArtistWorkPageProps) {
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
              href="/artist/dashboard"
              className="inline-flex h-11 items-center rounded-full border border-black/10 bg-[#faf8f3] px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm"
            >
              대시보드
            </Link>

            <Link
              href="/artist/works"
              className="inline-flex h-11 items-center rounded-full border border-black/10 bg-[#faf8f3] px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm"
            >
              작품 목록으로 돌아가기
            </Link>

            <Link
              href={`/artist/works/${shareTarget}/share`}
              className="inline-flex h-11 items-center rounded-full border border-black/10 bg-[#faf8f3] px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm"
            >
              공유 카드 만들기
            </Link>

            <LogoutButton className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm">
              로그아웃
            </LogoutButton>
          </div>
        </header>

        <section className="grid gap-8 py-12 md:grid-cols-[1.05fr_0.95fr] md:items-end md:py-16">
          <div className="max-w-4xl">
            <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
              작품 정보 수정
            </p>

            <h1 className="mt-5 text-5xl font-semibold tracking-[-0.04em] text-neutral-950 md:text-7xl md:leading-[0.95]">
              작품 정보 수정
            </h1>

            <p className="mt-8 max-w-2xl text-sm leading-7 text-neutral-600 md:text-[15px]">
              등록한 작품의 이미지와 정보를 수정할 수 있습니다. 공개 여부는
              갤러리 검수 후 반영됩니다.
            </p>
          </div>

          <aside className="rounded-[2rem] border border-black/10 bg-white/85 p-5 backdrop-blur-sm md:p-6">
            <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
              안내
            </p>
            <p className="mt-4 text-sm leading-7 text-neutral-600">
              현재 상태는 오른쪽 미리보기 카드에서 함께 확인할 수 있습니다.
              공개 상태는 작가가 직접 바꾸지 않고, 갤러리 검수 흐름에 따라
              반영됩니다.
            </p>
          </aside>
        </section>

        <ArtistWorkEditor mode="edit" workId={id} />
      </div>
    </main>
  );
}
