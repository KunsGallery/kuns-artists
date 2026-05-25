"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import LogoutButton from "@/components/auth/LogoutButton";
import { useProtectedArtist } from "@/hooks/useProtectedArtist";
import {
  getWorksForArtist,
  type ArtistWorkDoc,
} from "@/lib/firebase/firestore";
import { buildArtistPublicUrl } from "@/lib/shareCards";

type ReadinessItem = {
  label: string;
  description: string;
  href: string;
  actionLabel: string;
  completed: boolean;
};

type MetricCard = {
  label: string;
  value: string;
  tone?: "neutral" | "accent" | "warning" | "muted";
  description: string;
};

function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`luxury-card rounded-[2rem] border border-white/10 bg-[rgba(255,255,255,0.03)] ${className}`}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.34em] text-[var(--kuns-orange)]">
      {children}
    </p>
  );
}

function MetricTile({ label, value, tone = "neutral", description }: MetricCard) {
  const toneClass = {
    neutral: "border-white/10 bg-white/[0.03] text-[var(--foreground)]",
    accent:
      "border-[var(--kuns-orange)]/25 bg-[var(--kuns-orange)]/10 text-[var(--foreground)]",
    warning: "border-amber-200/20 bg-amber-50/10 text-amber-50",
    muted: "border-white/10 bg-white/[0.02] text-white/72",
  }[tone];

  return (
    <div className={`rounded-[1.55rem] border p-5 ${toneClass}`}>
      <p className="text-[10px] uppercase tracking-[0.28em] text-white/42">
        {label}
      </p>
      <p className="mt-4 text-3xl font-semibold tracking-[-0.05em]">{value}</p>
      <p className="mt-3 text-sm leading-6 text-white/58">{description}</p>
    </div>
  );
}

function ActionCard({
  href,
  label,
  title,
  description,
}: {
  href: string;
  label: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-[1.65rem] border border-white/10 bg-white/[0.03] p-6 transition duration-500 hover:-translate-y-1 hover:border-[var(--kuns-orange)]/35 hover:bg-[var(--kuns-orange)]/[0.06]"
    >
      <div className="flex items-start justify-between gap-5">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">
            {label}
          </p>
          <h3 className="mt-4 text-[1.35rem] font-medium tracking-[-0.045em] text-[var(--foreground)] transition group-hover:text-[var(--kuns-orange)] md:text-[1.55rem]">
            {title}
          </h3>
        </div>

        <span className="mt-1 text-sm text-white/28 transition duration-300 group-hover:translate-x-1 group-hover:text-[var(--kuns-orange)]">
          →
        </span>
      </div>

      <p className="mt-4 text-sm leading-7 text-white/54">{description}</p>
    </Link>
  );
}

