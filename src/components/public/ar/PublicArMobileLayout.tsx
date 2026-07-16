"use client";

import Link from "next/link";
import DocentAudioPlayer from "@/components/ar/DocentAudioPlayer";
import { ArtworkModelViewer } from "@/components/ar-v2/ArtworkModelViewer";
import type { PublicArLayoutProps } from "./types";
import { PublicArDetails } from "./PublicArDetails";
import { PublicArInstructions } from "./PublicArInstructions";
import { PublicArMetadata } from "./PublicArMetadata";

type PublicArMobileLayoutProps = PublicArLayoutProps;

export function PublicArMobileLayout({
  work,
  workHref,
  artistHref,
  arMediaUrl,
  source,
  debugMessage,
  docentAudioEnabled,
  docentAudioUrl,
  docentAudioTitle,
  docentAudioDescription,
}: PublicArMobileLayoutProps) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#111111] text-[#F7F1E8]">
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(243,112,33,0.16),transparent_28%),radial-gradient(circle_at_84%_12%,rgba(255,255,255,0.05),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.015),transparent_28%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/5" />

        <div className="mx-auto max-w-6xl px-5 py-6 md:px-8 md:py-8">
          <header className="flex items-center justify-between">
            <Link
              href="/"
              className="text-[11px] uppercase tracking-[0.34em] text-white/45"
            >
              KÜN’S GALLERY
            </Link>

            <p className="text-[10px] uppercase tracking-[0.28em] text-white/38">
              Mobile AR
            </p>
          </header>

          <section className="mt-6 space-y-5">
            <PublicArMetadata work={work} artistHref={artistHref} />

            <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#161616] shadow-[0_24px_90px_rgba(0,0,0,0.28)]">
              <div className="border-b border-white/10 px-5 py-4 md:px-6">
                <p className="text-[11px] uppercase tracking-[0.34em] text-white/42">
                  3D 보기
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#F7F1E8]">
                  내 공간에 놓아보기
                </h2>
              </div>

              <div className="p-4 md:p-6">
                <div className="overflow-hidden rounded-[1.65rem] border border-white/10 bg-[#141414] shadow-[0_18px_60px_rgba(0,0,0,0.24)]">
                  <ArtworkModelViewer
                    objectUrl={arMediaUrl || null}
                    arDisabled={!arMediaUrl}
                    arButtonLabel="내 공간에 놓아보기"
                    showArButton
                    showToolbar={false}
                    stageClassName="min-h-[clamp(320px,92vw,560px)]"
                    viewerClassName="h-[clamp(320px,92vw,560px)]"
                  />
                </div>
              </div>
            </section>

            <PublicArInstructions viewport="mobile" />

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
          </section>
        </div>
      </div>
    </main>
  );
}
