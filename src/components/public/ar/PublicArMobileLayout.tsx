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
  webXrHref,
  webXrSupportStatus,
  source,
  debugMessage,
  docentAudioEnabled,
  docentAudioUrl,
  docentAudioTitle,
  docentAudioDescription,
}: PublicArMobileLayoutProps) {
  return (
    <main className="public-ar-page min-h-screen overflow-x-hidden bg-[#111111] text-[#F7F1E8]">
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

            {webXrHref && webXrSupportStatus === "supported" ? (
              <div className="mt-4 rounded-[1.4rem] border border-[#F37021]/25 bg-[#F37021]/8 p-4">
                <p className="text-[11px] uppercase tracking-[0.34em] text-[#FFB37B]">
                  Beta
                </p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#F7F1E8]">
                      정밀 배치로 열기
                    </p>
                    <p className="mt-1 text-sm leading-6 text-white/62">
                      지원되는 모바일 기기에서 WebXR AR 베타를 엽니다.
                    </p>
                  </div>

                  <Link
                    href={webXrHref}
                    className="inline-flex h-11 shrink-0 items-center justify-center rounded-full border border-[#F37021]/35 bg-[#F37021]/12 px-4 text-sm text-[#F7F1E8] transition hover:border-[#F37021]/55 hover:bg-[#F37021]/18"
                  >
                    정밀 배치로 열기 Beta
                  </Link>
                </div>
              </div>
            ) : null}
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
    </main>
  );
}
