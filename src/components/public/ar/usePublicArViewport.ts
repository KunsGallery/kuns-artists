"use client";

import { useEffect, useState } from "react";
import type { PublicArViewport } from "./types";

export function usePublicArViewport(): PublicArViewport {
  const [viewport, setViewport] = useState<PublicArViewport>("pending");

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");

    const updateViewport = () => {
      setViewport(mediaQuery.matches ? "desktop" : "mobile");
    };

    updateViewport();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updateViewport);

      return () => {
        mediaQuery.removeEventListener("change", updateViewport);
      };
    }

    mediaQuery.addListener(updateViewport);

    return () => {
      mediaQuery.removeListener(updateViewport);
    };
  }, []);

  return viewport;
}
