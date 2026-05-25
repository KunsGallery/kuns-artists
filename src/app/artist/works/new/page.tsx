import Link from "next/link";
import LogoutButton from "@/components/auth/LogoutButton";
import ArtistWorkEditor from "@/components/artist/ArtistWorkEditor";

export default function NewArtistWorkPage() {
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

            <LogoutButton className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm">
              로그아웃
            </LogoutButton>
          </div>
        </header>

        <section className="grid gap-8 py-12 md:grid-cols-[1.05fr_0.95fr] md:items-end md:py-16">
          <div className="max-w-4xl">
            <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
              작품 등록
            </p>

            <h1 className="mt-5 text-5xl font-semibold tracking-[-0.04em] text-neutral-950 md:text-7xl md:leading-[0.95]">
              새 작품 등록
            </h1>

            <p className="mt-8 max-w-2xl text-sm leading-7 text-neutral-600 md:text-[15px]">
              작품 이미지와 기본 정보를 입력하면 갤러리 검수 후 공개 작가
              페이지에 반영됩니다.
            </p>
          </div>

          <aside className="rounded-[2rem] border border-black/10 bg-white/85 p-5 backdrop-blur-sm md:p-6">
            <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
              안내
            </p>
            <p className="mt-4 text-sm leading-7 text-neutral-600">
              먼저 대표 이미지를 정리해두면 입력 흐름이 훨씬 매끄럽습니다.
              저장 후에는 검수 과정을 거쳐 공개 작가 페이지에 반영됩니다.
            </p>
          </aside>
        </section>

        <ArtistWorkEditor mode="new" />
      </div>
    </main>
  );
}
