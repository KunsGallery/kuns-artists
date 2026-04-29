import Link from "next/link";
import { artists } from "@/data/artists";

export default function HomePage() {
  // 데이터 분리
  const representedArtists = [...artists]
    .filter((a) => a.type === "represented")
    .sort((a, b) => a.name.localeCompare(b.name));

  const projectArtists = [...artists]
    .filter((a) => a.type === "project")
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <main className="min-h-screen">
      {/* --- SECTION 01: HERO --- */}
      <section className="relative flex min-h-[90vh] flex-col items-center justify-center text-center">
        <div className="luxury-container animate-reveal">
          <p className="label-represented mx-auto w-fit border-l-0 border-b pb-4 mb-10 px-0">
            Heritage & Archive
          </p>
          <h1 className="luxury-serif text-[clamp(4rem,12vw,11rem)] font-extralight leading-none tracking-tighter">
            KÜN’S <br />
            <span className="opacity-40">MUSEUM</span>
          </h1>
          <p className="mt-12 mx-auto max-w-2xl text-lg font-light text-neutral-500 leading-relaxed">
            박물관의 심장부에 보관된 보석들처럼, <br />
            우리는 시대를 관통하는 예술가들의 시간을 영구히 기록합니다.
          </p>
          <div className="mt-16 flex justify-center gap-6">
            <Link href="/artists" className="btn-primary">Explore All</Link>
          </div>
        </div>
        
        {/* Decorative Light Spotlight */}
        <div className="absolute top-0 left-1/2 -z-10 h-[500px] w-[800px] -translate-x-1/2 bg-[#a38c5d]/5 blur-[120px]" />
      </section>

      {/* --- SECTION 02: THE MAIN VAULT (Represented Artists) --- */}
      <section className="py-32 border-t border-white/5 bg-[#080808]">
        <div className="luxury-container">
          <div className="mb-20 flex items-end justify-between">
            <div>
              <p className="label-represented mb-4">Master Collection</p>
              <h2 className="luxury-serif text-5xl md:text-7xl font-extralight">Represented</h2>
            </div>
            <p className="hidden md:block text-sm text-neutral-600 max-w-xs text-right italic">
              KÜN’S GALLERY의 정신을 공유하는 <br />전속 아티스트 마스터 리스트입니다.
            </p>
          </div>

          <div className="grid gap-px bg-white/5 border border-white/5">
            {representedArtists.map((artist, index) => (
              <Link
                key={artist.slug}
                href={`/artists/${artist.slug}`}
                className="group relative flex items-center justify-between bg-[#050505] p-10 transition-all duration-700 hover:bg-[#0a0a0a]"
              >
                <div className="flex items-center gap-12">
                  <span className="luxury-serif text-2xl text-[#a38c5d] opacity-30 group-hover:opacity-100 transition-opacity">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className="text-3xl font-light tracking-tight group-hover:translate-x-3 transition-transform duration-500">
                      {artist.name}
                    </h3>
                    <p className="mt-2 text-xs uppercase tracking-widest text-neutral-600">Permanent residency</p>
                  </div>
                </div>
                
                {/* Artist Preview - 마우스 호버 시 나타나는 이미지 힌트 (선택 사항) */}
                <div className="flex items-center gap-8">
                   <div className="h-px w-24 bg-[#a38c5d]/20 transition-all group-hover:w-40 group-hover:bg-[#a38c5d]" />
                   <span className="text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Enter Vault</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* --- SECTION 03: THE GALLERY (Project Artists) --- */}
      <section className="py-40">
        <div className="luxury-container">
          <div className="mb-20">
            <p className="label-project mb-4">Collaborative Visions</p>
            <h2 className="luxury-serif text-5xl font-extralight">Project Artists</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {projectArtists.map((artist) => (
              <Link
                key={artist.slug}
                href={`/artists/${artist.slug}`}
                className="group relative aspect-[4/5] overflow-hidden border border-white/5 bg-white/[0.02] p-8 flex flex-col justify-end transition-all hover:border-white/20"
              >
                {/* 배경 워터마크 텍스트 */}
                <div className="absolute top-10 left-8 luxury-serif text-6xl opacity-[0.03] group-hover:opacity-10 transition-opacity pointer-events-none uppercase">
                  Project
                </div>
                
                <div className="relative z-10">
                  <h3 className="text-xl font-medium text-neutral-300 group-hover:text-white transition-colors">
                    {artist.name}
                  </h3>
                  <p className="mt-3 text-[11px] text-neutral-600 uppercase tracking-widest">
                    Guest Artist Archive
                  </p>
                </div>
                
                {/* Decorative border animation */}
                <div className="absolute bottom-0 left-0 h-1 w-0 bg-neutral-600 transition-all duration-700 group-hover:w-full" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* --- SECTION 04: SYSTEM PHILOSOPHY --- */}
      <section className="py-40 bg-[#0a0a0a] border-t border-white/5">
        <div className="luxury-container flex flex-col items-center text-center">
          <div className="h-20 w-px bg-gradient-to-b from-[#a38c5d] to-transparent mb-12" />
          <h2 className="luxury-serif text-5xl md:text-7xl font-extralight mb-12 italic">
            The Ethics of <br /> Digital Heritage
          </h2>
          <div className="grid max-w-4xl gap-16 md:grid-cols-2 text-left">
            <div className="space-y-6">
              <h4 className="text-[11px] font-bold text-[#a38c5d] uppercase tracking-[0.3em]">Selection & Care</h4>
              <p className="text-sm leading-loose text-neutral-500 font-light">
                전속 작가의 기록은 갤러리의 역사와 궤를 같이합니다. 모든 아카이브는 작가의 사후에도 가치가 훼손되지 않도록 표준화된 데이터 규격을 따릅니다.
              </p>
            </div>
            <div className="space-y-6">
              <h4 className="text-[11px] font-bold text-[#707070] uppercase tracking-[0.3em]">Diversity & Vision</h4>
              <p className="text-sm leading-loose text-neutral-500 font-light">
                프로젝트 아티스트와의 협업은 갤러리에 새로운 시각을 수혈합니다. 비록 기간 한정된 프로젝트일지라도 그 순간의 예술적 실험은 이곳에 영구히 기록됩니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="py-20 border-t border-white/5">
        <div className="luxury-container flex flex-col md:flex-row justify-between items-center gap-8">
           <div className="text-[11px] font-bold tracking-[0.5em] text-neutral-700 uppercase">
             KÜN’S GALLERY · Archive
           </div>
           <div className="flex gap-10 text-[10px] text-neutral-500 tracking-widest uppercase">
             <Link href="/" className="hover:text-white transition-colors">Instagram</Link>
             <Link href="/" className="hover:text-white transition-colors">Privacy</Link>
             <Link href="/" className="hover:text-white transition-colors">Terms</Link>
           </div>
        </div>
      </footer>
    </main>
  );
}