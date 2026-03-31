import Link from "next/link";
import { artists } from "@/data/artists";

const representedArtists = [...artists]
  .filter((artist) => artist.type === "represented")
  .sort((a, b) => a.name.localeCompare(b.name));

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f5f3ee] text-neutral-950">
      <section className="border-b border-black/5">
        <div className="mx-auto flex min-h-[72vh] max-w-7xl flex-col justify-between px-5 py-6 md:px-8 md:py-8">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
                KÜN’S GALLERY
              </p>
            </div>

            <nav className="flex items-center gap-2 md:gap-3">
              <Link
                href="/artists"
                className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm"
              >
                Artists
              </Link>
            </nav>
          </header>

          <div className="grid gap-12 py-12 md:grid-cols-[1.15fr_0.85fr] md:items-end md:py-16">
            <div className="max-w-4xl">
              <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
                Digital Viewing System
              </p>

              <h1 className="mt-5 text-5xl font-semibold tracking-[-0.04em] text-neutral-950 md:text-7xl md:leading-[0.95]">
                A spatial way
                <br />
                to encounter
                <br />
                each artist.
              </h1>

              <p className="mt-8 max-w-xl text-sm leading-7 text-neutral-600 md:text-[15px]">
                KÜN’S GALLERY의 전속 작가를 위한 AR 기반 뷰잉 시스템입니다.
                데스크탑에서는 작품 미리보기와 QR을 확인하고, 모바일에서는
                바로 공간 배치 경험으로 이어질 수 있도록 설계합니다.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/artists"
                  className="inline-flex h-12 items-center rounded-full bg-neutral-950 px-6 text-sm font-medium text-white transition hover:opacity-90"
                >
                  아티스트 보기
                </Link>

                <Link
                  href="/ar/jessup-choi-sample-01"
                  className="inline-flex h-12 items-center rounded-full border border-black/10 bg-white px-6 text-sm font-medium text-neutral-900 transition hover:border-black/20 hover:shadow-sm"
                >
                  AR 샘플 보기
                </Link>
              </div>
            </div>

            <div className="flex justify-start md:justify-end">
              <div className="w-full max-w-[420px] rounded-[2rem] border border-black/10 bg-white/80 p-5 backdrop-blur-sm md:p-6">
                <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
                  Represented Artists
                </p>

                <div className="mt-5 space-y-3">
                  {representedArtists.map((artist, index) => (
                    <Link
                      key={artist.slug}
                      href={`/artists/${artist.slug}`}
                      className="group flex items-center justify-between rounded-2xl border border-transparent bg-[#f7f6f2] px-4 py-4 transition hover:border-black/10 hover:bg-white"
                    >
                      <div className="min-w-0">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                          {String(index + 1).padStart(2, "0")}
                        </p>
                        <h2 className="mt-1 truncate text-lg font-medium tracking-[-0.02em] text-neutral-950">
                          {artist.name}
                        </h2>
                        {artist.nameKo ? (
                          <p className="mt-1 text-sm text-neutral-500">
                            {artist.nameKo}
                          </p>
                        ) : null}
                      </div>

                      <span className="text-sm text-neutral-400 transition group-hover:translate-x-0.5 group-hover:text-neutral-700">
                        View
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 border-t border-black/5 pt-6 md:grid-cols-3">
            <div className="rounded-[1.5rem] bg-white px-5 py-5">
              <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                Desktop
              </p>
              <p className="mt-3 text-sm leading-6 text-neutral-600">
                작품 이미지 또는 3D 미리보기와 함께 QR을 제공해 모바일 AR
                경험으로 자연스럽게 연결합니다.
              </p>
            </div>

            <div className="rounded-[1.5rem] bg-white px-5 py-5">
              <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                Mobile
              </p>
              <p className="mt-3 text-sm leading-6 text-neutral-600">
                작품 페이지에 진입하면 기기 환경에 맞는 AR 실행 흐름으로 바로
                이어질 수 있도록 구성합니다.
              </p>
            </div>

            <div className="rounded-[1.5rem] bg-white px-5 py-5">
              <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                Structure
              </p>
              <p className="mt-3 text-sm leading-6 text-neutral-600">
                AR 기능 안정화 후, 작가 상세와 전체 아티스트 리스트를 순차적으로
                얹는 구조로 확장합니다.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}