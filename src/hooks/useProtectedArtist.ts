"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { assertAllowedArtist, logout } from "@/lib/firebase/auth";
import type { ArtistDoc } from "@/lib/firebase/firestore";

type UseProtectedArtistOptions = {
  requireAdmin?: boolean;
  redirectOnFail?: boolean;
  unauthenticatedRedirectPath?: string;
  forbiddenRedirectPath?: string;
  fallbackErrorMessage?: string;
};

function getErrorMessage(error: unknown, fallbackErrorMessage: string) {
  return error instanceof Error ? error.message : fallbackErrorMessage;
}

export function useProtectedArtist({
  requireAdmin = false,
  redirectOnFail = true,
  unauthenticatedRedirectPath = "/artist/login",
  forbiddenRedirectPath = "/artist/dashboard",
  fallbackErrorMessage = "계정 정보를 불러오는 중 오류가 발생했습니다.",
}: UseProtectedArtistOptions = {}) {
  const router = useRouter();
  const [artist, setArtist] = useState<ArtistDoc | null>(null);
  const [uid, setUid] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const handleAuthStateChange = useEffectEvent(async (user: User | null) => {
    try {
      setIsLoading(true);
      setErrorMessage("");

      if (!user) {
        setArtist(null);
        setUid("");
        setErrorMessage("로그인이 필요합니다.");

        if (redirectOnFail) {
          router.replace(unauthenticatedRedirectPath);
        }

        return;
      }

      const artistDoc = await assertAllowedArtist(user);

      if (requireAdmin && artistDoc.role !== "admin") {
        setArtist(null);
        setUid("");
        setErrorMessage("관리자 권한이 필요합니다.");

        if (redirectOnFail) {
          router.replace(forbiddenRedirectPath);
        }

        return;
      }

      setArtist(artistDoc);
      setUid(user.uid);
    } catch (error) {
      setArtist(null);
      setUid("");
      setErrorMessage(getErrorMessage(error, fallbackErrorMessage));

      await logout().catch(() => undefined);

      if (redirectOnFail) {
        router.replace(unauthenticatedRedirectPath);
      }
    } finally {
      setIsLoading(false);
    }
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      void handleAuthStateChange(user);
    });

    return () => unsubscribe();
  }, []);

  return {
    artist,
    uid,
    isLoading,
    errorMessage,
  };
}