function ReadinessRow({
  item,
}: {
  item: ReadinessItem;
}) {
  return (
    <article className="grid gap-4 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-medium tracking-[-0.035em] text-[var(--foreground)]">
            {item.label}
          </h3>
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.24em] ${
              item.completed
                ? "border-[var(--kuns-orange)]/25 bg-[var(--kuns-orange)]/10 text-[var(--kuns-orange)]"
                : "border-white/10 bg-white/[0.02] text-white/50"
            }`}
          >
            {item.completed ? "✓ 완료" : "필요"}
          </span>
        </div>

        <p className="mt-3 max-w-3xl text-sm leading-7 text-white/58">
          {item.description}
        </p>
      </div>

      <Link
        href={item.href}
        className="inline-flex h-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] px-4 text-sm text-[var(--foreground)] transition hover:border-[var(--kuns-orange)]/35 hover:bg-[var(--kuns-orange)]/[0.08]"
      >
        {item.actionLabel}
      </Link>
    </article>
  );
}

export default function ArtistDashboardPage() {
  const { artist, uid, errorMessage, isLoading } = useProtectedArtist({
    fallbackErrorMessage: "작가 정보를 불러오는 중 오류가 발생했습니다.",
  });
  const [works, setWorks] = useState<ArtistWorkDoc[]>([]);
  const [worksErrorMessage, setWorksErrorMessage] = useState("");
  const [isLoadingWorks, setIsLoadingWorks] = useState(true);
  const [copyMessage, setCopyMessage] = useState("");
  const [copyError, setCopyError] = useState("");

  const isAdmin = artist?.role === "admin";
  const artistName = artist?.name?.trim() || "";
  const artistNameKo = artist?.nameKo?.trim() || "";
  const artistStatus = isLoading
    ? "공개 상태: 불러오는 중..."
    : artist?.status === "active"
      ? "공개 상태: 활성"
      : artist?.status === "inactive"
        ? "공개 상태: 비활성"
        : "공개 상태: 확인 필요";
  const artistModeLabel = isAdmin ? "관리자 계정 · 작가 모드" : "작가 전용 홈";
  const publicArtistUrl = useMemo(
    () => (artist?.slug?.trim() ? buildArtistPublicUrl(artist.slug) : ""),
    [artist?.slug]
  );
  const publicArtistUrlDisplay = publicArtistUrl.replace(/^https?:\/\//, "");

  useEffect(() => {
    let isActive = true;

    void (async () => {
      if (!uid) {
        if (isActive) {
          setWorks([]);
          setWorksErrorMessage("");
          setIsLoadingWorks(false);
        }

        return;
      }

      try {
        setIsLoadingWorks(true);
        setWorksErrorMessage("");
        const artistWorks = await getWorksForArtist(uid);

        if (isActive) {
          setWorks(artistWorks);
        }
      } catch (error) {
        if (!isActive) {
          return;
        }

        setWorks([]);
        setWorksErrorMessage(
          error instanceof Error
            ? error.message
            : "작품 상태를 불러오지 못했습니다."
        );
      } finally {
        if (isActive) {
          setIsLoadingWorks(false);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [uid]);

  const totalWorks = works.length;
  const publishedWorks = works.filter(
    (work) => work.isPublished === true && work.archived !== true
  ).length;
  const pendingWorks = works.filter(
    (work) => work.isPublished !== true && work.archived !== true
  ).length;
  const archivedWorks = works.filter((work) => work.archived === true).length;

  const hasProfileImage = Boolean(artist?.profileImageUrl?.trim());
  const hasBio = Boolean(artist?.bio?.trim() || artist?.bioEn?.trim());
  const hasExternalLinks = Boolean(
    artist?.instagramUrl?.trim() ||
      artist?.websiteUrl?.trim() ||
      artist?.youtubeUrl?.trim() ||
      artist?.artsyUrl?.trim() ||
      artist?.cvUrl?.trim()
  );
  const hasWorks = totalWorks > 0;
  const hasPublishedWorks = publishedWorks > 0;
  const hasCvOrArchive = Boolean(
    (artist?.cvItems?.length ?? 0) > 0 || (artist?.archiveLinks?.length ?? 0) > 0
  );

  const readinessItems: ReadinessItem[] = [
    {
      label: "프로필 이미지 등록",
      description:
        "공개 페이지에 표시될 대표 이미지를 등록해주세요.",
      href: "/artist/profile",
      actionLabel: "프로필 열기",
      completed: hasProfileImage,
    },
    {
      label: "작가 소개 입력",
      description:
        "작가 소개는 공개 페이지의 중심 문장으로 사용됩니다.",
      href: "/artist/profile",
      actionLabel: "프로필 열기",
      completed: hasBio,
    },
    {
      label: "외부 링크 입력",
      description:
        "Instagram, Website, CV 등 외부 링크를 연결할 수 있습니다.",
      href: "/artist/profile",
      actionLabel: "프로필 열기",
      completed: hasExternalLinks,
    },
    {
      label: "작품 등록",
      description: worksErrorMessage
        ? "작품 상태를 불러오지 못했습니다."
        : "대표 작품 이미지를 등록해 작가 페이지를 채워주세요.",
      href: "/artist/works/new",
      actionLabel: "작품 등록",
      completed: hasWorks,
    },
    {
      label: "공개 작품 있음",
      description: worksErrorMessage
        ? "작품 상태를 불러오지 못했습니다."
        : "작품은 갤러리 확인 후 공개됩니다.",
      href: "/artist/works",
      actionLabel: "작품 목록",
      completed: hasPublishedWorks,
    },
    {
      label: "CV / Archive 등록",
      description:
        "CV와 아카이브 자료는 갤러리에서 관리합니다.",
      href: isAdmin ? "/admin/artists" : "/artist/profile",
      actionLabel: isAdmin ? "관리자에서 열기" : "프로필 열기",
      completed: hasCvOrArchive,
    },
  ];

  const completedCount = readinessItems.filter((item) => item.completed).length;
  const readinessPercent = Math.round(
    (completedCount / readinessItems.length) * 100
  );

  const workMetrics: MetricCard[] = [
    {
      label: "전체 작품",
      value: isLoadingWorks ? "..." : worksErrorMessage ? "—" : String(totalWorks),
      tone: "neutral",
      description: "현재 등록된 전체 작품 수입니다.",
    },
    {
      label: "공개 작품",
      value: isLoadingWorks
        ? "..."
        : worksErrorMessage
          ? "—"
          : String(publishedWorks),
      tone: "accent",
      description: "공개 페이지에서 확인 가능한 작품입니다.",
    },
    {
      label: "검수 대기",
      value: isLoadingWorks
        ? "..."
        : worksErrorMessage
          ? "—"
          : String(pendingWorks),
      tone: "warning",
      description: "관리자 확인을 기다리는 작품입니다.",
    },
    {
      label: "보관 작품",
      value: isLoadingWorks
        ? "..."
        : worksErrorMessage
          ? "—"
          : String(archivedWorks),
      tone: "muted",
      description: "아카이브로 보관된 작품입니다.",
    },
  ];

  const quickActions = [
    {
      href: "/artist/profile",
      label: "프로필",
      title: "프로필 수정",
      description: "작가 소개, 이미지, 외부 링크를 관리합니다.",
    },
    {
      href: "/artist/works/new",
      label: "작품",
      title: "작품 등록",
      description: "작품 이미지와 기본 정보를 등록합니다.",
    },
    {
      href: "/artist/works",
      label: "목록",
      title: "작품 목록",
      description: "등록한 작품의 상태를 확인합니다.",
    },
    {
      href: "/artist/share",
      label: "공유",
      title: "작가 페이지 공유",
      description: "QR 코드가 포함된 공유 카드를 생성합니다.",
    },
  ];

  const adminTools = [
    {
      href: "/admin",
      label: "Admin Home",
      title: "Gallery Admin Home",
      description: "작가와 작품 관리의 시작 화면입니다.",
    },
    {
      href: "/admin/artists",
      label: "Artists Management",
      title: "작가 관리",
      description: "전속 작가와 프로젝트 아티스트를 관리합니다.",
    },
    {
      href: "/admin/works",
      label: "Works Management",
      title: "작품 승인",
      description: "공개 상태와 보관 상태를 관리합니다.",
    },
  ];

  const heroName = isLoading
    ? "불러오는 중..."
    : artistName || "작가 정보를 불러오지 못했습니다.";
  const heroSubtitle = isLoading ? " " : artistNameKo || " ";
  const profileImageUrl = artist?.profileImageUrl?.trim() || "";
  const hasPublicLink = Boolean(publicArtistUrl);

  async function handleCopyPublicLink() {
    if (!hasPublicLink) {
      setCopyError("공개 페이지 주소를 준비 중입니다. 갤러리에 문의해주세요.");
      setCopyMessage("");
      return;
    }

    try {
      await navigator.clipboard.writeText(publicArtistUrl);
      setCopyMessage("공개 작가 페이지 링크가 복사되었습니다.");
      setCopyError("");
    } catch {
      setCopyMessage("");
      setCopyError("링크 복사에 실패했습니다. URL을 직접 복사해주세요.");
    }
  }

  return (
    <main className="theme-dark min-h-screen bg-[var(--background-deep)] text-[var(--foreground)]">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--kuns-orange)]/50 to-transparent" />
        <div className="pointer-events-none absolute left-1/2 top-[-16rem] h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-[var(--kuns-orange)]/12 blur-3xl" />

        <div className="luxury-container relative">
          <header className="flex flex-col gap-4 py-6 md:flex-row md:items-center md:justify-between md:py-8">
            <Link href="/" className="group">
              <p className="text-[11px] uppercase tracking-[0.34em] text-[var(--foreground)] transition group-hover:text-[var(--kuns-orange)]">
                KÜN’S GALLERY
              </p>
              <p className="mt-1 text-xs tracking-[-0.02em] text-white/42">
                Artist dashboard
              </p>
            </Link>

            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              <Link
                href="/artists"
                className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] px-5 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--foreground)] transition duration-500 hover:border-[var(--kuns-orange)]/35 hover:text-[var(--kuns-orange)]"
              >
                작가 목록
              </Link>

              <LogoutButton className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.02] px-5 text-[12px] font-medium uppercase tracking-[0.12em] text-white/72 transition duration-500 hover:border-[var(--kuns-orange)]/30 hover:bg-[var(--kuns-orange)]/8 hover:text-[var(--foreground)]">
                로그아웃
              </LogoutButton>
            </div>
          </header>

          <div className="grid gap-8 pb-14 pt-6 md:pb-20 md:pt-10 lg:grid-cols-[1.04fr_0.96fr] lg:items-start">
            <div className="max-w-4xl animate-reveal">
              <SectionLabel>KÜN’S Gallery Artist Archive</SectionLabel>

              <h1 className="luxury-serif mt-7 max-w-4xl text-[3.4rem] font-normal leading-[0.85] tracking-[-0.08em] text-[var(--foreground)] sm:text-[5.2rem] md:text-[7rem] lg:text-[8rem]">
                {heroName}
              </h1>

              {artistNameKo ? (
                <p className="mt-5 text-[1.15rem] tracking-[-0.04em] text-white/62 md:text-[1.4rem]">
                  {heroSubtitle}
                </p>
              ) : null}

              <p className="mt-7 max-w-2xl text-[16px] leading-8 text-white/60 md:text-[18px] md:leading-9">
                프로필과 작품 정보를 관리하고, 공개 작가 페이지를 준비합니다.
                지금 필요한 작업을 빠르게 확인하고, 공개 흐름으로 자연스럽게
                이어갈 수 있도록 정리된 작가 전용 홈입니다.
              </p>

              <div className="mt-10 flex flex-wrap gap-3">
                <a
                  href={hasPublicLink ? publicArtistUrl : "#"}
                  target={hasPublicLink ? "_blank" : undefined}
                  rel={hasPublicLink ? "noreferrer" : undefined}
                  aria-disabled={!hasPublicLink}
                  className={`inline-flex h-12 items-center justify-center rounded-full border px-6 text-[12px] font-semibold uppercase tracking-[0.12em] transition duration-500 ${
                    hasPublicLink
                      ? "border-[var(--kuns-orange)] bg-[var(--kuns-orange)] text-[var(--background-deep)] hover:-translate-y-0.5 hover:bg-[var(--kuns-orange-hover)]"
                      : "pointer-events-none border-white/10 bg-white/[0.02] text-white/38"
                  }`}
                >
                  공개 페이지 열기
                </a>

                <Link href="/artist/profile" className="btn-secondary">
                  프로필 수정
                </Link>

                <Link href="/artist/works/new" className="btn-secondary">
                  작품 등록
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3 text-[11px] uppercase tracking-[0.24em] text-white/36">
                <span>{artistModeLabel}</span>
                <span className="h-px w-8 bg-white/14" />
                <span>{artistStatus}</span>
              </div>

              {errorMessage ? (
                <div className="mt-6 rounded-[1.5rem] border border-amber-200/20 bg-amber-50/10 px-4 py-4 text-sm leading-7 text-amber-50">
                  작가 정보를 불러오지 못했습니다.
                </div>
              ) : null}
            </div>

            <aside className="animate-reveal-delay-1">
              <Panel>
                <div className="border-b border-white/10 p-6 md:p-7">
                  <div className="flex items-start justify-between gap-6">
                    <div className="min-w-0">
                      <SectionLabel>Public Page Preview</SectionLabel>
                      <p className="mt-4 text-[1.15rem] font-medium tracking-[-0.04em] text-[var(--foreground)] md:text-[1.25rem]">
                        공개 페이지가 이렇게 연결됩니다.
                      </p>
                      <p className="mt-3 max-w-xl text-sm leading-7 text-white/52">
                        작가 페이지는 공개용 소개와 아카이브를 한 흐름으로
                        보여주도록 설계됩니다.
                      </p>
                    </div>

                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[var(--kuns-orange)]/25 bg-[var(--kuns-orange)]/10 text-sm text-[var(--foreground)]">
                      {isAdmin ? "AD" : "AR"}
                    </div>
                  </div>
                </div>

                <div className="p-6 md:p-7">
                  <div className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-[var(--background-soft)]">
                    <div className="relative aspect-[16/10] overflow-hidden">
                      {profileImageUrl ? (
                        <Image
                          src={profileImageUrl}
                          alt={artistName || "작가 프로필 이미지"}
                          fill
                          sizes="(max-width: 768px) 100vw, 480px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#262626] via-[#191919] to-[#111111]">
                          <div className="flex h-24 w-24 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-xl tracking-[0.12em] text-white/60">
                            KÜN’S
                          </div>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d]/92 via-[#0d0d0d]/28 to-transparent" />
                      <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--kuns-orange)]">
                            Public Artist Page
                          </p>
                          <p className="mt-3 text-[1.8rem] leading-[1] tracking-[-0.055em] text-[var(--foreground)]">
                            {heroName}
                          </p>
                          {artistNameKo ? (
                            <p className="mt-2 text-sm text-white/56">
                              {artistNameKo}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    <div className="rounded-[1.45rem] border border-white/10 bg-white/[0.03] px-4 py-4">
                      <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">
                        공개 페이지 주소
                      </p>
                      {hasPublicLink ? (
                        <p className="mt-2 break-all text-[11px] leading-6 text-white/68">
                          {publicArtistUrlDisplay}
                        </p>
                      ) : (
                        <p className="mt-2 text-sm leading-7 text-white/54">
                          공개 페이지 주소를 준비 중입니다. 갤러리에 문의해주세요.
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <a
                        href={hasPublicLink ? publicArtistUrl : "#"}
                        target={hasPublicLink ? "_blank" : undefined}
                        rel={hasPublicLink ? "noreferrer" : undefined}
                        aria-disabled={!hasPublicLink}
                        className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-sm transition duration-500 ${
                          hasPublicLink
                            ? "border border-[var(--kuns-orange)]/25 bg-[var(--kuns-orange)]/10 text-[var(--foreground)] hover:border-[var(--kuns-orange)] hover:bg-[var(--kuns-orange)]/15"
                            : "pointer-events-none border border-white/10 bg-white/[0.02] text-white/38"
                        }`}
                      >
                        공개 페이지 열기
                      </a>

                      <button
                        type="button"
                        onClick={() => {
                          void handleCopyPublicLink();
                        }}
                        className="inline-flex h-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] px-4 text-sm text-[var(--foreground)] transition hover:border-[var(--kuns-orange)]/35 hover:bg-[var(--kuns-orange)]/[0.08]"
                      >
                        링크 복사
                      </button>
                    </div>

                    {copyMessage ? (
                      <p className="text-sm leading-7 text-[var(--kuns-orange)]">
                        {copyMessage}
                      </p>
                    ) : null}

                    {copyError ? (
                      <p className="text-sm leading-7 text-amber-50/85">
                        {copyError}
                      </p>
                    ) : null}
                  </div>
                </div>
              </Panel>
            </aside>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10">
        <div className="luxury-container py-14 md:py-20">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <SectionLabel>Profile Readiness</SectionLabel>
              <h2 className="luxury-serif mt-5 text-5xl font-normal leading-[0.95] tracking-[-0.07em] text-[var(--foreground)] md:text-7xl">
                작가 페이지 준비도
              </h2>
              <p className="mt-5 max-w-2xl text-[15px] leading-8 text-white/54 md:text-[16px] md:leading-9">
                지금 무엇을 입력해야 하는지 바로 확인할 수 있도록 정리했습니다.
                완료 항목은 공개 페이지 반영 기준으로 표시됩니다.
              </p>
            </div>

            <div className="w-full max-w-[340px] rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-end justify-between gap-4">
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/38">
                  준비도
                </p>
                <p className="text-sm font-medium text-white/72">
                  {completedCount} / {readinessItems.length}
                </p>
              </div>

              <div className="mt-4 h-2 rounded-full bg-white/[0.08]">
                <div
                  className="h-2 rounded-full bg-[var(--kuns-orange)] transition-all"
                  style={{ width: `${readinessPercent}%` }}
                />
              </div>

              <p className="mt-4 text-xs leading-6 text-white/46">
                프로필, 작품, 공개 페이지 상태를 한눈에 점검합니다.
              </p>
            </div>
          </div>

          <div className="mt-10 grid gap-4">
            {readinessItems.map((item) => (
              <ReadinessRow key={item.label} item={item} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-white/10">
        <div className="luxury-container py-14 md:py-20">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <SectionLabel>Works Summary</SectionLabel>
              <h2 className="luxury-serif mt-5 text-5xl font-normal leading-[0.95] tracking-[-0.07em] text-[var(--foreground)] md:text-7xl">
                작품 현황 요약
              </h2>
            </div>

            <p className="max-w-xl text-[15px] leading-8 text-white/54 md:text-[16px] md:leading-9">
              전체 작품, 공개 작품, 검수 대기, 보관 작품을 작가 화면에서 바로
              확인할 수 있도록 정리했습니다.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {workMetrics.map((metric) => (
              <MetricTile key={metric.label} {...metric} />
            ))}
          </div>

          {worksErrorMessage ? (
            <div className="mt-5 rounded-[1.5rem] border border-amber-200/20 bg-amber-50/10 px-4 py-4 text-sm leading-7 text-amber-50">
              작품 상태를 불러오지 못했습니다.
            </div>
          ) : null}

          {!worksErrorMessage && !isLoadingWorks && works.length === 0 ? (
            <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-white/58">
              아직 등록된 작품이 없습니다. 첫 작품을 등록해보세요.
            </div>
          ) : null}
        </div>
      </section>

      <section className="border-b border-white/10">
        <div className="luxury-container py-14 md:py-20">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <SectionLabel>Quick Actions</SectionLabel>
              <h2 className="luxury-serif mt-5 text-5xl font-normal leading-[0.95] tracking-[-0.07em] text-[var(--foreground)] md:text-7xl">
                바로 할 수 있는 작업
              </h2>
            </div>

            <p className="max-w-xl text-[15px] leading-8 text-white/54 md:text-[16px] md:leading-9">
              자주 쓰는 작업만 카드로 모아, 대시보드에서 바로 이동할 수 있게
              정리했습니다.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {quickActions.map((action) => (
              <ActionCard key={action.label} {...action} />
            ))}
          </div>
        </div>
      </section>

      {isAdmin ? (
        <section className="border-b border-white/10">
          <div className="luxury-container py-14 md:py-20">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <SectionLabel>Gallery Admin Tools</SectionLabel>
                <h2 className="luxury-serif mt-5 text-4xl font-normal leading-[0.95] tracking-[-0.07em] text-[var(--foreground)] md:text-6xl">
                  관리자 도구
                </h2>
              </div>

              <p className="max-w-xl text-[15px] leading-8 text-white/54 md:text-[16px] md:leading-9">
                관리자 계정에서는 작가 홈과 분리된 작은 도구 섹션만 따로 노출합니다.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {adminTools.map((tool) => (
                <ActionCard key={tool.label} {...tool} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
