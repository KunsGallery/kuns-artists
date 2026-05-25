"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import LogoutButton from "@/components/auth/LogoutButton";
import R2ImageUploadField from "@/components/shared/R2ImageUploadField";
import { artists as seedArtists } from "@/data/artists";
import { useProtectedArtist } from "@/hooks/useProtectedArtist";
import {
  getAllWorksForAdmin,
  resolveArtistWorkSlug,
  updateWorkForAdmin,
  type ArtistWorkAdminUpdatePayload,
  type ArtistWorkDoc,
} from "@/lib/firebase/firestore";

type WorkFormValues = ArtistWorkAdminUpdatePayload;
type StatusFilter = "all" | "pending" | "published" | "archived";
type ArtistFilter = "all" | "represented" | "project";

const EMPTY_FORM: WorkFormValues = {
  isPublished: false,
  archived: false,
  coverImageUrl: "",
  modelGlb: "",
  modelUsdz: "",
  generatedGlbUrl: "",
  generatedUsdzUrl: "",
};

const STATUS_FILTER_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Review Pending" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

const ARTIST_FILTER_OPTIONS: Array<{ value: ArtistFilter; label: string }> = [
  { value: "all", label: "All Artists" },
  { value: "represented", label: "전속 작가" },
  { value: "project", label: "Project Artists" },
];

const REPRESENTED_ARTIST_SLUGS = new Set(
  seedArtists
    .filter((artist) => artist.type === "represented")
    .map((artist) => artist.slug)
);

function toFormValues(work: ArtistWorkDoc): WorkFormValues {
  return {
    isPublished: work.isPublished === true,
    archived: work.archived === true,
    coverImageUrl: work.coverImageUrl || "",
    modelGlb: work.modelGlb || "",
    modelUsdz: work.modelUsdz || "",
    generatedGlbUrl: work.generatedGlbUrl || "",
    generatedUsdzUrl: work.generatedUsdzUrl || "",
  };
}

function getWorkStatus(work: ArtistWorkDoc): Exclude<StatusFilter, "all"> {
  if (work.archived === true) {
    return "archived";
  }

  if (work.isPublished === true) {
    return "published";
  }

  return "pending";
}

function getWorkStatusLabel(status: Exclude<StatusFilter, "all">) {
  if (status === "published") return "Published";
  if (status === "archived") return "Archived";
  return "Review Pending";
}

function getWorkStatusTone(status: Exclude<StatusFilter, "all">) {
  if (status === "published") return "published";
  if (status === "archived") return "archived";
  return "pending";
}

function getWorkStatusMessage(status: Exclude<StatusFilter, "all">) {
  if (status === "published") {
    return "Published: 공개 작가 페이지에 표시됩니다.";
  }

  if (status === "archived") {
    return "Archived: 보관 처리되어 공개 목록에서 제외됩니다.";
  }

  return "Review Pending: 아직 공개되지 않습니다.";
}

function isProjectArtistWork(work: ArtistWorkDoc) {
  return !REPRESENTED_ARTIST_SLUGS.has(work.artistSlug || "");
}

function isRepresentedArtistWork(work: ArtistWorkDoc) {
  return REPRESENTED_ARTIST_SLUGS.has(work.artistSlug || "");
}

function getArtistFilterMatches(work: ArtistWorkDoc, filter: ArtistFilter) {
  if (filter === "all") return true;
  if (filter === "represented") return isRepresentedArtistWork(work);
  return isProjectArtistWork(work);
}

