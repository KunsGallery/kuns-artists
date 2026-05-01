"use client";

import Link from "next/link";
import LogoutButton from "@/components/auth/LogoutButton";
import { useProtectedArtist } from "@/hooks/useProtectedArtist";

export default function AdminPage() {
  const { artist, errorMessage, isLoading } = useProtectedArtist({
    requireAdmin: true,
    fallbackErrorMessage: "관리자 정보를 불러오는 중 오류가 발생했습니다.",
  });

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
              href="/artist/dashboard"
              className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm"
            >
              Artist Mode
            </Link>

            <LogoutButton className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm">
              Logout
            </LogoutButton>
          </div>
        </header>

        <section className="py-12 md:py-16">
          <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
            Admin
          </p>

          <h1 className="mt-5 text-5xl font-semibold tracking-[-0.04em] text-neutral-950 md:text-7xl md:leading-[0.95]">
            Admin
            <br />
            dashboard.
          </h1>

          <p className="mt-8 max-w-xl text-sm leading-7 text-neutral-600 md:text-[15px]">
            작가 정보, 작품 정보, AR 파일 연결과 공개 상태를 관리하는 관리자
            영역입니다.
          </p>
        </section>

        <section className="rounded-[1.5rem] bg-white px-6 py-6 text-sm leading-7 text-neutral-600">
          {isLoading
            ? "관리자 권한을 확인하는 중입니다."
            : errorMessage || `${artist?.name || "관리자"} 계정으로 로그인되었습니다.`}
        </section>

        <section className="grid gap-4 border-t border-black/5 py-8 md:grid-cols-2">
          <Link
            href="/admin/artists"
            className="rounded-[1.5rem] bg-white px-5 py-5 transition hover:-translate-y-0.5 hover:shadow-sm"
          >
            <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
              Artists
            </p>
            <h2 className="mt-3 text-xl font-medium tracking-[-0.03em] text-neutral-950">
              작가 관리
            </h2>
            <p className="mt-3 text-sm leading-6 text-neutral-600">
              전속 작가 계정, 프로필, 공개 상태를 관리합니다.
            </p>
          </Link>

          <Link
            href="/admin/works"
            className="rounded-[1.5rem] bg-white px-5 py-5 transition hover:-translate-y-0.5 hover:shadow-sm"
          >
            <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
              Works
            </p>
            <h2 className="mt-3 text-xl font-medium tracking-[-0.03em] text-neutral-950">
              작품 관리
            </h2>
            <p className="mt-3 text-sm leading-6 text-neutral-600">
              작품 공개 여부와 GLB / USDZ AR 파일 연결을 관리합니다.
            </p>
          </Link>
        </section>
      </div>
    </main>
  );
}
