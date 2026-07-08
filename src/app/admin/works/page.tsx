"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import LogoutButton from "@/components/auth/LogoutButton";
import R2ImageUploadField from "@/components/shared/R2ImageUploadField";
import { artists as seedArtists } from "@/data/artists";
import { useProtectedArtist } from "@/hooks/useProtectedArtist";
import {
  getAllArtistsForAdmin,
  deleteWorkForAdmin,
  getAllWorksForAdmin,
  resolveArtistWorkSlug,
  updateWorkForAdmin,
  type ArtistDoc,
  type ArtistWorkDoc,
} from "@/lib/firebase/firestore";
import {
  deleteR2ObjectsByPublicUrls,
  uploadGlbFileToR2,
  uploadUsdzFileToR2,
} from "@/lib/r2/client";
import { hasArAsset } from "@/lib/workDisplay";
import { createCanvasArFiles, createSafeGlbFilename } from "@/lib/ar/createCanvasGlb";

const DEFAULT_AR_SIDE_COLOR = "#111111";
const DEFAULT_AR_DEPTH_CM = 3.5;
const MIN_AR_DEPTH_CM = 3;
const AR_TEXTURE_ROTATION_CHOICES = [0, 90, 180, 270] as const;

type WorkFormValues = {
  isPublished: boolean;
  archived: boolean;
  coverImageUrl: string;
  modelGlb: string;
  modelUsdz: string;
  generatedGlbUrl: string;
  generatedUsdzUrl: string;
  displayOrder?: number;
  arTextureRotationDeg: number;
  arTextureFlipX: boolean;
  arTextureFlipY: boolean;
  arSideColor: string;
  arDepthCm: string;
  arBackLabelEnabled: boolean;
  frontRotationXDeg?: number;
  frontRotationYDeg?: number;
  sideMode?: "canvas" | "image";
  showBackLabel?: boolean;
  docentAudioEnabled?: boolean;
  docentAudioUrl?: string;
  docentAudioTitle?: string;
  docentAudioDescription?: string;
};
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
  arTextureRotationDeg: 0,
  arTextureFlipX: false,
  arTextureFlipY: false,
  arSideColor: DEFAULT_AR_SIDE_COLOR,
  arDepthCm: String(DEFAULT_AR_DEPTH_CM),
  arBackLabelEnabled: true,
  docentAudioEnabled: false,
  docentAudioUrl: "",
  docentAudioTitle: "",
  docentAudioDescription: "",
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
  const fallbackDepthCm = normalizeArDepthCm(
    work.arDepthCm ?? work.depthCm ?? DEFAULT_AR_DEPTH_CM
  );
  return {
    isPublished: work.isPublished === true,
    archived: work.archived === true,
    coverImageUrl: work.coverImageUrl || "",
    modelGlb: work.modelGlb || "",
    modelUsdz: work.modelUsdz || "",
    generatedGlbUrl: work.generatedGlbUrl || "",
    generatedUsdzUrl: work.generatedUsdzUrl || "",
    displayOrder: work.displayOrder,
    arTextureRotationDeg: normalizeArTextureRotationDeg(
      work.arTextureRotationDeg ?? work.frontRotationYDeg ?? 0
    ),
    arTextureFlipX: work.arTextureFlipX === true,
    arTextureFlipY: work.arTextureFlipY === true,
    arSideColor: normalizeArSideColor(work.arSideColor ?? undefined),
    arDepthCm: String(fallbackDepthCm),
    arBackLabelEnabled:
      work.arBackLabelEnabled ??
      work.showBackLabel ??
      true,
    docentAudioEnabled: work.docentAudioEnabled === true,
    docentAudioUrl: work.docentAudioUrl || "",
    docentAudioTitle: work.docentAudioTitle || "",
    docentAudioDescription: work.docentAudioDescription || "",
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

function getDeleteConfirmMessage(status: Exclude<StatusFilter, "all">) {
  const base =
    "이 작품을 영구 삭제할까요? Firestore 작품 문서가 삭제되며, 공개 페이지에서도 더 이상 보이지 않습니다.";

  if (status === "published") {
    return `${base}\n\n현재 공개 중인 작품입니다. 삭제하면 공개 페이지에서도 즉시 사라집니다.`;
  }

  return base;
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

function normalizeArTextureRotationDeg(value?: number | null) {
  if (!Number.isFinite(value ?? NaN)) {
    return 0;
  }

  const normalized = ((Math.round(value ?? 0) % 360) + 360) % 360;

  return AR_TEXTURE_ROTATION_CHOICES.includes(
    normalized as (typeof AR_TEXTURE_ROTATION_CHOICES)[number]
  )
    ? (normalized as (typeof AR_TEXTURE_ROTATION_CHOICES)[number])
    : 0;
}

function normalizeArDepthCm(value?: number | null) {
  if (!Number.isFinite(value ?? NaN)) {
    return DEFAULT_AR_DEPTH_CM;
  }

  return Math.max(MIN_AR_DEPTH_CM, Number(value));
}

function normalizeArSideColor(value?: string | null) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return DEFAULT_AR_SIDE_COLOR;
  }

  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed : DEFAULT_AR_SIDE_COLOR;
}

function hasGlbAssetInForm(form: WorkFormValues) {
  return Boolean([form.generatedGlbUrl, form.modelGlb].some((value) => value?.trim()));
}

function hasUsdzAssetInForm(form: WorkFormValues) {
  return Boolean(
    [form.generatedUsdzUrl, form.modelUsdz].some((value) => value?.trim())
  );
}

function hasDocentAudioInForm(form: WorkFormValues) {
  return Boolean(form.docentAudioEnabled && form.docentAudioUrl?.trim());
}

function hasTrimmedValue(value?: string | null) {
  return Boolean(value?.trim());
}

function hasPositiveNumber(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function hasFiniteNumber(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value);
}

