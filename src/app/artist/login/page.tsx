import Link from "next/link";

const adminCards = [
  {
    label: "Admin Works",
    title: "전체 작품 관리",
    description:
      "작가들이 등록한 작품을 확인하고, 공개 승인 및 AR 파일 연결을 관리합니다.",
    href: "/admin/works",
  },
  {
    label: "Admin Artists",
    title: "전체 작가 관리",
    description:
      "전속 작가 계정, 프로필 상태, 공개 정보를 관리하는 영역입니다.",
    href: "/admin/artists",
  },
  {
    label: "Kim Hwan Profile",
    title: "김환 작가 프로필 관리",
    description:
      "관리자 계정으로 연결된 김환 작가의 공개 프로필 정보를 수정합니다.",
    href: "/artist/profile",
  },
  {
    label: "Kim Hwan Works",
    title: "김환 작가 작품 관리",
    description:
      "김환 작가의 작품을 등록하고 수정하며, GLB 생성 테스트를 진행합니다.",
    href: "/artist/works",
  },
];

export default function AdminPage() {
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

          <nav className="flex items-center gap-2 md:gap-3">
            <Link
              href="/artists"
              className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm"
            >
              Artists
            </Link>

            <Link
              href="/artist/dashboard"
              className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm"
            >
              Artist Mode
            </Link>
          </nav>
        </header>

        <section className="grid gap-10 py-12 md:grid-cols-[1.05fr_0.95fr] md:items-end md:py-16">
          <div className="max-w-4xl">
            <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
              Admin Dashboard
            </p>

            <h1 className="mt-5 text-5xl font-semibold tracking-[-0.04em] text-neutral-950 md:text-7xl md:leading-[0.95]">
              Manage
              <br />
              artists
              <br />
              and works.
            </h1>

            <p className="mt-8 max-w-xl text-sm leading-7 text-neutral-600 md:text-[15px]">
              관리자 계정은 전체 작가와 작품을 관리할 수 있으며, 동시에 김환
              작가 계정으로 연결되어 김환 작가의 프로필과 작품도 직접 수정할 수
              있습니다.
            </p>
          </div>

          <aside className="flex justify-start md:justify-end">
            <div className="w-full max-w-[440px] rounded-[2rem] border border-black/10 bg-white/80 p-5 backdrop-blur-sm md:p-6">
              <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
                Account Role
              </p>

              <div className="mt-5 space-y-4">
                <div className="rounded-[1.5rem] bg-[#f7f6f2] px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                    Admin
                  </p>
                  <p className="mt-2 text-sm leading-6 text-neutral-600">
                    전체 작가, 전체 작품, 공개 승인, AR 파일 연결 관리
                  </p>
                </div>

                <div className="rounded-[1.5rem] bg-[#f7f6f2] px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                    Artist
                  </p>
                  <p className="mt-2 text-sm leading-6 text-neutral-600">
                    김환 작가 프로필 및 김환 작가 작품 등록/수정
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section className="grid gap-4 border-t border-black/5 py-8 md:grid-cols-2">
          {adminCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group rounded-[1.75rem] bg-white px-6 py-6 transition hover:-translate-y-0.5 hover:shadow-sm"
            >
              <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                {card.label}
              </p>

              <h2 className="mt-4 text-2xl font-medium tracking-[-0.04em] text-neutral-950">
                {card.title}
              </h2>

              <p className="mt-4 max-w-xl text-sm leading-7 text-neutral-600">
                {card.description}
              </p>

              <span className="mt-6 inline-flex text-sm text-neutral-400 transition group-hover:translate-x-1 group-hover:text-neutral-950">
                Enter
              </span>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}