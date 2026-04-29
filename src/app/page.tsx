import Link from "next/link";
import { artists } from "@/data/artists";

const representedArtists = [...artists]
  .filter((artist) => artist.type === "represented")
  .sort((a, b) => a.name.localeCompare(b.name));

const featureItems = [
  {
    label: "Archive",
    title: "A living archive for represented artists.",
    description:
      "작가의 소개, 작품, 링크, 전시 기록을 하나의 정제된 디지털 아카이브로 정리합니다.",
  },
  {
    label: "AR Viewing",
    title: "From image to spatial encounter.",
    description:
      "작품 이미지를 기반으로 캔버스형 GLB를 생성하고, 모바일 AR 경험으로 확장합니다.",
  },
  {
    label: "Artist CMS",
    title: "A private update room for artists.",
    description:
      "작가는 직접 프로필과 작품 정보를 업데이트하고, 갤러리는 검수 후 공개합니다.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen text-[var(--foreground)]">
      <section className="relative min-h-screen overflow-hidden border-b border-white/10">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#a38c5d]/50 to-transparent" />
        <div className="pointer-events-none absolute left-1/2 top-[-18rem] h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-[#a38c5d]/10 blur-3xl" />

        <div className="luxury-container relative flex min-h-screen flex-col">
          <header className="flex items-center justify-between gap-5 py-6 md:py-8">
            <Link href="/" className="group">
              <p className="text-[11px] uppercase tracking-[0.34em] text-[#f7f4ec] transition group-hover:text-[#a38c5d]">
                KÜN’S GALLERY
              </p>
              <p className="mt-1 hidden text-xs tracking-[-0.02em] text-white/42 md:block">
                Represented Artists · Digital Archive · AR Viewing
              </p>
            </Link>

            <nav className="flex items-center gap-2 md:gap-6">
              <Link
                href="/artists"
                className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-5 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#f7f4ec] transition duration-500 hover:border-[#a38c5d] hover:text-[#a38c5d]"
              >
                Artists
              </Link>

              <Link
                href="/artist/login"
                className="inline-flex h-11 items-center justify-center rounded-full border border-[#a38c5d]/40 bg-[#a38c5d]/10 px-5 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#f7f4ec] transition duration-500 hover:-translate-y-0.5 hover:border-[#a38c5d] hover:bg-[#a38c5d] hover:shadow-[0_0_30px_rgba(163,140,93,0.25)]"
              >
                Artist Login
              </Link>
            </nav>
          </header>

          <div className="grid flex-1 gap-12 py-12 md:grid-cols-[1.08fr_0.92fr] md:items-center md:py-20">
            <section className="max-w-5xl animate-reveal">
              <p className="label-represented">Private Digital Archive</p>

              <h1 className="luxury-serif mt-8 max-w-5xl text-[4.35rem] font-normal leading-[0.86] tracking-[-0.085em] text-[#f7f4ec] sm:text-[6.4rem] md:text-[8.2rem] lg:text-[9.3rem]">
                KÜN’S
                <br />
                Artists
              </h1>

              <div className="mt-8 grid max-w-4xl gap-8 md:grid-cols-[0.78fr_1.22fr] md:items-start">
                <p className="pt-2 text-[10px] uppercase tracking-[0.34em] text-white/36">
                  Seoul · Since 2022
                </p>

                <p className="max-w-2xl text-[15px] leading-8 text-white/58 md:text-[17px] md:leading-9">
                  KÜN’S GALLERY의 전속 작가를 위한 디지털 아카이브이자,
                  작품을 실제 공간으로 확장하기 위한 AR 뷰잉 시스템입니다.
                  기록은 조용하게 정리되고, 작품은 더 가까운 경험으로
                  이동합니다.
                </p>
              </div>

              <div className="mt-10 flex flex-wrap gap-3">
                <Link href="/artists" className="btn-primary">
                  View Artists
                </Link>

                <Link href="/artist/login" className="btn-secondary">
                  Update Profile
                </Link>
              </div>
            </section>

            <aside className="relative animate-reveal-delay-1">
              <div className="pointer-events-none absolute -left-8 -top-8 hidden h-32 w-32 rounded-full border border-[#a38c5d]/20 md:block" />
              <div className="pointer-events-none absolute -bottom-8 -right-8 hidden h-44 w-44 rounded-full border border-white/10 md:block" />

              <div className="luxury-card relative overflow-hidden rounded-[2.25rem] p-5 md:p-6">
                <div className="border-b border-white/10 pb-5">
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <p className="label-represented">
                        Represented Artists
                      </p>
                      <p className="mt-3 max-w-xs text-sm leading-6 text-white/45">
                        Alphabetical order by English name
                      </p>
                    </div>

                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#a38c5d]/30 bg-[#a38c5d]/10 text-sm text-[#d9c590]">
                      {representedArtists.length}
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-white/10">
                  {representedArtists.map((artist, index) => (
                    <Link
                      key={artist.slug}
                      href={`/artists/${artist.slug}`}
                      className="group grid grid-cols-[3.2rem_minmax(0,1fr)_auto] items-center gap-4 py-5"
                    >
                      <p className="text-xs tracking-[0.2em] text-white/28">
                        {String(index + 1).padStart(2, "0")}
                      </p>

                      <div className="min-w-0">
                        <h2 className="truncate text-[1.35rem] font-medium tracking-[-0.045em] text-[#f7f4ec] transition group-hover:text-[#a38c5d] md:text-[1.7rem]">
                          {artist.name}
                        </h2>

                        {artist.nameKo ? (
                          <p className="mt-1 text-sm text-white/42">
                            {artist.nameKo}
                          </p>
                        ) : null}
                      </div>

                      <span className="text-sm text-white/32 transition duration-300 group-hover:translate-x-1 group-hover:text-[#a38c5d]">
                        Enter
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </aside>
          </div>

          <section className="grid gap-4 border-t border-white/10 py-6 md:grid-cols-3 md:py-8">
            {featureItems.map((item, index) => (
              <div
                key={item.label}
                className="group border border-white/10 bg-white/[0.035] p-6 backdrop-blur-md transition duration-500 hover:border-[#a38c5d]/40 hover:bg-[#a38c5d]/[0.06]"
                style={{
                  animationDelay: `${index * 120}ms`,
                }}
              >
                <div className="flex items-center justify-between gap-6">
                  <p className="text-[10px] uppercase tracking-[0.32em] text-[#a38c5d]">
                    {item.label}
                  </p>
                  <span className="h-px w-8 bg-white/18 transition duration-500 group-hover:w-12 group-hover:bg-[#a38c5d]" />
                </div>

                <h3 className="luxury-serif mt-8 text-[1.65rem] font-normal leading-[1.05] tracking-[-0.045em] text-[#f7f4ec] md:text-[2rem]">
                  {item.title}
                </h3>

                <p className="mt-5 text-sm leading-7 text-white/52">
                  {item.description}
                </p>
              </div>
            ))}
          </section>
        </div>
      </section>

      <section className="border-b border-white/10">
        <div className="luxury-container grid gap-8 py-14 md:grid-cols-[0.8fr_1.2fr] md:py-20">
          <div>
            <p className="label-represented">System Note</p>
            <h2 className="luxury-serif mt-5 max-w-lg text-5xl font-normal leading-[0.95] tracking-[-0.07em] text-[#f7f4ec] md:text-7xl">
              From archive
              <br />
              to placement.
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <p className="text-[15px] leading-8 text-white/56 md:text-[16px] md:leading-9">
              작가 페이지는 단순한 소개 페이지가 아니라, 작품과 기록이
              업데이트되는 살아 있는 디지털 프로필로 설계됩니다.
            </p>

            <p className="text-[15px] leading-8 text-white/56 md:text-[16px] md:leading-9">
              작품 정보와 이미지는 캔버스형 GLB 생성 도구와 연결되고, 이후
              관리자의 검수와 승인을 거쳐 공개 AR 경험으로 확장됩니다.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}