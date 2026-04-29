"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import {
  getArtistProfileByUid,
  getWorksForArtist,
  type ArtistDoc,
  type ArtistWorkDoc,
} from "@/lib/firebase/firestore";

export default function ArtistWorksPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [artist, setArtist] = useState<ArtistDoc | null>(null);
  const [works, setWorks] = useState<ArtistWorkDoc[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setIsLoading(true);
        setErrorMessage("");

        if (!user) {
          setArtist(null);
          setWorks([]);
          setErrorMessage("로그인이 필요합니다.");
          return;
        }

        const artistDoc = await getArtistProfileByUid(user.uid);

        if (!artistDoc) {
          setArtist(null);
          setWorks([]);
          setErrorMessage("등록된 작가 정보가 없습니다.");
          return;
        }

        const artistWorks = await getWorksForArtist(user.uid);

        setArtist(artistDoc);
        setWorks(artistWorks);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "작품 목록을 불러오는 중 오류가 발생했습니다.";

        setErrorMessage(message);
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

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

          <Link
            href="/artist/dashboard"
            className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm"
          >
            Dashboard
          </Link>
        </header>

        <section className="py-12 md:py-16">
          <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
            Artist Works
          </p>

          <h1 className="mt-5 text-5xl font-semibold tracking-[-0.04em] text-neutral-950 md:text-7xl md:leading-[0.95]">
            Manage
            <br />
            your works.
          </h1>

          <p className="mt-8 max-w-2xl text-sm leading-7 text-neutral-600 md:text-[15px]">
            {artist
              ? `${artist.name || "Artist"} 계정으로 저장된 Firestore 작품을 불러옵니다. 작품 저장, 수정, GLB 다운로드 테스트를 여기서 이어갈 수 있습니다.`
              : "현재 로그인한 작가 계정의 Firestore 작품 목록을 불러옵니다."}
          </p>
        </section>

        {errorMessage ? (
          <section className="rounded-[1.5rem] bg-white px-6 py-6 text-sm leading-7 text-red-600">
            {errorMessage}
          </section>
        ) : null}

        <section className="grid gap-4 border-t border-black/5 py-8 md:grid-cols-2 xl:grid-cols-3">
          <Link
            href="/artist/works/new"
            className="rounded-[1.5rem] bg-white px-5 py-5 transition hover:-translate-y-0.5 hover:shadow-sm"
          >
            <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
              New Work
            </p>
            <h2 className="mt-3 text-xl font-medium tracking-[-0.03em] text-neutral-950">
              새 작품 등록
            </h2>
            <p className="mt-3 text-sm leading-6 text-neutral-600">
              Firestore works 컬렉션에 새 작품 문서를 만들고, GLB 생성 옵션도
              함께 저장합니다.
            </p>
          </Link>

          {isLoading ? (
            <div className="rounded-[1.5rem] bg-white px-5 py-5 text-sm leading-7 text-neutral-600">
              작품 목록을 불러오는 중입니다.
            </div>
          ) : null}

          {!isLoading && works.length === 0 && !errorMessage ? (
            <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white px-5 py-5 text-sm leading-7 text-neutral-600">
              아직 저장된 작품이 없습니다. 새 작품 등록으로 첫 작품을 추가해보세요.
            </div>
          ) : null}

          {works.map((work) => (
            <Link
              key={work.id}
              href={`/artist/works/${work.id}/edit`}
              className="rounded-[1.5rem] bg-white px-5 py-5 transition hover:-translate-y-0.5 hover:shadow-sm"
            >
              <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                Work
              </p>
              <h2 className="mt-3 text-xl font-medium tracking-[-0.03em] text-neutral-950">
                {work.title || "Untitled"}
              </h2>
              <p className="mt-2 text-sm text-neutral-500">
                {work.year || "Year not set"}
              </p>
              <div className="mt-4 space-y-1 text-sm leading-6 text-neutral-600">
                <p>{work.artistName || artist?.name || "Unknown Artist"}</p>
                <p>{work.medium || "Medium not set"}</p>
                <p>{work.dimensions || "Dimensions not set"}</p>
              </div>
              <div className="mt-4 rounded-[1.25rem] bg-[#f7f6f2] px-4 py-4 text-xs leading-6 text-neutral-500">
                {work.coverImageUrl ? "Cover image URL connected" : "Cover image URL missing"}
                <br />
                {work.generatedGlbUrl
                  ? "Generated GLB URL connected"
                  : "Generated GLB URL not saved yet"}
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
