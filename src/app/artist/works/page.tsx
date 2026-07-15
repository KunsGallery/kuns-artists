"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import LogoutButton from "@/components/auth/LogoutButton";
import { useProtectedArtist } from "@/hooks/useProtectedArtist";
import {
  deleteArtistWork,
  getWorksForArtist,
  resolveArtistWorkSlug,
  type ArtistWorkDoc,
} from "@/lib/firebase/firestore";
import { deleteR2ObjectsByPublicUrls } from "@/lib/r2/client";
import { hasArAsset } from "@/lib/workDisplay";
import { getArV2WorkflowStatus } from "@/lib/ar-v2";

type WorkStatusFilter = "all" | "pending" | "published" | "archived";

function getWorkStatus(work: ArtistWorkDoc): Exclude<WorkStatusFilter, "all"> {
  if (work.archived === true) {
    return "archived";
  }

  if (work.isPublished === true) {
    return "published";
  }

  return "pending";
}

function getStatusLabel(status: Exclude<WorkStatusFilter, "all">) {
  if (status === "published") {
    return "공개";
  }

  if (status === "archived") {
    return "보관";
  }

  return "검수 대기";
}

function getStatusTone(status: Exclude<WorkStatusFilter, "all">) {
  if (status === "published") {
    return "published";
  }

  if (status === "archived") {
    return "archived";
  }

  return "pending";
}

function getStatusMessage(status: Exclude<WorkStatusFilter, "all">) {
  if (status === "published") {
    return "현재 공개 작품 상세 페이지에 표시 중입니다.";
  }

  if (status === "archived") {
    return "보관 처리된 작품입니다.";
  }

  return "관리자 검수 후 공개 작품 상세 페이지에 표시됩니다.";
}

function getDeleteConfirmMessage(status: Exclude<WorkStatusFilter, "all">) {
  const base =
    "이 작품을 삭제할까요? 삭제 후에는 작품 목록과 공개 페이지에서 사라집니다.";

  if (status === "published") {
    return `${base}\n\n현재 공개 중인 작품입니다. 삭제하면 공개 페이지에서도 즉시 사라집니다.`;
  }

  return base;
}

function getPublicWorkSlug(work: ArtistWorkDoc) {
  return work.slug?.trim() || resolveArtistWorkSlug(work) || work.id?.trim() || "";
}

function getCardAccentClass(status: Exclude<WorkStatusFilter, "all">) {
  if (status === "published") {
    return "border-[#F37021]/30 hover:border-[#F37021]/40";
  }

  if (status === "archived") {
    return "hover:border-white/15";
  }

  return "hover:border-white/15";
}

function getArWorkflowLabel(work: ArtistWorkDoc) {
  const status = getArV2WorkflowStatus(work);

  if (status === "approved") return "AR 준비 완료";
  if (status === "changes-requested") return "수정 요청";
  if (status === "outdated") return "재요청 필요";
  if (status === "requested") return "AR 요청됨";
  if (status === "cancelled") return "요청 취소됨";
  return "AR 요청 전";
}

function getArWorkflowTone(work: ArtistWorkDoc) {
  const status = getArV2WorkflowStatus(work);

  if (status === "approved") return "published" as const;
  if (status === "changes-requested" || status === "outdated") return "pending" as const;
  if (status === "requested") return "published" as const;
  if (status === "cancelled") return "archived" as const;
  return "pending" as const;
}

function getArWorkflowHint(work: ArtistWorkDoc) {
  const status = getArV2WorkflowStatus(work);

  if (status === "approved") {
    return work.isPublished === true
      ? "승인된 AR 모델을 공개 페이지에서 볼 수 있습니다."
      : "승인된 AR 모델이 준비되었습니다. 작품 공개 후 AR 링크가 활성화됩니다.";
  }

  if (status === "changes-requested") {
    return work.arV2Review?.message?.trim()
      ? `수정 요청: ${work.arV2Review.message.trim()}`
      : "갤러리에서 수정 요청을 보냈습니다.";
  }

  if (status === "outdated") {
    return "작품 정보가 변경되어 AR 제작을 다시 요청해야 합니다.";
  }

  if (status === "requested") {
    return "갤러리에서 AR 제작 요청을 검수 중입니다.";
  }

  if (status === "cancelled") {
    return "이전 요청이 취소되었습니다. 필요하면 다시 요청할 수 있습니다.";
  }

  return "작품 정보와 크기를 확인한 뒤 AR 제작을 요청할 수 있습니다.";
}

