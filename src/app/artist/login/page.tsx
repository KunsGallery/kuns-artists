"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/client";
import { assertAllowedArtist, logout, signInWithGoogle } from "@/lib/firebase/auth";
import { getArtistHomePath } from "@/lib/artistRoutes";

function getLoginErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    const code = (error as { code: string }).code;

    if (code === "auth/popup-blocked") {
      return "브라우저가 로그인 팝업을 차단했습니다. 아래 버튼으로 다시 시도해주세요.";
    }

    if (code === "auth/popup-closed-by-user") {
      return "로그인이 취소되었습니다. 다시 시도해주세요.";
    }

    if (code === "auth/cancelled-popup-request") {
      return "로그인 창이 닫혔습니다. 아래 버튼으로 다시 열어주세요.";
    }
  }

  return error instanceof Error ? error.message : "로그인 중 오류가 발생했습니다.";
}

export default function ArtistLoginPage() {
  const router = useRouter();
  const hasAttemptedAutoSignIn = useRef(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleManualGoogleLogin() {
    try {
      setIsSigningIn(true);
      setErrorMessage("");

      const user = await signInWithGoogle();
      const artist = await assertAllowedArtist(user);
      router.replace(getArtistHomePath(artist.role));
    } catch (error) {
      setErrorMessage(getLoginErrorMessage(error));
      await logout().catch(() => undefined);
    } finally {
      setIsSigningIn(false);
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      void (async () => {
        try {
          if (user) {
            setErrorMessage("");
            const artist = await assertAllowedArtist(user);
            router.replace(getArtistHomePath(artist.role));
            return;
          }

          const skipAutoPrompt =
            new URLSearchParams(window.location.search).get("loggedOut") === "1";

          if (!skipAutoPrompt && !hasAttemptedAutoSignIn.current) {
            hasAttemptedAutoSignIn.current = true;
            try {
              setIsSigningIn(true);
              setErrorMessage("");

              const nextUser = await signInWithGoogle();
              const artist = await assertAllowedArtist(nextUser);
              router.replace(getArtistHomePath(artist.role));
            } catch (error) {
              setErrorMessage(getLoginErrorMessage(error));
              await logout().catch(() => undefined);
            } finally {
              setIsSigningIn(false);
            }
          }
        } catch (error) {
          setErrorMessage(getLoginErrorMessage(error));
          await logout().catch(() => undefined);
        } finally {
          setIsInitializing(false);
        }
      })();
    });

    return () => unsubscribe();
  }, [router]);

  return (
    <main className="theme-dark min-h-screen bg-[#f5f3ee] text-neutral-950">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-5 py-6 md:px-8 md:py-8">
        <header className="flex items-center justify-between">
          <Link
            href="/"
            className="text-[11px] uppercase tracking-[0.28em] text-neutral-500"
          >
            KÜN’S GALLERY
          </Link>

          <Link
            href="/artists"
            className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm"
          >
            작가 목록
          </Link>
        </header>

        <section className="grid flex-1 gap-10 py-12 md:grid-cols-[1.02fr_0.98fr] md:items-center md:py-16">
          <div className="max-w-4xl">
            <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
              작가 로그인
            </p>

            <h1 className="mt-5 text-5xl font-semibold tracking-[-0.04em] text-neutral-950 md:text-7xl md:leading-[0.95]">
              Sign in with
              <br />
              Google.
            </h1>

            <p className="mt-8 max-w-xl text-sm leading-7 text-neutral-600 md:text-[15px]">
              등록된 작가와 관리자 계정만 접근할 수 있습니다. 로그인 후 계정
              권한에 따라 작가 대시보드 또는 관리자 화면으로 이동합니다.
            </p>
          </div>

          <aside className="flex justify-start md:justify-end">
            <div className="w-full max-w-[460px] rounded-[2rem] border border-black/10 bg-white p-6 shadow-sm md:p-7">
              <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
                Access
              </p>

              <div className="mt-6 space-y-4">
                <div className="rounded-[1.5rem] bg-[#f7f6f2] px-5 py-5">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                    Google Account
                  </p>
                  <p className="mt-2 text-sm leading-6 text-neutral-600">
                    계정 선택 창이 기본으로 열리며, 허용된 이메일만 계속 진행됩니다.
                  </p>
                </div>

                <div className="rounded-[1.5rem] bg-[#f7f6f2] px-5 py-5">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                    Redirect
                  </p>
                  <p className="mt-2 text-sm leading-6 text-neutral-600">
                    관리자 계정은 `/admin`, 작가 계정은 `/artist/dashboard`로 이동합니다.
                  </p>
                </div>
              </div>

              {errorMessage ? (
                <div className="mt-6 rounded-[1.5rem] bg-[#fff3f1] px-5 py-4 text-sm leading-7 text-red-600">
                  {errorMessage}
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  hasAttemptedAutoSignIn.current = true;
                  void handleManualGoogleLogin();
                }}
                disabled={isSigningIn}
                className="mt-6 inline-flex h-14 w-full items-center justify-center rounded-full bg-neutral-950 px-6 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSigningIn
                  ? "Google 로그인 창을 여는 중..."
                  : "Google로 로그인"}
              </button>

              <p className="mt-4 text-sm leading-6 text-neutral-500">
                {isInitializing && !errorMessage
                  ? "로그인 상태를 확인하는 중입니다."
                  : "팝업이 차단되었거나 닫힌 경우 버튼으로 다시 시도해주세요."}
              </p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
