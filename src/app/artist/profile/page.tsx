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
  bioEn: string;
  location: string;
  profileImageUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
  cvUrl: string;
  artsyUrl: string;
  websiteUrl: string;
};

const initialForm: FormState = {
  name: "",
  nameKo: "",
  tagline: "",
  bio: "",
  bioEn: "",
  location: "",
  profileImageUrl: "",
  instagramUrl: "",
  youtubeUrl: "",
  cvUrl: "",
  artsyUrl: "",
  websiteUrl: "",
};

export default function ArtistProfilePage() {
  const [uid, setUid] = useState("");
  const [artist, setArtist] = useState<ArtistDoc | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setIsLoading(true);
        setErrorMessage("");
        setMessage("");

        if (!user) {
          setArtist(null);
          setErrorMessage("로그인이 필요합니다.");
          return;
        }

        setUid(user.uid);

        const artistDoc = await getArtistProfileByUid(user.uid);

        if (!artistDoc) {
          setArtist(null);
          setErrorMessage("등록된 작가 정보가 없습니다.");
          return;
        }

        setArtist(artistDoc);
        setForm({
          name: artistDoc.name || "",
          nameKo: artistDoc.nameKo || "",
          tagline: artistDoc.tagline || "",
          bio: artistDoc.bio || "",
          bioEn: artistDoc.bioEn || "",
          location: artistDoc.location || "",
          profileImageUrl: artistDoc.profileImageUrl || "",
          instagramUrl: artistDoc.instagramUrl || "",
          youtubeUrl: artistDoc.youtubeUrl || "",
          cvUrl: artistDoc.cvUrl || "",
          artsyUrl: artistDoc.artsyUrl || "",
          websiteUrl: artistDoc.websiteUrl || "",
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

  const handleChange = (key: keyof FormState, value: string) => {
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
      setMessage("");
      setErrorMessage("");

      await updateArtistProfile(uid, {
        name: form.name,
        nameKo: form.nameKo,
        tagline: form.tagline,
        bio: form.bio,
        bioEn: form.bioEn,
        location: form.location,
        profileImageUrl: form.profileImageUrl,
        instagramUrl: form.instagramUrl,
        youtubeUrl: form.youtubeUrl,
        cvUrl: form.cvUrl,
        artsyUrl: form.artsyUrl,
        websiteUrl: form.websiteUrl,
      });

      setMessage("프로필 정보가 저장되었습니다.");
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "저장 중 오류가 발생했습니다.";

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
                작가 기본 정보, 소개글, 링크 정보를 입력하는 페이지입니다.
                현재는 URL 입력 방식으로 운영하고, 이후 Cloudflare R2 업로드
                기능을 붙일 수 있습니다.
              </p>
            </div>

            <aside className="flex justify-start md:justify-end">
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
                      {isLoading ? "Loading..." : artist?.status || "No data"}
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </div>

          <div className="border-t border-black/5 py-8 md:py-10">
            <div className="grid gap-6 lg:grid-cols-2">
              <section className="space-y-5 rounded-[1.75rem] bg-white p-6">
                <InputField
                  label="English Name"
                  value={form.name}
                  onChange={(value) => handleChange("name", value)}
                />

                <InputField
                  label="Korean Name"
                  value={form.nameKo}
                  onChange={(value) => handleChange("nameKo", value)}
                />

                <InputField
                  label="Location"
                  value={form.location}
                  placeholder="Lives & works in Seoul, Korea"
                  onChange={(value) => handleChange("location", value)}
                />

                <InputField
                  label="Tagline"
                  value={form.tagline}
                  onChange={(value) => handleChange("tagline", value)}
                />

                <InputField
                  label="Profile Image URL"
                  value={form.profileImageUrl}
                  onChange={(value) => handleChange("profileImageUrl", value)}
                />
              </section>

              <section className="space-y-5 rounded-[1.75rem] bg-white p-6">
                <InputField
                  label="Instagram URL"
                  value={form.instagramUrl}
                  onChange={(value) => handleChange("instagramUrl", value)}
                />

                <InputField
                  label="YouTube URL"
                  value={form.youtubeUrl}
                  onChange={(value) => handleChange("youtubeUrl", value)}
                />

                <InputField
                  label="CV URL"
                  value={form.cvUrl}
                  onChange={(value) => handleChange("cvUrl", value)}
                />

                <InputField
                  label="Artsy URL"
                  value={form.artsyUrl}
                  onChange={(value) => handleChange("artsyUrl", value)}
                />

                <InputField
                  label="Website URL"
                  value={form.websiteUrl}
                  onChange={(value) => handleChange("websiteUrl", value)}
                />
              </section>

              <section className="space-y-5 rounded-[1.75rem] bg-white p-6 lg:col-span-2">
                <TextareaField
                  label="Korean Biography"
                  value={form.bio}
                  rows={8}
                  onChange={(value) => handleChange("bio", value)}
                />

                <TextareaField
                  label="English Biography"
                  value={form.bioEn}
                  rows={8}
                  onChange={(value) => handleChange("bioEn", value)}
                />

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
              </section>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function InputField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
        {label}
      </label>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-3 h-13 w-full rounded-2xl border border-black/10 bg-[#f7f6f2] px-4 text-sm outline-none transition placeholder:text-neutral-400 focus:border-black/20"
      />
    </div>
  );
}

function TextareaField({
  label,
  value,
  rows,
  onChange,
}: {
  label: string;
  value: string;
  rows: number;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
        {label}
      </label>
      <textarea
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className="mt-3 w-full rounded-2xl border border-black/10 bg-[#f7f6f2] px-4 py-4 text-sm leading-7 outline-none transition focus:border-black/20"
      />
    </div>
  );
}