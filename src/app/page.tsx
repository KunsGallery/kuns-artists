import type { Metadata } from "next";
import Link from "next/link";
import FeaturedArtistsPreview from "@/components/public/FeaturedArtistsPreview";

export const metadata: Metadata = {
  title: "Artists Archive",
  description:
    "Official artist pages, selected works, and archival records for KÜN’S Gallery represented artists.",
};

const archiveNotes = [
  {
    title: "Works",
    description: "선별된 작품 이미지를 중심으로 각 작가의 현재 흐름을 보여줍니다.",
  },
  {
    title: "CV",
    description: "전시와 이력은 깔끔하게 정리되어, 필요한 순간 바로 읽히도록 구성됩니다.",
  },
  {
    title: "Press & Archive",
    description: "기사, 인터뷰, 기록 자료가 한곳에 모여 작가 페이지의 맥락을 보완합니다.",
  },
];

export default function HomePage() {
  return (
    <main className="theme-dark min-h-screen text-[var(--foreground)]">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--kuns-orange)]/45 to-transparent" />
        <div className="pointer-events-none absolute left-1/2 top-[-18rem] h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-[var(--kuns-orange)]/12 blur-3xl" />
        <div className="pointer-events-none absolute right-[-8rem] top-[12rem] hidden h-64 w-64 rounded-full border border-white/10 lg:block" />

        <div className="luxury-container relative">
          <header className="flex items-center justify-between gap-5 py-6 md:py-8">
            <Link href="/" className="group">
              <p className="text-[11px] uppercase tracking-[0.34em] text-[var(--foreground)] transition group-hover:text-[var(--kuns-orange)]">
                KÜN’S GALLERY
              </p>
              <p className="mt-1 hidden text-xs tracking-[-0.02em] text-white/42 md:block">
                Official artist archive
              </p>
            </Link>

            <nav className="flex items-center gap-2 md:gap-3">
              <Link
                href="/artists"
                className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.035] px-5 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--foreground)] transition duration-500 hover:border-[var(--kuns-orange)]/35 hover:text-[var(--kuns-orange)]"
              >
                Artists
              </Link>

              <Link
                href="/artist/login"
                className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.02] px-5 text-[11px] font-medium uppercase tracking-[0.12em] text-white/72 transition duration-500 hover:border-[var(--kuns-orange)]/30 hover:bg-[var(--kuns-orange)]/8 hover:text-[var(--foreground)]"
              >
                Artist Login
              </Link>
            </nav>
          </header>

          <div className="grid gap-14 pb-14 pt-8 md:pb-20 md:pt-10 lg:grid-cols-[1.06fr_0.94fr] lg:items-end lg:min-h-[calc(100vh-8rem)]">
            <section className="max-w-4xl animate-reveal">
              <p className="label-represented">KÜN’S GALLERY</p>

              <h1 className="luxury-serif mt-7 max-w-4xl text-[3.8rem] font-normal leading-[0.84] tracking-[-0.08em] text-[var(--foreground)] sm:text-[5.7rem] md:text-[7.4rem] lg:text-[8.6rem]">
                Artists
                <br />
                Archive
              </h1>

              <p className="mt-7 max-w-2xl text-[16px] leading-8 text-white/60 md:text-[18px] md:leading-9">
                Official artist pages, selected works, and archival records.
                KÜN’S Gallery의 전속 작가를 한눈에 소개하고, 조용하지만 분명한
                톤으로 아카이브의 성격을 드러냅니다.
              </p>

              <div className="mt-10 flex flex-wrap gap-3">
                <Link href="/artists" className="btn-primary">
                  View Artists
                </Link>

                <Link href="/artist/login" className="btn-secondary">
                  Artist Login
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 text-[11px] uppercase tracking-[0.24em] text-white/36">
                <span>Represented artists</span>
                <span className="h-px w-8 bg-white/14" />
                <span>Selected works</span>
                <span className="h-px w-8 bg-white/14" />
                <span>Archive records</span>
              </div>
            </section>

            <aside className="relative animate-reveal-delay-1">
              <div className="pointer-events-none absolute -left-4 top-8 hidden h-28 w-28 rounded-full border border-[var(--kuns-orange)]/18 md:block" />

              <div className="luxury-card overflow-hidden rounded-[2rem]">
                <div className="border-b border-white/10 p-6 md:p-7">
                  <p className="luxury-label text-[10px]">Archive Preview</p>
                  <div className="mt-5 flex items-end justify-between gap-6">
                    <div>
                      <p className="text-[1.15rem] font-medium tracking-[-0.04em] text-[var(--foreground)] md:text-[1.25rem]">
                        A calm front door for the gallery&apos;s artists.
                      </p>
                      <p className="mt-3 max-w-md text-sm leading-7 text-white/52">
                        작가별 페이지는 공개용 소개와 아카이브를 한 흐름으로
                        보여주도록 설계됩니다.
                      </p>
                    </div>

                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[var(--kuns-orange)]/25 bg-[var(--kuns-orange)]/10 text-sm text-[var(--foreground)]">
                      04
                    </div>
                  </div>
                </div>

                <div className="grid gap-px bg-white/10 md:grid-cols-2">
                  {archiveNotes.map((note) => (
                    <div
                      key={note.title}
                      className="bg-[rgba(255,255,255,0.03)] p-6 transition duration-500 hover:bg-[rgba(243,112,33,0.06)]"
                    >
                      <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--kuns-orange)]">
                        {note.title}
                      </p>
                      <p className="mt-4 text-sm leading-7 text-white/54">
                        {note.description}
                      </p>
                    </div>
                  ))}

                  <div className="bg-[rgba(255,255,255,0.03)] p-6 md:col-span-2">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-white/36">
                      Official note
                    </p>
                    <p className="mt-4 max-w-2xl text-sm leading-7 text-white/56">
                      작품, CV, Press & Archive, Share Card를 하나의 공식
                      아카이브 안에서 정돈해, 작가 페이지가 항상 일관된
                      인상을 유지하도록 돕습니다.
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10">
        <div className="luxury-container py-14 md:py-20">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="label-represented">Featured Artists</p>
              <h2 className="luxury-serif mt-5 text-5xl font-normal leading-[0.95] tracking-[-0.07em] text-[var(--foreground)] md:text-7xl">
                Represented
                <br />
                artists preview
              </h2>
            </div>

            <p className="max-w-xl text-[15px] leading-8 text-white/54 md:text-[16px] md:leading-9">
              전속 작가 4명을 미리 보여주는 영역입니다. 각 카드에서 바로
              상세 페이지로 이동할 수 있어, 홈에서 아카이브로의 흐름이 자연스럽게
              이어집니다.
            </p>
          </div>

          <div className="mt-10">
            <FeaturedArtistsPreview />
          </div>
        </div>
      </section>

      <section className="border-b border-white/10">
        <div className="luxury-container grid gap-8 py-14 md:grid-cols-[0.92fr_1.08fr] md:gap-12 md:py-20">
          <div>
            <p className="label-represented">Platform Note</p>
            <h2 className="luxury-serif mt-5 max-w-lg text-5xl font-normal leading-[0.95] tracking-[-0.07em] text-[var(--foreground)] md:text-7xl">
              One archive,
              <br />
              many entries.
            </h2>
          </div>

          <div className="space-y-6">
            <p className="max-w-3xl text-[15px] leading-8 text-white/58 md:text-[16px] md:leading-9">
              KÜN’S Gallery Artists는 전속 작가를 위한 공식 아카이브입니다.
              작품, 이력, Press & Archive, Share Card가 같은 기준으로 정리되어
              작가별 페이지가 늘 깔끔하고 일관된 인상을 유지합니다.
            </p>

            <p className="max-w-3xl text-[15px] leading-8 text-white/58 md:text-[16px] md:leading-9">
              관람자는 조용한 서사로 작가를 만나고, 갤러리는 필요한 정보와
              기록을 한곳에서 관리할 수 있습니다. 기술보다 인상과 흐름이 먼저
              드러나도록 구성한 공개형 아카이브입니다.
            </p>
          </div>
        </div>
      </section>

      <footer>
        <div className="luxury-container py-14 md:py-20">
          <div className="luxury-card rounded-[2rem] p-7 md:p-10">
            <div className="grid gap-8 md:grid-cols-[1.05fr_auto] md:items-end">
              <div>
                <p className="label-represented">Footer CTA</p>
                <h2 className="luxury-serif mt-5 max-w-2xl text-4xl font-normal leading-[0.95] tracking-[-0.07em] text-[var(--foreground)] md:text-6xl">
                  View represented
                  <br />
                  artists or log in.
                </h2>
                <p className="mt-5 max-w-xl text-[15px] leading-8 text-white/54 md:text-[16px] md:leading-9">
                  가장 중요한 진입점만 남겨, 홈에서 바로 아카이브와 작가
                  관리 흐름으로 이어집니다.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href="/artists" className="btn-primary">
                  View Represented Artists
                </Link>

                <Link href="/artist/login" className="btn-secondary">
                  Artist Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