function formatArDepthCm(value?: string | number | null) {
  if (typeof value === "string") {
    const parsed = parseOptionalNumberInput(value);
    return parsed !== undefined ? parsed : DEFAULT_AR_DEPTH_CM;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  return DEFAULT_AR_DEPTH_CM;
}

function getArDepthCmNumber(form: WorkFormValues, work?: ArtistWorkDoc | null) {
  const parsed = parseOptionalNumberInput(form.arDepthCm);
  const fallback = normalizeArDepthCm(
    work?.arDepthCm ?? work?.depthCm ?? DEFAULT_AR_DEPTH_CM
  );

  return normalizeArDepthCm(parsed ?? fallback);
}

function getArBackLabelEnabled(form: WorkFormValues, work?: ArtistWorkDoc | null) {
  return form.arBackLabelEnabled ?? work?.arBackLabelEnabled ?? work?.showBackLabel ?? true;
}

function getArSideColor(form: WorkFormValues, work?: ArtistWorkDoc | null) {
  return normalizeArSideColor(form.arSideColor || work?.arSideColor || DEFAULT_AR_SIDE_COLOR);
}

function getArTextureRotationDeg(
  form: WorkFormValues,
  work?: ArtistWorkDoc | null
) {
  const value = form.arTextureRotationDeg ?? work?.arTextureRotationDeg ?? work?.frontRotationYDeg ?? 0;
  return normalizeArTextureRotationDeg(value);
}

function hasArSettingsChanged(form: WorkFormValues, work?: ArtistWorkDoc | null) {
  if (!work) {
    return false;
  }

  return (
    getArTextureRotationDeg(form, work) !==
      normalizeArTextureRotationDeg(
        work.arTextureRotationDeg ?? work.frontRotationYDeg ?? 0
      ) ||
    Boolean(form.arTextureFlipX) !== Boolean(work.arTextureFlipX) ||
    Boolean(form.arTextureFlipY) !== Boolean(work.arTextureFlipY) ||
    getArSideColor(form, work).toLowerCase() !==
      normalizeArSideColor(work.arSideColor || DEFAULT_AR_SIDE_COLOR).toLowerCase() ||
    getArDepthCmNumber(form, work) !==
      normalizeArDepthCm(work.arDepthCm ?? work.depthCm ?? DEFAULT_AR_DEPTH_CM) ||
    getArBackLabelEnabled(form, work) !==
      (work.arBackLabelEnabled ?? work.showBackLabel ?? true)
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

function getArtistQueryMatches(work: ArtistWorkDoc, artistQuery: string) {
  const normalizedQuery = artistQuery.trim();

  if (!normalizedQuery) {
    return true;
  }

  return (
    work.artistId === normalizedQuery || work.artistSlug === normalizedQuery
  );
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

type ArBadgeTone = "ready" | "missing" | "preparing" | "neutral";

function ArPill({
  tone,
  children,
}: {
  tone: ArBadgeTone;
  children: React.ReactNode;
}) {
  const toneClass = {
    ready: "border-emerald-400/25 bg-emerald-400/10 text-emerald-100",
    missing: "border-amber-400/25 bg-amber-400/10 text-amber-100",
    preparing: "border-[#F37021]/25 bg-[#F37021]/10 text-[#FFBF8A]",
    neutral: "border-white/10 bg-white/[0.04] text-white/72",
  }[tone];

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.22em] ${toneClass}`}
    >
      {children}
    </span>
  );
}

function ArChecklistItem({
  label,
  detail,
  tone,
}: {
  label: string;
  detail: string;
  tone: Exclude<ArBadgeTone, "neutral">;
}) {
  const badgeLabel = tone === "ready" ? "Ready" : tone === "preparing" ? "Preparing" : "Missing";

  return (
    <div className="flex items-start justify-between gap-4 rounded-[1.25rem] border border-white/10 bg-white/[0.03] px-4 py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-white/90">{label}</p>
        <p className="mt-1 text-[12px] leading-5 text-white/52">{detail}</p>
      </div>
      <ArPill tone={tone}>{badgeLabel}</ArPill>
    </div>
  );
}

function ArTextField({
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
      <span className="text-[11px] uppercase tracking-[0.24em] text-white/42">
        {label}
      </span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-13 w-full rounded-[1.15rem] border border-white/10 bg-white/[0.04] px-4 text-sm text-[#F7F1E8] outline-none transition placeholder:text-white/24 focus:border-white/20 focus:bg-white/[0.06]"
      />
      {helpText ? (
        <p className="mt-2 break-words text-[11px] leading-5 text-white/48">
          {helpText}
        </p>
      ) : null}
    </label>
  );
}

function PreviewLinkCard({
  label,
  href,
  pathLabel,
  buttonLabel,
  disabledMessage,
}: {
  label: string;
  href: string;
  pathLabel: string;
  buttonLabel: string;
  disabledMessage: string;
}) {
  const isDisabled = !href;

  return (
    <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.03] px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.24em] text-white/42">
        {label}
      </p>
      <p className="mt-2 break-all text-sm leading-6 text-white/64">
        {pathLabel}
      </p>
      <div className="mt-4">
        {isDisabled ? (
          <span className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] px-5 text-sm text-white/42">
            {disabledMessage}
          </span>
        ) : (
          <Link
            href={href}
            className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] px-5 text-sm text-[#F7F1E8] transition hover:border-white/20 hover:bg-white/[0.08]"
          >
            {buttonLabel}
          </Link>
        )}
      </div>
    </div>
  );
}

function ObjectSettingChip({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.1rem] border border-white/10 bg-black/20 px-3 py-3">
      <p className="text-[10px] uppercase tracking-[0.22em] text-white/40">
        {label}
      </p>
      <p className="mt-2 text-sm leading-6 text-white/90">{value}</p>
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

function AdminWorksPageContent() {
  const searchParams = useSearchParams();
  const requestedArtist = searchParams.get("artist")?.trim() || "";
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
  const [isDeletingSelectedWork, setIsDeletingSelectedWork] = useState(false);
  const [arTestFileMessage, setArTestFileMessage] = useState("");
  const [arTestFileErrorMessage, setArTestFileErrorMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [artistFilter, setArtistFilter] = useState<ArtistFilter>("all");
  const [artistQueryFilter, setArtistQueryFilter] = useState("");

  useEffect(() => {
    let isActive = true;

    void (async () => {
      try {
        setIsLoadingWorks(true);
        setSaveErrorMessage("");
        const [result, artistResult] = await Promise.all([
          getAllWorksForAdmin(),
          getAllArtistsForAdmin(),
        ]);

        if (!isActive) {
          return;
        }

        setWorks(result);
        setSelectedWorkId((current) => current || result[0]?.id || "");
        setArtistQueryFilter(() => {
          if (!requestedArtist) {
            return "";
          }

          const hasMatchingSeedArtist = seedArtists.some(
            (artist) => artist.slug === requestedArtist
          );
          const hasMatchingFirestoreArtist = artistResult.some(
            (artist: ArtistDoc) =>
              artist.id === requestedArtist || artist.slug === requestedArtist
          );
          const hasMatchingWork = result.some((work) =>
            getArtistQueryMatches(work, requestedArtist)
          );

          return hasMatchingSeedArtist ||
            hasMatchingFirestoreArtist ||
            hasMatchingWork
            ? requestedArtist
            : "";
        });
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
  }, [requestedArtist]);

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
      const matchesRequestedArtist = getArtistQueryMatches(
        work,
        artistQueryFilter
      );

      return matchesStatus && matchesArtist && matchesRequestedArtist;
    });
  }, [artistFilter, artistQueryFilter, statusFilter, works]);

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
  const hasGlbInForm = hasGlbAssetInForm(selectedForm);
  const hasUsdzInForm = hasUsdzAssetInForm(selectedForm);
  const isWebPreviewReady = hasGlbInForm;
  const isIphonePlacementReady = hasUsdzInForm;
  const selectedArtworkImageUrl =
    selectedForm.coverImageUrl?.trim() ||
    selectedWork?.coverImageUrl?.trim() ||
    "";
  const hasArtworkImage = hasTrimmedValue(selectedArtworkImageUrl);
  const hasArtworkDimensions =
    hasPositiveNumber(selectedWork?.widthCm) &&
    hasPositiveNumber(selectedWork?.heightCm);
  const hasArtistSlug = hasTrimmedValue(selectedWork?.artistSlug);
  const hasWorkRouteSlug = hasTrimmedValue(selectedWorkSlug);
  const hasArSettingsModified = hasArSettingsChanged(selectedForm, selectedWork);
  const currentArTextureRotationDeg = getArTextureRotationDeg(
    selectedForm,
    selectedWork
  );
  const currentArTextureFlipX = Boolean(selectedForm.arTextureFlipX);
  const currentArTextureFlipY = Boolean(selectedForm.arTextureFlipY);
  const currentArSideColor = getArSideColor(selectedForm, selectedWork);
  const currentArDepthCm = getArDepthCmNumber(selectedForm, selectedWork);
  const currentArBackLabelEnabled = getArBackLabelEnabled(
    selectedForm,
    selectedWork
  );
  const arFrontPreviewTransform = `rotate(${currentArTextureRotationDeg}deg) scaleX(${
    currentArTextureFlipX ? -1 : 1
  }) scaleY(${currentArTextureFlipY ? -1 : 1})`;
  const arBackLabelPreviewRows = [
    { label: "TITLE", value: selectedWork?.title?.trim() || "Untitled" },
    { label: "ARTIST", value: selectedWork?.artistName?.trim() || "Unknown artist" },
    { label: "YEAR", value: selectedWork?.year?.trim() || "" },
    { label: "MEDIUM", value: selectedWork?.medium?.trim() || "" },
    {
      label: "SIZE",
      value:
        selectedWork?.dimensions?.trim() ||
        (hasPositiveNumber(selectedWork?.widthCm) &&
        hasPositiveNumber(selectedWork?.heightCm)
          ? `${selectedWork?.widthCm} x ${selectedWork?.heightCm} cm`
          : ""),
    },
  ].filter((row) => Boolean(row.value));
  const arChecklistItems = [
    {
      label: "Artwork image",
      detail: hasArtworkImage
        ? "Cover image URL is ready for AR preview generation."
        : "Missing cover image URL.",
      tone: hasArtworkImage ? "ready" : "missing",
    },
    {
      label: "Width / Height",
      detail: hasArtworkDimensions
        ? `${selectedWork?.widthCm} cm / ${selectedWork?.heightCm} cm`
        : "Missing width or height.",
      tone: hasArtworkDimensions ? "ready" : "missing",
    },
    {
      label: "Artist slug",
      detail: hasArtistSlug
        ? `artistSlug: ${selectedWork?.artistSlug}`
        : "Missing artist slug.",
      tone: hasArtistSlug ? "ready" : "missing",
    },
    {
      label: "Work slug",
      detail: hasWorkRouteSlug
        ? `Route slug: ${selectedWorkSlug}`
        : "Missing work slug.",
      tone: hasWorkRouteSlug ? "ready" : "missing",
    },
    {
      label: "GLB preview",
      detail: isWebPreviewReady
        ? "Web / Android AR preview is ready."
        : "No GLB connected yet.",
      tone: isWebPreviewReady ? "ready" : "preparing",
    },
    {
      label: "USDZ placement",
      detail: isIphonePlacementReady
        ? "iPhone Quick Look placement is ready."
        : "USDZ is still needed for iPhone placement.",
      tone: isIphonePlacementReady ? "ready" : "missing",
    },
  ] as const;
  const hasObjectSettings = [
    selectedWork?.depthCm,
    selectedWork?.arDepthCm,
    selectedWork?.arSideColor,
    selectedWork?.arBackLabelEnabled,
    selectedWork?.arTextureRotationDeg,
    selectedWork?.frontRotationXDeg,
    selectedWork?.frontRotationYDeg,
    selectedWork?.sideMode,
    selectedWork?.showBackLabel,
  ].some((value) => value !== undefined);

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
      await updateWorkForAdmin(selectedWork.id, {
        isPublished: selectedForm.isPublished,
        archived: selectedForm.archived,
        coverImageUrl: selectedForm.coverImageUrl,
        modelGlb: selectedForm.modelGlb,
        modelUsdz: selectedForm.modelUsdz,
        generatedGlbUrl: selectedForm.generatedGlbUrl,
        generatedUsdzUrl: selectedForm.generatedUsdzUrl,
        displayOrder: selectedForm.displayOrder,
        arTextureRotationDeg: getArTextureRotationDeg(
          selectedForm,
          selectedWork
        ),
        arTextureFlipX: selectedForm.arTextureFlipX,
        arTextureFlipY: selectedForm.arTextureFlipY,
        arSideColor: getArSideColor(selectedForm, selectedWork),
        arDepthCm: getArDepthCmNumber(selectedForm, selectedWork),
        arBackLabelEnabled: getArBackLabelEnabled(selectedForm, selectedWork),
        docentAudioEnabled: selectedForm.docentAudioEnabled,
        docentAudioUrl: selectedForm.docentAudioUrl,
        docentAudioTitle: selectedForm.docentAudioTitle,
        docentAudioDescription: selectedForm.docentAudioDescription,
      });
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

  async function handleDeleteSelectedWork() {
    if (!selectedWork) {
      return;
    }

    const confirmed = window.confirm(
      getDeleteConfirmMessage(selectedStatus ?? "pending")
    );

    if (!confirmed) {
      return;
    }

    setIsDeletingSelectedWork(true);
    setSaveMessage("");
    setSaveErrorMessage("");

    try {
      const deletedWork = await deleteWorkForAdmin(selectedWork.id);

      void deleteR2ObjectsByPublicUrls(
        [
          deletedWork.coverImageUrl,
          deletedWork.generatedGlbUrl,
          deletedWork.generatedUsdzUrl,
        ].filter((value): value is string => Boolean(value && value.trim()))
      ).catch(() => undefined);

      setWorks((current) =>
        current.filter((work) => work.id !== selectedWork.id)
      );
      setSaveMessage("Artwork deleted.");
    } catch (error) {
      setSaveErrorMessage(
        error instanceof Error
          ? error.message
          : "작품 삭제에 실패했습니다. 잠시 후 다시 시도해주세요."
      );
    } finally {
      setIsDeletingSelectedWork(false);
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
      const { glbBlob, usdzBlob, usdzError } = await createCanvasArFiles(
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
          useArModelSettings: true,
          textureRotationDeg: currentArTextureRotationDeg,
          textureFlipX: currentArTextureFlipX,
          textureFlipY: currentArTextureFlipY,
          sideColor: currentArSideColor,
          depthCm: currentArDepthCm,
          showBackLabel: currentArBackLabelEnabled,
        }
      );

      const glbFilename = createSafeGlbFilename(
        selectedWork.title || selectedWork.slug || selectedWork.id || "artwork"
      );
      const usdzFilename = glbFilename.replace(/\.glb$/i, ".usdz");

      const glbUploadResult = await uploadGlbFileToR2({
        blob: glbBlob,
        filename: glbFilename,
        artistSlug: artistSlugForUpload,
        workSlug: workSlugForUpload,
      });

      let usdzUploadResult: Awaited<ReturnType<typeof uploadUsdzFileToR2>> | null =
        null;
      let usdzUploadErrorMessage = "";

      if (usdzBlob) {
        try {
          usdzUploadResult = await uploadUsdzFileToR2({
            blob: usdzBlob,
            filename: usdzFilename,
            artistSlug: artistSlugForUpload,
            workSlug: workSlugForUpload,
          });
        } catch (error) {
          usdzUploadErrorMessage =
            error instanceof Error
              ? error.message
              : "AR 준비용 USDZ 파일 업로드에 실패했습니다. 잠시 후 다시 시도해주세요.";
        }
      } else if (usdzError) {
        usdzUploadErrorMessage = usdzError;
      }

      setSelectedForm((current) => ({
        ...current,
        generatedGlbUrl: glbUploadResult.publicUrl,
        ...(usdzUploadResult?.publicUrl
          ? { generatedUsdzUrl: usdzUploadResult.publicUrl }
          : {}),
      }));
      setWorks((current) =>
        current.map((work) =>
          work.id === selectedWork.id
            ? {
              ...work,
                generatedGlbUrl: glbUploadResult.publicUrl,
                ...(usdzUploadResult?.publicUrl
                  ? { generatedUsdzUrl: usdzUploadResult.publicUrl }
                  : {}),
              }
            : work
        )
      );
      if (usdzUploadResult) {
        setArTestFileMessage(
          "GLB generated for web/Android preview. USDZ generated for iPhone Quick Look."
        );
      } else {
        setArTestFileMessage(
          `GLB generated for web/Android preview, but USDZ generation failed. iPhone AR placement still requires a valid USDZ file.${usdzUploadErrorMessage ? ` ${usdzUploadErrorMessage}` : ""}`
        );
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message ===
          "AR 준비용 파일 업로드에 실패했습니다. 잠시 후 다시 시도해주세요."
      ) {
        setArTestFileErrorMessage(error.message);
      } else {
        setArTestFileErrorMessage(
          "Failed to generate the test GLB. Check artwork image and dimensions."
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
              href="/admin/works/new"
              className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm"
            >
              Add Artwork
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
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
                  Works Review
                </p>

                <h1 className="mt-5 text-5xl font-semibold tracking-[-0.04em] text-neutral-950 md:text-7xl md:leading-[0.95]">
                  Works
                  <br />
                  Review.
                </h1>
              </div>

              <Link
                href="/admin/works/new"
                className="inline-flex h-11 items-center justify-center rounded-full border border-[#F37021]/25 bg-[#F37021]/10 px-5 text-sm text-[#b85d18] transition hover:border-[#F37021]/40 hover:bg-[#F37021]/14"
              >
                Add Artwork
              </Link>
            </div>

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

              {artistQueryFilter ? (
                <div className="mt-4 rounded-[1.25rem] border border-[#F37021]/20 bg-[#fff7f1] px-4 py-4 text-sm leading-6 text-[#b85d18]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-[#b85d18]/75">
                        Artist filter
                      </p>
                      <p className="mt-2 break-all">
                        {artistQueryFilter}
                      </p>
                    </div>
                    <Link
                      href="/admin/works"
                      className="shrink-0 rounded-full border border-[#F37021]/30 bg-white px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-[#b85d18] transition hover:bg-[#fff2e8]"
                    >
                      Clear
                    </Link>
                  </div>
                </div>
              ) : null}
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
                  title="4. AR Preview Builder"
                  description="Prepare and connect AR preview files for this artwork."
                >
                  <div className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(243,112,33,0.12),transparent_34%),linear-gradient(180deg,#1a1a1a_0%,#141414_100%)] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.24)] md:p-5">
                    <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                      <div className="space-y-4">
                        <div className="rounded-[1.45rem] border border-white/10 bg-white/[0.03] p-4 md:p-5">
                          <p className="text-[11px] uppercase tracking-[0.24em] text-white/42">
                            Artwork Image
                          </p>
                          <p className="mt-2 text-sm leading-7 text-white/60">
                            Use the same image that will power the public artwork and AR preview pages.
                          </p>
                          <div className="mt-4">
                            <R2ImageUploadField
                              label="Artwork Image"
                              description="Upload an image or paste a public URL. This value is used for the public artwork and AR preview."
                              value={selectedForm.coverImageUrl || ""}
                              onChange={(value) =>
                                updateSelectedField("coverImageUrl", value)
                              }
                              target="work-image"
                              artistSlug={selectedWork.artistSlug}
                              workSlug={selectedWork.slug || selectedWork.id || undefined}
                            />
                          </div>
                        </div>

                        <div className="rounded-[1.45rem] border border-white/10 bg-[linear-gradient(180deg,#171717_0%,#111111_100%)] p-4 md:p-5">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-[11px] uppercase tracking-[0.24em] text-white/42">
                                AR Model Preview &amp; Settings
                              </p>
                              <p className="mt-2 text-sm leading-7 text-white/62">
                                AR 파일을 생성하기 전에 정면 방향, 측면 마감, 뒷면 라벨을 확인하고 조정합니다.
                              </p>
                            </div>
                            <ArPill tone={hasArSettingsModified ? "preparing" : "neutral"}>
                              {hasArSettingsModified ? "Settings changed" : "In sync"}
                            </ArPill>
                          </div>

                          <div className="mt-4 grid gap-4 lg:grid-cols-2">
                            <div className="rounded-[1.45rem] border border-white/10 bg-white/[0.03] p-4">
                              <p className="text-[11px] uppercase tracking-[0.24em] text-white/42">
                                Original
                              </p>
                              <div className="mt-3 overflow-hidden rounded-[1.1rem] border border-white/10 bg-black/20">
                                {selectedArtworkImageUrl ? (
                                  <img
                                    src={selectedArtworkImageUrl}
                                    alt={selectedWork.title || "Original artwork"}
                                    className="aspect-[4/5] w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex aspect-[4/5] items-center justify-center px-4 text-center text-sm leading-6 text-white/38">
                                    이미지 없음
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="rounded-[1.45rem] border border-white/10 bg-white/[0.03] p-4">
                              <p className="text-[11px] uppercase tracking-[0.24em] text-white/42">
                                AR Front Preview
                              </p>
                              <div className="mt-3 overflow-hidden rounded-[1.1rem] border border-white/10 bg-black/20">
                                {selectedArtworkImageUrl ? (
                                  <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#151515]">
                                    <img
                                      src={selectedArtworkImageUrl}
                                      alt="AR front preview"
                                      className="absolute inset-0 h-full w-full object-cover"
                                      style={{
                                        transform: arFrontPreviewTransform,
                                        transformOrigin: "center",
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <div className="flex aspect-[4/5] items-center justify-center px-4 text-center text-sm leading-6 text-white/38">
                                    AR preview unavailable
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-4 xl:grid-cols-2">
                            <div className="rounded-[1.45rem] border border-white/10 bg-white/[0.03] p-4">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                  <p className="text-[11px] uppercase tracking-[0.24em] text-white/42">
                                    Front Direction Controls
                                  </p>
                                  <p className="mt-2 text-sm leading-7 text-white/58">
                                    Rotate and flip the front image until the preview matches the original.
                                  </p>
                                </div>
                                <ArPill tone="neutral">
                                  {currentArTextureRotationDeg}° / X{currentArTextureFlipX ? " on" : " off"} / Y{currentArTextureFlipY ? " on" : " off"}
                                </ArPill>
                              </div>

                              <div className="mt-4 flex flex-wrap gap-2">
                                {[90, 180, 270].map((step) => (
                                  <button
                                    key={step}
                                    type="button"
                                    onClick={() =>
                                      updateSelectedField(
                                        "arTextureRotationDeg",
                                        step as 90 | 180 | 270
                                      )
                                    }
                                    className="inline-flex h-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm text-[#F7F1E8] transition hover:border-white/20 hover:bg-white/[0.07]"
                                  >
                                    Rotate {step}°
                                  </button>
                                ))}
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateSelectedField(
                                      "arTextureFlipX",
                                      !currentArTextureFlipX
                                    )
                                  }
                                  className="inline-flex h-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm text-[#F7F1E8] transition hover:border-white/20 hover:bg-white/[0.07]"
                                >
                                  Flip Horizontal
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateSelectedField(
                                      "arTextureFlipY",
                                      !currentArTextureFlipY
                                    )
                                  }
                                  className="inline-flex h-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm text-[#F7F1E8] transition hover:border-white/20 hover:bg-white/[0.07]"
                                >
                                  Flip Vertical
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    updateSelectedField("arTextureRotationDeg", 0);
                                    updateSelectedField("arTextureFlipX", false);
                                    updateSelectedField("arTextureFlipY", false);
                                  }}
                                  className="inline-flex h-10 items-center justify-center rounded-full border border-[#F37021]/35 bg-[#F37021]/10 px-4 text-sm text-[#F7F1E8] transition hover:border-[#F37021]/55 hover:bg-[#F37021]/16"
                                >
                                  Reset Direction
                                </button>
                              </div>
                            </div>

                            <div className="rounded-[1.45rem] border border-white/10 bg-white/[0.03] p-4">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                  <p className="text-[11px] uppercase tracking-[0.24em] text-white/42">
                                    Edge / Depth Settings
                                  </p>
                                  <p className="mt-2 text-sm leading-7 text-white/58">
                                    Adjust the edge finish and depth before generating AR files.
                                  </p>
                                </div>
                                <ArPill tone="neutral">
                                  {currentArDepthCm.toFixed(1)} cm
                                </ArPill>
                              </div>

                              <div className="mt-4 space-y-4">
                                <div className="grid gap-2 sm:grid-cols-3">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateSelectedField(
                                        "arSideColor",
                                        "#111111"
                                      )
                                    }
                                    className={`rounded-[1rem] border px-4 py-3 text-left transition ${
                                      currentArSideColor.toLowerCase() === "#111111"
                                        ? "border-white/25 bg-white/[0.08]"
                                        : "border-white/10 bg-white/[0.03] hover:border-white/20"
                                    }`}
                                  >
                                    <span className="text-[10px] uppercase tracking-[0.22em] text-white/40">
                                      Preset
                                    </span>
                                    <span className="mt-2 block text-sm text-[#F7F1E8]">
                                      Matte Black
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateSelectedField(
                                        "arSideColor",
                                        "#d6cec0"
                                      )
                                    }
                                    className={`rounded-[1rem] border px-4 py-3 text-left transition ${
                                      currentArSideColor.toLowerCase() === "#d6cec0"
                                        ? "border-white/25 bg-white/[0.08]"
                                        : "border-white/10 bg-white/[0.03] hover:border-white/20"
                                    }`}
                                  >
                                    <span className="text-[10px] uppercase tracking-[0.22em] text-white/40">
                                      Preset
                                    </span>
                                    <span className="mt-2 block text-sm text-[#F7F1E8]">
                                      Warm Ivory
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateSelectedField(
                                        "arSideColor",
                                        "#444444"
                                      )
                                    }
                                    className={`rounded-[1rem] border px-4 py-3 text-left transition ${
                                      currentArSideColor.toLowerCase() === "#444444"
                                        ? "border-white/25 bg-white/[0.08]"
                                        : "border-white/10 bg-white/[0.03] hover:border-white/20"
                                    }`}
                                  >
                                    <span className="text-[10px] uppercase tracking-[0.22em] text-white/40">
                                      Preset
                                    </span>
                                    <span className="mt-2 block text-sm text-[#F7F1E8]">
                                      Neutral Gray
                                    </span>
                                  </button>
                                </div>

                                <label className="block">
                                  <span className="text-[11px] uppercase tracking-[0.24em] text-white/42">
                                    Side Color
                                  </span>
                                  <input
                                    type="color"
                                    value={normalizeArSideColor(
                                      selectedForm.arSideColor
                                    )}
                                    onChange={(event) =>
                                      updateSelectedField(
                                        "arSideColor",
                                        event.target.value
                                      )
                                    }
                                    className="mt-2 h-12 w-full rounded-[1.1rem] border border-white/10 bg-white/[0.04] p-1"
                                  />
                                </label>

                                <label className="block">
                                  <span className="text-[11px] uppercase tracking-[0.24em] text-white/42">
                                    AR Depth (cm)
                                  </span>
                                  <input
                                    type="number"
                                    min="3"
                                    step="0.5"
                                    value={selectedForm.arDepthCm}
                                    onChange={(event) =>
                                      updateSelectedField(
                                        "arDepthCm",
                                        event.target.value
                                      )
                                    }
                                    className="mt-2 h-13 w-full rounded-[1.15rem] border border-white/10 bg-white/[0.04] px-4 text-sm text-[#F7F1E8] outline-none transition placeholder:text-white/24 focus:border-white/20 focus:bg-white/[0.06]"
                                  />
                                  <p className="mt-2 text-[11px] leading-5 text-white/48">
                                    Current depth: {currentArDepthCm.toFixed(1)} cm. 3 cm 이상을 권장합니다.
                                  </p>
                                </label>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 rounded-[1.45rem] border border-white/10 bg-white/[0.03] p-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="text-[11px] uppercase tracking-[0.24em] text-white/42">
                                  Back Label Preview
                                </p>
                                <p className="mt-2 text-sm leading-7 text-white/58">
                                  The back face uses the artwork information label when enabled.
                                </p>
                              </div>
                              <label className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] uppercase tracking-[0.2em] text-white/70">
                                <input
                                  type="checkbox"
                                  checked={currentArBackLabelEnabled}
                                  onChange={(event) =>
                                    updateSelectedField(
                                      "arBackLabelEnabled",
                                      event.target.checked
                                    )
                                  }
                                  className="h-4 w-4 rounded border-white/20 bg-transparent"
                                />
                                Show Back Label
                              </label>
                            </div>

                            <div className="mt-4 rounded-[1.25rem] border border-white/10 bg-[#f6f1e8] p-4 text-[#1f1d1a]">
                              {currentArBackLabelEnabled ? (
                                <div className="space-y-3">
                                  <p className="text-[10px] uppercase tracking-[0.24em] text-[#67615a]">
                                    Artwork back label
                                  </p>
                                  <div className="space-y-1">
                                    {arBackLabelPreviewRows.map((row) => (
                                      <div key={row.label}>
                                        <p className="text-[10px] uppercase tracking-[0.22em] text-[#67615a]">
                                          {row.label}
                                        </p>
                                        <p className="text-sm leading-6 text-[#1f1d1a]">
                                          {row.value}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="flex min-h-[180px] items-center justify-center rounded-[1rem] border border-dashed border-[#d4c9b8] bg-[#fffdf8] text-center text-sm leading-6 text-[#67615a]">
                                  Back label disabled. The back face will render as a solid ivory surface.
                                </div>
                              )}
                            </div>
                          </div>

                          {hasArSettingsModified ? (
                            <p className="mt-4 rounded-[1.1rem] border border-[#F37021]/25 bg-[#F37021]/10 px-4 py-3 text-sm leading-6 text-[#FFBF8A]">
                              Settings changed. Regenerate AR Files to apply them.
                            </p>
                          ) : null}
                        </div>

                        <div className="rounded-[1.45rem] border border-white/10 bg-[linear-gradient(180deg,#161616_0%,#121212_100%)] p-4 md:p-5">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-[11px] uppercase tracking-[0.24em] text-white/42">
                                Docent Audio
                              </p>
                              <p className="mt-2 text-sm leading-7 text-white/60">
                                작품별 AR 페이지 하단에 도슨트 오디오 설명을 표시할 수 있습니다.
                              </p>
                            </div>
                            <ArPill tone={hasDocentAudioInForm(selectedForm) ? "ready" : "neutral"}>
                              {hasDocentAudioInForm(selectedForm) ? "Enabled" : "Hidden"}
                            </ArPill>
                          </div>

                          <label className="mt-4 flex items-start gap-3 rounded-[1.25rem] border border-white/10 bg-white/[0.03] px-4 py-4">
                            <input
                              type="checkbox"
                              checked={selectedForm.docentAudioEnabled === true}
                              onChange={(event) =>
                                updateSelectedField(
                                  "docentAudioEnabled",
                                  event.target.checked
                                )
                              }
                              className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-white/90">
                                Enable Docent Audio
                              </p>
                              <p className="mt-1 text-sm leading-6 text-white/55">
                                공개 AR 페이지에서 오디오 플레이어를 표시합니다.
                              </p>
                            </div>
                          </label>

                          <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <ArTextField
                              label="docentAudioTitle"
                              value={selectedForm.docentAudioTitle || ""}
                              onChange={(value) =>
                                updateSelectedField("docentAudioTitle", value)
                              }
                              placeholder="Docent Audio Guide"
                              helpText="오디오 플레이어 제목입니다."
                            />
                            <ArTextField
                              label="docentAudioUrl"
                              value={selectedForm.docentAudioUrl || ""}
                              onChange={(value) =>
                                updateSelectedField("docentAudioUrl", value)
                              }
                              placeholder="https://..."
                              helpText="MP3, WAV, OGG 등 공개 URL을 입력하세요."
                            />
                          </div>

                          <div className="mt-4">
                            <ArTextField
                              label="docentAudioDescription"
                              value={selectedForm.docentAudioDescription || ""}
                              onChange={(value) =>
                                updateSelectedField(
                                  "docentAudioDescription",
                                  value
                                )
                              }
                              placeholder="짧은 설명을 입력하세요."
                              helpText="선택사항입니다. 공개 페이지에서는 보조 문구로만 노출됩니다."
                            />
                          </div>
                        </div>

                        <div className="rounded-[1.45rem] border border-white/10 bg-white/[0.03] p-4 md:p-5">
                          <p className="text-[11px] uppercase tracking-[0.24em] text-white/42">
                            Status
                          </p>
                          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="max-w-2xl">
                              <h4 className="text-2xl font-semibold tracking-[-0.04em] text-[#F7F1E8]">
                                {isIphonePlacementReady
                                  ? "iPhone AR Placement Ready"
                                  : isWebPreviewReady
                                    ? "Web / Android Preview Ready"
                                    : "AR Preview Preparing"}
                              </h4>
                              <p className="mt-2 text-sm leading-7 text-white/66">
                                {isIphonePlacementReady
                                  ? "USDZ is connected, so iPhone Quick Look placement is ready. GLB still powers the web and Android preview."
                                  : isWebPreviewReady
                                    ? "GLB is connected, so web and Android previews are ready. Add a USDZ URL to restore iPhone placement."
                                    : "Connect a GLB or USDZ URL, or generate a test AR file set, to enable the preview flow."}
                              </p>
                            </div>
                            <div className="flex flex-col items-start gap-2">
                              <ArPill
                                tone={
                                  isIphonePlacementReady
                                    ? "ready"
                                    : isWebPreviewReady
                                      ? "preparing"
                                      : "missing"
                                }
                              >
                                {isIphonePlacementReady
                                  ? "iPhone Ready"
                                  : isWebPreviewReady
                                    ? "Web Ready"
                                    : "Waiting"}
                              </ArPill>
                              <span className="text-[11px] uppercase tracking-[0.22em] text-white/40">
                                USDZ unlocks Quick Look placement
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-[1.45rem] border border-white/10 bg-white/[0.03] p-4 md:p-5">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-[11px] uppercase tracking-[0.24em] text-white/42">
                                Readiness checklist
                              </p>
                              <p className="mt-2 text-sm leading-7 text-white/60">
                                Check the items below before generating or linking AR files.
                              </p>
                            </div>
                            <ArPill tone="neutral">6 checks</ArPill>
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            {arChecklistItems.map((item) => (
                              <ArChecklistItem
                                key={item.label}
                                label={item.label}
                                detail={item.detail}
                                tone={item.tone}
                              />
                            ))}
                          </div>
                        </div>

                        {hasObjectSettings ? (
                          <div className="rounded-[1.45rem] border border-white/10 bg-white/[0.03] p-4 md:p-5">
                            <p className="text-[11px] uppercase tracking-[0.24em] text-white/42">
                              Stored AR Settings
                            </p>
                            <p className="mt-2 text-sm leading-7 text-white/60">
                              Read-only summary of the AR model settings currently in the work document.
                            </p>

                            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                              <ObjectSettingChip
                                label="Rotation"
                                value={`${currentArTextureRotationDeg}°`}
                              />
                              <ObjectSettingChip
                                label="Flip X"
                                value={currentArTextureFlipX ? "On" : "Off"}
                              />
                              <ObjectSettingChip
                                label="Flip Y"
                                value={currentArTextureFlipY ? "On" : "Off"}
                              />
                              <ObjectSettingChip
                                label="Edge Color"
                                value={currentArSideColor.toUpperCase()}
                              />
                              <ObjectSettingChip
                                label="Depth"
                                value={`${currentArDepthCm.toFixed(1)} cm`}
                              />
                              <ObjectSettingChip
                                label="Back Label"
                                value={currentArBackLabelEnabled ? "On" : "Off"}
                              />
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div className="space-y-4">
                        <div className="rounded-[1.45rem] border border-white/10 bg-white/[0.03] p-4 md:p-5">
                          <p className="text-[11px] uppercase tracking-[0.24em] text-white/42">
                            Generate AR Files
                          </p>
                          <p className="mt-2 text-sm leading-7 text-white/66">
                            Preview settings affect the next generated GLB/USDZ files.
                          </p>
                          <p className="mt-2 text-sm leading-7 text-white/58">
                            Check the front direction and back label before generating AR files.
                          </p>
                          <div className="mt-4 rounded-[1.25rem] border border-white/10 bg-black/20 px-4 py-4">
                            <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">
                              Before generating
                            </p>
                            <ul className="mt-3 space-y-2 text-sm leading-6 text-white/58">
                              <li>Artwork image is required.</li>
                              <li>Width and height are required.</li>
                              <li>Web / Android Preview uses GLB.</li>
                              <li>iPhone Quick Look uses USDZ.</li>
                              <li>Save Changes after generating to persist the URLs.</li>
                            </ul>
                          </div>

                          <button
                            type="button"
                            onClick={() => void handleGenerateArTestFile()}
                            disabled={isGeneratingArTestFile}
                            className="mt-4 inline-flex h-11 items-center justify-center rounded-full border border-[#F37021]/35 bg-[#F37021]/10 px-5 text-sm text-[#F7F1E8] transition hover:border-[#F37021]/55 hover:bg-[#F37021]/16 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isGeneratingArTestFile
                              ? "Generating AR Files..."
                              : "Generate AR Files"}
                          </button>

                          {arTestFileMessage ? (
                            <p
                              role="status"
                              aria-live="polite"
                              className="mt-3 rounded-[1.15rem] border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm leading-6 text-emerald-100"
                            >
                              {arTestFileMessage}
                            </p>
                          ) : null}

                          {arTestFileErrorMessage ? (
                            <p
                              role="alert"
                              aria-live="assertive"
                              className="mt-3 rounded-[1.15rem] border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm leading-6 text-amber-100"
                            >
                              {arTestFileErrorMessage}
                            </p>
                          ) : null}
                        </div>

                        <div className="rounded-[1.45rem] border border-white/10 bg-white/[0.03] p-4 md:p-5">
                          <p className="text-[11px] uppercase tracking-[0.24em] text-white/42">
                            Preview Links
                          </p>
                          <p className="mt-2 text-sm leading-7 text-white/60">
                            After saving, check how this artwork appears on the public artwork and AR preview pages.
                          </p>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <PreviewLinkCard
                              label="Artwork Page"
                              href={publicWorkHref}
                              pathLabel={`/works/${selectedWorkSlug || "work-slug"}`}
                              buttonLabel="View Artwork"
                              disabledMessage="Save to unlock"
                            />
                            <PreviewLinkCard
                              label="AR Preview Page"
                              href={arHref}
                              pathLabel={`/ar/${selectedWorkSlug || "work-slug"}`}
                              buttonLabel="View AR Preview"
                              disabledMessage="Save to unlock"
                            />
                          </div>
                        </div>

                        <div className="rounded-[1.45rem] border border-white/10 bg-white/[0.03] p-4 md:p-5">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-[11px] uppercase tracking-[0.24em] text-white/42">
                                Manual AR File URLs
                              </p>
                              <p className="mt-2 text-sm leading-7 text-white/60">
                                If the automatic generator is not enough, connect GLB and USDZ URLs directly here.
                              </p>
                            </div>
                            <ArPill tone="neutral">Optional</ArPill>
                          </div>

                          <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <ArTextField
                              label="generatedGlbUrl"
                              value={selectedForm.generatedGlbUrl || ""}
                              onChange={(value) =>
                                updateSelectedField("generatedGlbUrl", value)
                              }
                              placeholder="https://..."
                              helpText="Generated GLB URL. This powers web and Android preview."
                            />
                            <ArTextField
                              label="generatedUsdzUrl"
                              value={selectedForm.generatedUsdzUrl || ""}
                              onChange={(value) =>
                                updateSelectedField("generatedUsdzUrl", value)
                              }
                              placeholder="https://..."
                              helpText="Generated USDZ URL. This restores iPhone Quick Look placement."
                            />
                            <ArTextField
                              label="modelGlb"
                              value={selectedForm.modelGlb || ""}
                              onChange={(value) =>
                                updateSelectedField("modelGlb", value)
                              }
                              placeholder="https://..."
                              helpText="Manual GLB URL if you already prepared one."
                            />
                            <ArTextField
                              label="modelUsdz"
                              value={selectedForm.modelUsdz || ""}
                              onChange={(value) =>
                                updateSelectedField("modelUsdz", value)
                              }
                              placeholder="https://..."
                              helpText="Manual USDZ URL for iPhone AR placement."
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </SectionCard>

                <SectionCard
                  title="5. Actions"
                  description="Save the current publication and AR link changes."
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <button
                      type="button"
                      onClick={() => void handleSaveSelected()}
                      disabled={!selectedWork || isSaving || isDeletingSelectedWork}
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

                    <button
                      type="button"
                      onClick={() => void handleDeleteSelectedWork()}
                      disabled={!selectedWork || isSaving || isDeletingSelectedWork}
                      className="inline-flex h-12 items-center justify-center rounded-full border border-red-300 bg-white px-6 text-sm text-red-700 transition hover:border-red-400 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    >
                      {isDeletingSelectedWork ? "삭제 중..." : "Delete Artwork"}
                    </button>
                  </div>

                  <p className="text-sm leading-6 text-neutral-500">
                    작품 상태가 저장된 뒤 공개 페이지와 AR Preview 페이지에서 이어서 확인할 수 있습니다.
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

export default function AdminWorksPage() {
  return (
    <Suspense
      fallback={
        <main className="theme-dark min-h-screen bg-[#111111] text-[var(--foreground)]" />
      }
    >
      <AdminWorksPageContent />
    </Suspense>
  );
}
