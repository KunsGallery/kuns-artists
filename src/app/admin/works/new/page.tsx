"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import LogoutButton from "@/components/auth/LogoutButton";
import ArtistWorkGlbForm from "@/components/artist/ArtistWorkGlbForm";
import { useProtectedArtist } from "@/hooks/useProtectedArtist";
import {
  createWorkForAdmin,
  getAllArtistsForAdmin,
  type ArtistDoc,
} from "@/lib/firebase/firestore";
import type { WorkFormValues } from "@/types/work";

function normalizeOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed || undefined;
}

function buildSavePayload(values: WorkFormValues) {
  const widthCm = values.widthCm.trim() ? Number(values.widthCm) : undefined;
  const heightCm = values.heightCm.trim() ? Number(values.heightCm) : undefined;
  const depthCm = values.depthCm.trim() ? Number(values.depthCm) : undefined;
  const frontRotationXDeg = values.frontRotationXDeg.trim()
    ? Number(values.frontRotationXDeg)
    : undefined;
  const frontRotationYDeg = values.frontRotationYDeg.trim()
    ? Number(values.frontRotationYDeg)
    : undefined;

  return {
    title: values.title.trim(),
    year: normalizeOptionalText(values.year),
    medium: normalizeOptionalText(values.medium),
    dimensions: normalizeOptionalText(values.dimensions),
    description: normalizeOptionalText(values.description),
    coverImageUrl: normalizeOptionalText(values.coverImageUrl),
    widthCm,
    heightCm,
    depthCm,
    frontRotationXDeg,
    frontRotationYDeg,
    sideMode: values.sideMode,
    showBackLabel: values.showBackLabel,
  };
}

function AdminNewWorkPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedArtist = searchParams.get("artist")?.trim() || "";
  const { errorMessage } = useProtectedArtist({
    requireAdmin: true,
    fallbackErrorMessage: "관리자 정보를 불러오는 중 오류가 발생했습니다.",
  });
  const [artists, setArtists] = useState<ArtistDoc[]>([]);
  const [selectedArtistId, setSelectedArtistId] = useState("");
  const [isLoadingArtists, setIsLoadingArtists] = useState(true);
  const [loadErrorMessage, setLoadErrorMessage] = useState("");

  useEffect(() => {
    let isActive = true;

    void (async () => {
      try {
        setIsLoadingArtists(true);
        const result = await getAllArtistsForAdmin();

        if (!isActive) {
          return;
        }

        setArtists(result);
        setSelectedArtistId((current) => {
          const matchedArtist = requestedArtist
            ? result.find(
                (artist) =>
                  artist.id === requestedArtist || artist.slug === requestedArtist
              )
            : null;

          if (matchedArtist) {
            return matchedArtist.id;
          }

          return current || result[0]?.id || "";
        });
        setLoadErrorMessage("");
      } catch (error) {
        if (!isActive) {
          return;
        }

        setArtists([]);
        setLoadErrorMessage(
          error instanceof Error
            ? error.message
            : "작가 목록을 불러오는 중 오류가 발생했습니다."
        );
      } finally {
        if (isActive) {
          setIsLoadingArtists(false);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [requestedArtist]);

  const selectedArtist = useMemo(
    () => artists.find((artist) => artist.id === selectedArtistId) ?? null,
    [artists, selectedArtistId]
  );

  async function handleSave(values: WorkFormValues) {
    if (!selectedArtist) {
      throw new Error("작가를 선택해주세요.");
    }

    const payload = buildSavePayload(values);

    await createWorkForAdmin(selectedArtist.id, selectedArtist, payload);
    router.push("/admin/works");

    return "작품이 저장되었습니다.";
  }

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
              href="/admin/works"
              className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm"
            >
              작품 관리로 돌아가기
            </Link>

            <Link
              href="/admin"
              className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm"
            >
              Admin
            </Link>

            <LogoutButton className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm">
              로그아웃
            </LogoutButton>
          </div>
        </header>

        <section className="grid gap-8 py-12 md:grid-cols-[1.05fr_0.95fr] md:items-end md:py-16">
          <div className="max-w-4xl">
            <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
              작품 등록
            </p>

            <h1 className="mt-5 text-5xl font-semibold tracking-[-0.04em] text-neutral-950 md:text-7xl md:leading-[0.95]">
              새 작품
              <br />
              등록.
            </h1>

            <p className="mt-8 max-w-2xl text-sm leading-7 text-neutral-600 md:text-[15px]">
              관리자가 작품을 먼저 등록하고, 이후 공개 상태와 AR 설정을 검수
              화면에서 조정할 수 있습니다.
            </p>
          </div>

          <aside className="rounded-[2rem] border border-black/10 bg-white/85 p-5 backdrop-blur-sm md:p-6">
            <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
              Artist Target
            </p>

            <label className="mt-4 block">
              <span className="text-[13px] font-medium tracking-[-0.01em] text-neutral-700">
                대상 작가
              </span>
              <select
                value={selectedArtistId}
                onChange={(event) => setSelectedArtistId(event.target.value)}
                className="mt-2 h-13 w-full rounded-[1.25rem] border border-black/10 bg-white px-4 text-sm text-neutral-900 outline-none transition focus:border-black/20"
                disabled={isLoadingArtists}
              >
                {artists.map((artist) => (
                  <option key={artist.id} value={artist.id}>
                    {artist.name || artist.slug || artist.id}
                  </option>
                ))}
              </select>
            </label>

            <p className="mt-4 text-sm leading-7 text-neutral-600">
              {selectedArtist
                ? `${selectedArtist.name || selectedArtist.slug}에 새 작품을 추가합니다.`
                : loadErrorMessage || "작가를 먼저 선택해주세요."}
            </p>

            {errorMessage || loadErrorMessage ? (
              <div className="mt-5 rounded-[1.5rem] border border-red-200 bg-red-50 px-4 py-4 text-sm leading-6 text-red-700">
                {errorMessage || loadErrorMessage}
              </div>
            ) : null}
          </aside>
        </section>

        {selectedArtist ? (
          <ArtistWorkGlbForm
            key={selectedArtist.id}
            mode="new"
            initialValues={{ artistName: selectedArtist.name || "" }}
            onSave={handleSave}
            saveButtonLabel="작품 저장"
            artistSlug={selectedArtist.slug}
          />
        ) : (
          <section className="rounded-[2rem] border border-black/8 bg-white px-6 py-8 text-sm leading-7 text-neutral-600">
            등록할 작가를 선택하면 작품 입력 폼이 나타납니다.
          </section>
        )}
      </div>
    </main>
  );
}

export default function AdminNewWorkPage() {
  return (
    <Suspense
      fallback={
        <main className="theme-dark min-h-screen bg-[#f5f3ee] text-neutral-950" />
      }
    >
      <AdminNewWorkPageContent />
    </Suspense>
  );
}