function Badge({
  tone,
  children,
}: {
  tone: "published" | "pending" | "archived" | "neutral" | "orange";
  children: React.ReactNode;
}) {
  const toneClass = {
    published: "border-[#F37021]/35 bg-[#F37021]/10 text-[#b85d18]",
    pending: "border-amber-200 bg-amber-50 text-amber-900",
    archived: "border-slate-200 bg-slate-50 text-slate-600",
    neutral: "border-black/10 bg-[#f7f6f2] text-neutral-600",
    orange: "border-[#F37021]/35 bg-[#F37021]/10 text-[#b85d18]",
  }[tone];

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.24em] ${toneClass}`}
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
      card: "border-black/8 bg-[#171717]",
      label: "text-white/45",
      value: "text-white",
    },
    orange: {
      card: "border-[#F37021]/20 bg-[#171717]",
      label: "text-white/42",
      value: "text-[#ff9d57]",
    },
    muted: {
      card: "border-white/10 bg-[#1d1d1d]",
      label: "text-white/42",
      value: "text-white/92",
    },
    subdued: {
      card: "border-slate-700/60 bg-[#1b1b1b]",
      label: "text-slate-300/60",
      value: "text-slate-100",
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
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
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

function MiniStatus({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "amber" | "gray";
}) {
  const toneClass = {
    green: "border-emerald-200 bg-emerald-50 text-emerald-800",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    gray: "border-black/10 bg-[#f7f6f2] text-neutral-500",
  }[tone];

  return (
    <div className={`rounded-[1rem] border px-3 py-2 ${toneClass}`}>
      <p className="text-[10px] uppercase tracking-[0.22em] opacity-70">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

function WorkListCard({
  work,
  active,
  onSelect,
}: {
  work: ArtistWorkDoc;
  active: boolean;
  onSelect: () => void;
}) {
  const status = getWorkStatus(work);
  const coverImageUrl = work.coverImageUrl || "";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group w-full rounded-[1.5rem] border bg-white p-3 text-left transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(0,0,0,0.04)] ${
        active
          ? "border-[#F37021]/45 ring-1 ring-[#F37021]/15"
          : "border-black/8 hover:border-black/15"
      }`}
    >
      <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-3">
        <div className="overflow-hidden rounded-[1.1rem] bg-[#ece8df]">
          {coverImageUrl ? (
            <img
              src={coverImageUrl}
              alt={work.title || "Artwork thumbnail"}
              className="aspect-[4/5] h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex aspect-[4/5] items-center justify-center px-3 text-center text-[11px] leading-5 text-neutral-400">
              이미지 없음
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-[16px] font-semibold tracking-[-0.03em] text-neutral-950">
                {work.title || "Untitled"}
              </h3>
              <p className="mt-1 truncate text-sm text-neutral-500">
                {work.artistName || "Unknown artist"}
              </p>
              <p className="mt-0.5 text-sm text-neutral-500">
                {work.year || "Year not set"}
              </p>
            </div>

            <Badge tone={getWorkStatusTone(status)}>
              {getWorkStatusLabel(status)}
            </Badge>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <MiniStatus
              label="이미지"
              value={work.coverImageUrl ? "있음" : "없음"}
              tone={work.coverImageUrl ? "green" : "gray"}
            />
            <MiniStatus
              label="크기"
              value={work.dimensions ? "있음" : "없음"}
              tone={work.dimensions ? "green" : "gray"}
            />
            <MiniStatus
              label="AR file"
              value={work.generatedGlbUrl ? "있음" : "없음"}
              tone={work.generatedGlbUrl ? "green" : "gray"}
            />
          </div>
        </div>
      </div>
    </button>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.75rem] border border-black/8 bg-white p-6 shadow-sm md:p-7">
      <div className="mb-5 space-y-2">
        <p className="text-[11px] font-medium tracking-[0.24em] text-neutral-400">
          {title}
        </p>
        <p className="max-w-2xl text-sm leading-7 text-neutral-600">
          {description}
        </p>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.25rem] border border-black/10 bg-[#f7f6f2] px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
        {label}
      </p>
      <p className="mt-2 break-words text-sm leading-6 text-neutral-600">
        {value || "—"}
      </p>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
        {label}
      </span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-13 w-full rounded-[1.25rem] border border-black/10 bg-[#f7f6f2] px-4 text-sm text-neutral-900 outline-none transition focus:border-black/20"
      />
    </label>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
  description,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description: string;
}) {
  return (
    <label className="block rounded-[1.25rem] border border-black/10 bg-[#f7f6f2] px-4 py-4">
      <span className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
        {label}
      </span>
      <div className="mt-3 flex items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-black/20"
        />
        <span className="text-sm leading-6 text-neutral-600">{description}</span>
      </div>
    </label>
  );
}

