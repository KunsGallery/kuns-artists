"use client";

import { useEffect, useMemo, useState } from "react";
import { getWorkBySlug as getStaticWorkBySlug } from "@/data/works";
import { getWorkBySlugForPublicRoute } from "@/lib/firebase/firestore";
import { getReadyArV2GlbUrl } from "@/lib/workDisplay";
import { mapPublicArWork, getPublicArWorkRouteSlug } from "@/lib/publicArWork";
import type { PublicArWork } from "@/components/public/ar/types";
import { useWebXrSupport } from "./useWebXrSupport";
import { PublicArWebXrSession } from "./PublicArWebXrSession";
import Link from "next/link";

function WebXrNoticeScreen({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#111111] text-[#F7F1E8]">
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(243,112,33,0.16),transparent_28%),radial-gradient(circle_at_84%_12%,rgba(255,255,255,0.05),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.015),transparent_28%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/5" />

        <div className="mx-auto flex min-h-screen max-w-4xl items-center px-5 py-8 md:px-8">
          <section className="w-full rounded-[2.4rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.018)),#161616] p-6 shadow-[0_26px_100px_rgba(0,0,0,0.3)] md:p-8">
            <div className="mb-6 h-px w-24 bg-gradient-to-r from-[#F37021]/80 to-transparent" />
            <p className="text-[11px] uppercase tracking-[0.34em] text-white/42">
              KÜN’S GALLERY
            </p>

            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[#F7F1E8] md:text-5xl">
              {title}
            </h1>

            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/66 md:text-[15px]">
              {description}
            </p>

            <div className="mt-8">
              <Link
                href={actionHref}
                className="inline-flex h-11 items-center justify-center rounded-full border border-[#F37021]/35 bg-[#F37021]/10 px-4 text-sm text-[#F7F1E8] transition hover:border-[#F37021]/55 hover:bg-[#F37021]/16"
              >
                {actionLabel}
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function WebXrLoadingScreen({ message }: { message: string }) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#111111] text-[#F7F1E8]">
      <div className="mx-auto flex min-h-screen max-w-4xl items-center px-5 py-8 md:px-8">
        <section className="w-full rounded-[2.4rem] border border-white/10 bg-[#161616] p-6 shadow-[0_26px_100px_rgba(0,0,0,0.3)] md:p-8">
          <p className="text-[11px] uppercase tracking-[0.34em] text-white/42">
            WebXR Beta
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[#F7F1E8] md:text-5xl">
            지원 여부를 확인하는 중입니다.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/66 md:text-[15px]">
            {message}
          </p>
        </section>
      </div>
    </main>
  );
}

type PublicArWebXrPageProps = {
  slug: string;
};

export default function PublicArWebXrPage({ slug }: PublicArWebXrPageProps) {
  const staticWork = useMemo(() => getStaticWorkBySlug(slug), [slug]);
  const [work, setWork] = useState<PublicArWork | null>(staticWork ?? null);
  const [isLoading, setIsLoading] = useState(true);
  const [unpublished, setUnpublished] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState("");
  const support = useWebXrSupport();
  const routeWork = work ?? staticWork;
  const routeSlug = routeWork ? getPublicArWorkRouteSlug(routeWork) || slug : slug;
  const backHref = routeSlug ? `/ar/${routeSlug}` : "/ar";

  useEffect(() => {
    let isActive = true;

    const timeoutId = window.setTimeout(() => {
      if (isActive) {
        setIsLoading(false);
        setLoadErrorMessage("작품 정보를 불러오는 데 시간이 걸리고 있습니다. 기본 정보를 먼저 표시합니다.");
      }
    }, 6000);

    void (async () => {
      try {
        const result = await getWorkBySlugForPublicRoute(slug);

        if (!isActive) {
          return;
        }

        if (result.work) {
          const merged = mapPublicArWork(result.work, staticWork ?? undefined);

          if (merged) {
            setWork(merged);
          }

          setUnpublished(result.unpublished);
          setLoadErrorMessage("");
        } else if (staticWork) {
          setWork(staticWork);
          setUnpublished(false);
          setLoadErrorMessage("");
        } else {
          setWork(null);
          setUnpublished(false);
          setLoadErrorMessage("");
        }
      } catch {
        if (!isActive) {
          return;
        }

        setWork(staticWork ?? null);
        setUnpublished(false);
        setLoadErrorMessage("작품 정보를 불러오지 못해 기본 정보를 먼저 표시합니다.");
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

  if (
    support.status === "insecure" ||
    support.status === "unsupported" ||
    support.status === "error"
  ) {
    return (
      <WebXrNoticeScreen
        title="이 기기에서는 WebXR 베타를 열 수 없습니다."
        description={support.message}
        actionHref={backHref}
        actionLabel="기본 AR 페이지로 돌아가기"
      />
    );
  }

  if (support.status === "checking") {
    return <WebXrLoadingScreen message={support.message} />;
  }

  if (isLoading && !work) {
    return <WebXrLoadingScreen message={loadErrorMessage || support.message} />;
  }

  if (!work) {
    return (
      <WebXrNoticeScreen
        title="작품을 찾을 수 없습니다."
        description="요청한 경로와 일치하는 작품을 찾지 못했습니다. 기본 AR 페이지로 돌아가서 다시 확인해 주세요."
        actionHref={backHref}
        actionLabel="기본 AR 페이지로 돌아가기"
      />
    );
  }

  const readyArV2GlbUrl = getReadyArV2GlbUrl(work);

  if (unpublished) {
    return (
      <WebXrNoticeScreen
        title="아직 공개 승인되지 않은 작품입니다."
        description="이 작품은 공개 승인 전이라 WebXR 베타를 열 수 없습니다. 기본 AR 페이지로 돌아가 주세요."
        actionHref={backHref}
        actionLabel="기본 AR 페이지로 돌아가기"
      />
    );
  }

  if (!readyArV2GlbUrl) {
    return (
      <WebXrNoticeScreen
        title="정밀 배치용 3D 모델이 아직 준비되지 않았습니다."
        description="이 작품은 아직 WebXR 베타용 GLB가 준비되지 않았습니다. 기본 AR 페이지에서 기존 배치 방식을 사용해 주세요."
        actionHref={backHref}
        actionLabel="기본 AR 페이지로 돌아가기"
      />
    );
  }

  return (
    <PublicArWebXrSession
      key={readyArV2GlbUrl}
      work={work}
      glbUrl={readyArV2GlbUrl}
      backHref={backHref}
    />
  );
}
