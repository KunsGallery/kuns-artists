"use client";

import Link from "next/link";
import LogoutButton from "@/components/auth/LogoutButton";
import { useProtectedArtist } from "@/hooks/useProtectedArtist";

function AdminCard({
  href,
  label,
  title,
  description,
}: {
  href: string;
  label: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-[1.75rem] border border-black/8 bg-white p-6 transition hover:-translate-y-0.5 hover:border-black/15 hover:shadow-[0_24px_60px_rgba(0,0,0,0.05)]"
    >
      <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-400">
        {label}
      </p>
      <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-neutral-950">
        {title}
      </h2>
      <p className="mt-4 text-sm leading-7 text-neutral-600">{description}</p>
      <p className="mt-8 text-[11px] uppercase tracking-[0.24em] text-neutral-400 transition group-hover:text-neutral-700">
        열기
      </p>
    </Link>
  );
}

export default function AdminPage() {
  const { artist, errorMessage, isLoading } = useProtectedArtist({
    requireAdmin: true,
    fallbackErrorMessage: "관리자 정보를 불러오는 중 오류가 발생했습니다.",
  });

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
              className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm"
            >
              김환 작가 모드
            </Link>

            <Link
              href="/artists"
              className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm"
            >
              공개 사이트
            </Link>

            <LogoutButton className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm">
              로그아웃
            </LogoutButton>
          </div>
        </header>

        <section className="grid gap-8 py-12 md:grid-cols-[1.05fr_0.95fr] md:items-end md:py-16">
          <div className="max-w-4xl">
            <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
              Admin
            </p>

            <h1 className="mt-5 text-5xl font-semibold tracking-[-0.04em] text-neutral-950 md:text-7xl md:leading-[0.95]">
              Admin
              <br />
              대시보드.
            </h1>

            <p className="mt-8 max-w-2xl text-sm leading-7 text-neutral-600 md:text-[15px]">
              작가와 작품의 공개 구조를 관리하는 관리자 시작 화면입니다. 아직
              세부 기능이 완성되지 않았더라도, 어디로 들어가야 하는지는 분명히
              보이도록 정리했습니다.
            </p>
          </div>

          <aside className="rounded-[2rem] border border-black/10 bg-white/85 p-5 backdrop-blur-sm md:p-6">
            <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
              Current Admin
            </p>
            <div className="mt-5 space-y-4">
              <SummaryRow
                label="Name"
                value={isLoading ? "불러오는 중..." : artist?.name || "정보 없음"}
              />
              <SummaryRow
                label="Role"
                value={isLoading ? "불러오는 중..." : artist?.role || "정보 없음"}
              />
              <SummaryRow
                label="Artist Mode"
                value={isLoading ? "불러오는 중..." : "/artist/dashboard"}
              />
            </div>

            {errorMessage ? (
              <div className="mt-5 rounded-[1.5rem] border border-red-200 bg-red-50 px-4 py-4 text-sm leading-6 text-red-700">
                {errorMessage}
              </div>
            ) : null}
          </aside>
        </section>

        <section className="grid gap-4 border-t border-black/5 py-8 md:grid-cols-2">
          <AdminCard
            href="/admin/artists"
            label="작가 관리"
            title="작가 관리"
            description="전속 작가와 프로젝트 아티스트를 관리합니다."
          />

          <AdminCard
            href="/admin/works"
            label="작품 관리"
            title="작품 관리"
            description="공개 승인, 보관 상태, 모델 URL을 관리합니다."
          />

          <AdminCard
            href="/artist/dashboard"
            label="Kim Hwan Artist Mode"
            title="작가 모드"
            description="관리자 계정으로 김환 작가의 기본 작업 화면을 확인합니다."
          />

          <AdminCard
            href="/artists"
            label="공개 사이트"
            title="공개 작가 페이지"
            description="외부에서 보이는 작가 목록과 공개 페이지를 확인합니다."
          />
        </section>
      </div>
    </main>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.5rem] bg-[#f7f6f2] px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-400">
        {label}
      </p>
      <p className="mt-2 break-words text-sm leading-6 text-neutral-600">
        {value}
      </p>
    </div>
  );
}
