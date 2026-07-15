"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import DocentAudioPlayer from "@/components/ar/DocentAudioPlayer";
import DeviceRedirect from "@/components/ar/DeviceRedirect";
import { ArtworkModelViewer } from "@/components/ar-v2/ArtworkModelViewer";
import { getArtistBySlug } from "@/data/artists";
import { getWorkBySlug as getStaticWorkBySlug } from "@/data/works";
import {
  getWorkBySlugForPublicRoute,
  resolveArtistWorkSlug,
  type ArtistWorkDoc,
} from "@/lib/firebase/firestore";
import {
  getLegacyArGlbUrl,
  getLegacyArUsdzUrl,
  getReadyArV2GlbUrl,
  hasArAsset,
  hasLegacyArAsset,
  hasReadyArV2Asset,
} from "@/lib/workDisplay";
import type { Work } from "@/types/work";

type PublicWork = Work & {
  id?: string;
};

const noop = () => undefined;

function mapPublicWork(
  firestoreWork?: ArtistWorkDoc | null,
  fallbackWork?: Work
): PublicWork | null {
  const slug = firestoreWork
    ? resolveArtistWorkSlug(firestoreWork)
    : fallbackWork?.slug ?? "";
  const artistSlug = firestoreWork?.artistSlug ?? fallbackWork?.artistSlug ?? "";
  const artistName =
    firestoreWork?.artistName ?? fallbackWork?.artistName ?? "";
  const title = firestoreWork?.title ?? fallbackWork?.title ?? "";

  if (!slug || !artistSlug || !artistName || !title) {
    return null;
  }

  return {
    id: firestoreWork?.id,
    slug,
    artistSlug,
    artistName,
    title,
    year: firestoreWork?.year ?? fallbackWork?.year,
    medium: firestoreWork?.medium ?? fallbackWork?.medium,
    dimensions: firestoreWork?.dimensions ?? fallbackWork?.dimensions,
    description: firestoreWork?.description ?? fallbackWork?.description,
    coverImage: firestoreWork?.coverImageUrl ?? fallbackWork?.coverImage,
    coverImageUrl: firestoreWork?.coverImageUrl ?? fallbackWork?.coverImageUrl,
    modelGlb:
      firestoreWork?.generatedGlbUrl ??
      firestoreWork?.modelGlb ??
      fallbackWork?.modelGlb,
    modelUsdz:
      firestoreWork?.generatedUsdzUrl ??
      firestoreWork?.modelUsdz ??
      fallbackWork?.modelUsdz,
    generatedGlbUrl:
      firestoreWork?.generatedGlbUrl ?? fallbackWork?.generatedGlbUrl,
    generatedUsdzUrl:
      firestoreWork?.generatedUsdzUrl ?? fallbackWork?.generatedUsdzUrl,
    arV2Config:
      firestoreWork?.arV2Config ?? fallbackWork?.arV2Config,
    arV2Asset:
      firestoreWork?.arV2Asset ?? fallbackWork?.arV2Asset,
    docentAudioEnabled:
      firestoreWork?.docentAudioEnabled ?? fallbackWork?.docentAudioEnabled,
    docentAudioUrl:
      firestoreWork?.docentAudioUrl ?? fallbackWork?.docentAudioUrl,
    docentAudioTitle:
      firestoreWork?.docentAudioTitle ?? fallbackWork?.docentAudioTitle,
    docentAudioDescription:
      firestoreWork?.docentAudioDescription ??
      fallbackWork?.docentAudioDescription,
    widthCm: firestoreWork?.widthCm ?? fallbackWork?.widthCm,
    heightCm: firestoreWork?.heightCm ?? fallbackWork?.heightCm,
    depthCm: firestoreWork?.depthCm ?? fallbackWork?.depthCm,
    frontRotationXDeg:
      firestoreWork?.frontRotationXDeg ?? fallbackWork?.frontRotationXDeg,
    frontRotationYDeg:
      firestoreWork?.frontRotationYDeg ?? fallbackWork?.frontRotationYDeg,
    sideMode: firestoreWork?.sideMode ?? fallbackWork?.sideMode,
    showBackLabel:
      firestoreWork?.showBackLabel ?? fallbackWork?.showBackLabel,
    isPublished: firestoreWork?.isPublished ?? fallbackWork?.isPublished,
    archived: firestoreWork?.archived ?? fallbackWork?.archived,
  };
}

