import Link from "next/link";
import LogoutButton from "@/components/auth/LogoutButton";
import ArtistWorkEditor from "@/components/artist/ArtistWorkEditor";

export default function NewArtistWorkPage() {
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

          <div className="flex items-center gap-2 md:gap-3">
            <Link
              href="/artist/works"
              className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm"
            >
              Works
            </Link>

            <LogoutButton className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm">
              Logout
            </LogoutButton>
          </div>
        </header>

        <section className="py-12 md:py-16">
          <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
            New Work
          </p>

          <h1 className="mt-5 text-5xl font-semibold tracking-[-0.04em] text-neutral-950 md:text-7xl md:leading-[0.95]">
            Add a new
            <br />
            work.
          </h1>

          <p className="mt-8 max-w-2xl text-sm leading-7 text-neutral-600 md:text-[15px]">
            작품 정보를 입력하면 Firestore works 컬렉션에 새 문서를 만들고,
            같은 폼 값으로 캔버스형 GLB를 바로 다운로드할 수 있습니다.
          </p>
        </section>

        <ArtistWorkEditor mode="new" />
      </div>
    </main>
  );
}
