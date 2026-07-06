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
import { hasArAsset } from "@/lib/workDisplay";

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
    displayOrder: work.displayOrder,
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

function getWorkDisplayOrderLabel(work: ArtistWorkDoc) {
  return Number.isFinite(work.displayOrder as number)
    ? `Order ${work.displayOrder}`
    : "No order";
}

function parseOptionalNumberInput(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function hasArAssetInForm(form: WorkFormValues) {
  return Boolean(
    [
      form.generatedGlbUrl,
      form.modelGlb,
      form.generatedUsdzUrl,
      form.modelUsdz,
    ].some((value) => value?.trim())
  );
}

function getPublicWorkSlug(work: ArtistWorkDoc) {
  return work.slug?.trim() || resolveArtistWorkSlug(work) || work.id?.trim() || "";
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
                <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                  {getWorkDisplayOrderLabel(work)}
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
              label="AR status"
              value={hasArAsset(work) ? "AR Ready" : "Missing AR Files"}
              tone={hasArAsset(work) ? "green" : "gray"}
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
  helpText,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  helpText?: string;
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
      {helpText ? (
        <p className="mt-2 text-[11px] leading-5 text-neutral-500">
          {helpText}
        </p>
      ) : null}
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
  const [isGeneratingArTestFile, setIsGeneratingArTestFile] = useState(false);
  const [arTestFileMessage, setArTestFileMessage] = useState("");
  const [arTestFileErrorMessage, setArTestFileErrorMessage] = useState("");
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
      setArTestFileMessage("");
      setArTestFileErrorMessage("");
      if (selectedWorkId && filteredWorks.length === 0) {
        setSelectedWorkId("");
      }
      return;
    }

    if (selectedWork.id !== selectedWorkId) {
      setSelectedWorkId(selectedWork.id);
    }

    setSelectedForm(toFormValues(selectedWork));
    setArTestFileMessage("");
    setArTestFileErrorMessage("");
  }, [filteredWorks.length, selectedWork, selectedWorkId]);

  const selectedStatus = selectedWork ? getWorkStatus(selectedWork) : null;
  const selectedWorkSlug = selectedWork ? getPublicWorkSlug(selectedWork) : "";
  const artistHref = selectedWork?.artistSlug
    ? `/artists/${selectedWork.artistSlug}`
    : "";
  const publicWorkHref = selectedWorkSlug ? `/works/${selectedWorkSlug}` : "";
  const arHref = selectedWorkSlug ? `/ar/${selectedWorkSlug}` : "";
  const arReadyFromForm = hasArAssetInForm(selectedForm);

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

  async function handleGenerateArTestFile() {
    if (!selectedWork) {
      return;
    }

    const coverImageUrl =
      selectedForm.coverImageUrl?.trim() || selectedWork.coverImageUrl?.trim() || "";
    const widthCm = selectedWork.widthCm;
    const heightCm = selectedWork.heightCm;
    const artistSlugForUpload =
      selectedWork.artistSlug?.trim() || selectedWork.id?.trim() || "";
    const workSlugForUpload = selectedWorkSlug || selectedWork.id?.trim() || "";

    if (!coverImageUrl) {
      setArTestFileErrorMessage("작품 이미지가 필요합니다.");
      setArTestFileMessage("");
      return;
    }

    if (!widthCm || !heightCm) {
      setArTestFileErrorMessage(
        "AR 테스트 파일 생성을 위해 작품의 가로/세로 크기가 필요합니다."
      );
      setArTestFileMessage("");
      return;
    }

    if (!artistSlugForUpload || !workSlugForUpload) {
      setArTestFileErrorMessage("작가 또는 작품 주소 정보를 확인할 수 없습니다.");
      setArTestFileMessage("");
      return;
    }

    setIsGeneratingArTestFile(true);
    setArTestFileMessage("");
    setArTestFileErrorMessage("");

    try {
      const [
        { createCanvasGlbBlob, createSafeGlbFilename },
        { uploadGlbFileToR2 },
      ] = await Promise.all([
        import("@/lib/ar/createCanvasGlb"),
        import("@/lib/r2/client"),
      ]);

      const glbBlob = await createCanvasGlbBlob(
        {
          imageUrl: coverImageUrl,
          title: selectedWork.title || "Artwork",
          widthCm,
          heightCm,
          depthCm: selectedWork.depthCm,
          artistName: selectedWork.artistName,
          year: selectedWork.year,
          medium: selectedWork.medium,
          dimensions: selectedWork.dimensions,
        },
        {
          sideMode: "canvas",
          showBackLabel: false,
          frontRotationXDeg: selectedWork.frontRotationXDeg,
          frontRotationYDeg: selectedWork.frontRotationYDeg,
        }
      );

      const filename = createSafeGlbFilename(
        selectedWork.title || selectedWork.slug || selectedWork.id || "artwork"
      );
      const uploadResult = await uploadGlbFileToR2({
        blob: glbBlob,
        filename,
        artistSlug: artistSlugForUpload,
        workSlug: workSlugForUpload,
      });

      setSelectedForm((current) => ({
        ...current,
        generatedGlbUrl: uploadResult.publicUrl,
      }));
      setWorks((current) =>
        current.map((work) =>
          work.id === selectedWork.id
            ? {
                ...work,
                generatedGlbUrl: uploadResult.publicUrl,
              }
            : work
        )
      );
      setArTestFileMessage(
        "AR 테스트 파일이 생성되었습니다. 변경사항 저장을 눌러 반영해주세요."
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message ===
          "AR 준비용 파일 업로드에 실패했습니다. 잠시 후 다시 시도해주세요."
      ) {
        setArTestFileErrorMessage(error.message);
      } else {
        setArTestFileErrorMessage(
          "AR 테스트 파일 생성에 실패했습니다. 이미지 URL과 작품 크기를 확인해주세요."
        );
      }
      setArTestFileMessage("");
    } finally {
      setIsGeneratingArTestFile(false);
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

                  <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)] md:items-end">
                    <label className="block">
                      <span className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                        Display Order
                      </span>
                      <input
                        type="number"
                        step="1"
                        value={selectedForm.displayOrder ?? ""}
                        onChange={(event) =>
                          updateSelectedField(
                            "displayOrder",
                            parseOptionalNumberInput(event.target.value)
                          )
                        }
                        placeholder="빈 값 가능"
                        className="mt-2 h-13 w-full rounded-[1.25rem] border border-black/10 bg-[#f7f6f2] px-4 text-sm text-neutral-900 outline-none transition focus:border-black/20"
                      />
                    </label>

                    <div className="rounded-[1.25rem] border border-black/10 bg-[#f7f6f2] px-4 py-4">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                        노출 순서
                      </p>
                      <p className="mt-2 text-sm leading-6 text-neutral-600">
                        숫자가 낮을수록 작가 페이지에서 먼저 표시됩니다.
                      </p>
                    </div>
                  </div>
                </SectionCard>

                <SectionCard
                  title="4. AR / File Links"
                  description="기술 용어는 그대로 유지하고, 필요한 파일 URL을 직접 관리합니다."
                >
                  <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#171717] shadow-sm">
                    <div className="h-1 w-full bg-gradient-to-r from-[#F37021] via-[#ff9b5a] to-transparent" />
                    <div className="px-4 py-4 md:px-5 md:py-5">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-white/42">
                        AR File Connection Guide
                      </p>
                      <p className="mt-2 text-sm leading-7 text-white/70">
                        GLB는 웹/Android AR Preview에 우선 사용됩니다. USDZ는 iOS Quick Look용으로 연결할 수 있습니다. 저장 후 GLB 또는 USDZ URL이 하나라도 있으면 /works와 /ar 페이지에서 AR Preview Available로 표시됩니다.
                      </p>
                      <p className="mt-3 text-[11px] uppercase tracking-[0.24em] text-white/38">
                        현재는 URL을 직접 입력합니다.
                      </p>

                      <div className="mt-4 rounded-[1.25rem] border border-white/10 bg-white/[0.03] px-4 py-4">
                        <p className="text-[11px] uppercase tracking-[0.24em] text-white/42">
                          AR Test File
                        </p>
                        <p className="mt-2 text-sm leading-7 text-white/68">
                          작품 이미지와 크기를 기준으로 간단한 GLB 테스트 파일을 생성해 R2에 업로드합니다.
                        </p>
                        <button
                          type="button"
                          onClick={() => void handleGenerateArTestFile()}
                          disabled={isGeneratingArTestFile}
                          className="mt-4 inline-flex h-11 items-center justify-center rounded-full border border-[#F37021]/35 bg-[#F37021]/10 px-5 text-sm text-[#F7F1E8] transition hover:border-[#F37021]/55 hover:bg-[#F37021]/16 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isGeneratingArTestFile
                            ? "AR 테스트 파일 생성 중..."
                            : "AR 테스트 파일 자동 생성"}
                        </button>

                        {arTestFileMessage ? (
                          <p className="mt-3 text-sm leading-6 text-emerald-200">
                            {arTestFileMessage}
                          </p>
                        ) : null}

                        {arTestFileErrorMessage ? (
                          <p className="mt-3 text-sm leading-6 text-amber-200">
                            {arTestFileErrorMessage}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.25rem] border border-white/10 bg-[#171717] px-4 py-4 text-sm leading-7 text-white/70">
                    <div className="h-px w-12 bg-gradient-to-r from-[#F37021] to-transparent" />
                    <p className="mt-3 text-[11px] uppercase tracking-[0.24em] text-white/42">
                      Status: {arReadyFromForm ? "AR Ready" : "Missing AR Files"}
                    </p>
                    <p className="mt-2">
                      {arReadyFromForm
                        ? "GLB 또는 USDZ URL이 연결되어 공개 AR Preview가 활성화됩니다."
                        : "GLB 또는 USDZ URL을 연결하면 공개 페이지에서 AR Preview가 활성화됩니다."}
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <TextField
                      label="generatedGlbUrl"
                      value={selectedForm.generatedGlbUrl || ""}
                      onChange={(value) =>
                        updateSelectedField("generatedGlbUrl", value)
                      }
                      placeholder="https://..."
                      helpText="자동 생성 또는 업로드된 GLB URL을 연결합니다."
                    />
                    <TextField
                      label="generatedUsdzUrl"
                      value={selectedForm.generatedUsdzUrl || ""}
                      onChange={(value) =>
                        updateSelectedField("generatedUsdzUrl", value)
                      }
                      placeholder="https://..."
                      helpText="자동 생성 또는 업로드된 USDZ URL을 연결합니다."
                    />
                    <TextField
                      label="modelGlb"
                      value={selectedForm.modelGlb || ""}
                      onChange={(value) => updateSelectedField("modelGlb", value)}
                      placeholder="https://..."
                      helpText="수동으로 준비한 GLB URL을 연결합니다."
                    />
                    <TextField
                      label="modelUsdz"
                      value={selectedForm.modelUsdz || ""}
                      onChange={(value) =>
                        updateSelectedField("modelUsdz", value)
                      }
                      placeholder="https://..."
                      helpText="수동으로 준비한 USDZ URL을 연결합니다."
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

                  <div className="rounded-[1.25rem] border border-black/10 bg-[#f7f6f2] px-4 py-4 text-sm leading-7 text-neutral-600">
                    저장 후 공개 작품 상세 페이지와 AR Preview 페이지에서 상태가 반영됩니다.
                  </div>

                  <div className="rounded-[1.25rem] border border-black/10 bg-[#f7f6f2] px-4 py-4 text-sm leading-7 text-neutral-600">
                    <p>작품 상세: /works/{selectedWorkSlug || "work-slug"}</p>
                    <p>AR Preview: /ar/{selectedWorkSlug || "work-slug"}</p>
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

                    {publicWorkHref ? (
                      <Link
                        href={publicWorkHref}
                        className={`inline-flex h-12 items-center justify-center rounded-full px-6 text-sm transition sm:w-auto ${
                          selectedStatus === "published"
                            ? "border border-[#F37021]/30 bg-[#fff7f1] text-[#b85d18] hover:border-[#F37021]/40"
                            : "border border-black/10 bg-white text-neutral-900 hover:border-black/20"
                        }`}
                      >
                        작품 상세 열기
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

                  {selectedWorkSlug ? (
                    <div className="rounded-[1.25rem] border border-black/10 bg-[#f7f6f2] px-4 py-4 text-sm leading-7 text-neutral-600">
                      <p>작품 상세: /works/{selectedWorkSlug}</p>
                      <p>AR Preview: /ar/{selectedWorkSlug}</p>
                      <p className="mt-2 text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                        저장 후 공개 작품 상세 페이지와 AR Preview 페이지에서 상태가 반영됩니다.
                      </p>
                    </div>
                  ) : null}
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