function getWorkRouteSlug(work: PublicWork) {
  return work.slug
    ? work.slug
    : work.id
      ? resolveArtistWorkSlug({
          id: work.id,
          slug: work.slug,
          title: work.title,
          artistSlug: work.artistSlug,
        })
      : "";
}

function getWorkHref(work: PublicWork) {
  const routeSlug = getWorkRouteSlug(work);

  return routeSlug ? `/works/${routeSlug}` : "/works";
}

function getArtistHref(work?: PublicWork | null) {
  return work?.artistSlug ? `/artists/${work.artistSlug}` : "/artists";
}

function ButtonLink({
  href,
  children,
  accent = false,
  subtle = false,
}: {
  href: string;
  children: string;
  accent?: boolean;
  subtle?: boolean;
}) {
  const tone = accent
    ? "border-[#F37021]/35 bg-[#F37021]/10 text-[#F7F1E8] hover:border-[#F37021]/55 hover:bg-[#F37021]/16"
    : subtle
      ? "border-white/8 bg-white/[0.02] text-white/68 hover:border-white/16 hover:bg-white/[0.05]"
      : "border-white/10 bg-white/[0.04] text-[#F7F1E8] hover:border-[#F37021]/35 hover:bg-[#F37021]/10";

  return (
    <Link
      href={href}
      className={`inline-flex h-11 items-center justify-center rounded-full border px-4 text-sm transition ${tone}`}
    >
      {children}
    </Link>
  );
}

function InfoRow({
  label,
  value,
  href,
}: {
  label: string;
  value?: string;
  href?: string;
}) {
  if (!value) return null;

  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.03] px-4 py-4">
      <p className="text-[10px] uppercase tracking-[0.28em] text-white/42">
        {label}
      </p>
      {href ? (
        <Link
          href={href}
          className="mt-2 inline-flex items-center gap-2 text-sm leading-6 text-white/82 transition hover:text-[#FFB37B]"
        >
          <span>{value}</span>
          <span className="text-[#FF9B5A]">↗</span>
        </Link>
      ) : (
        <p className="mt-2 text-sm leading-6 text-white/82">{value}</p>
      )}
    </div>
  );
}

function DevDetails({
  source,
  debugMessage,
}: {
  source: "Firestore" | "Seed";
  debugMessage?: string;
}) {
  const showDebugNote = process.env.NODE_ENV === "development";

  if (!showDebugNote || !debugMessage) {
    return null;
  }

  return (
    <details className="mt-6 rounded-[1.25rem] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-white/62">
      <summary className="cursor-pointer list-none text-[11px] uppercase tracking-[0.22em] text-white/40">
        Development
      </summary>
      <p className="mt-3 text-[11px] uppercase tracking-[0.22em] text-white/42">
        Source: {source}
      </p>
      <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-white/42">
        {debugMessage}
      </p>
    </details>
  );
}