function StatusBadge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "published" | "pending" | "archived";
}) {
  const styles = {
    published: "border-[#F37021]/35 bg-[#F37021]/10 text-[#f6b07f]",
    pending: "border-white/10 bg-white/5 text-white/66",
    archived: "border-slate-500/30 bg-slate-500/10 text-slate-300",
  }[tone];

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] tracking-[0.24em] ${styles}`}
    >
      {children}
    </span>
  );
}

function StatCard({
  label,
  value,
  accent = "neutral",
}: {
  label: string;
  value: string;
  accent?: "neutral" | "orange" | "muted" | "subdued";
}) {
  const styles = {
    neutral: {
      card: "border-black/8 bg-white",
      label: "text-neutral-500",
      value: "text-neutral-950",
    },
    orange: {
      card: "border-[#F37021]/20 bg-[#fff7f1]",
      label: "text-[#b85d18]/75",
      value: "text-[#b85d18]",
    },
    muted: {
      card: "border-black/8 bg-[#f7f6f2]",
      label: "text-neutral-500",
      value: "text-neutral-950",
    },
    subdued: {
      card: "border-slate-200 bg-slate-50",
      label: "text-slate-500",
      value: "text-slate-800",
    },
  }[accent];

  return (
    <div className={`rounded-[1.5rem] border p-5 shadow-sm ${styles.card}`}>
      <p className={`text-[11px] uppercase tracking-[0.24em] ${styles.label}`}>
        {label}
      </p>
      <p className={`mt-3 text-4xl font-semibold tracking-[-0.05em] ${styles.value}`}>
        {value}
      </p>
    </div>
  );
}

function FilterPill({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-sm transition ${
        active
          ? "border border-[#F37021]/35 bg-[#F37021]/10 text-[#b85d18]"
          : "border border-black/10 bg-white text-neutral-600 hover:border-black/20 hover:text-neutral-950"
      }`}
    >
      {children}
    </button>
  );
}

function WorkMeta({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.22em] text-white/38">
        {label}
      </p>
      <p className="mt-2 text-sm leading-6 text-white/78">{value}</p>
    </div>
  );
}

