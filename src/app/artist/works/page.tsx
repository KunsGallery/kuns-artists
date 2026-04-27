import Link from "next/link";

export default function ArtistWorksPage() {
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
            href="/artist/dashboard"
            className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm"
          >
            Dashboard
          </Link>
        </header>

        <section className="py-12 md:py-16">
          <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
            Artist Works
          </p>

          <h1 className="mt-5 text-5xl font-semibold tracking-[-0.04em] text-neutral-950 md:text-7xl md:leading-[0.95]">
            Manage
            <br />
            your works.
          </h1>

          <p className="mt-8 max-w-xl text-sm leading-7 text-neutral-600 md:text-[15px]">
            작가가 본인의 작품 정보를 등록하고 수정하는 페이지입니다.
          </p>
        </section>

        <section className="grid gap-4 border-t border-black/5 py-8 md:grid-cols-2">
          <Link
            href="/artist/works/new"
            className="rounded-[1.5rem] bg-white px-5 py-5 transition hover:-translate-y-0.5 hover:shadow-sm"
          >
            <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
              New Work
            </p>
            <h2 className="mt-3 text-xl font-medium tracking-[-0.03em] text-neutral-950">
              새 작품 등록
            </h2>
            <p className="mt-3 text-sm leading-6 text-neutral-600">
              작품명, 연도, 재료, 사이즈, 이미지 URL을 입력합니다.
            </p>
          </Link>

          <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white px-5 py-5 text-sm leading-7 text-neutral-600">
            작품 목록 기능은 Firestore 연결 후 확장할 예정입니다.
          </div>
        </section>
      </div>
    </main>
  );
}