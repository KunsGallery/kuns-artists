"use client";

import { useEffect } from "react";
import type { PublicArLayoutProps } from "./types";
import { usePublicArViewport } from "./usePublicArViewport";
import { PublicArDesktopLayout } from "./PublicArDesktopLayout";
import { PublicArMobileLayout } from "./PublicArMobileLayout";

type PublicArResponsiveLayoutProps = PublicArLayoutProps;

function PublicArPendingShell() {
  return (
    <main className="public-ar-page min-h-screen overflow-x-hidden bg-[#111111] text-[#F7F1E8]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/5" />

      <div className="mx-auto max-w-6xl px-5 py-6 md:px-8 md:py-8">
        <div className="h-6 w-40 rounded-full bg-white/8" />

        <section className="mt-6 space-y-5 rounded-[2.4rem] border border-white/10 bg-[#161616] p-5 shadow-[0_28px_110px_rgba(0,0,0,0.28)] md:p-8">
          <div className="h-4 w-24 rounded-full bg-white/8" />
          <div className="h-10 w-3/5 rounded-[1.1rem] bg-white/8" />
          <div className="grid gap-3 md:grid-cols-3">
            <div className="h-24 rounded-[1.2rem] border border-white/8 bg-white/[0.03]" />
            <div className="h-24 rounded-[1.2rem] border border-white/8 bg-white/[0.03]" />
            <div className="h-24 rounded-[1.2rem] border border-white/8 bg-white/[0.03]" />
          </div>
          <div className="h-[min(56vh,560px)] rounded-[2rem] border border-white/8 bg-white/[0.03]" />
        </section>
      </div>
    </main>
  );
}

export function PublicArResponsiveLayout({
  work,
  workHref,
  artistHref,
  publicArUrl,
  quickLookUsdzUrl,
  webXrHref,
  webXrSupportStatus,
  arMediaUrl,
  source,
  debugMessage,
  docentAudioEnabled,
  docentAudioUrl,
  docentAudioTitle,
  docentAudioDescription,
}: PublicArResponsiveLayoutProps) {
  const viewport = usePublicArViewport();

  useEffect(() => {
    document.body.classList.add("public-ar-route");

    return () => {
      document.body.classList.remove("public-ar-route");
    };
  }, []);

  if (viewport === "pending") {
    return <PublicArPendingShell />;
  }

  if (viewport === "desktop") {
    return (
      <PublicArDesktopLayout
        work={work}
        workHref={workHref}
        artistHref={artistHref}
        publicArUrl={publicArUrl}
        quickLookUsdzUrl={quickLookUsdzUrl}
        webXrHref={webXrHref}
        webXrSupportStatus={webXrSupportStatus}
        arMediaUrl={arMediaUrl}
        source={source}
        debugMessage={debugMessage}
        docentAudioEnabled={docentAudioEnabled}
        docentAudioUrl={docentAudioUrl}
        docentAudioTitle={docentAudioTitle}
        docentAudioDescription={docentAudioDescription}
      />
    );
  }

  return (
    <PublicArMobileLayout
      work={work}
      workHref={workHref}
      artistHref={artistHref}
      publicArUrl={publicArUrl}
      quickLookUsdzUrl={quickLookUsdzUrl}
      webXrHref={webXrHref}
      webXrSupportStatus={webXrSupportStatus}
      arMediaUrl={arMediaUrl}
      source={source}
      debugMessage={debugMessage}
      docentAudioEnabled={docentAudioEnabled}
      docentAudioUrl={docentAudioUrl}
      docentAudioTitle={docentAudioTitle}
      docentAudioDescription={docentAudioDescription}
    />
  );
}