export default function ArtistWorksPage() {
  const [works, setWorks] = useState<ArtistWorkDoc[]>([]);
  const [worksErrorMessage, setWorksErrorMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionErrorMessage, setActionErrorMessage] = useState("");
  const [deletingWorkId, setDeletingWorkId] = useState("");
  const [statusFilter, setStatusFilter] = useState<WorkStatusFilter>("all");
  const { uid, isLoading, errorMessage } = useProtectedArtist({
    fallbackErrorMessage: "작가 정보를 불러오는 중 오류가 발생했습니다.",
  });

  useEffect(() => {
    let isActive = true;

    void (async () => {
      if (!uid) {
        if (isActive) {
          setWorks([]);
          setWorksErrorMessage("");
          setActionMessage("");
          setActionErrorMessage("");
        }

        return;
      }

      try {
        setWorksErrorMessage("");
        setActionMessage("");
        setActionErrorMessage("");
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
            : "작품 목록을 불러오는 중 오류가 발생했습니다."
        );
      }
    })();

    return () => {
      isActive = false;
    };
  }, [uid]);

  const counts = useMemo(() => {
    const published = works.filter(
      (work) => work.isPublished === true && work.archived !== true
    ).length;
    const pending = works.filter(
      (work) => work.isPublished !== true && work.archived !== true
    ).length;
    const archived = works.filter((work) => work.archived === true).length;

    return {
      total: works.length,
      published,
      pending,
      archived,
    };
  }, [works]);

  const filteredWorks = useMemo(
    () =>
      statusFilter === "all"
        ? works
        : works.filter((work) => getWorkStatus(work) === statusFilter),
    [statusFilter, works]
  );

  const hasWorks = works.length > 0;
  const hasFilteredWorks = filteredWorks.length > 0;

  async function handleDeleteWork(work: ArtistWorkDoc) {
    if (!uid) {
      setActionErrorMessage("로그인이 필요합니다.");
      return;
    }

    const status = getWorkStatus(work);
    const confirmed = window.confirm(getDeleteConfirmMessage(status));

    if (!confirmed) {
      return;
    }

    setDeletingWorkId(work.id);
    setActionMessage("");
    setActionErrorMessage("");

    try {
      const deletedWork = await deleteArtistWork(work.id, uid);

      void deleteR2ObjectsByPublicUrls(
        [
          deletedWork.coverImageUrl,
          deletedWork.generatedGlbUrl,
          deletedWork.generatedUsdzUrl,
          deletedWork.arV2Asset?.glbUrl,
        ].filter(
          (value): value is string => Boolean(value && value.trim())
        )
      ).catch(() => undefined);

      setWorks((current) => current.filter((entry) => entry.id !== work.id));
      setActionMessage("작품이 삭제되었습니다.");
    } catch (error) {
      setActionErrorMessage(
        error instanceof Error
          ? error.message
          : "작품 삭제에 실패했습니다. 잠시 후 다시 시도해주세요."
      );
    } finally {
      setDeletingWorkId("");
    }
  }

  return (
    <main className="theme-dark min-h-screen bg-[#f5f3ee] text-neutral-950">
      <section className="border-b border-black/5">
        <div className="mx-auto max-w-7xl px-5 py-6 md:px-8 md:py-8">
          <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <Link
              href="/"
              className="text-[11px] uppercase tracking-[0.28em] text-neutral-500"
            >
              KÜN’S GALLERY
            </Link>

            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              <Link
                href="/artist/dashboard"
                className="inline-flex h-11 items-center rounded-full border border-black/10 bg-[#faf8f3] px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm"
              >
                대시보드로 돌아가기
              </Link>

              <Link
                href="/artist/works/new"
                className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm"
              >
                새 작품 등록
              </Link>

              <LogoutButton className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm">
                로그아웃
              </LogoutButton>
            </div>
          </header>

          <div className="grid gap-8 py-12 md:grid-cols-[1.05fr_0.95fr] md:items-end md:py-16">
            <div className="max-w-4xl">
              <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
                작품 관리
              </p>

              <h1 className="mt-5 text-5xl font-semibold tracking-[-0.04em] text-neutral-950 md:text-7xl md:leading-[0.95]">
                작품 관리
              </h1>

              <p className="mt-8 max-w-2xl text-sm leading-7 text-neutral-600 md:text-[15px]">
                등록한 작품의 상태를 확인하고, 새 작품을 추가하거나 정보를 수정할 수 있습니다.
              </p>
            </div>

            <aside className="rounded-[2rem] border border-black/10 bg-white/85 p-5 backdrop-blur-sm md:p-6">
              <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
                안내
              </p>
              <p className="mt-4 text-sm leading-7 text-neutral-600">
                작품은 상태별로 정리해 볼 수 있고, 공개된 작품은 작품 상세 페이지와 AR 페이지로 이어집니다.
              </p>
            </aside>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-10">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="전체 작품" value={String(counts.total)} />
          <StatCard
            label="공개 작품"
            value={String(counts.published)}
            accent="orange"
          />
          <StatCard
            label="검수 대기"
            value={String(counts.pending)}
            accent="muted"
          />
          <StatCard
            label="보관 작품"
            value={String(counts.archived)}
            accent="subdued"
          />
        </div>

        <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
              Works
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-neutral-950 md:text-4xl">
              작품 목록
            </h2>
          </div>

          <div className="flex flex-wrap gap-2">
            <FilterPill active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>
              All
            </FilterPill>
            <FilterPill
              active={statusFilter === "pending"}
              onClick={() => setStatusFilter("pending")}
            >
              검수 대기
            </FilterPill>
            <FilterPill
              active={statusFilter === "published"}
              onClick={() => setStatusFilter("published")}
            >
              공개
            </FilterPill>
            <FilterPill
              active={statusFilter === "archived"}
              onClick={() => setStatusFilter("archived")}
            >
              보관
            </FilterPill>
          </div>
        </div>

        <Suspense fallback={null}>
          <SavedWorkNotice />
        </Suspense>

        {actionMessage ? (
          <div className="mt-6 rounded-[1.75rem] border border-emerald-200 bg-emerald-50 px-5 py-5 text-sm leading-7 text-emerald-800">
            {actionMessage}
          </div>
        ) : null}

        {actionErrorMessage ? (
          <div className="mt-6 rounded-[1.75rem] border border-amber-200 bg-amber-50 px-5 py-5 text-sm leading-7 text-amber-900">
            {actionErrorMessage}
          </div>
        ) : null}

        {errorMessage || worksErrorMessage ? (
          <div className="mt-6 rounded-[1.75rem] border border-red-200 bg-red-50 px-5 py-5 text-sm leading-7 text-red-700">
            {errorMessage || worksErrorMessage}
          </div>
        ) : null}

        {isLoading ? (
          <div className="mt-8 rounded-[2rem] border border-black/8 bg-white px-5 py-5 text-sm leading-7 text-neutral-600 shadow-sm">
            작품 목록을 불러오는 중입니다.
          </div>
        ) : null}

        {!isLoading && !hasWorks && !errorMessage && !worksErrorMessage ? (
          <WorksEmptyState />
        ) : null}

        {!isLoading && hasWorks && !hasFilteredWorks ? (
          <div className="mt-8 rounded-[2rem] border border-black/8 bg-white px-5 py-6 text-sm leading-7 text-neutral-600 shadow-sm">
            현재 선택한 상태에 해당하는 작품이 없습니다.
          </div>
        ) : null}

        <div className="mt-8 grid gap-4">
          {filteredWorks.map((work) => {
            const status = getWorkStatus(work);
            const coverImageUrl = work.coverImageUrl || "";
            const shareTarget =
              work.id?.trim() || work.slug?.trim() || resolveArtistWorkSlug(work);
            const publicWorkSlug = getPublicWorkSlug(work);
            const publicWorkHref = publicWorkSlug ? `/works/${publicWorkSlug}` : "";
            const arSlug = getPublicWorkSlug(work);
            const arWorkflowStatus = getArV2WorkflowStatus(work);
            const arRequestHref = `/artist/works/${work.id}/ar`;
            const publicArHref = work.isPublished === true && arWorkflowStatus === "approved" && arSlug
              ? `/ar/${arSlug}`
              : "";

            return (
              <article
                key={work.id}
                className={`group overflow-hidden rounded-[2rem] border border-white/10 bg-[#171717] shadow-[0_24px_80px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_28px_90px_rgba(0,0,0,0.24)] ${getCardAccentClass(status)}`}
              >
                <div className="grid gap-0 md:grid-cols-[240px_minmax(0,1fr)]">
                  <div className="relative overflow-hidden bg-[#111111]">
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0.34)),radial-gradient(circle_at_20%_20%,rgba(243,112,33,0.18),transparent_30%)]" />
                    {coverImageUrl ? (
                      <img
                        src={coverImageUrl}
                        alt={work.title || "Artwork cover"}
                        className="aspect-[4/5] h-full w-full object-cover transition duration-700 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex aspect-[4/5] items-center justify-center px-6 text-center text-sm leading-7 text-white/40">
                        이미지 없음
                      </div>
                    )}

                    <div className="absolute left-4 top-4">
                      <StatusBadge tone={getStatusTone(status)}>
                        {getStatusLabel(status)}
                      </StatusBadge>
                    </div>
                  </div>

                  <div className="flex min-w-0 flex-col justify-between p-5 md:p-6">
                    <div className="space-y-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[11px] uppercase tracking-[0.24em] text-white/38">
                            작품 정보
                          </p>
                          <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white md:text-[2rem]">
                            {work.title || "Untitled"}
                          </h3>
                          <p className="mt-2 text-sm text-white/55">
                            {work.year || "Year not set"}
                          </p>
                        </div>

                        <div className="hidden md:block">
                          <StatusBadge tone={getStatusTone(status)}>
                            {getStatusLabel(status)}
                          </StatusBadge>
                        </div>
                      </div>

                      <div className="grid gap-3 text-sm leading-6 text-white/72 sm:grid-cols-2">
                        <WorkMeta
                          label="Medium"
                          value={work.medium || "Medium not set"}
                        />
                        <WorkMeta
                          label="Dimensions"
                          value={work.dimensions || "Dimensions not set"}
                        />
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-3">
                          <p className="text-[10px] uppercase tracking-[0.22em] text-white/38">
                            AR Workflow
                          </p>
                          <p className="mt-2 text-sm font-medium text-white/88">
                            {getArWorkflowLabel(work)}
                          </p>
                        </div>
                        <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-3">
                          <p className="text-[10px] uppercase tracking-[0.22em] text-white/38">
                            AR Hint
                          </p>
                          <p className="mt-2 text-sm leading-6 text-white/70">
                            {getArWorkflowHint(work)}
                          </p>
                        </div>
                      </div>

                      <p className="text-sm leading-7 text-white/62">
                        {getStatusMessage(status)}
                      </p>
                    </div>

                    <div className="mt-6 space-y-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                        <Link
                          href={`/artist/works/${shareTarget}/edit`}
                          className="inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-medium text-neutral-950 transition hover:bg-[#F37021] hover:text-[#171717] sm:w-auto"
                        >
                          수정
                        </Link>

                        <Link
                          href={`/artist/works/${shareTarget}/share`}
                          className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-5 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/[0.08] sm:w-auto"
                        >
                          공유 카드 만들기
                        </Link>

                        <Link
                          href={arRequestHref}
                          className={`inline-flex h-11 items-center justify-center rounded-full px-5 text-sm transition sm:w-auto ${
                            getArWorkflowTone(work) === "published"
                              ? "border border-[#F37021]/35 bg-[#F37021]/10 text-[#f6b07f] hover:border-[#F37021]/50 hover:bg-[#F37021]/14"
                              : getArWorkflowTone(work) === "archived"
                                ? "border border-white/10 bg-white/[0.04] text-white/72 hover:border-white/20 hover:bg-white/[0.08]"
                                : "border border-white/10 bg-white/[0.04] text-white/80 hover:border-white/20 hover:bg-white/[0.08]"
                          }`}
                        >
                          {getArWorkflowLabel(work)}
                        </Link>

                        {publicArHref ? (
                          <Link
                            href={publicArHref}
                            className="inline-flex h-11 items-center justify-center rounded-full border border-[#F37021]/35 bg-[#F37021] px-5 text-sm font-medium text-[#171717] transition hover:bg-[#ff7a2f] sm:w-auto"
                          >
                            공개 AR 보기
                          </Link>
                        ) : null}

                        {status === "published" ? (
                          <Link
                            href={publicWorkHref}
                            className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-5 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/[0.08] sm:w-auto"
                          >
                            작품 상세 보기
                          </Link>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => void handleDeleteWork(work)}
                          disabled={deletingWorkId === work.id}
                          className="inline-flex h-11 items-center justify-center rounded-full border border-red-400/25 bg-red-500/10 px-5 text-sm text-red-100 transition hover:border-red-400/45 hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                        >
                          {deletingWorkId === work.id ? "삭제 중..." : "삭제"}
                        </button>
                      </div>

                      <p className="text-[11px] uppercase tracking-[0.24em] text-white/34">
                        {hasArAsset(work)
                          ? "AR 파일이 연결되어 있습니다."
                          : "AR 파일 연결 후 공개 페이지에서 AR Preview가 활성화됩니다."}
                      </p>

                      <p className="text-[11px] uppercase tracking-[0.24em] text-white/34">
                        {status === "published"
                          ? "현재 공개 작품 상세 페이지에 표시 중입니다."
                          : status === "archived"
                            ? "보관 처리된 작품입니다."
                            : "관리자 검수 후 공개 작품 상세 페이지에 표시됩니다."}
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function WorksEmptyState() {
  return (
    <div className="mt-8 overflow-hidden rounded-[2rem] border border-white/10 bg-[#171717] shadow-[0_24px_80px_rgba(0,0,0,0.16)]">
      <div className="relative px-5 py-6 md:px-6 md:py-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(243,112,33,0.18),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_60%)]" />

        <div className="relative grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div className="max-w-2xl">
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/40">
              Empty state
            </p>
            <h3 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
              아직 등록된 작품이 없습니다.
            </h3>
            <p className="mt-4 text-sm leading-7 text-white/68">
              첫 작품을 등록하면 갤러리 검수 후 공개 작가 페이지에 표시할 수 있습니다.
            </p>
          </div>

          <Link
            href="/artist/works/new"
            className="inline-flex h-12 items-center justify-center rounded-full bg-[#F37021] px-6 text-sm font-medium text-[#171717] transition hover:bg-[#ff7a2f]"
          >
            첫 작품 등록하기
          </Link>
        </div>
      </div>
    </div>
  );
}

function SavedWorkNotice() {
  const searchParams = useSearchParams();

  if (searchParams.get("saved") !== "1") {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-6 flex flex-col gap-4 rounded-[1.75rem] border border-emerald-200 bg-emerald-50 px-5 py-5 text-sm leading-7 text-emerald-800 md:flex-row md:items-center md:justify-between"
    >
      <p>
        작품이 저장되었습니다. 등록한 작품은 관리자 검수 후 공개됩니다.
      </p>
      <Link
        href="/artist/works/new"
        className="inline-flex h-11 items-center justify-center rounded-full border border-emerald-200 bg-white px-5 text-sm font-medium text-emerald-900 transition hover:border-emerald-300"
      >
        새 작품 등록
      </Link>
    </div>
  );
}
