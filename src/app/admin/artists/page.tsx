"use client";

import Link from "next/link";
import LogoutButton from "@/components/auth/LogoutButton";
import { useProtectedArtist } from "@/hooks/useProtectedArtist";

export default function AdminArtistsPage() {
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
              href="/admin"
              className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm"
            >
              Admin
            </Link>

            <LogoutButton className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm">
              Logout
            </LogoutButton>
          </div>
        </header>

        <section className="py-12 md:py-16">
          <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
            Admin Artists
          </p>

          <h1 className="mt-5 text-5xl font-semibold tracking-[-0.04em] text-neutral-950 md:text-7xl md:leading-[0.95]">
            Artist
            <br />
            management.
          </h1>

          <p className="mt-8 max-w-xl text-sm leading-7 text-neutral-600 md:text-[15px]">
            전체 작가 계정, 프로필, 권한, 공개 상태를 관리하는 관리자 페이지입니다.
          </p>
        </section>

        <section className="rounded-[1.5rem] border border-dashed border-black/10 bg-white px-6 py-8 text-sm leading-7 text-neutral-600">
          {isLoading
            ? "관리자 권한을 확인하는 중입니다."
            : errorMessage ||
              `${artist?.name || "관리자"} 계정으로 작가 관리 영역에 접근했습니다. 아직 관리자 작가 관리 기능은 준비 중입니다.`}
        </section>
      </div>
    </main>
  );
}
