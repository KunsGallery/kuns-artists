"use client";

import { useMemo, useState } from "react";
import QRCodePanel from "./QRCodePanel";
import { getArGlbUrl, getArUsdzUrl, hasArAsset } from "@/lib/workDisplay";
import type { Work } from "@/types/work";

type DeviceRedirectProps = {
  work: Work;
};

type DeviceInfo = {
  isReady: boolean;
  isMobile: boolean;
  isIos: boolean;
  isAndroid: boolean;
  currentUrl: string;
  origin: string;
};

const initialDeviceInfo: DeviceInfo = {
  isReady: false,
  isMobile: false,
  isIos: false,
  isAndroid: false,
  currentUrl: "",
  origin: "",
};

function getDeviceInfo(): DeviceInfo {
  const ua = window.navigator.userAgent.toLowerCase();

  const isIos = /iphone|ipad|ipod/i.test(ua);
  const isAndroid = /android/i.test(ua);
  const isMobile =
    isIos || isAndroid || /mobile|blackberry|iemobile|opera mini/i.test(ua);

  return {
    isReady: true,
    isMobile,
    isIos,
    isAndroid,
    currentUrl: window.location.href,
    origin: window.location.origin,
  };
}

function getAbsoluteModelUrl(modelPath: string | undefined, origin: string) {
  if (!modelPath || !origin) return "";

  return modelPath.startsWith("http") ? modelPath : `${origin}${modelPath}`;
}

function getAndroidSceneViewerIntent(absoluteGlbUrl: string, title: string) {
  const sceneViewerUrl =
    `https://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(
      absoluteGlbUrl
    )}` + `&mode=ar_preferred&title=${encodeURIComponent(title)}`;

  return (
    `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(
      absoluteGlbUrl
    )}` +
    `&mode=ar_preferred&title=${encodeURIComponent(title)}` +
    `#Intent;scheme=https;package=com.google.android.googlequicksearchbox;` +
    `action=android.intent.action.VIEW;` +
    `S.browser_fallback_url=${encodeURIComponent(sceneViewerUrl)};end;`
  );
}

function ActionLink({
  href,
  children,
  accent = false,
  rel,
  target,
}: {
  href: string;
  children: string;
  accent?: boolean;
  rel?: string;
  target?: string;
}) {
  return (
    <a
      href={href}
      rel={rel}
      target={target}
      className={`inline-flex h-11 items-center justify-center rounded-full px-4 text-sm transition ${
        accent
          ? "border border-[#F37021]/35 bg-[#F37021]/10 text-[#F7F1E8] hover:border-[#F37021]/55 hover:bg-[#F37021]/16"
          : "border border-white/10 bg-white/[0.04] text-[#F7F1E8] hover:border-[#F37021]/35 hover:bg-[#F37021]/10"
      }`}
    >
      {children}
    </a>
  );
}