function ChecklistRow({
  label,
  detail,
  done,
}: {
  label: string;
  detail: string;
  done: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-[1.15rem] border border-black/8 bg-[#fcfbf8] px-4 py-3">
      <span
        className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
          done
            ? "bg-[#F37021]/10 text-[#b85d18]"
            : "bg-slate-100 text-slate-400"
        }`}
      >
        {done ? "✓" : "•"}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-neutral-700">{label}</p>
        <p className="mt-1 text-[12px] leading-5 text-neutral-500">{detail}</p>
      </div>
    </div>
  );
}

function StatusNote({
  status,
}: {
  status: Exclude<StatusFilter, "all">;
}) {
  const styles = {
    published: "border-[#F37021]/20 bg-[#fff7f1] text-[#b85d18]",
    pending: "border-amber-200 bg-amber-50 text-amber-900",
    archived: "border-slate-200 bg-slate-50 text-slate-700",
  }[status];

  return (
    <div className={`rounded-[1.25rem] border px-4 py-4 ${styles}`}>
      <p className="text-[11px] uppercase tracking-[0.24em] opacity-70">
        Publication Status
      </p>
      <p className="mt-2 text-sm leading-7">{getWorkStatusMessage(status)}</p>
    </div>
  );
}

function WorksEmptyState() {
  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-[#171717] shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
      <div className="relative overflow-hidden px-5 py-6 md:px-6 md:py-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(243,112,33,0.18),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_60%)]" />

        <div className="relative max-w-2xl">
          <p className="text-[11px] uppercase tracking-[0.3em] text-white/40">
            Empty state
          </p>
          <h3 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
            등록된 작품이 없습니다.
          </h3>
          <p className="mt-4 text-sm leading-7 text-white/68">
            작가가 작품을 등록하면 이곳에서 바로 검수할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AdminWorksPage() {
  const { errorMessage } = useProtectedArtist({
    requireAdmin: true,
    fallbackErrorMessage: "관리자 정보를 불러오는 중 오류가 발생했습니다.",
  });

  const [works, setWorks] = useState<ArtistWorkDoc[]>([]);
  const [selectedWorkId, setSelectedWorkId] = useState("");
  const [selectedForm, setSelectedForm] = useState<WorkFormValues>(EMPTY_FORM);
  const [isLoadingWorks, setIsLoadingWorks] = useState(true);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveErrorMessage, setSaveErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [artistFilter, setArtistFilter] = useState<ArtistFilter>("all");

  useEffect(() => {
    let isActive = true;

    void (async () => {
      try {
        setIsLoadingWorks(true);
        setSaveErrorMessage("");
        const result = await getAllWorksForAdmin();

        if (!isActive) {
          return;
        }

        setWorks(result);
        setSelectedWorkId((current) => current || result[0]?.id || "");
      } catch (error) {
        if (!isActive) {
          return;
        }

        setWorks([]);
        setSaveErrorMessage(
          error instanceof Error
            ? error.message
            : "작품 목록을 불러오는 중 오류가 발생했습니다."
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
  }, []);

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
      pending,
      published,
      archived,
    };
  }, [works]);

  const filteredWorks = useMemo(() => {
    return works.filter((work) => {
      const matchesStatus =
        statusFilter === "all" || getWorkStatus(work) === statusFilter;
      const matchesArtist = getArtistFilterMatches(work, artistFilter);

      return matchesStatus && matchesArtist;
    });
  }, [artistFilter, statusFilter, works]);

  const selectedWork = useMemo(
    () =>
      filteredWorks.find((entry) => entry.id === selectedWorkId) ??
      filteredWorks[0] ??
      null,
    [filteredWorks, selectedWorkId]
  );

  useEffect(() => {
    if (!selectedWork) {
      setSelectedForm(EMPTY_FORM);
      if (selectedWorkId && filteredWorks.length === 0) {
        setSelectedWorkId("");
      }
      return;
    }

    if (selectedWork.id !== selectedWorkId) {
      setSelectedWorkId(selectedWork.id);
    }

    setSelectedForm(toFormValues(selectedWork));
  }, [filteredWorks.length, selectedWork, selectedWorkId]);

  const selectedStatus = selectedWork ? getWorkStatus(selectedWork) : null;
  const selectedWorkSlug = selectedWork ? resolveArtistWorkSlug(selectedWork) : "";
  const artistHref = selectedWork?.artistSlug
    ? `/artists/${selectedWork.artistSlug}`
    : "";
  const arHref = selectedWorkSlug ? `/ar/${selectedWorkSlug}` : "";

  function updateSelectedField<K extends keyof WorkFormValues>(
    key: K,
    value: WorkFormValues[K]
  ) {
    setSelectedForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSaveSelected() {
    if (!selectedWork) {
      return;
    }

    setIsSaving(true);
    setSaveMessage("");
    setSaveErrorMessage("");

    try {
      await updateWorkForAdmin(selectedWork.id, selectedForm);
      setSaveMessage("작품 상태가 저장되었습니다.");
      const refreshed = await getAllWorksForAdmin();
      setWorks(refreshed);
    } catch (error) {
      setSaveErrorMessage(
        error instanceof Error
          ? error.message
          : "저장 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요."
      );
    } finally {
      setIsSaving(false);
    }
  }

  const hasWorks = works.length > 0;
  const hasFilteredWorks = filteredWorks.length > 0;

  return (
    <main className="theme-dark min-h-screen bg-[#f5f3ee] text-neutral-950">
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
              href="/admin"
              className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm"
            >
              Admin
            </Link>

            <Link
              href="/artists"
              className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm"
            >
              공개 사이트
            </Link>

            <LogoutButton className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm">
              로그아웃
            </LogoutButton>
          </div>
        </header>

        <section className="grid gap-8 py-12 md:grid-cols-[1.05fr_0.95fr] md:items-end md:py-16">
          <div className="max-w-4xl">
            <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
              Works Review
            </p>

            <h1 className="mt-5 text-5xl font-semibold tracking-[-0.04em] text-neutral-950 md:text-7xl md:leading-[0.95]">
              Works
              <br />
              Review.
            </h1>

            <p className="mt-8 max-w-2xl text-sm leading-7 text-neutral-600 md:text-[15px]">
              작가가 등록한 작품을 확인하고, 공개 여부와 아카이브 상태를 관리합니다.
            </p>
          </div>

          <aside className="rounded-[2rem] border border-black/10 bg-white/85 p-5 backdrop-blur-sm md:p-6">
            <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
              Review summary
            </p>
            <p className="mt-4 text-sm leading-7 text-neutral-600">
              작품 상태와 공개 링크를 빠르게 점검하고, 검수 결과를 바로 반영할 수 있습니다.
            </p>
          </aside>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="전체 작품" value={String(counts.total)} />
          <StatCard
            label="검수 대기"
            value={String(counts.pending)}
            accent="muted"
          />
          <StatCard
            label="공개 작품"
            value={String(counts.published)}
            accent="orange"
          />
          <StatCard
            label="보관 작품"
            value={String(counts.archived)}
            accent="subdued"
          />
        </section>

        {errorMessage || saveErrorMessage ? (
          <div className="mt-6 rounded-[1.75rem] border border-red-200 bg-red-50 px-5 py-5 text-sm leading-7 text-red-700">
            {errorMessage || saveErrorMessage}
          </div>
        ) : null}

        <section className="grid gap-6 border-t border-black/5 py-8 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <div className="rounded-[1.75rem] border border-black/8 bg-white p-4 shadow-sm">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                  상태 필터
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {STATUS_FILTER_OPTIONS.map((option) => (
                    <FilterPill
                      key={option.value}
                      active={statusFilter === option.value}
                      onClick={() => setStatusFilter(option.value)}
                    >
                      {option.label}
                    </FilterPill>
                  ))}
                </div>
              </div>

              <div className="mt-4 border-t border-black/5 pt-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                  작가 필터
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {ARTIST_FILTER_OPTIONS.map((option) => (
                    <FilterPill
                      key={option.value}
                      active={artistFilter === option.value}
                      onClick={() => setArtistFilter(option.value)}
                    >
                      {option.label}
                    </FilterPill>
                  ))}
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-neutral-500">
                {filteredWorks.length} / {works.length} works
              </p>
            </div>

            {isLoadingWorks ? (
              <div className="rounded-[1.75rem] border border-black/8 bg-white px-5 py-5 text-sm leading-7 text-neutral-600">
                작품 목록을 불러오는 중입니다.
              </div>
            ) : null}

            {!isLoadingWorks && !hasWorks ? (
              <WorksEmptyState />
            ) : null}

            {hasWorks ? (
              <div className="space-y-3">
                {filteredWorks.map((entry) => (
                  <WorkListCard
                    key={entry.id}
                    work={entry}
                    active={entry.id === selectedWorkId}
                    onSelect={() => setSelectedWorkId(entry.id)}
                  />
                ))}

                {!hasFilteredWorks ? (
                  <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-white px-5 py-5 text-sm leading-7 text-neutral-600">
                    조건에 맞는 작품이 없습니다.
                  </div>
                ) : null}
              </div>
            ) : null}
          </aside>

          <div className="space-y-6">
            {selectedWork ? (
              <>
                <SectionCard
                  title="Quick check"
                  description="공개 가능 여부를 빠르게 판단할 수 있도록 핵심 항목을 먼저 확인합니다."
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    <ChecklistRow
                      label="이미지 있음"
                      detail={selectedWork.coverImageUrl ? "있음" : "없음"}
                      done={Boolean(selectedWork.coverImageUrl)}
                    />
                    <ChecklistRow
                      label="제목 있음"
                      detail={selectedWork.title ? "있음" : "없음"}
                      done={Boolean(selectedWork.title)}
                    />
                    <ChecklistRow
                      label="작가명 있음"
                      detail={selectedWork.artistName ? "있음" : "없음"}
                      done={Boolean(selectedWork.artistName)}
                    />
                    <ChecklistRow
                      label="크기 있음"
                      detail={selectedWork.dimensions ? "있음" : "없음"}
                      done={Boolean(selectedWork.dimensions)}
                    />
                    <ChecklistRow
                      label="공개 상태 설정됨"
                      detail={getWorkStatusLabel(selectedStatus || "pending")}
                      done={Boolean(selectedWork)}
                    />
                  </div>
                </SectionCard>

                <SectionCard
                  title="1. Artwork Preview"
                  description="대표 이미지와 작품 기본 정보를 함께 확인합니다."
                >
                  <div className="overflow-hidden rounded-[1.75rem] border border-black/8 bg-[#f7f6f2]">
                    {selectedWork.coverImageUrl ? (
                      <img
                        src={selectedWork.coverImageUrl}
                        alt={selectedWork.title || "Artwork preview"}
                        className="aspect-[4/5] w-full object-cover md:aspect-[3/4]"
                      />
                    ) : (
                      <div className="flex aspect-[4/5] items-center justify-center bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(247,246,242,0.96)),radial-gradient(circle_at_25%_20%,rgba(243,112,33,0.16),transparent_28%)] px-6 text-center text-sm leading-7 text-neutral-400 md:aspect-[3/4]">
                        이미지 없음
                      </div>
                    )}
                  </div>

                  <div className="grid gap-3 rounded-[1.5rem] border border-black/8 bg-[#fcfbf8] p-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                        Overview
                      </p>
                      <h4 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-neutral-950">
                        {selectedWork.title || "Untitled"}
                      </h4>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                        Artist Name
                      </p>
                      <p className="mt-2 text-sm leading-6 text-neutral-600">
                        {selectedWork.artistName || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                        Year
                      </p>
                      <p className="mt-2 text-sm leading-6 text-neutral-600">
                        {selectedWork.year || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                        Medium
                      </p>
                      <p className="mt-2 text-sm leading-6 text-neutral-600">
                        {selectedWork.medium || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                        Dimensions
                      </p>
                      <p className="mt-2 text-sm leading-6 text-neutral-600">
                        {selectedWork.dimensions || "—"}
                      </p>
                    </div>
                  </div>
                </SectionCard>

                <SectionCard
                  title="2. Basic Info"
                  description="공개 목록에서 확인할 수 있는 핵심 정보입니다."
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    <InfoCard label="Title" value={selectedWork.title || ""} />
                    <InfoCard
                      label="Artist Name"
                      value={selectedWork.artistName || ""}
                    />
                    <InfoCard label="Year" value={selectedWork.year || ""} />
                    <InfoCard label="Medium" value={selectedWork.medium || ""} />
                    <div className="md:col-span-2">
                      <InfoCard
                        label="Dimensions"
                        value={selectedWork.dimensions || ""}
                      />
                    </div>
                  </div>
                </SectionCard>

                <SectionCard
                  title="3. Publication Status"
                  description="공개와 보관 상태를 여기서만 조정합니다."
                >
                  {selectedStatus ? <StatusNote status={selectedStatus} /> : null}

                  <div className="grid gap-5 md:grid-cols-2">
                    <ToggleField
                      label="isPublished"
                      checked={selectedForm.isPublished === true}
                      onChange={(checked) =>
                        updateSelectedField("isPublished", checked)
                      }
                      description={
                        selectedStatus === "published"
                          ? "Published: 공개 작가 페이지에 표시됩니다."
                          : selectedStatus === "archived"
                            ? "Archived: 보관 처리되어 공개 목록에서 제외됩니다."
                            : "Review Pending: 아직 공개되지 않습니다."
                      }
                    />
                    <ToggleField
                      label="archived"
                      checked={selectedForm.archived === true}
                      onChange={(checked) =>
                        updateSelectedField("archived", checked)
                      }
                      description="보관 처리 시 공개 목록에서 제외됩니다."
                    />
                  </div>
                </SectionCard>

                <SectionCard
                  title="4. AR / File Links"
                  description="기술 용어는 그대로 유지하고, 필요한 파일 URL을 직접 관리합니다."
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <TextField
                      label="generatedGlbUrl"
                      value={selectedForm.generatedGlbUrl || ""}
                      onChange={(value) =>
                        updateSelectedField("generatedGlbUrl", value)
                      }
                    />
                    <TextField
                      label="generatedUsdzUrl"
                      value={selectedForm.generatedUsdzUrl || ""}
                      onChange={(value) =>
                        updateSelectedField("generatedUsdzUrl", value)
                      }
                    />
                    <TextField
                      label="modelGlb"
                      value={selectedForm.modelGlb || ""}
                      onChange={(value) => updateSelectedField("modelGlb", value)}
                    />
                    <TextField
                      label="modelUsdz"
                      value={selectedForm.modelUsdz || ""}
                      onChange={(value) =>
                        updateSelectedField("modelUsdz", value)
                      }
                    />
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <R2ImageUploadField
                      label="작품 이미지"
                      description="관리자는 작품 이미지를 업로드하거나 URL로 직접 입력할 수 있습니다. 공개 페이지와 AR 페이지에서 사용됩니다."
                      value={selectedForm.coverImageUrl || ""}
                      onChange={(value) =>
                        updateSelectedField("coverImageUrl", value)
                      }
                      target="work-image"
                      artistSlug={selectedWork.artistSlug}
                      workSlug={selectedWork.slug || selectedWork.id || undefined}
                    />
                  </div>
                </SectionCard>

                <SectionCard
                  title="5. Actions"
                  description="작품 상태를 저장하고, 공개 화면을 바로 확인합니다."
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <button
                      type="button"
                      onClick={() => void handleSaveSelected()}
                      disabled={!selectedWork || isSaving}
                      className="inline-flex h-12 items-center justify-center rounded-full bg-neutral-950 px-6 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    >
                      {isSaving ? "저장 중..." : "변경사항 저장"}
                    </button>

                    {artistHref ? (
                      <Link
                        href={artistHref}
                        className="inline-flex h-12 items-center justify-center rounded-full border border-black/10 bg-white px-6 text-sm text-neutral-900 transition hover:border-black/20 sm:w-auto"
                      >
                        작가 페이지 열기
                      </Link>
                    ) : null}

                    {arHref ? (
                      <Link
                        href={arHref}
                        className="inline-flex h-12 items-center justify-center rounded-full border border-black/10 bg-[#f7f6f2] px-6 text-sm text-neutral-900 transition hover:border-black/20 sm:w-auto"
                      >
                        AR 페이지 열기
                      </Link>
                    ) : null}
                  </div>

                  <p className="text-sm leading-6 text-neutral-500">
                    작품 상태가 저장된 뒤 공개 페이지와 AR 페이지에서 이어서 확인할 수 있습니다.
                  </p>
                </SectionCard>
              </>
            ) : (
              <SectionCard
                title={hasWorks ? "조건에 맞는 작품이 없습니다." : "등록된 작품이 없습니다."}
                description={
                  hasWorks
                    ? "필터를 조정하면 다른 작품을 선택할 수 있습니다."
                    : "작가가 작품을 등록하면 이곳에서 검수할 수 있습니다."
                }
              >
                <div className="rounded-[1.5rem] border border-dashed border-black/10 bg-[#fcfbf8] px-5 py-6 text-sm leading-7 text-neutral-600">
                  {hasWorks
                    ? "조건에 맞는 작품이 없습니다."
                    : "등록된 작품이 없습니다."}
                </div>
              </SectionCard>
            )}

            {saveMessage ? (
              <div
                role="status"
                aria-live="polite"
                className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50 p-5 text-sm leading-7 text-emerald-800"
              >
                {saveMessage}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
