import Link from "next/link";
import { artists } from "@/data/artists";

const representedArtists = [...artists]
  .filter((artist) => artist.type === "represented")
  .sort((a, b) => a.name.localeCompare(b.name));

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f5f3ee] text-neutral-950">
      <section className="relative overflow-hidden border-b border-black/5">
        <div className="pointer-events-none absolute left-[-18rem] top-[-18rem] h-[36rem] w-[36rem] rounded-full bg-white/60 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-20rem] right-[-16rem] h-[40rem] w-[40rem] rounded-full bg-[#e9e2d6]/70 blur-3xl" />

        <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-5 py-6 md:px-8 md:py-8">
          <header className="flex items-center justify-between gap-4">
            <Link href="/" className="group inline-flex flex-col">
              <span className="text-[11px] uppercase tracking-[0.32em] text-neutral-500 transition group-hover:text-neutral-900">
                KÜN’S GALLERY
              </span>
              <span className="mt-1 hidden text-xs text-neutral-400 md:block">
                Artists · Archive · AR Viewing
              </span>
            </Link>

            <nav className="flex items-center gap-2 md:gap-3">
              <Link
                href="/artists"
                className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white/70 px-4 text-sm text-neutral-900 backdrop-blur-md transition hover:border-black/20 hover:bg-white hover:shadow-sm md:px-5"
              >
                Artists
              </Link>

              <Link
                href="/artist/login"
                className="inline-flex h-11 items-center rounded-full bg-neutral-950 px-4 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:opacity-90 hover:shadow-[0_14px_30px_rgba(0,0,0,0.12)] md:px-5"
              >
                <span className="hidden sm:inline">Artist Login</span>
                <span className="sm:hidden">Login</span>
              </Link>
            </nav>
          </header>

          <div className="grid flex-1 gap-10 py-12 md:grid-cols-[1.12fr_0.88fr] md:items-center md:py-16">
            <div className="max-w-4xl">
              <div className="inline-flex rounded-full border border-black/10 bg-white/60 px-4 py-2 backdrop-blur-md">
                <p className="text-[11px] uppercase tracking-[0.26em] text-neutral-500">
                  Digital Viewing System
                </p>
              </div>

              <h1 className="mt-7 text-[3.45rem] font-semibold leading-[0.92] tracking-[-0.065em] text-neutral-950 sm:text-6xl md:text-[5.6rem]">
                A new way
                <br />
                to place art
                <br />
                in space.
              </h1>

              <p className="mt-8 max-w-2xl text-[15px] leading-8 text-neutral-600 md:text-[16px]">
                KÜN’S GALLERY의 전속 작가를 위한 아카이브와 AR 기반 뷰잉
                시스템입니다. 작가 페이지에서 작품과 기록을 탐색하고, 작품별
                페이지에서 모바일 AR 경험으로 이어질 수 있도록 설계합니다.
              </p>

              <div className="mt-9 flex flex-wrap gap-3">
                <Link
                  href="/artists"
                  className="inline-flex h-12 items-center rounded-full bg-neutral-950 px-6 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:opacity-90 hover:shadow-[0_14px_30px_rgba(0,0,0,0.12)]"
                >
                  아티스트 보기
                </Link>

                <Link
                  href="/ar/jessup-choi-sample-01"
                  className="inline-flex h-12 items-center rounded-full border border-black/10 bg-white/80 px-6 text-sm font-medium text-neutral-900 backdrop-blur-md transition hover:-translate-y-0.5 hover:border-black/20 hover:bg-white hover:shadow-sm"
                >
                  AR 샘플 보기
                </Link>

                <Link
                  href="/artist/login"
                  className="inline-flex h-12 items-center rounded-full border border-black/10 bg-transparent px-6 text-sm font-medium text-neutral-700 transition hover:-translate-y-0.5 hover:border-black/20 hover:bg-white/70 hover:text-neutral-950"
                >
                  작가 로그인
                </Link>
              </div>
            </div>

            <aside className="flex justify-start md:justify-end">
              <div className="w-full max-w-[440px] rounded-[2.25rem] border border-black/10 bg-white/70 p-4 shadow-[0_30px_90px_rgba(0,0,0,0.05)] backdrop-blur-xl md:p-5">
                <div className="rounded-[1.75rem] bg-[#f7f6f2] px-5 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
                        Represented Artists
                      </p>
                      <p className="mt-3 text-sm leading-6 text-neutral-500">
                        Alphabetical order by English name
                      </p>
                    </div>

                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-sm font-medium text-neutral-700">
                      {representedArtists.length}
                    </div>
                  </div>
                </div>

                <div className="mt-3 space-y-2.5">
                  {representedArtists.map((artist, index) => (
                    <Link
                      key={artist.slug}
                      href={`/artists/${artist.slug}`}
                      className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-[1.55rem] border border-transparent bg-white/85 px-4 py-4 transition hover:-translate-y-0.5 hover:border-black/10 hover:bg-white hover:shadow-[0_18px_40px_rgba(0,0,0,0.04)]"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5f3ee] text-[11px] tracking-[0.16em] text-neutral-500">
                        {String(index + 1).padStart(2, "0")}
                      </div>

                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-medium tracking-[-0.025em] text-neutral-950">
                          {artist.name}
                        </h2>
                        {artist.nameKo ? (
                          <p className="mt-1 text-sm text-neutral-500">
                            {artist.nameKo}
                          </p>
                        ) : null}
                      </div>

                      <span className="text-sm text-neutral-400 transition group-hover:translate-x-0.5 group-hover:text-neutral-800">
                        View
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </aside>
          </div>

          <div className="grid gap-4 border-t border-black/5 py-6 md:grid-cols-3">
            <div className="group rounded-[1.65rem] border border-black/5 bg-white/75 px-5 py-5 backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                  Desktop
                </p>
                <span className="h-2 w-2 rounded-full bg-neutral-300 transition group-hover:bg-neutral-950" />
              </div>
              <p className="mt-4 text-sm leading-7 text-neutral-600">
                작품 미리보기와 QR을 함께 제공해 모바일 AR 경험으로 자연스럽게
                연결합니다.
              </p>
            </div>

            <div className="group rounded-[1.65rem] border border-black/5 bg-white/75 px-5 py-5 backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                  Mobile
                </p>
                <span className="h-2 w-2 rounded-full bg-neutral-300 transition group-hover:bg-neutral-950" />
              </div>
              <p className="mt-4 text-sm leading-7 text-neutral-600">
                iPhone과 Android 환경에 맞춰 작품을 공간에 배치하는 흐름으로
                이어집니다.
              </p>
            </div>

            <div className="group rounded-[1.65rem] border border-black/5 bg-white/75 px-5 py-5 backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                  Artist CMS
                </p>
                <span className="h-2 w-2 rounded-full bg-neutral-300 transition group-hover:bg-neutral-950" />
              </div>
              <p className="mt-4 text-sm leading-7 text-neutral-600">
                작가는 로그인 후 본인 정보와 작품 데이터를 업데이트할 수 있도록
                확장합니다.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}