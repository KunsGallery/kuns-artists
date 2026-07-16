"use client";

import Link from "next/link";
import DocentAudioPlayer from "@/components/ar/DocentAudioPlayer";
import { ArtworkModelViewer } from "@/components/ar-v2/ArtworkModelViewer";
import type { PublicArLayoutProps } from "./types";
import { PublicArDetails } from "./PublicArDetails";
import { PublicArInstructions } from "./PublicArInstructions";
import { PublicArMetadata } from "./PublicArMetadata";
import { PublicArQrCard } from "./PublicArQrCard";

type PublicArDesktopLayoutProps = PublicArLayoutProps;

export function PublicArDesktopLayout({
  work,
  workHref,
  artistHref,
  publicArUrl,
  arMediaUrl,
  source,
  debugMessage,
  docentAudioEnabled,
  docentAudioUrl,
  docentAudioTitle,
  docentAudioDescription,
}: PublicArDesktopLayoutProps) {
  return (
    <main className="public-ar-page min-h-screen overflow-x-hidden bg-[#111111] text-[#F7F1E8]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/5" />

      <div className="mx-auto max-w-7xl px-5 py-6 md:px-8 md:py-8">
        <header className="flex items-center justify-between">
          <Link
            href="/"
            className="text-[11px] uppercase tracking-[0.34em] text-white/45"
          >
            KÜN’S GALLERY
          </Link>

          <p className="text-[10px] uppercase tracking-[0.28em] text-white/38">
            Desktop QR Handoff
          </p>
        </header>

        <section className="mt-6 overflow-hidden rounded-[2.4rem] border border-white/10 bg-[#161616] shadow-[0_28px_110px_rgba(0,0,0,0.32)]">
          <div className="grid gap-0 lg:grid-cols-[1.06fr_0.94fr]">
            <div className="border-b border-white/10 p-5 md:p-6 lg:border-b-0 lg:border-r lg:p-8">
              <PublicArMetadata work={work} artistHref={artistHref} />

              <div className="mt-5 rounded-[2rem] border border-white/10 bg-[#141414] p-4 shadow-[0_18px_60px_rgba(0,0,0,0.24)] md:p-5">
                <ArtworkModelViewer
                  objectUrl={arMediaUrl || null}
                  arDisabled={!arMediaUrl}
                  showArButton={false}
                  showToolbar={false}
                  stageClassName="min-h-[clamp(360px,45vw,600px)] lg:min-h-[600px]"
                  viewerClassName="h-[clamp(360px,45vw,600px)] lg:h-[600px]"
                />
              </div>

              <div className="mt-5">
                <PublicArInstructions viewport="desktop" />
              </div>
            </div>

            <div className="space-y-5 p-5 md:p-6 lg:p-8">
              <PublicArQrCard url={publicArUrl} />

              <PublicArDetails
                work={work}
                workHref={workHref}
                artistHref={artistHref}
                source={source}
                debugMessage={debugMessage}
                footer={
                  docentAudioEnabled ? (
                    <DocentAudioPlayer
                      title={docentAudioTitle}
                      description={docentAudioDescription}
                      src={docentAudioUrl}
                    />
                  ) : null
                }
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
