"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { assertAllowedArtist, signInWithGoogle } from "@/lib/firebase/auth";

export default function ArtistLoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const user = await signInWithGoogle();
      await assertAllowedArtist(user);

      router.push("/artist/dashboard");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "로그인 중 오류가 발생했습니다.";

      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
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

            <nav className="flex items-center gap-2 md:gap-3">
              <Link
                href="/artists"
                className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm"
              >
                Artists
              </Link>
            </nav>
          </header>

          <div className="grid gap-10 py-12 md:grid-cols-[1.05fr_0.95fr] md:items-end md:py-16">
            <div className="max-w-4xl">
              <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
                Artist Access
              </p>

              <h1 className="mt-5 text-5xl font-semibold tracking-[-0.04em] text-neutral-950 md:text-7xl md:leading-[0.95]">
                Sign in
                <br />
                for artist
                <br />
                updates.
              </h1>

              <p className="mt-8 max-w-xl text-sm leading-7 text-neutral-600 md:text-[15px]">
                등록된 작가 계정만 로그인할 수 있습니다. 로그인 후 본인 페이지에서
                프로필, 작품 정보, 아카이브 데이터를 직접 업데이트할 수 있도록
                확장할 예정입니다.
              </p>
            </div>

            <div className="flex justify-start md:justify-end">
              <div className="w-full max-w-[440px] rounded-[2rem] border border-black/10 bg-white/80 p-5 backdrop-blur-sm md:p-6">
                <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
                  Google Sign-In
                </p>

                <div className="mt-5 space-y-4">
                  <div className="rounded-[1.5rem] bg-[#f7f6f2] px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                      Access Policy
                    </p>
                    <p className="mt-2 text-sm leading-6 text-neutral-600">
                      Google account
                      <br />
                      registered artist only
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="inline-flex h-14 w-full items-center justify-center rounded-full bg-neutral-950 px-6 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isLoading ? "로그인 중..." : "Google로 로그인"}
                  </button>

                  {errorMessage ? (
                    <div className="rounded-[1.25rem] bg-[#f7f6f2] px-4 py-4 text-sm leading-7 text-red-600">
                      {errorMessage}
                    </div>
                  ) : null}

                  <div className="rounded-[1.25rem] bg-[#f7f6f2] px-4 py-4 text-xs leading-6 text-neutral-500">
                    현재는 Firebase Authentication과 Firestore에 등록된 작가만
                    접근할 수 있도록 설계합니다.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}