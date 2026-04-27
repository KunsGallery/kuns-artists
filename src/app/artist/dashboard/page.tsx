"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { logout } from "@/lib/firebase/auth";
import {
  getArtistProfileByUid,
  type ArtistDoc,
} from "@/lib/firebase/firestore";

export default function ArtistDashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [artist, setArtist] = useState<ArtistDoc | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setIsLoading(true);
        setErrorMessage("");

        if (!user) {
          setArtist(null);
          setErrorMessage("로그인이 필요합니다.");
          return;
        }

        const artistDoc = await getArtistProfileByUid(user.uid);

        if (!artistDoc) {
          setArtist(null);
          setErrorMessage("등록된 작가 정보가 없습니다.");
          return;
        }

        setArtist(artistDoc);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "작가 정보를 불러오는 중 오류가 발생했습니다.";

        setErrorMessage(message);
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await logout();
    window.location.href = "/artist/login";
  };

  return (
    <main className="min-h-screen bg-[#f5f3ee] text-neutral-950">
      <section className="border-b border-black/5">
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
                href="/artist/profile"
                className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm"
              >
                Profile
              </Link>

              <Link
                href="/artist/works"
                className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm"
              >
                Works
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm"
              >
                Logout
              </button>
            </div>
          </header>

          <div className="grid gap-10 py-12 md:grid-cols-[1.05fr_0.95fr] md:items-end md:py-16">
            <div className="max-w-4xl">
              <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
                Artist Dashboard
              </p>

              <h1 className="mt-5 text-5xl font-semibold tracking-[-0.04em] text-neutral-950 md:text-7xl md:leading-[0.95]">
                Your artist
                <br />
                dashboard.
              </h1>

              <p className="mt-8 max-w-xl text-sm leading-7 text-neutral-600 md:text-[15px]">
                작가 정보를 수정하고, 작품 데이터를 등록하며, 이후 공개 페이지와
                AR 뷰잉 시스템으로 연결되는 관리 공간입니다.
              </p>
            </div>

            <aside className="flex justify-start md:justify-end">
              <div className="w-full max-w-[440px] rounded-[2rem] border border-black/10 bg-white/80 p-5 backdrop-blur-sm md:p-6">
                <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
                  Overview
                </p>

                <div className="mt-5 space-y-4">
                  <div className="rounded-[1.5rem] bg-[#f7f6f2] px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                      Artist
                    </p>
                    <p className="mt-2 text-sm leading-6 text-neutral-600">
                      {isLoading ? "Loading..." : artist?.name || "No data"}
                    </p>
                  </div>

                  <div className="rounded-[1.5rem] bg-[#f7f6f2] px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                      Role
                    </p>
                    <p className="mt-2 text-sm leading-6 text-neutral-600">
                      {isLoading ? "Loading..." : artist?.role || "No data"}
                    </p>
                  </div>

                  <div className="rounded-[1.5rem] bg-[#f7f6f2] px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                      Status
                    </p>
                    <p className="mt-2 text-sm leading-6 text-neutral-600">
                      {isLoading
                        ? "Loading..."
                        : artist?.status || errorMessage || "Unavailable"}
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </div>

          {errorMessage ? (
            <div className="border-t border-black/5 py-8">
              <div className="rounded-[1.5rem] bg-white px-6 py-6 text-sm leading-7 text-red-600">
                {errorMessage}
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 border-t border-black/5 py-8 md:grid-cols-3">
            <Link
              href="/artist/profile"
              className="rounded-[1.5rem] bg-white px-5 py-5 transition hover:-translate-y-0.5 hover:shadow-sm"
            >
              <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                Profile
              </p>
              <h2 className="mt-3 text-xl font-medium tracking-[-0.03em] text-neutral-950">
                프로필 수정
              </h2>
              <p className="mt-3 text-sm leading-6 text-neutral-600">
                작가명, 소개글, 프로필 이미지 URL, 외부 링크를 수정합니다.
              </p>
            </Link>

            <Link
              href="/artist/works"
              className="rounded-[1.5rem] bg-white px-5 py-5 transition hover:-translate-y-0.5 hover:shadow-sm"
            >
              <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                Works
              </p>
              <h2 className="mt-3 text-xl font-medium tracking-[-0.03em] text-neutral-950">
                작품 관리
              </h2>
              <p className="mt-3 text-sm leading-6 text-neutral-600">
                작품 정보를 등록하고 수정합니다. AR 파일 연결은 관리자에서
                관리합니다.
              </p>
            </Link>

            <div className="rounded-[1.5rem] bg-white px-5 py-5">
              <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                Archive
              </p>
              <h2 className="mt-3 text-xl font-medium tracking-[-0.03em] text-neutral-950">
                아카이브
              </h2>
              <p className="mt-3 text-sm leading-6 text-neutral-600">
                전시, 아트페어, 텍스트, 미디어 아카이브 영역은 이후 확장할
                예정입니다.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}