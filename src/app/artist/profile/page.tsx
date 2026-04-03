"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { logout } from "@/lib/firebase/auth";
import {
  getArtistProfileByUid,
  updateArtistProfile,
  type ArtistDoc,
} from "@/lib/firebase/firestore";

type FormState = {
  name: string;
  nameKo: string;
  tagline: string;
  bio: string;
  profileImageUrl: string;
};

export default function ArtistProfilePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uid, setUid] = useState("");
  const [artist, setArtist] = useState<ArtistDoc | null>(null);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [form, setForm] = useState<FormState>({
    name: "",
    nameKo: "",
    tagline: "",
    bio: "",
    profileImageUrl: "",
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setIsLoading(true);
        setErrorMessage("");
        setMessage("");

        if (!user) {
          setErrorMessage("로그인이 필요합니다.");
          setArtist(null);
          return;
        }

        setUid(user.uid);

        const artistDoc = await getArtistProfileByUid(user.uid);

        if (!artistDoc) {
          setErrorMessage("등록된 작가 정보가 없습니다.");
          setArtist(null);
          return;
        }

        setArtist(artistDoc);
        setForm({
          name: artistDoc.name || "",
          nameKo: artistDoc.nameKo || "",
          tagline: artistDoc.tagline || "",
          bio: artistDoc.bio || "",
          profileImageUrl: artistDoc.profileImageUrl || "",
        });
      } catch (error) {
        const msg =
          error instanceof Error
            ? error.message
            : "작가 정보를 불러오는 중 오류가 발생했습니다.";

        setErrorMessage(msg);
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleChange = (
    key: keyof FormState,
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    try {
      if (!uid) {
        throw new Error("로그인 정보가 없습니다.");
      }

      setIsSaving(true);
      setErrorMessage("");
      setMessage("");

      await updateArtistProfile(uid, {
        name: form.name,
        nameKo: form.nameKo,
        tagline: form.tagline,
        bio: form.bio,
        profileImageUrl: form.profileImageUrl,
      });

      setMessage("프로필 정보가 저장되었습니다.");
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : "저장 중 오류가 발생했습니다.";

      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

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
                href="/artist/dashboard"
                className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm"
              >
                Dashboard
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

          <div className="grid gap-10 py-12 md:grid-cols-[1.05fr_0.95fr] md:items-start md:py-16">
            <div className="max-w-4xl">
              <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
                Artist Profile
              </p>

              <h1 className="mt-5 text-5xl font-semibold tracking-[-0.04em] text-neutral-950 md:text-7xl md:leading-[0.95]">
                Edit your
                <br />
                profile.
              </h1>

              <p className="mt-8 max-w-xl text-sm leading-7 text-neutral-600 md:text-[15px]">
                작가 기본 정보와 소개 문구를 수정하는 페이지입니다. 이후 작품
                등록, 아카이빙, 파일 업로드 구조와 이어집니다.
              </p>
            </div>

            <div className="flex justify-start md:justify-end">
              <div className="w-full max-w-[440px] rounded-[2rem] border border-black/10 bg-white/80 p-5 backdrop-blur-sm md:p-6">
                <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
                  Current Artist
                </p>

                <div className="mt-5 space-y-4">
                  <div className="rounded-[1.5rem] bg-[#f7f6f2] px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                      Name
                    </p>
                    <p className="mt-2 text-sm leading-6 text-neutral-600">
                      {isLoading ? "Loading..." : artist?.name || "No data"}
                    </p>
                  </div>

                  <div className="rounded-[1.5rem] bg-[#f7f6f2] px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                      Type
                    </p>
                    <p className="mt-2 text-sm leading-6 text-neutral-600">
                      {isLoading ? "Loading..." : artist?.type || "No data"}
                    </p>
                  </div>

                  <div className="rounded-[1.5rem] bg-[#f7f6f2] px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                      Status
                    </p>
                    <p className="mt-2 text-sm leading-6 text-neutral-600">
                      {isLoading ? "Loading..." : artist?.status || "No data"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-black/5 py-8 md:py-10">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-5 rounded-[1.75rem] bg-white p-6">
                <div>
                  <label className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                    English Name
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    className="mt-3 h-13 w-full rounded-2xl border border-black/10 bg-[#f7f6f2] px-4 text-sm outline-none transition focus:border-black/20"
                  />
                </div>

                <div>
                  <label className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                    Korean Name
                  </label>
                  <input
                    value={form.nameKo}
                    onChange={(e) => handleChange("nameKo", e.target.value)}
                    className="mt-3 h-13 w-full rounded-2xl border border-black/10 bg-[#f7f6f2] px-4 text-sm outline-none transition focus:border-black/20"
                  />
                </div>

                <div>
                  <label className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                    Tagline
                  </label>
                  <input
                    value={form.tagline}
                    onChange={(e) => handleChange("tagline", e.target.value)}
                    className="mt-3 h-13 w-full rounded-2xl border border-black/10 bg-[#f7f6f2] px-4 text-sm outline-none transition focus:border-black/20"
                  />
                </div>

                <div>
                  <label className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                    Profile Image URL
                  </label>
                  <input
                    value={form.profileImageUrl}
                    onChange={(e) =>
                      handleChange("profileImageUrl", e.target.value)
                    }
                    className="mt-3 h-13 w-full rounded-2xl border border-black/10 bg-[#f7f6f2] px-4 text-sm outline-none transition focus:border-black/20"
                  />
                </div>
              </div>

              <div className="space-y-5 rounded-[1.75rem] bg-white p-6">
                <div>
                  <label className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                    Biography
                  </label>
                  <textarea
                    value={form.bio}
                    onChange={(e) => handleChange("bio", e.target.value)}
                    rows={12}
                    className="mt-3 w-full rounded-2xl border border-black/10 bg-[#f7f6f2] px-4 py-4 text-sm leading-7 outline-none transition focus:border-black/20"
                  />
                </div>

                {message ? (
                  <div className="rounded-[1.25rem] bg-[#f7f6f2] px-4 py-4 text-sm leading-7 text-green-700">
                    {message}
                  </div>
                ) : null}

                {errorMessage ? (
                  <div className="rounded-[1.25rem] bg-[#f7f6f2] px-4 py-4 text-sm leading-7 text-red-600">
                    {errorMessage}
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving || isLoading}
                  className="inline-flex h-14 items-center justify-center rounded-full bg-neutral-950 px-6 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "저장 중..." : "프로필 저장"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}