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
    <main className="theme-dark min-h-screen bg-[radial-gradient(circle_at_top,_rgba(243,112,33,0.12),transparent_26%),linear-gradient(180deg,#151515_0%,#111111_100%)] text-[#F7F1E8]">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-5 py-6 md:px-8 md:py-8">
        <header className="flex items-center justify-between">
          <Link
            href="/"
            className="text-[11px] uppercase tracking-[0.34em] text-white/45"
          >
            KÜN’S GALLERY
          </Link>

          <Link
            href="/artists"
            className="inline-flex h-11 items-center rounded-full border border-white/10 bg-white/[0.04] px-5 text-sm text-[#F7F1E8] transition hover:border-white/20 hover:bg-white/[0.08]"
          >
            Artists
          </Link>
        </header>

        <section className="flex flex-1 items-center py-12 md:py-16">
          <div className="w-full max-w-[540px]">
            <div className="mb-6 flex items-center gap-3">
              <span className="h-px flex-1 bg-white/10" />
              <span className="text-[10px] uppercase tracking-[0.34em] text-white/40">
                Artists Archive
              </span>
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <div className="rounded-[2.25rem] border border-white/10 bg-white/[0.035] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.24)] backdrop-blur-sm md:p-8">
              <p className="text-[11px] uppercase tracking-[0.34em] text-white/42">
                Artist Login
              </p>

              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-[#F7F1E8] md:text-6xl md:leading-[0.95]">
                Continue with
                <br />
                Google.
              </h1>

              <p className="mt-6 max-w-xl text-sm leading-7 text-white/68 md:text-[15px]">
                Sign in with your approved Google account to manage your artist
                profile and works.
              </p>

              <div className="mt-6 rounded-[1.4rem] border border-white/10 bg-black/15 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.26em] text-white/42">
                  Access
                </p>
                <p className="mt-2 text-sm leading-7 text-white/58">
                  Access is limited to approved artists and gallery administrators.
                </p>
              </div>

              {errorMessage ? (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="mt-6 rounded-[1.4rem] border border-red-500/20 bg-red-500/10 px-4 py-4 text-sm leading-7 text-red-200"
                >
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
                className="mt-6 inline-flex h-14 w-full items-center justify-center rounded-full bg-[#F37021] px-6 text-sm font-medium text-[#171717] transition hover:bg-[#ff7a2f] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSigningIn ? "Opening Google sign-in..." : "Continue with Google"}
              </button>

              <p className="mt-4 text-sm leading-6 text-white/46">
                {isInitializing && !errorMessage
                  ? "Checking your sign-in status..."
                  : "If the popup was blocked or closed, use the button above to try again."}
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