function ArNoticeScreen({
  title,
  description,
  actions,
  meta,
  debugMessage,
  source,
  eyebrow = "KÜN’S GALLERY",
}: {
  title: string;
  description: string;
  actions?: Array<{
    href: string;
    label: string;
    accent?: boolean;
    subtle?: boolean;
  }>;
  meta?: string;
  debugMessage?: string;
  source?: "Firestore" | "Seed";
  eyebrow?: string;
}) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#111111] text-[#F7F1E8]">
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(243,112,33,0.18),transparent_26%),radial-gradient(circle_at_84%_12%,rgba(255,255,255,0.06),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.015),transparent_28%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/5" />

        <div className="mx-auto max-w-7xl px-5 py-6 md:px-8 md:py-8">
          <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <Link
              href="/"
              className="text-[11px] uppercase tracking-[0.34em] text-white/45"
            >
              KÜN’S GALLERY
            </Link>

            <div className="flex flex-wrap gap-2">
              <ButtonLink href="/artists" subtle>
                View Artists
              </ButtonLink>
              <ButtonLink href="/artists" subtle>
                Back to Artists
              </ButtonLink>
            </div>
          </header>

          <section className="mt-8 rounded-[2.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02)),radial-gradient(circle_at_18%_18%,rgba(243,112,33,0.16),transparent_30%),#151515] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.38)] md:p-8">
            <div className="mb-5 h-px w-24 bg-gradient-to-r from-[#F37021]/80 to-transparent" />
            <p className="text-[11px] uppercase tracking-[0.34em] text-white/42">
              {eyebrow}
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[#F7F1E8] md:text-5xl">
              {title}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/68 md:text-[15px]">
              {description}
            </p>
            {meta ? (
              <p className="mt-4 text-[11px] uppercase tracking-[0.24em] text-white/42">
                {meta}
              </p>
            ) : null}
            {source || debugMessage ? (
              <DevDetails
                source={source || "Seed"}
                debugMessage={debugMessage}
              />
            ) : null}
            {actions && actions.length > 0 ? (
              <div className="mt-8 flex flex-wrap gap-2">
                {actions.map((action) => (
                  <ButtonLink
                    key={`${action.href}-${action.label}`}
                    href={action.href}
                    accent={action.accent}
                    subtle={action.subtle}
                  >
                    {action.label}
                  </ButtonLink>
                ))}
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}

function PublicWorkContent({
  work,
  source,
  debugMessage,
}: {
  work: Work;
  source: "Firestore" | "Seed";
  debugMessage?: string;
}) {
  const artist = getArtistBySlug(work.artistSlug);
  const showDebugNote = process.env.NODE_ENV === "development";
  const readyArV2GlbUrl = getReadyArV2GlbUrl(work);
  const legacyArGlbUrl = getLegacyArGlbUrl(work);
  const legacyArUsdzUrl = getLegacyArUsdzUrl(work);
  const hasReadyArV2 = hasReadyArV2Asset(work);
  const hasLegacyAr = hasLegacyArAsset(work);
  const arReady = hasArAsset(work);
  const arStatusLabel = hasReadyArV2
    ? "AR v2 Ready"
    : hasLegacyAr
      ? "Legacy AR Ready"
      : "AR Preview Preparing";
  const arHeroCopy = hasReadyArV2
    ? "View the approved AR v2 model in the public viewer, then continue with the docent audio guide below."
    : arReady
      ? "View the artwork in AR, then continue with the docent audio guide below."
      : "An AR preview for this artwork is being prepared.";
  const workHref = getWorkHref(work);
  const artistHref = getArtistHref(work);
  const artistPageHref = work.artistSlug ? artistHref : "";
  const docentAudioEnabled =
    work.docentAudioEnabled === true && Boolean(work.docentAudioUrl?.trim());
  const docentAudioUrl = work.docentAudioUrl?.trim() || "";
  const docentAudioTitle =
    work.docentAudioTitle?.trim() || "Docent Audio Guide";
  const docentAudioDescription = work.docentAudioDescription?.trim() || "";
  const legacyFallbackWork = useMemo(
    () => ({
      ...work,
      arV2Config: undefined,
      arV2Asset: undefined,
    }),
    [work]
  );

  const infoRows = [
    { label: "Title", value: work.title },
    {
      label: "Artist",
      value: artist?.name ?? work.artistName,
      href: work.artistSlug ? artistHref : undefined,
    },
    { label: "Year", value: work.year },
    { label: "Medium", value: work.medium },
    { label: "Dimensions", value: work.dimensions },
  ];

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#111111] text-[#F7F1E8]">
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(243,112,33,0.18),transparent_26%),radial-gradient(circle_at_84%_12%,rgba(255,255,255,0.06),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.015),transparent_28%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/5" />

        <div className="mx-auto max-w-7xl px-5 py-6 md:px-8 md:py-8">
          <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <Link
              href="/"
              className="text-[11px] uppercase tracking-[0.34em] text-white/45"
            >
              KÜN’S GALLERY
            </Link>

            <div className="flex flex-wrap gap-2">
              <ButtonLink href={workHref} subtle>
                View Artwork
              </ButtonLink>
              {work.artistSlug ? (
                <ButtonLink href={artistHref} subtle>
                  View Artist Page
                </ButtonLink>
              ) : null}
              <ButtonLink href="/artists" subtle>
                View Artists
              </ButtonLink>
            </div>
          </header>

          <section className="mt-8 rounded-[2.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02)),radial-gradient(circle_at_18%_18%,rgba(243,112,33,0.16),transparent_30%),#151515] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.38)] md:p-8">
            <div className="mb-5 h-px w-24 bg-gradient-to-r from-[#F37021]/80 to-transparent" />
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.34em] text-white/50">
                KÜN’S GALLERY
              </span>
              <span className="inline-flex rounded-full border border-[#F37021]/25 bg-[#F37021]/10 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-[#ffad76]">
                AR VIEWING ROOM
              </span>
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.24em] ${
                  arReady
                    ? "border-emerald-200/20 bg-emerald-50/10 text-emerald-200"
                    : "border-amber-200/20 bg-amber-50/10 text-amber-200"
                }`}
              >
                {arStatusLabel}
              </span>
            </div>

            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.05em] text-[#F7F1E8] md:text-6xl md:leading-[0.95]">
              {work.title}
            </h1>

            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
              {artistPageHref ? (
                <Link
                  href={artistPageHref}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-lg text-white/80 transition hover:border-[#F37021]/35 hover:bg-[#F37021]/10 hover:text-[#F7F1E8] md:text-xl"
                >
                  <span>{work.artistName}</span>
                  <span className="text-[#FF9B5A]">↗</span>
                </Link>
              ) : (
                <p className="text-lg text-white/72 md:text-xl">{work.artistName}</p>
              )}

              <span className="text-[11px] uppercase tracking-[0.24em] text-white/40">
                mobile viewing room
              </span>
            </div>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/68 md:text-[15px]">
              {arHeroCopy}
            </p>

            {arReady ? (
              <div className="mt-5 rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-4 text-sm leading-7 text-white/72">
                <p>Center the desired wall height before placing the artwork.</p>
                <p>The initial placement uses the artwork&apos;s actual dimensions.</p>
                <p>Pinch with two fingers to resize after placement.</p>
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-2">
              {arReady ? (
                <ButtonLink href="#ar-access" accent>
                  View in AR
                </ButtonLink>
              ) : null}
              <ButtonLink href={workHref} accent={!arReady}>
                View Artwork
              </ButtonLink>
              {work.artistSlug ? (
                <ButtonLink href={artistHref}>View Artist Page</ButtonLink>
              ) : null}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.1rem] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/62">
                Digital archive
              </div>
              <div className="rounded-[1.1rem] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/62">
                Public AR preview
              </div>
              <div className="rounded-[1.1rem] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/62">
                Contemporary presentation
              </div>
            </div>

            {work.description ? (
              <p className="mt-6 max-w-3xl text-[15px] leading-8 text-white/66">
                {work.description}
              </p>
            ) : null}

            {showDebugNote && debugMessage ? (
              <details className="mt-6 rounded-[1.25rem] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-white/62">
                <summary className="cursor-pointer list-none text-[11px] uppercase tracking-[0.22em] text-white/40">
                  Development
                </summary>
                <p className="mt-3 text-[11px] uppercase tracking-[0.22em] text-white/42">
                  Source: {source}
                </p>
                <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-white/42">
                  {debugMessage}
                </p>
              </details>
            ) : null}
          </section>
        </div>

        <section id="ar-access" className="mx-auto max-w-7xl px-5 pt-6 md:px-8 md:pt-8">
          {hasReadyArV2 ? (
            <div className="space-y-6">
              <div className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#161616] shadow-[0_30px_120px_rgba(0,0,0,0.35)]">
                <div className="grid gap-0 lg:grid-cols-[0.94fr_1.06fr] lg:items-stretch">
                  <div className="relative border-b border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.012)),radial-gradient(circle_at_18%_18%,rgba(243,112,33,0.16),transparent_28%),#141414] p-5 md:p-6 lg:border-b-0 lg:border-r lg:p-8">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(243,112,33,0.1),transparent_35%)]" />
                    <div className="relative flex h-full flex-col justify-between gap-6">
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-white/50">
                            AR v2
                          </span>
                          <span className="inline-flex rounded-full border border-emerald-200/20 bg-emerald-50/10 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-emerald-200">
                            Ready
                          </span>
                          {hasLegacyAr ? (
                            <span className="inline-flex rounded-full border border-[#F37021]/25 bg-[#F37021]/10 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-[#ffad76]">
                              Legacy fallback available
                            </span>
                          ) : null}
                        </div>

                        <div className="max-w-2xl space-y-3">
                          <h2 className="text-3xl font-semibold tracking-[-0.05em] text-[#F7F1E8] md:text-4xl">
                            Open the canonical GLB in the public viewer.
                          </h2>
                          <p className="text-sm leading-7 text-white/68 md:text-[15px]">
                            The same approved AR v2 model is shown here on desktop, while mobile devices can open the built-in AR experience from the viewer.
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-[1.1rem] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/62">
                          Desktop 3D preview
                        </div>
                        <div className="rounded-[1.1rem] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/62">
                          iPhone Quick Look
                        </div>
                        <div className="rounded-[1.1rem] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/62">
                          Android Scene Viewer
                        </div>
                      </div>

                      <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-4 text-sm leading-7 text-white/62">
                        {legacyArGlbUrl ? (
                          <p>
                            Legacy GLB is also archived for this work.
                            {legacyArUsdzUrl ? " USDZ fallback is available as well." : ""}
                          </p>
                        ) : (
                          <p>
                            This is the primary public AR v2 model for the work.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 md:p-6 lg:p-8">
                    <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#141414] shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
                      <ArtworkModelViewer
                        objectUrl={readyArV2GlbUrl}
                        arDisabled={!readyArV2GlbUrl}
                        onEvent={noop}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {hasLegacyAr ? (
                <div className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#161616] shadow-[0_30px_120px_rgba(0,0,0,0.28)]">
                  <DeviceRedirect work={legacyFallbackWork} />
                </div>
              ) : null}
            </div>
          ) : hasLegacyAr ? (
            <DeviceRedirect work={legacyFallbackWork} />
          ) : (
            <ArNoticeScreen
              title="AR preview is being prepared."
              description="This artwork is published, but the AR v2 model is not ready yet."
              meta={debugMessage || undefined}
              debugMessage={debugMessage || undefined}
            />
          )}
        </section>

        <section className="mx-auto max-w-7xl px-5 pt-6 md:px-8 md:pt-8">
          <div className="grid gap-6 lg:grid-cols-[0.98fr_1.02fr]">
            <article className="rounded-[2.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.02)),#151515] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.28)] md:p-8">
              <div className="mb-5 h-px w-24 bg-gradient-to-r from-[#F37021]/80 to-transparent" />
              <p className="text-[11px] uppercase tracking-[0.34em] text-white/42">
                Artwork Information
              </p>
              <h2 className="mt-4 text-2xl font-medium tracking-[-0.04em] text-[#F7F1E8] md:text-3xl">
                A precise archive record for the work.
              </h2>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {infoRows.map((row) => (
                  <InfoRow
                    key={row.label}
                    label={row.label}
                    value={row.value}
                    href={row.href}
                  />
                ))}
              </div>
            </article>

            <aside className="rounded-[2.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.02)),#151515] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.28)] md:p-8">
              <div className="mb-5 h-px w-24 bg-gradient-to-r from-[#F37021]/80 to-transparent" />
              <p className="text-[11px] uppercase tracking-[0.34em] text-white/42">
                Archive Note
              </p>
              <h2 className="mt-4 text-2xl font-medium tracking-[-0.04em] text-[#F7F1E8] md:text-3xl">
                Quiet details, presented with gallery restraint.
              </h2>

              <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
                <p className="text-[10px] uppercase tracking-[0.28em] text-white/42">
                  Description
                </p>
                {work.description ? (
                  <div className="mt-3 space-y-4 text-[15px] leading-8 text-white/68">
                    {work.description.split("\n").map((paragraph, index) => (
                      <p key={`description-${index}`}>{paragraph}</p>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm leading-7 text-white/46">
                    작품 설명이 준비 중입니다.
                  </p>
                )}
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <ButtonLink href={workHref} accent>
                  View Artwork
                </ButtonLink>
                {work.artistSlug ? (
                  <ButtonLink href={artistHref}>View Artist Page</ButtonLink>
                ) : null}
              </div>
            </aside>
          </div>
        </section>

        {docentAudioEnabled ? (
          <section className="mx-auto max-w-7xl px-5 pt-6 md:px-8 md:pt-8">
            <DocentAudioPlayer
              title={docentAudioTitle}
              description={docentAudioDescription}
              src={docentAudioUrl}
            />
          </section>
        ) : null}

        <section className="mx-auto max-w-7xl px-5 py-6 md:px-8 md:py-8">
          <div className="rounded-[2.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.02)),#151515] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.28)] md:p-8">
            <div className="mb-5 h-px w-24 bg-gradient-to-r from-[#F37021]/80 to-transparent" />
            <p className="text-[11px] uppercase tracking-[0.34em] text-white/42">
              Navigation
            </p>
            <h2 className="mt-4 text-2xl font-medium tracking-[-0.04em] text-[#F7F1E8] md:text-3xl">
              Continue browsing the gallery archive.
            </h2>

            <div className="mt-6 flex flex-wrap gap-2">
              <ButtonLink href={workHref} accent>
                View Artwork
              </ButtonLink>
              {work.artistSlug ? (
                <ButtonLink href={artistHref}>View Artist Page</ButtonLink>
              ) : null}
              <ButtonLink href="/artists">View Artists</ButtonLink>
              <ButtonLink href="/artists" subtle>
                Back to Artists
              </ButtonLink>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function PendingWorkNotice({
  work,
  source,
  debugMessage,
}: {
  work: Work | null;
  source: "Firestore" | "Seed";
  debugMessage?: string;
}) {
  const artistHref = work?.artistSlug ? `/artists/${work.artistSlug}` : "/artists";

  return (
    <ArNoticeScreen
      title="아직 공개 승인되지 않은 작품입니다."
      description="작품 정보는 내부 기준으로 확인되지만, 공개 승인 상태가 아니어서 공개 작품 상세 페이지에서는 아직 노출되지 않습니다."
      actions={[
        { href: artistHref, label: "View Artist Page" },
        { href: "/artists", label: "Back to Artists", subtle: true },
      ]}
      meta={work ? `${work.title} · ${work.artistName}` : undefined}
      debugMessage={debugMessage}
      source={source}
    />
  );
}

function MissingWorkNotice({
  slug,
  debugMessage,
}: {
  slug: string;
  debugMessage?: string;
}) {
  return (
    <ArNoticeScreen
      title="작품을 찾을 수 없습니다."
      description="요청한 경로와 일치하는 작품을 찾지 못했습니다."
      actions={[{ href: "/artists", label: "Back to Artists" }]}
      meta={`Requested path: ${slug}`}
      debugMessage={debugMessage}
    />
  );
}

export default function PublicArWorkPage({ slug }: { slug: string }) {
  const staticWork = useMemo(() => getStaticWorkBySlug(slug), [slug]);
  const [work, setWork] = useState<PublicWork | null>(staticWork ?? null);
  const [source, setSource] = useState<"Firestore" | "Seed">(
    staticWork ? "Seed" : "Seed"
  );
  const [isLoading, setIsLoading] = useState(true);
  const [unpublished, setUnpublished] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState("");

  useEffect(() => {
    let isActive = true;
    const timeoutId = window.setTimeout(() => {
      if (isActive) {
        setIsLoading(false);
        setLoadErrorMessage(
          "Loading artwork details is taking longer than usual. Showing the basic information first."
        );
      }
    }, 6000);

    void (async () => {
      try {
        const result = await getWorkBySlugForPublicRoute(slug);

        if (!isActive) {
          return;
        }

        if (result.work) {
          const merged = mapPublicWork(result.work, staticWork ?? undefined);

          if (merged) {
            setWork(merged);
          }

          setUnpublished(result.unpublished);
          setSource("Firestore");
          setLoadErrorMessage("");
        } else if (staticWork) {
          setWork(staticWork);
          setUnpublished(false);
          setSource("Seed");
          setLoadErrorMessage("");
        } else {
          setWork(null);
          setUnpublished(false);
          setSource("Seed");
          setLoadErrorMessage("");
        }
      } catch {
        if (!isActive) {
          return;
        }

        setWork(staticWork ?? null);
        setUnpublished(false);
        setSource("Seed");
        setLoadErrorMessage(
          "We couldn't load the artwork details, so the basic information is shown instead."
        );
      } finally {
        if (isActive) {
          window.clearTimeout(timeoutId);
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [slug, staticWork]);

  if (unpublished) {
    return (
      <PendingWorkNotice
        work={work}
        source={source}
        debugMessage={loadErrorMessage || undefined}
      />
    );
  }

  if (work) {
    return (
      <PublicWorkContent
        work={work}
        source={source}
        debugMessage={loadErrorMessage || undefined}
      />
    );
  }

  if (isLoading) {
    return (
      <ArNoticeScreen
        title="Loading artwork details."
        description="We are checking the public archive and loading the artwork record."
        meta={loadErrorMessage || undefined}
        debugMessage={loadErrorMessage || undefined}
      />
    );
  }

  return <MissingWorkNotice slug={slug} debugMessage={loadErrorMessage || undefined} />;
}
