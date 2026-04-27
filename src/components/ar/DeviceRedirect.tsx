"use client";

import { useEffect, useMemo, useState } from "react";
import ArtworkViewer from "./ArtworkViewer";
import QRCodePanel from "./QRCodePanel";
import type { Work } from "@/data/works";

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
    isIos ||
    isAndroid ||
    /mobile|blackberry|iemobile|opera mini/i.test(ua);

  return {
    isReady: true,
    isMobile,
    isIos,
    isAndroid,
    currentUrl: window.location.href,
    origin: window.location.origin,
  };
}

function getIosQuickLookLink(modelUsdz?: string) {
  if (!modelUsdz) return null;
  return modelUsdz;
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

export default function DeviceRedirect({ work }: DeviceRedirectProps) {
  const [deviceInfo, setDeviceInfo] =
    useState<DeviceInfo>(initialDeviceInfo);

  useEffect(() => {
    setDeviceInfo(getDeviceInfo());
  }, []);

  const absoluteGlbUrl = useMemo(() => {
    return getAbsoluteModelUrl(work.modelGlb, deviceInfo.origin);
  }, [work.modelGlb, deviceInfo.origin]);

  const iosLink = useMemo(() => {
    return getIosQuickLookLink(work.modelUsdz);
  }, [work.modelUsdz]);

  const androidIntent = useMemo(() => {
    if (!absoluteGlbUrl) return null;
    return getAndroidSceneViewerIntent(absoluteGlbUrl, work.title);
  }, [absoluteGlbUrl, work.title]);

  const hasIosAr = deviceInfo.isIos && Boolean(iosLink);
  const hasAndroidAr = deviceInfo.isAndroid && Boolean(androidIntent);
  const hasMobileAr = hasIosAr || hasAndroidAr;

  const artworkViewer = (
    <ArtworkViewer
      title={work.title}
      artistName={work.artistName}
      coverImage={work.coverImage}
      description={work.description}
      medium={work.medium}
      dimensions={work.dimensions}
      year={work.year}
    />
  );

  if (!deviceInfo.isReady || !deviceInfo.isMobile) {
    return (
      <div className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
        {artworkViewer}
        <QRCodePanel url={deviceInfo.currentUrl} />
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
      {artworkViewer}

      <section className="rounded-[1.75rem] border border-black/8 bg-white p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
              AR Launch
            </p>
            <h3 className="mt-3 text-[1.5rem] font-medium tracking-[-0.03em] text-neutral-950">
              View in your space
            </h3>
          </div>

          <span className="text-sm text-neutral-400">Mobile</span>
        </div>

        <p className="mt-5 text-sm leading-7 text-neutral-600">
          모바일에서는 기기 환경에 따라 바로 AR 실행 버튼이 표시됩니다.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          {hasIosAr && iosLink ? (
            <a
              href={iosLink}
              rel="ar"
              className="inline-flex h-14 items-center justify-center rounded-full bg-neutral-950 px-6 text-sm font-medium text-white transition hover:opacity-90"
            >
              iPhone에서 AR 보기
            </a>
          ) : null}

          {hasAndroidAr && androidIntent ? (
            <a
              href={androidIntent}
              className="inline-flex h-14 items-center justify-center rounded-full bg-neutral-950 px-6 text-sm font-medium text-white transition hover:opacity-90"
            >
              Android에서 AR 보기
            </a>
          ) : null}

          {!hasMobileAr ? (
            <div className="rounded-[1.25rem] bg-[#f7f6f2] px-4 py-4 text-sm leading-7 text-neutral-600">
              아직 이 작품의 AR 파일이 연결되지 않았습니다.
              <br />
              <span className="text-neutral-500">
                `public/models` 안의 GLB, USDZ 파일 경로를 확인해주세요.
              </span>
            </div>
          ) : null}
        </div>

        <div className="mt-6 rounded-[1.25rem] bg-[#f7f6f2] px-4 py-4 text-xs leading-6 text-neutral-500">
          Desktop에서는 QR을 통해 모바일로 이어지고,
          <br />
          Mobile에서는 바로 AR 버튼으로 진입합니다.
        </div>
      </section>
    </div>
  );
}