export default function DeviceRedirect({ work }: DeviceRedirectProps) {
  const [deviceInfo] = useState<DeviceInfo>(() => {
    if (typeof window === "undefined") {
      return initialDeviceInfo;
    }

    return getDeviceInfo();
  });
  const arReady = hasArAsset(work);

  const imageUrl = work.coverImageUrl || work.coverImage || "";
  const workHref = work.slug ? `/works/${work.slug}` : "/works";
  const artistHref = work.artistSlug ? `/artists/${work.artistSlug}` : "/artists";

  const absoluteGlbUrl = useMemo(() => {
    return getAbsoluteModelUrl(getArGlbUrl(work), deviceInfo.origin);
  }, [deviceInfo.origin, work]);

  const iosLink = useMemo(() => {
    return getAbsoluteModelUrl(getArUsdzUrl(work), deviceInfo.origin);
  }, [deviceInfo.origin, work]);

  const androidIntent = useMemo(() => {
    if (!absoluteGlbUrl) return null;
    return getAndroidSceneViewerIntent(absoluteGlbUrl, work.title);
  }, [absoluteGlbUrl, work.title]);

  const hasIosAr = deviceInfo.isIos && Boolean(iosLink);
  const hasAndroidAr = deviceInfo.isAndroid && Boolean(androidIntent);
  const hasMobileAr = hasIosAr || hasAndroidAr;

  const previewVisual = imageUrl ? (
    <div className="relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-black/20">
      <img
        src={imageUrl}
        alt={work.title}
        className="h-[320px] w-full object-cover md:h-[480px] lg:h-[600px]"
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_35%,rgba(0,0,0,0.34))]" />
      <div className="absolute left-4 top-4 rounded-full border border-white/12 bg-black/40 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-white/80">
        Artwork Preview
      </div>
    </div>
  ) : (
    <div className="flex h-[320px] flex-col justify-between rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.015)),radial-gradient(circle_at_18%_18%,rgba(243,112,33,0.18),transparent_30%)] p-5 md:h-[480px] lg:h-[600px] lg:p-6">
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-[0.34em] text-white/42">
          Artwork Preview
        </p>
        <p className="max-w-sm text-sm leading-7 text-white/62">
          작품 이미지를 준비 중입니다.
        </p>
      </div>
      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-[0.28em] text-white/42">
          KÜN’S Gallery
        </p>
        <p className="text-lg font-medium tracking-[-0.03em] text-[#F7F1E8]">
          {work.title}
        </p>
        <p className="text-sm text-white/55">{work.artistName}</p>
      </div>
    </div>
  );

  if (!arReady) {
    return (
      <section className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#161616] shadow-[0_30px_120px_rgba(0,0,0,0.35)]">
        <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative border-b border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.012)),radial-gradient(circle_at_18%_18%,rgba(243,112,33,0.16),transparent_28%),#141414] p-4 md:p-6 lg:border-b-0 lg:border-r lg:p-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(243,112,33,0.1),transparent_35%)]" />
            <div className="relative space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-white/50">
                  AR Preview
                </span>
                <span className="inline-flex rounded-full border border-[#F37021]/25 bg-[#F37021]/10 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-[#ffad76]">
                  Preparing
                </span>
              </div>

              {previewVisual}
            </div>
          </div>

          <div className="p-5 md:p-6 lg:p-8">
            <div className="mb-5 h-px w-24 bg-gradient-to-r from-[#F37021]/80 to-transparent" />
            <p className="text-[11px] uppercase tracking-[0.28em] text-white/42">
              Device Guidance
            </p>
            <h3 className="mt-3 text-2xl font-medium tracking-[-0.04em] text-[#F7F1E8] md:text-3xl">
              AR preview is being prepared.
            </h3>
            <p className="mt-4 max-w-xl text-sm leading-7 text-white/62">
              This artwork page is available, but the AR preview file has not been connected yet.
            </p>

            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[10px] uppercase tracking-[0.26em] text-white/42">
                Guided View
              </p>
              <p className="mt-2 text-sm leading-7 text-white/68">
                View the artwork now, or return to the artist and gallery index while the AR preview is being prepared.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <ActionLink href={workHref} accent>
                  View Artwork
                </ActionLink>
                {work.artistSlug ? (
                  <ActionLink href={artistHref}>
                    View Artist Page
                  </ActionLink>
                ) : null}
                <ActionLink href="/artists">Back to Artists</ActionLink>
              </div>
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-[#F37021]/15 bg-[#F37021]/8 px-4 py-4 text-sm leading-7 text-[#ffb37a]">
              The AR preview will appear here once the gallery connects the required file.
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#161616] shadow-[0_30px_120px_rgba(0,0,0,0.35)]">
      <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative border-b border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.012)),radial-gradient(circle_at_18%_18%,rgba(243,112,33,0.16),transparent_28%),#141414] p-4 md:p-6 lg:border-b-0 lg:border-r lg:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(243,112,33,0.1),transparent_35%)]" />
          <div className="relative space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-white/50">
                AR Preview
              </span>
              <span className="inline-flex rounded-full border border-[#F37021]/25 bg-[#F37021]/10 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-[#ffad76]">
                Available
              </span>
            </div>

            {previewVisual}
          </div>
        </div>

        <div className="p-5 md:p-6 lg:p-8">
          <div className="mb-5 h-px w-24 bg-gradient-to-r from-[#F37021]/80 to-transparent" />
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/42">
            Device Guidance
          </p>
          <h3 className="mt-3 text-2xl font-medium tracking-[-0.04em] text-[#F7F1E8] md:text-3xl">
            {deviceInfo.isReady && deviceInfo.isMobile
              ? "Use your device camera and supported browser for the best AR preview experience."
              : "Open this page on a mobile device to view the AR preview."}
          </h3>
          <p className="mt-4 max-w-xl text-sm leading-7 text-white/62">
            Desktop users can scan the QR code to continue on mobile. Mobile users can launch the AR preview directly when supported.
          </p>

          <div className="mt-6">
            {deviceInfo.isReady && deviceInfo.isMobile ? (
              <div className="flex flex-col gap-3">
                {hasIosAr && iosLink ? (
                  <a
                    href={iosLink}
                    rel="ar"
                    className="inline-flex h-11 items-center justify-center rounded-full border border-[#F37021]/35 bg-[#F37021]/10 px-5 text-sm text-[#F7F1E8] transition hover:border-[#F37021]/55 hover:bg-[#F37021]/16"
                  >
                    View AR
                  </a>
                ) : null}
                {hasAndroidAr && androidIntent ? (
                  <a
                    href={androidIntent}
                    className="inline-flex h-11 items-center justify-center rounded-full border border-[#F37021]/35 bg-[#F37021]/10 px-5 text-sm text-[#F7F1E8] transition hover:border-[#F37021]/55 hover:bg-[#F37021]/16"
                  >
                    View AR
                  </a>
                ) : null}
                {!hasMobileAr ? (
                  <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-white/60">
                    AR preview is being prepared.
                    <br />
                    <span className="text-white/46">
                      This artwork page is available, but the AR preview file has not been connected yet.
                    </span>
                  </div>
                ) : null}
              </div>
            ) : (
              <QRCodePanel url={deviceInfo.currentUrl} />
            )}
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/[0.03] px-4 py-4">
            <p className="text-[10px] uppercase tracking-[0.26em] text-white/42">
              Supporting Links
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <ActionLink href={workHref} accent>
                View Artwork
              </ActionLink>
              {work.artistSlug ? (
                <ActionLink href={artistHref}>
                  View Artist Page
                </ActionLink>
              ) : null}
              <ActionLink href="/artists">View Artists</ActionLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
