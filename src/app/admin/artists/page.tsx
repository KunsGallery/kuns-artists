import Link from "next/link";

export default function AdminArtistsPage() {
  return (
    <main className="min-h-screen bg-[#f5f3ee] text-neutral-950">
      <div className="mx-auto max-w-7xl px-5 py-6 md:px-8 md:py-8">
        <header className="flex items-center justify-between">
          <Link
            href="/"
            className="text-[11px] uppercase tracking-[0.28em] text-neutral-500"
          >
            KÜN’S GALLERY
          </Link>

          <Link
            href="/admin"
            className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm"
          >
            Admin
          </Link>
        </header>

        <section className="py-12 md:py-16">
          <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
            Admin Artists
          </p>

          <h1 className="mt-5 text-5xl font-semibold tracking-[-0.04em] text-neutral-950 md:text-7xl md:leading-[0.95]">
            Artist
            <br />
            management.
          </h1>

          <p className="mt-8 max-w-xl text-sm leading-7 text-neutral-600 md:text-[15px]">
            전체 작가 계정, 프로필, 권한, 공개 상태를 관리하는 관리자 페이지입니다.
          </p>
        </section>

        <section className="rounded-[1.5rem] border border-dashed border-black/10 bg-white px-6 py-8 text-sm leading-7 text-neutral-600">
          아직 관리자 작가 관리 기능은 준비 중입니다.
        </section>
      </div>
    </main>
  );
}