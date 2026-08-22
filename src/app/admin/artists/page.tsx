"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import LogoutButton from "@/components/auth/LogoutButton";
import R2ImageUploadField from "@/components/shared/R2ImageUploadField";
import { useProtectedArtist } from "@/hooks/useProtectedArtist";
import {
  createProjectArtistForAdmin,
  getAllArtistsForAdmin,
  getExhibitionsForArtist,
  getWorksForArtist,
  resolveArtistWorkSlug,
  updateArtistForAdmin,
  type ArtistAdminSavePayload,
  type ArtistDoc,
  type ArtistWorkDoc,
} from "@/lib/firebase/firestore";
import {
  ARTIST_ARCHIVE_LINK_TYPE_OPTIONS,
  ARTIST_CV_DISPLAY_ORDER,
  ARTIST_CV_TYPE_OPTIONS,
  getArtistCvTypeDisplayLabel,
  sortArtistArchiveLinks,
  sortArtistCvItems,
  type ArtistArchiveLink,
  type ArtistCvItem,
  type ArtistCvType,
} from "@/types/artist";
import type { ExhibitionDoc } from "@/types/exhibition";

type ArtistFormValues = ArtistAdminSavePayload;

const EMPTY_PROJECT_FORM: ArtistFormValues = {
  slug: "",
  name: "",
  nameKo: "",
  type: "project",
  status: "active",
  role: "artist",
  tagline: "",
  bio: "",
  bioEn: "",
  location: "",
  profileImageUrl: "",
  profileImagePosition: "center center",
  instagramUrl: "",
  youtubeUrl: "",
  cvUrl: "",
  artsyUrl: "",
  websiteUrl: "",
  portfolioPdfUrl: "",
  portfolioPdfLabel: "",
  featuredWorkId: "",
  featuredWorkSlug: "",
  featuredWorkTitle: "",
  featuredWorkImageUrl: "",
  galleryNote: "",
  galleryNoteEn: "",
  cvItems: [],
  archiveLinks: [],
};

function toFormValues(artist: ArtistDoc): ArtistFormValues {
  return {
    email: artist.email || "",
    slug: artist.slug || "",
    name: artist.name || "",
    nameKo: artist.nameKo || "",
    type: artist.type || "represented",
    status: artist.status || "active",
    role: artist.role || "artist",
    tagline: artist.tagline || "",
    bio: artist.bio || "",
    bioEn: artist.bioEn || "",
    location: artist.location || "",
    profileImageUrl: artist.profileImageUrl || "",
    profileImagePosition: artist.profileImagePosition || "center center",
    instagramUrl: artist.instagramUrl || "",
    youtubeUrl: artist.youtubeUrl || "",
    cvUrl: artist.cvUrl || "",
    artsyUrl: artist.artsyUrl || "",
    websiteUrl: artist.websiteUrl || "",
    portfolioPdfUrl: artist.portfolioPdfUrl || "",
    portfolioPdfLabel: artist.portfolioPdfLabel || "",
    featuredWorkId: artist.featuredWorkId || "",
    featuredWorkSlug: artist.featuredWorkSlug || "",
    featuredWorkTitle: artist.featuredWorkTitle || "",
    featuredWorkImageUrl: artist.featuredWorkImageUrl || "",
    galleryNote: artist.galleryNote || "",
    galleryNoteEn: artist.galleryNoteEn || "",
    cvItems: sortArtistCvItems(artist.cvItems ?? []),
    archiveLinks: sortArtistArchiveLinks(artist.archiveLinks ?? []),
  };
}

function ArtistListCard({
  artist,
  active,
  onSelect,
}: {
  artist: ArtistDoc;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-[1.5rem] border bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-black/15 hover:shadow-[0_20px_40px_rgba(0,0,0,0.04)] ${
        active ? "border-black/20 ring-1 ring-black/10" : "border-black/8"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={artist.type === "represented" ? "gold" : "silver"}>
          {artist.type || "artist"}
        </Badge>
        <Badge tone={artist.status === "active" ? "green" : "gray"}>
          {artist.status || "unknown"}
        </Badge>
        <Badge tone={artist.role === "admin" ? "black" : "gray"}>
          {artist.role || "artist"}
        </Badge>
      </div>

      <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-neutral-950">
        {artist.name || "Unnamed Artist"}
      </h3>
      <p className="mt-2 text-sm text-neutral-500">{artist.slug || "공개 주소 없음"}</p>
      <p className="mt-4 text-sm leading-6 text-neutral-600">
        {artist.tagline || "아직 소개 문구가 없습니다."}
      </p>
    </button>
  );
}

function Badge({
  tone,
  children,
}: {
  tone: "gold" | "silver" | "green" | "gray" | "black";
  children: React.ReactNode;
}) {
  const toneClass = {
    gold: "border-amber-200 bg-amber-50 text-amber-900",
    silver: "border-slate-200 bg-slate-50 text-slate-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-800",
    gray: "border-black/10 bg-[#f7f6f2] text-neutral-500",
    black: "border-black/10 bg-neutral-950 text-white",
  }[tone];

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.24em] ${toneClass}`}
    >
      {children}
    </span>
  );
}

function createItemId(prefix: "cv" | "archive") {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function createEmptyCvItem(order: number): ArtistCvItem {
  return {
    id: createItemId("cv"),
    year: "",
    type: "other",
    title: "",
    venue: "",
    location: "",
    note: "",
    order,
  };
}

function createEmptyArchiveLink(order: number): ArtistArchiveLink {
  return {
    id: createItemId("archive"),
    year: "",
    type: "other",
    title: "",
    source: "",
    url: "",
    description: "",
    order,
  };
}

function normalizeBulkPasteSectionTitle(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}

const BULK_PASTE_SECTION_TYPE_ALIASES: Array<{
  type: ArtistCvType;
  aliases: string[];
}> = [
  {
    type: "solo",
    aliases: [
      "개인전",
      "Solo Exhibitions",
      "Solo Exhibition",
      "개인전 | Solo Exhibitions",
    ],
  },
  {
    type: "group",
    aliases: [
      "단체전",
      "Selected Group Exhibitions",
      "Group Exhibitions",
      "Group Exhibition",
      "단체전 | Selected Group Exhibitions",
    ],
  },
  {
    type: "fair",
    aliases: ["아트페어", "Art Fairs", "Art Fair", "아트페어 | Art Fairs"],
  },
  {
    type: "award",
    aliases: [
      "수상",
      "수상내역",
      "수상내역 | Honors and Awards",
      "Honors and Awards",
      "Honors",
      "Awards",
      "Award",
      "수상 | Awards",
    ],
  },
  {
    type: "collection",
    aliases: ["소장", "Collections", "Collection", "소장 | Collections"],
  },
  {
    type: "publication",
    aliases: [
      "출판",
      "Publications",
      "Publication",
      "출판 | Publications",
    ],
  },
  {
    type: "residency",
    aliases: ["레지던시", "Residencies", "Residency", "레지던시 | Residencies"],
  },
  {
    type: "education",
    aliases: ["학력", "Education", "학력 | Education"],
  },
  {
    type: "other",
    aliases: ["기타", "Other", "기타 | Other"],
  },
];

const BULK_PASTE_SECTION_TYPE_MAP = new Map<string, ArtistCvType>();

for (const { type, aliases } of BULK_PASTE_SECTION_TYPE_ALIASES) {
  for (const alias of aliases) {
    BULK_PASTE_SECTION_TYPE_MAP.set(normalizeBulkPasteSectionTitle(alias), type);
  }
}

type AdminArtistTab = "profile" | "cv" | "archive" | "meta";

const ADMIN_ARTIST_TABS: Array<{
  value: AdminArtistTab;
  label: string;
  description: string;
}> = [
  {
    value: "profile",
    label: "Profile",
    description: "기본 정보, 소개글, 링크, 이미지",
  },
  {
    value: "cv",
    label: "CV / 이력",
    description: "CV 항목, 수상, 텍스트 붙여넣기",
  },
  {
    value: "archive",
    label: "아카이브",
    description: "보도 링크와 아카이브 텍스트 붙여넣기",
  },
  {
    value: "meta",
    label: "관리 메타",
    description: "문서 ID, 공개 주소, 유형, 보호 안내",
  },
];

type AdminCvGroup = {
  type: ArtistCvType;
  label: string;
  items: ArtistCvItem[];
};

type AdminArchiveGroup = {
  type: ArtistArchiveLink["type"];
  label: string;
  items: ArtistArchiveLink[];
};

function groupAdminCvItems(items: ArtistCvItem[]): AdminCvGroup[] {
  const grouped = new Map<ArtistCvType, ArtistCvItem[]>();

  for (const item of items) {
    const next = grouped.get(item.type) ?? [];
    next.push(item);
    grouped.set(item.type, next);
  }

  return ARTIST_CV_DISPLAY_ORDER.map((type) => ({
    type,
    label: getArtistCvTypeDisplayLabel(type),
    items: sortArtistCvItems(grouped.get(type) ?? []),
  }));
}

function groupAdminArchiveLinks(items: ArtistArchiveLink[]): AdminArchiveGroup[] {
  const grouped = new Map<ArtistArchiveLink["type"], ArtistArchiveLink[]>();

  for (const item of items) {
    const next = grouped.get(item.type) ?? [];
    next.push(item);
    grouped.set(item.type, next);
  }

  return ARTIST_ARCHIVE_LINK_TYPE_OPTIONS.map((option) => ({
    type: option.value,
    label: option.label,
    items: sortArtistArchiveLinks(grouped.get(option.value) ?? []),
  }));
}

function getBulkPasteSectionType(line: string): ArtistCvType | null {
  return (
    BULK_PASTE_SECTION_TYPE_MAP.get(normalizeBulkPasteSectionTitle(line)) ?? null
  );
}

function normalizeArchiveBulkPasteText(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}

function extractArchiveBulkPasteUrl(text: string) {
  return text.match(/https?:\/\/[^\s]+/i)?.[0] ?? "";
}

const ARCHIVE_BULK_PASTE_TYPE_RULES: Array<{
  type: ArtistArchiveLink["type"];
  keywords: string[];
}> = [
  { type: "interview", keywords: ["interview", "인터뷰"] },
  { type: "article", keywords: ["article", "기사", "아티클"] },
  { type: "video", keywords: ["video", "영상", "유튜브", "youtube"] },
  { type: "catalog", keywords: ["catalog", "catalogue", "카탈로그"] },
  { type: "press", keywords: ["press", "보도", "언론"] },
  { type: "website", keywords: ["website", "웹사이트", "homepage", "page"] },
];

function inferArchiveBulkPasteType(titleCandidate: string) {
  const normalized = normalizeArchiveBulkPasteText(titleCandidate);

  for (const rule of ARCHIVE_BULK_PASTE_TYPE_RULES) {
    if (
      rule.keywords.some((keyword) =>
        normalized.includes(normalizeArchiveBulkPasteText(keyword))
      )
    ) {
      return rule.type;
    }
  }

  return "other";
}

function normalizeCvItemOrder(items: ArtistCvItem[]) {
  return sortArtistCvItems(items).map((item, index) => ({
    ...item,
    order: index,
  }));
}

function normalizeArchiveLinkOrder(items: ArtistArchiveLink[]) {
  return sortArtistArchiveLinks(items).map((item, index) => ({
    ...item,
    order: index,
  }));
}

function getArtistWorkImageUrl(work: ArtistWorkDoc) {
  return work.coverImageUrl?.trim() || "";
}

function getArtistWorkSlug(work: ArtistWorkDoc) {
  return work.slug?.trim() || resolveArtistWorkSlug(work) || work.id?.trim() || "";
}

function getArtistWorkSelectionValue(work: ArtistWorkDoc) {
  return {
    featuredWorkId: work.id?.trim() || "",
    featuredWorkSlug: getArtistWorkSlug(work),
    featuredWorkTitle: work.title?.trim() || "",
    featuredWorkImageUrl: getArtistWorkImageUrl(work),
  };
}

function formatAdminDate(value?: string) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return "";
  }

  const parsed = new Date(`${trimmed}T00:00:00Z`);

  if (Number.isNaN(parsed.getTime())) {
    return trimmed;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

function formatAdminDateRange(startDate?: string, endDate?: string) {
  const start = formatAdminDate(startDate);
  const end = formatAdminDate(endDate);

  if (!start) {
    return end;
  }

  if (!end) {
    return start;
  }

  return `${start} - ${end}`;
}

function ArtistOverviewCard({
  artist,
  works,
  exhibitions,
  featuredWorkPresent,
}: {
  artist: ArtistDoc;
  works: ArtistWorkDoc[];
  exhibitions: ExhibitionDoc[];
  featuredWorkPresent: boolean;
}) {
  const artistTarget = artist.slug || artist.id;
  const recentWorks = works.slice(0, 3);
  const recentExhibitions = exhibitions.slice(0, 3);
  const worksSummary = {
    total: works.length,
    published: works.filter(
      (work) => work.isPublished === true && work.archived !== true
    ).length,
    pending: works.filter(
      (work) => work.isPublished !== true && work.archived !== true
    ).length,
    archived: works.filter((work) => work.archived === true).length,
  };
  const exhibitionsSummary = {
    total: exhibitions.length,
    published: exhibitions.filter(
      (exhibition) => exhibition.isPublished === true && exhibition.archived !== true
    ).length,
    archived: exhibitions.filter((exhibition) => exhibition.archived === true).length,
  };

  return (
    <section className="rounded-[1.75rem] border border-black/8 bg-[#141414] p-5 text-white shadow-[0_24px_70px_rgba(0,0,0,0.18)] md:p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-white/40">
            Artist Overview
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white md:text-3xl">
            {artist.name || artist.slug || "Unnamed Artist"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-white/56">
            작품과 전시 상태를 한 화면에서 빠르게 점검합니다.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/works/new?artist=${encodeURIComponent(artistTarget)}`}
            className="inline-flex h-10 items-center rounded-full border border-[#F37021]/35 bg-[#F37021] px-4 text-sm font-medium text-[#171717] transition hover:bg-[#ff7a2f]"
          >
            Add Artwork
          </Link>
          <Link
            href={`/admin/works?artist=${encodeURIComponent(artistTarget)}`}
            className="inline-flex h-10 items-center rounded-full border border-white/10 bg-white/[0.05] px-4 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/[0.08]"
          >
            Manage Works
          </Link>
          <Link
            href={`/admin/exhibitions?artist=${encodeURIComponent(artistTarget)}`}
            className="inline-flex h-10 items-center rounded-full border border-white/10 bg-white/[0.05] px-4 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/[0.08]"
          >
            Add Exhibition
          </Link>
          <Link
            href={artist.slug ? `/artists/${artist.slug}` : "/artists"}
            className="inline-flex h-10 items-center rounded-full border border-white/10 bg-white/[0.05] px-4 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/[0.08]"
          >
            View Public Artist Page
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/42">
              Works Summary
            </p>
            <span className="inline-flex rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-white/55">
              {featuredWorkPresent ? "Featured set" : "No featured work"}
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <SummaryMetric label="Total works" value={worksSummary.total} />
            <SummaryMetric label="Published works" value={worksSummary.published} />
            <SummaryMetric label="Pending works" value={worksSummary.pending} />
            <SummaryMetric label="Archived works" value={worksSummary.archived} />
          </div>

          <div className="mt-4 space-y-3">
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/42">
              Recent works
            </p>
            {recentWorks.length > 0 ? (
              <div className="space-y-2">
                {recentWorks.map((work) => (
                  <div
                    key={work.id}
                    className="flex items-center justify-between gap-3 rounded-[1.1rem] border border-white/8 bg-black/15 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">
                        {work.title || "Untitled"}
                      </p>
                      <p className="mt-1 text-xs text-white/52">
                        {work.year || "Year not set"}
                      </p>
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.22em] text-white/38">
                      {work.isPublished === true
                        ? "Published"
                        : work.archived === true
                          ? "Archived"
                          : "Pending"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-6 text-white/50">
                아직 등록된 작품이 없습니다.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/42">
            Exhibitions Summary
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <SummaryMetric label="Total exhibitions" value={exhibitionsSummary.total} />
            <SummaryMetric
              label="Published exhibitions"
              value={exhibitionsSummary.published}
            />
            <SummaryMetric
              label="Archived exhibitions"
              value={exhibitionsSummary.archived}
            />
            <SummaryMetric label="Public page" value={artist.slug ? "Live" : "Hidden"} />
          </div>

          <div className="mt-4 space-y-3">
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/42">
              Recent exhibitions
            </p>
            {recentExhibitions.length > 0 ? (
              <div className="space-y-2">
                {recentExhibitions.map((exhibition) => (
                  <div
                    key={exhibition.id}
                    className="flex items-center justify-between gap-3 rounded-[1.1rem] border border-white/8 bg-black/15 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">
                        {exhibition.title || "Untitled Exhibition"}
                      </p>
                      <p className="mt-1 text-xs text-white/52">
                        {formatAdminDateRange(
                          exhibition.startDate,
                          exhibition.endDate
                        ) || "Date not set"}
                      </p>
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.22em] text-white/38">
                      {exhibition.venue || exhibition.location || "No venue"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-6 text-white/50">
                아직 등록된 전시가 없습니다.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function SummaryMetric({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-[1.1rem] border border-white/10 bg-black/15 px-4 py-4">
      <p className="text-[10px] uppercase tracking-[0.24em] text-white/40">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">
        {value}
      </p>
    </div>
  );
}

function serializeArtistFormValues(form: ArtistFormValues) {
  return JSON.stringify({
    ...form,
    cvItems: normalizeCvItemOrder(form.cvItems ?? []),
    archiveLinks: normalizeArchiveLinkOrder(form.archiveLinks ?? []),
  });
}

function reorderByIndex<T extends { order: number }>(
  items: T[],
  index: number,
  direction: -1 | 1
) {
  const next = [...items];
  const targetIndex = index + direction;

  if (targetIndex < 0 || targetIndex >= next.length) {
    return next;
  }

  [next[index], next[targetIndex]] = [next[targetIndex], next[index]];

  return next.map((item, nextIndex) => ({
    ...item,
    order: nextIndex,
  }));
}

export default function AdminArtistsPage() {
  const { artist, errorMessage, isLoading } = useProtectedArtist({
    requireAdmin: true,
    fallbackErrorMessage: "관리자 정보를 불러오는 중 오류가 발생했습니다.",
  });

  const [artists, setArtists] = useState<ArtistDoc[]>([]);
  const [selectedArtistId, setSelectedArtistId] = useState("");
  const [artistSearch, setArtistSearch] = useState("");
  const [selectedForm, setSelectedForm] = useState<ArtistFormValues>(
    EMPTY_PROJECT_FORM
  );
  const [projectForm, setProjectForm] =
    useState<ArtistFormValues>(EMPTY_PROJECT_FORM);
  const [isLoadingArtists, setIsLoadingArtists] = useState(true);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [createMessage, setCreateMessage] = useState("");
  const [createError, setCreateError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isBulkPasteOpen, setIsBulkPasteOpen] = useState(false);
  const [bulkPasteText, setBulkPasteText] = useState("");
  const [bulkPasteMessage, setBulkPasteMessage] = useState("");
  const [bulkPasteError, setBulkPasteError] = useState("");
  const [bulkPasteMode, setBulkPasteMode] = useState<"append" | "replace">(
    "append"
  );
  const [archiveBulkPasteText, setArchiveBulkPasteText] = useState("");
  const [archiveBulkPasteMessage, setArchiveBulkPasteMessage] = useState("");
  const [archiveBulkPasteError, setArchiveBulkPasteError] = useState("");
  const [archiveBulkPasteMode, setArchiveBulkPasteMode] = useState<
    "append" | "replace"
  >("append");
  const [isArchiveBulkPasteOpen, setIsArchiveBulkPasteOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminArtistTab>("profile");
  const [expandedCvGroups, setExpandedCvGroups] = useState<
    Partial<Record<ArtistCvType, boolean>>
  >({});
  const [expandedArchiveGroups, setExpandedArchiveGroups] = useState<
    Partial<Record<ArtistArchiveLink["type"], boolean>>
  >({});
  const [selectedArtistWorks, setSelectedArtistWorks] = useState<ArtistWorkDoc[]>(
    []
  );
  const [isLoadingSelectedArtistWorks, setIsLoadingSelectedArtistWorks] =
    useState(false);
  const [selectedArtistWorksError, setSelectedArtistWorksError] = useState("");
  const [selectedArtistExhibitions, setSelectedArtistExhibitions] = useState<
    ExhibitionDoc[]
  >([]);
  const [isLoadingSelectedArtistExhibitions, setIsLoadingSelectedArtistExhibitions] =
    useState(false);
  const [selectedArtistExhibitionsError, setSelectedArtistExhibitionsError] =
    useState("");

  async function loadArtists(nextSelectedArtistId?: string) {
    const result = await getAllArtistsForAdmin();

    setArtists(result);
    setSelectedArtistId((current) => {
      if (
        nextSelectedArtistId &&
        result.some((entry) => entry.id === nextSelectedArtistId)
      ) {
        return nextSelectedArtistId;
      }

      if (current && result.some((entry) => entry.id === current)) {
        return current;
      }

      return result[0]?.id || "";
    });

    return result;
  }

  useEffect(() => {
    let isActive = true;

    void (async () => {
      try {
        setIsLoadingArtists(true);
        const result = await getAllArtistsForAdmin();

        if (!isActive) {
          return;
        }

        setArtists(result);
        setSelectedArtistId((current) => {
          if (current && result.some((entry) => entry.id === current)) {
            return current;
          }

          return result[0]?.id || "";
        });
      } catch (error) {
        if (!isActive) {
          return;
        }

        setArtists([]);
        setSaveError(
          error instanceof Error
            ? error.message
            : "작가 목록을 불러오는 중 오류가 발생했습니다."
        );
      } finally {
        if (isActive) {
          setIsLoadingArtists(false);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const nextArtist = artists.find((entry) => entry.id === selectedArtistId);

    if (nextArtist) {
      setSelectedForm(toFormValues(nextArtist));
      setBulkPasteText("");
      setBulkPasteMessage("");
      setBulkPasteError("");
      setBulkPasteMode("append");
      setArchiveBulkPasteText("");
      setArchiveBulkPasteMessage("");
      setArchiveBulkPasteError("");
      setArchiveBulkPasteMode("append");
      setIsArchiveBulkPasteOpen(false);
      setIsBulkPasteOpen(false);
    }
  }, [artists, selectedArtistId]);

  useEffect(() => {
    let isActive = true;
    const nextArtist = artists.find((entry) => entry.id === selectedArtistId);

    if (!nextArtist) {
      setSelectedArtistWorks([]);
      setSelectedArtistWorksError("");
      setIsLoadingSelectedArtistWorks(false);
      return () => {
        isActive = false;
      };
    }

    setIsLoadingSelectedArtistWorks(true);
    setSelectedArtistWorksError("");

    void getWorksForArtist(nextArtist.id)
      .then((works) => {
        if (!isActive) {
          return;
        }

        setSelectedArtistWorks(works);
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }

        setSelectedArtistWorks([]);
        setSelectedArtistWorksError(
          error instanceof Error
            ? error.message
            : "대표 작품 후보를 불러오는 중 오류가 발생했습니다."
        );
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingSelectedArtistWorks(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [artists, selectedArtistId]);

  useEffect(() => {
    let isActive = true;
    const nextArtist = artists.find((entry) => entry.id === selectedArtistId);

    if (!nextArtist) {
      setSelectedArtistExhibitions([]);
      setSelectedArtistExhibitionsError("");
      setIsLoadingSelectedArtistExhibitions(false);
      return () => {
        isActive = false;
      };
    }

    setIsLoadingSelectedArtistExhibitions(true);
    setSelectedArtistExhibitionsError("");

    void getExhibitionsForArtist(nextArtist.id, nextArtist.slug)
      .then((exhibitions) => {
        if (!isActive) {
          return;
        }

        setSelectedArtistExhibitions(exhibitions);
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }

        setSelectedArtistExhibitions([]);
        setSelectedArtistExhibitionsError(
          error instanceof Error
            ? error.message
            : "전시 현황을 불러오는 중 오류가 발생했습니다."
        );
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingSelectedArtistExhibitions(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [artists, selectedArtistId]);

  const filteredArtists = useMemo(() => {
    const query = artistSearch.trim().toLowerCase();

    if (!query) {
      return artists;
    }

    return artists.filter((entry) =>
      [entry.name, entry.nameKo, entry.slug, entry.email].some((value) =>
        value ? value.toLowerCase().includes(query) : false
      )
    );
  }, [artistSearch, artists]);

  useEffect(() => {
    if (filteredArtists.length === 0) {
      return;
    }

    if (!filteredArtists.some((entry) => entry.id === selectedArtistId)) {
      setSelectedArtistId(filteredArtists[0].id);
    }
  }, [filteredArtists, selectedArtistId]);

  const selectedArtist = useMemo(
    () => artists.find((entry) => entry.id === selectedArtistId) ?? null,
    [artists, selectedArtistId]
  );
  const selectedArtistBaseline = useMemo(
    () => (selectedArtist ? toFormValues(selectedArtist) : null),
    [selectedArtist]
  );
  const cvItems = useMemo(
    () => sortArtistCvItems(selectedForm.cvItems ?? []),
    [selectedForm.cvItems]
  );
  const archiveLinks = useMemo(
    () => sortArtistArchiveLinks(selectedForm.archiveLinks ?? []),
    [selectedForm.archiveLinks]
  );
  const cvGroups = useMemo(() => groupAdminCvItems(cvItems), [cvItems]);
  const archiveGroups = useMemo(
    () => groupAdminArchiveLinks(archiveLinks),
    [archiveLinks]
  );
  const publishedSelectedArtistWorks = useMemo(
    () =>
      selectedArtistWorks.filter(
        (work) => work.isPublished === true && work.archived !== true
      ),
    [selectedArtistWorks]
  );
  const publishedSelectedArtistExhibitions = useMemo(
    () =>
      selectedArtistExhibitions.filter(
        (exhibition) => exhibition.isPublished === true && exhibition.archived !== true
      ),
    [selectedArtistExhibitions]
  );
  const selectedFeaturedWork = useMemo(() => {
    const featuredWorkId = selectedForm.featuredWorkId?.trim() || "";
    const featuredWorkSlug = selectedForm.featuredWorkSlug?.trim() || "";
    const featuredWorkTitle = selectedForm.featuredWorkTitle?.trim() || "";

    if (!featuredWorkId && !featuredWorkSlug && !featuredWorkTitle) {
      return null;
    }

    return (
      publishedSelectedArtistWorks.find((work) => {
        const workSlug = getArtistWorkSlug(work);
        return (
          (featuredWorkId && work.id === featuredWorkId) ||
          (featuredWorkSlug && workSlug === featuredWorkSlug) ||
          (featuredWorkTitle && (work.title ?? "").trim() === featuredWorkTitle)
        );
      }) ?? null
    );
  }, [
    publishedSelectedArtistWorks,
    selectedForm.featuredWorkId,
    selectedForm.featuredWorkSlug,
    selectedForm.featuredWorkTitle,
  ]);
  const selectedFeaturedWorkPreview =
    selectedFeaturedWork ??
    (selectedForm.featuredWorkTitle?.trim() ||
    selectedForm.featuredWorkSlug?.trim() ||
    selectedForm.featuredWorkImageUrl?.trim()
      ? {
          id: selectedForm.featuredWorkId?.trim() || "",
          slug: selectedForm.featuredWorkSlug?.trim() || "",
          title: selectedForm.featuredWorkTitle?.trim() || "",
          coverImageUrl: selectedForm.featuredWorkImageUrl?.trim() || "",
          year: "",
        }
      : null);
  const hasFeaturedWorkSelection = Boolean(
    selectedForm.featuredWorkId?.trim() ||
      selectedForm.featuredWorkSlug?.trim() ||
      selectedForm.featuredWorkTitle?.trim() ||
      selectedForm.featuredWorkImageUrl?.trim()
  );
  const isSelectedFormDirty = useMemo(() => {
    if (!selectedArtistBaseline) {
      return false;
    }

    return (
      serializeArtistFormValues(selectedForm) !==
      serializeArtistFormValues(selectedArtistBaseline)
    );
  }, [selectedArtistBaseline, selectedForm]);

  const representedCount = artists.filter(
    (entry) => entry.type === "represented"
  ).length;
  const projectCount = artists.filter((entry) => entry.type === "project").length;
  const activeCount = artists.filter((entry) => entry.status === "active").length;

  const selectedArtistIsRepresented = selectedArtist?.type === "represented";
  const publicHref = selectedArtist?.slug ? `/artists/${selectedArtist.slug}` : "/artists";
  const saveButtonClassName = `inline-flex h-11 items-center justify-center rounded-full border px-5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-80 ${
    isSelectedFormDirty
      ? "border-[#F37021]/45 bg-[#F37021] text-[#171717] shadow-[0_12px_30px_rgba(243,112,33,0.18)] hover:bg-[#ff7a2f] disabled:border-[#F37021]/25 disabled:bg-[#F37021]/45 disabled:text-[#1f1f1f]"
      : "border-white/10 bg-white/[0.06] text-[var(--foreground)] hover:border-[#F37021]/35 hover:bg-[#F37021]/12 disabled:border-white/10 disabled:bg-white/[0.04] disabled:text-[var(--muted)]"
  }`;
  const showDirtyNotice = isSelectedFormDirty && !!selectedArtist;

  function updateSelectedField<K extends keyof ArtistFormValues>(
    key: K,
    value: ArtistFormValues[K]
  ) {
    setSelectedForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateProjectField<K extends keyof ArtistFormValues>(
    key: K,
    value: ArtistFormValues[K]
  ) {
    setProjectForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function clearFeaturedWork() {
    setSelectedForm((current) => ({
      ...current,
      featuredWorkId: "",
      featuredWorkSlug: "",
      featuredWorkTitle: "",
      featuredWorkImageUrl: "",
    }));
  }

  function setFeaturedWork(work: ArtistWorkDoc | null) {
    if (!work) {
      clearFeaturedWork();
      return;
    }

    const selection = getArtistWorkSelectionValue(work);

    setSelectedForm((current) => ({
      ...current,
      ...selection,
    }));
  }

  function updateCvItem(
    itemId: string,
    key: keyof ArtistCvItem,
    value: string | number
  ) {
    setSelectedForm((current) => ({
      ...current,
      cvItems: normalizeCvItemOrder(
        (current.cvItems ?? []).map((item) =>
          item.id === itemId
            ? ({
                ...item,
                [key]: value,
              } as ArtistCvItem)
            : item
        )
      ),
    }));
  }

  function addCvItem() {
    setSelectedForm((current) => {
      const nextItems = normalizeCvItemOrder(current.cvItems ?? []);
      return {
        ...current,
        cvItems: [...nextItems, createEmptyCvItem(nextItems.length)],
      };
    });
  }

  function deleteCvItem(itemId: string) {
    setSelectedForm((current) => ({
      ...current,
      cvItems: normalizeCvItemOrder(
        (current.cvItems ?? []).filter((item) => item.id !== itemId)
      ),
    }));
  }

  function moveCvItem(itemId: string, direction: -1 | 1) {
    setSelectedForm((current) => {
      const sortedItems = normalizeCvItemOrder(current.cvItems ?? []);
      const index = sortedItems.findIndex((item) => item.id === itemId);

      if (index < 0) {
        return current;
      }

      return {
        ...current,
        cvItems: reorderByIndex(sortedItems, index, direction),
      };
    });
  }

  function clearCvGroup(type: ArtistCvType) {
    if (
      !window.confirm(
        "이 그룹의 CV 항목을 화면에서 모두 제거할까요? 저장 전까지는 Firestore에 반영되지 않습니다."
      )
    ) {
      return;
    }

    setSelectedForm((current) => ({
      ...current,
      cvItems: normalizeCvItemOrder(
        (current.cvItems ?? []).filter((item) => item.type !== type)
      ),
    }));
  }

  function updateArchiveLink(
    itemId: string,
    key: keyof ArtistArchiveLink,
    value: string | number
  ) {
    setSelectedForm((current) => ({
      ...current,
      archiveLinks: normalizeArchiveLinkOrder(
        (current.archiveLinks ?? []).map((item) =>
          item.id === itemId
            ? ({
                ...item,
                [key]: value,
              } as ArtistArchiveLink)
            : item
        )
      ),
    }));
  }

  function addArchiveLink() {
    setSelectedForm((current) => {
      const nextItems = normalizeArchiveLinkOrder(current.archiveLinks ?? []);
      return {
        ...current,
        archiveLinks: [...nextItems, createEmptyArchiveLink(nextItems.length)],
      };
    });
  }

  function deleteArchiveLink(itemId: string) {
    setSelectedForm((current) => ({
      ...current,
      archiveLinks: normalizeArchiveLinkOrder(
        (current.archiveLinks ?? []).filter((item) => item.id !== itemId)
      ),
    }));
  }

  function moveArchiveLink(itemId: string, direction: -1 | 1) {
    setSelectedForm((current) => {
      const sortedItems = normalizeArchiveLinkOrder(current.archiveLinks ?? []);
      const index = sortedItems.findIndex((item) => item.id === itemId);

      if (index < 0) {
        return current;
      }

      return {
        ...current,
        archiveLinks: reorderByIndex(sortedItems, index, direction),
      };
    });
  }

  function toggleCvGroup(type: ArtistCvType, expanded: boolean) {
    setExpandedCvGroups((current) => ({
      ...current,
      [type]: expanded,
    }));
  }

  function toggleArchiveGroup(
    type: ArtistArchiveLink["type"],
    expanded: boolean
  ) {
    setExpandedArchiveGroups((current) => ({
      ...current,
      [type]: expanded,
    }));
  }

  function parseBulkCvLine(
    line: string,
    index: number,
    type: ArtistCvType
  ): ArtistCvItem | null {
    const trimmed = line.trim();

    if (!trimmed) {
      return null;
    }

    const yearMatch = trimmed.match(/^(\d{4})\s*(.*)$/);
    const year = yearMatch?.[1] ?? "";
    const remainder = (yearMatch?.[2] ?? trimmed).trim();
    const parts = remainder
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);

    return {
      id: createItemId("cv"),
      year,
      type,
      title: parts[0] ?? remainder,
      venue: parts[1] ?? "",
      location: parts.slice(2).join(", "),
      note: "",
      order: index,
    };
  }

  function parseArchiveBulkPasteLine(
    line: string,
    index: number
  ): ArtistArchiveLink | null {
    const trimmed = line.trim();

    if (!trimmed) {
      return null;
    }

    const yearMatch = trimmed.match(/^(\d{4})\s*(.*)$/);
    const year = yearMatch?.[1] ?? "";
    const remainder = (yearMatch?.[2] ?? trimmed).trim();
    const url = extractArchiveBulkPasteUrl(remainder);
    const cleaned = url ? remainder.replace(url, "").trim() : remainder;
    const parts = cleaned
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    const titleCandidate = parts[0] ?? remainder;
    const source = parts[1] ?? "";
    const description = parts.slice(2).join(", ");

    return {
      id: createItemId("archive"),
      year,
      type: inferArchiveBulkPasteType(titleCandidate),
      title: titleCandidate,
      source,
      url,
      description,
      order: index,
    };
  }

  function convertBulkPasteToDrafts() {
    setBulkPasteMessage("");
    const lines = bulkPasteText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      setBulkPasteError("붙여넣은 텍스트에서 변환할 줄을 찾지 못했습니다.");
      return;
    }

    const currentItems = normalizeCvItemOrder(selectedForm.cvItems ?? []);
    let currentType: ArtistCvType = "other";
    let nextOrder = bulkPasteMode === "append" ? currentItems.length : 0;
    const draftItems: ArtistCvItem[] = [];

    for (const line of lines) {
      const sectionType = getBulkPasteSectionType(line);

      if (sectionType) {
        currentType = sectionType;
        continue;
      }

      const item = parseBulkCvLine(line, nextOrder, currentType);

      if (item) {
        draftItems.push(item);
        nextOrder += 1;
      }
    }

    if (draftItems.length === 0) {
      setBulkPasteMessage("");
      setBulkPasteError("초안으로 변환할 수 있는 항목이 없습니다.");
      return;
    }

    setSelectedForm((current) => ({
      ...current,
      cvItems:
        bulkPasteMode === "append"
          ? normalizeCvItemOrder([...(current.cvItems ?? []), ...draftItems])
          : normalizeCvItemOrder(draftItems),
    }));
    setBulkPasteText("");
    setBulkPasteMessage(
      bulkPasteMode === "append"
        ? `기존 CV에 추가할 초안 ${draftItems.length}개가 생성되었습니다. 저장 전 내용을 확인해주세요.`
        : `기존 항목을 대체하는 CV 초안 ${draftItems.length}개가 생성되었습니다. 저장 전 내용을 확인해주세요.`
    );
    setBulkPasteError("");
    setIsBulkPasteOpen(true);
  }

  function convertArchiveBulkPasteToDrafts() {
    setArchiveBulkPasteMessage("");
    const lines = archiveBulkPasteText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      setArchiveBulkPasteError("붙여넣은 텍스트에서 변환할 줄을 찾지 못했습니다.");
      return;
    }

    const currentItems = normalizeArchiveLinkOrder(selectedForm.archiveLinks ?? []);
    let nextOrder = archiveBulkPasteMode === "append" ? currentItems.length : 0;
    const draftItems: ArtistArchiveLink[] = [];

    for (const line of lines) {
      const item = parseArchiveBulkPasteLine(line, nextOrder);

      if (item) {
        draftItems.push(item);
        nextOrder += 1;
      }
    }

    if (draftItems.length === 0) {
      setArchiveBulkPasteMessage("");
      setArchiveBulkPasteError("초안으로 변환할 수 있는 항목이 없습니다.");
      return;
    }

    setSelectedForm((current) => ({
      ...current,
      archiveLinks:
        archiveBulkPasteMode === "append"
          ? normalizeArchiveLinkOrder([...(current.archiveLinks ?? []), ...draftItems])
          : normalizeArchiveLinkOrder(draftItems),
    }));
    setArchiveBulkPasteText("");
    setArchiveBulkPasteMessage(
      archiveBulkPasteMode === "append"
        ? `기존 Archive Links에 추가할 초안 ${draftItems.length}개가 생성되었습니다. 저장 전 내용을 확인해주세요.`
        : `기존 링크를 대체하는 Archive Link 초안 ${draftItems.length}개가 생성되었습니다. 저장 전 내용을 확인해주세요.`
    );
    setArchiveBulkPasteError("");
    setIsArchiveBulkPasteOpen(true);
  }

  async function handleSaveCvAndArchive(
    context: AdminArtistTab = "cv"
  ) {
    if (!selectedArtist) {
      setSaveError("작가를 먼저 선택해주세요.");
      return;
    }

    if (!selectedForm.slug.trim()) {
      setSaveError("저장 전에 공개 페이지 주소를 확인해주세요.");
      return;
    }

    setIsSaving(true);
    setSaveMessage("");
    setSaveError("");

    try {
      const payload: ArtistFormValues = {
        ...selectedForm,
        cvItems: normalizeCvItemOrder(selectedForm.cvItems ?? []),
        archiveLinks: normalizeArchiveLinkOrder(
          selectedForm.archiveLinks ?? []
        ),
      };

      if (selectedForm.email?.trim()) {
        payload.email = selectedForm.email.trim();
      } else if (selectedArtist.email) {
        payload.email = selectedArtist.email;
      }

      const savedDocId = await updateArtistForAdmin(selectedArtist.id, {
        ...payload,
      });

      await loadArtists(savedDocId);
      setSaveMessage(
        context === "profile"
          ? `작가 정보가 저장되었습니다. Document: ${savedDocId}`
          : context === "archive"
            ? `Archive Links가 저장되었습니다. Document: ${savedDocId}`
            : `CV와 Archive Links가 저장되었습니다. Document: ${savedDocId}`
      );
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "저장 중 오류가 발생했습니다."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateProjectArtist() {
    setIsCreating(true);
    setCreateMessage("");
    setCreateError("");

    try {
      if (!projectForm.name.trim() || !projectForm.slug.trim()) {
        throw new Error("프로젝트 아티스트는 이름과 공개 주소가 필요합니다.");
      }

      await createProjectArtistForAdmin({
        ...projectForm,
        email: undefined,
        type: "project",
        status: "active",
        role: "artist",
      });

      setCreateMessage("프로젝트 아티스트가 생성되었습니다.");
      setProjectForm(EMPTY_PROJECT_FORM);
      await loadArtists();
    } catch (error) {
      setCreateError(
        error instanceof Error
          ? error.message
          : "프로젝트 아티스트 생성 중 오류가 발생했습니다."
      );
    } finally {
      setIsCreating(false);
    }
  }

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
              Admin Artists
            </p>

            <h1 className="mt-5 text-5xl font-semibold tracking-[-0.04em] text-neutral-950 md:text-7xl md:leading-[0.95]">
              Artist
              <br />
              management.
            </h1>

            <p className="mt-8 max-w-2xl text-sm leading-7 text-neutral-600 md:text-[15px]">
              전속 작가와 프로젝트 아티스트를 함께 관리합니다. represented / project
              구분과 active / inactive 상태를 먼저 보여주고, 선택한 작가는 바로
              수정할 수 있도록 구성했습니다.
            </p>
          </div>

          <aside className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-sm md:p-6">
            <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">
              Summary
            </p>
            <div className="mt-5 grid gap-4">
              <SummaryRow label="Represented" value={String(representedCount)} />
              <SummaryRow label="Project" value={String(projectCount)} />
              <SummaryRow label="활성" value={String(activeCount)} />
            </div>

            {errorMessage ? (
              <div className="mt-5 rounded-[1.5rem] border border-red-200 bg-red-50 px-4 py-4 text-sm leading-6 text-red-700">
                {errorMessage}
              </div>
            ) : null}
          </aside>
        </section>

        <section className="grid gap-6 border-t border-black/5 py-8 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
                  Artists
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-neutral-950">
                  작가 선택
                </h2>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-[#242424] p-4 shadow-sm">
              <label className="block">
                <span className="text-[11px] uppercase tracking-[0.24em] text-white/45">
                  Search
                </span>
                <input
                  type="search"
                  value={artistSearch}
                  onChange={(event) => setArtistSearch(event.target.value)}
                  placeholder="작가명, 이메일, 주소로 검색"
                  className="mt-2 h-12 w-full rounded-[1.15rem] border border-white/10 bg-white/[0.08] px-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#F37021] focus:bg-white/[0.1]"
                />
              </label>
            </div>

            {isLoadingArtists ? (
              <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] px-5 py-5 text-sm leading-7 text-[var(--muted)]">
                작가 목록을 불러오는 중입니다.
              </div>
            ) : null}

            {!isLoadingArtists && filteredArtists.length === 0 ? (
              <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] px-5 py-5 text-sm leading-7 text-[var(--muted)]">
                조건에 맞는 작가가 없습니다.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredArtists.map((entry) => (
                  <ArtistListCard
                    key={entry.id}
                    artist={entry}
                    active={entry.id === selectedArtistId}
                    onSelect={() => setSelectedArtistId(entry.id)}
                  />
                ))}
              </div>
            )}
          </aside>

          <div className="space-y-6">
            <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-6 shadow-sm md:p-7">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-400">
                    Selected Artist
                  </p>
                  <h3 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-neutral-950">
                    {selectedArtist?.name || "선택된 작가가 없습니다"}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-neutral-600">
                    {selectedArtist?.slug || "목록에서 작가를 선택해주세요."}
                  </p>
                  {selectedArtist ? (
                    <div className="mt-4 space-y-1 text-[11px] leading-5 text-white/45">
                      <p>
                        공개 주소:{" "}
                        <span className="font-medium text-neutral-700">
                          {selectedForm.slug || "—"}
                        </span>
                      </p>
                      <p>
                        Type:{" "}
                        <span className="font-medium text-neutral-700">
                          {selectedForm.type}
                        </span>
                      </p>
                      <p>
                        공개 페이지:{" "}
                        <span className="font-medium text-neutral-700">
                          {selectedForm.slug
                            ? `/artists/${selectedForm.slug}`
                            : "준비 중"}
                        </span>
                      </p>
                    </div>
                  ) : null}
                </div>

                {selectedArtist ? (
                  <Link
                    href={publicHref}
                    className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] px-5 text-sm text-[var(--foreground)] transition hover:border-white/20 hover:bg-white/[0.1]"
                  >
                    공개 페이지
                  </Link>
                ) : null}
              </div>

              <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-3 shadow-sm backdrop-blur-sm">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {ADMIN_ARTIST_TABS.map((tab) => {
                    const active = activeTab === tab.value;
                    const showDirtyDot =
                      isSelectedFormDirty &&
                      (tab.value === "profile" ||
                        tab.value === "cv" ||
                        tab.value === "archive");

                    return (
                      <button
                        key={tab.value}
                        type="button"
                        onClick={() => setActiveTab(tab.value)}
                        title={tab.description}
                        className={`inline-flex min-w-[160px] shrink-0 flex-col rounded-[1.35rem] border px-4 py-3 text-left transition ${
                          active
                            ? "border-[#F37021]/55 bg-[#F37021] text-[#171717] shadow-[0_10px_30px_rgba(243,112,33,0.18)]"
                            : "border-white/10 bg-[#242424] text-white/55 hover:border-white/20 hover:bg-[#2f2f2f] hover:text-white"
                        }`}
                        aria-pressed={active}
                      >
                        <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.24em]">
                          {tab.label}
                          {showDirtyDot ? (
                            <span className="inline-block h-2 w-2 rounded-full bg-[#F37021]" />
                          ) : null}
                        </span>
                        <span
                          className={`mt-1 text-[11px] leading-4 ${
                            active ? "text-[#171717]/75" : "text-white/45"
                          }`}
                        >
                          {tab.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {saveMessage || saveError ? (
                <div className="mt-4 space-y-3">
                  {saveMessage ? (
                    <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm leading-7 text-emerald-800">
                      {saveMessage}
                    </div>
                  ) : null}

                  {saveError ? (
                    <div className="rounded-[1.5rem] border border-red-200 bg-red-50 px-4 py-4 text-sm leading-7 text-red-700">
                      {saveError}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {showDirtyNotice ? (
                <div className="mt-4 rounded-[1.5rem] border border-[#F37021]/25 bg-[#F37021]/8 px-4 py-4 text-sm leading-7 text-[#b45d1e]">
                  저장되지 않은 변경사항이 있습니다.
                </div>
              ) : null}

              <div className="mt-6 space-y-6">
                <section hidden={activeTab !== "profile"} className="space-y-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-400">
                        Profile
                      </p>
                      <h4 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-neutral-950">
                        작가 기본 정보
                      </h4>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
                        작가 기본 정보, 소개 문구, 프로필 이미지, 외부 링크를 관리합니다.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSaveCvAndArchive("profile")}
                      disabled={!selectedArtist || isSaving}
                      className={saveButtonClassName}
                    >
                      {isSaving ? "저장 중..." : "작가 정보 저장"}
                    </button>
                  </div>

                  {selectedArtistExhibitionsError ? (
                    <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900">
                      {selectedArtistExhibitionsError}
                    </div>
                  ) : null}

                  {isLoadingSelectedArtistExhibitions ? (
                    <p className="text-sm leading-6 text-neutral-500">
                      선택한 작가의 전시 현황을 불러오는 중입니다.
                    </p>
                  ) : null}

                  {selectedArtist ? (
                    <ArtistOverviewCard
                      artist={selectedArtist}
                      works={selectedArtistWorks}
                      exhibitions={selectedArtistExhibitions}
                      featuredWorkPresent={hasFeaturedWorkSelection}
                    />
                  ) : null}

                  {selectedArtistIsRepresented ? (
                    <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-900">
                      전속 작가의 email, slug, type, role은 보호됩니다. 공개 구조에 영향이 있는 변경은 먼저 확인해주세요.
                    </div>
                  ) : null}

                  <div className="space-y-5 rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5 md:p-6">
                    <div className="grid gap-5 md:grid-cols-2">
                      <TextField
                        label="email"
                        value={selectedForm.email || ""}
                        onChange={(value) => updateSelectedField("email", value)}
                        disabled={selectedArtistIsRepresented}
                      />
                      <TextField
                        label="공개 주소"
                        value={selectedForm.slug}
                        onChange={(value) => updateSelectedField("slug", value)}
                        disabled={selectedArtistIsRepresented}
                      />
                    </div>

                    <div className="grid gap-5 md:grid-cols-3">
                      <TextField
                        label="name"
                        value={selectedForm.name}
                        onChange={(value) => updateSelectedField("name", value)}
                      />
                      <TextField
                        label="nameKo"
                        value={selectedForm.nameKo}
                        onChange={(value) => updateSelectedField("nameKo", value)}
                      />
                      <SelectField
                        label="type"
                        value={selectedForm.type}
                        onChange={(value) =>
                          updateSelectedField(
                            "type",
                            value as ArtistFormValues["type"]
                          )
                        }
                        disabled={selectedArtistIsRepresented}
                      >
                        <option value="represented">represented</option>
                        <option value="project">project</option>
                      </SelectField>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                      <SelectField
                        label="status"
                        value={selectedForm.status}
                        onChange={(value) =>
                          updateSelectedField(
                            "status",
                            value as ArtistFormValues["status"]
                          )
                        }
                      >
                        <option value="active">active</option>
                        <option value="inactive">inactive</option>
                      </SelectField>

                      <SelectField
                        label="role"
                        value={selectedForm.role}
                        onChange={(value) =>
                          updateSelectedField(
                            "role",
                            value as ArtistFormValues["role"]
                          )
                        }
                        disabled={selectedArtistIsRepresented}
                      >
                        <option value="artist">artist</option>
                        <option value="admin">admin</option>
                      </SelectField>
                    </div>

                    <TextField
                      label="tagline"
                      value={selectedForm.tagline}
                      onChange={(value) => updateSelectedField("tagline", value)}
                    />

                    <div className="grid gap-5 md:grid-cols-2">
                      <TextareaField
                        label="bio"
                        value={selectedForm.bio}
                        onChange={(value) => updateSelectedField("bio", value)}
                        rows={5}
                      />
                      <TextareaField
                        label="bioEn"
                        value={selectedForm.bioEn}
                        onChange={(value) => updateSelectedField("bioEn", value)}
                        rows={5}
                      />
                    </div>

                    <div className="space-y-4 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 md:p-6">
                      <div className="max-w-3xl">
                        <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-400">
                          Gallery Note
                        </p>
                        <h5 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-neutral-950">
                          갤러리 노트
                        </h5>
                        <p className="mt-2 text-sm leading-6 text-neutral-500">
                          KÜN’S Gallery가 작가의 작업을 공식적으로 소개하는 큐레이토리얼 코멘트입니다.
                        </p>
                      </div>

                      <div className="grid gap-5 md:grid-cols-2">
                        <TextareaField
                          label="Gallery Note KR"
                          value={selectedForm.galleryNote || ""}
                          onChange={(value) =>
                            updateSelectedField("galleryNote", value)
                          }
                          rows={8}
                          placeholder="KÜN’S Gallery가 바라보는 작가의 작업 세계와 주요 특징을 작성해주세요."
                        />
                        <TextareaField
                          label="Gallery Note EN"
                          value={selectedForm.galleryNoteEn || ""}
                          onChange={(value) =>
                            updateSelectedField("galleryNoteEn", value)
                          }
                          rows={8}
                          placeholder="Write KÜN’S Gallery’s curatorial note on the artist’s practice."
                        />
                      </div>
                    </div>

                    <div className="space-y-4 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 md:p-6">
                      <div className="max-w-3xl">
                        <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-400">
                          Portfolio PDF
                        </p>
                        <h5 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-neutral-950">
                          포트폴리오 PDF
                        </h5>
                        <p className="mt-2 text-sm leading-6 text-neutral-500">
                          갤러리가 제작한 작가 포트폴리오 PDF 링크를 등록합니다.
                        </p>
                      </div>

                      <div className="grid gap-5 md:grid-cols-2">
                        <TextField
                          label="Portfolio PDF URL"
                          value={selectedForm.portfolioPdfUrl || ""}
                          onChange={(value) =>
                            updateSelectedField("portfolioPdfUrl", value)
                          }
                          placeholder="https://..."
                        />
                        <TextField
                          label="Button Label, optional"
                          value={selectedForm.portfolioPdfLabel || ""}
                          onChange={(value) =>
                            updateSelectedField("portfolioPdfLabel", value)
                          }
                          placeholder="Download Portfolio"
                        />
                      </div>

                      <p className="text-sm leading-6 text-neutral-500">
                        입력한 PDF 링크는 공개 작가 페이지에 버튼으로 표시됩니다.
                      </p>
                    </div>

                    <TextField
                      label="location"
                      value={selectedForm.location}
                      onChange={(value) => updateSelectedField("location", value)}
                    />

                    <R2ImageUploadField
                      label="profileImageUrl"
                      description="관리자는 작가 프로필 이미지를 업로드하거나 URL로 직접 입력할 수 있습니다."
                      value={selectedForm.profileImageUrl}
                      onChange={(value) =>
                        updateSelectedField("profileImageUrl", value)
                      }
                      target="profile"
                      artistSlug={selectedArtist?.slug}
                    />

                    <div className="grid gap-5 md:grid-cols-[0.75fr_1fr]">
                      <SelectField
                        label="Profile Image Position"
                        value={selectedForm.profileImagePosition || "center center"}
                        onChange={(value) =>
                          updateSelectedField("profileImagePosition", value)
                        }
                      >
                        <option value="center center">Center</option>
                        <option value="center top">Top</option>
                        <option value="center 28%">Upper Portrait</option>
                        <option value="center 38%">Face Higher</option>
                        <option value="center 62%">Face Lower</option>
                        <option value="center bottom">Bottom</option>
                        <option value="left center">Left</option>
                        <option value="right center">Right</option>
                      </SelectField>
                      <TextField
                        label="Custom CSS Position"
                        value={selectedForm.profileImagePosition || ""}
                        onChange={(value) =>
                          updateSelectedField("profileImagePosition", value)
                        }
                        placeholder="center 38%"
                      />
                    </div>

                    <div className="space-y-4 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 md:p-6">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-400">
                            Featured Work
                          </p>
                          <h5 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-neutral-950">
                            대표 작품
                          </h5>
                          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
                            공개 작가 페이지와 작가 목록에서 우선적으로 보여줄 대표 작품을 선택합니다.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={clearFeaturedWork}
                          disabled={!hasFeaturedWorkSelection}
                          className="inline-flex h-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] px-4 text-sm text-[var(--foreground)] transition hover:border-[#F37021]/40 hover:bg-[#F37021]/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          대표 작품 없음
                        </button>
                      </div>

                      {selectedArtistWorksError ? (
                        <div className="rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900">
                          {selectedArtistWorksError}
                        </div>
                      ) : null}

                      {isLoadingSelectedArtistWorks ? (
                        <p className="text-sm leading-6 text-[var(--muted)]">
                          선택한 작가의 작품을 불러오는 중입니다.
                        </p>
                      ) : publishedSelectedArtistWorks.length > 0 ? (
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          {publishedSelectedArtistWorks.map((work) => {
                            const isSelected =
                              (selectedForm.featuredWorkId?.trim() &&
                                selectedForm.featuredWorkId === work.id) ||
                              (selectedForm.featuredWorkSlug?.trim() &&
                                getArtistWorkSlug(work) ===
                                  selectedForm.featuredWorkSlug);
                            const imageUrl = getArtistWorkImageUrl(work);

                            return (
                              <button
                                key={work.id}
                                type="button"
                                onClick={() => setFeaturedWork(work)}
                                className={`group rounded-[1.35rem] border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(0,0,0,0.08)] ${
                                  isSelected
                                    ? "border-[#F37021]/50 bg-[#F37021]/10 ring-1 ring-[#F37021]/20"
                                    : "border-black/10 bg-white/[0.06] hover:border-black/15"
                                }`}
                              >
                                <div className="flex gap-3">
                                  <div className="h-20 w-16 shrink-0 overflow-hidden rounded-[1rem] border border-white/10 bg-[#1f1f1f]">
                                    {imageUrl ? (
                                      <img
                                        src={imageUrl}
                                        alt={work.title || "Untitled"}
                                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                                      />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] text-[10px] uppercase tracking-[0.24em] text-white/40">
                                        No image
                                      </div>
                                    )}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] uppercase tracking-[0.22em] text-emerald-700">
                                        Published
                                      </span>
                                      {isSelected ? (
                                        <span className="inline-flex rounded-full border border-[#F37021]/30 bg-[#F37021]/12 px-2 py-0.5 text-[10px] uppercase tracking-[0.22em] text-[#b45d1e]">
                                          Selected
                                        </span>
                                      ) : null}
                                    </div>
                                    <p className="mt-2 text-sm font-medium leading-6 text-[var(--foreground)]">
                                      {work.title || "Untitled"}
                                    </p>
                                    <p className="mt-1 text-xs leading-5 text-white/55">
                                      {work.year || "—"}
                                    </p>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : selectedArtist ? (
                        <div className="rounded-[1.25rem] border border-dashed border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-[var(--muted)]">
                          공개된 작품이 아직 없습니다. 작품을 공개한 뒤 대표 작품을 선택할 수 있습니다.
                        </div>
                      ) : null}

                      {hasFeaturedWorkSelection ? (
                        <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.055] p-4">
                          {selectedFeaturedWorkPreview ? (
                            <div className="flex flex-col gap-4 md:flex-row md:items-start">
                              <div className="h-24 w-20 shrink-0 overflow-hidden rounded-[1rem] border border-white/10 bg-[#1f1f1f]">
                                {selectedFeaturedWorkPreview.coverImageUrl?.trim() ? (
                                  <img
                                    src={selectedFeaturedWorkPreview.coverImageUrl}
                                    alt={
                                      selectedFeaturedWorkPreview.title || "Featured work"
                                    }
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] text-[10px] uppercase tracking-[0.24em] text-white/40">
                                    No image
                                  </div>
                                )}
                              </div>

                              <div className="min-w-0 flex-1 space-y-2">
                                <p className="text-[10px] uppercase tracking-[0.28em] text-white/45">
                                  Selected Featured Work
                                </p>
                                <p className="text-sm leading-6 text-[var(--foreground)]">
                                  {selectedFeaturedWorkPreview.title || "Untitled"}
                                </p>
                                <p className="text-xs leading-5 text-white/55">
                                  {selectedFeaturedWorkPreview.slug || "선택된 대표 작품의 slug를 확인할 수 없습니다."}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-[10px] uppercase tracking-[0.28em] text-white/45">
                                Selected Featured Work
                              </p>
                              <p className="text-sm leading-6 text-amber-900">
                                선택한 대표 작품을 확인할 수 없습니다.
                              </p>
                              <p className="text-xs leading-5 text-amber-800/75">
                                {selectedForm.featuredWorkTitle?.trim() ||
                                  selectedForm.featuredWorkSlug?.trim() ||
                                  selectedForm.featuredWorkId?.trim() ||
                                  "저장된 대표 작품 정보가 없습니다."}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="rounded-[1.35rem] border border-dashed border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-[var(--muted)]">
                          대표 작품 없음
                        </div>
                      )}
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                      <TextField
                        label="instagramUrl"
                        value={selectedForm.instagramUrl}
                        onChange={(value) =>
                          updateSelectedField("instagramUrl", value)
                        }
                      />
                      <TextField
                        label="youtubeUrl"
                        value={selectedForm.youtubeUrl}
                        onChange={(value) =>
                          updateSelectedField("youtubeUrl", value)
                        }
                      />
                      <TextField
                        label="cvUrl"
                        value={selectedForm.cvUrl}
                        onChange={(value) => updateSelectedField("cvUrl", value)}
                      />
                      <TextField
                        label="artsyUrl"
                        value={selectedForm.artsyUrl}
                        onChange={(value) =>
                          updateSelectedField("artsyUrl", value)
                        }
                      />
                      <TextField
                        label="websiteUrl"
                        value={selectedForm.websiteUrl}
                        onChange={(value) =>
                          updateSelectedField("websiteUrl", value)
                        }
                      />
                    </div>
                  </div>
                </section>

                <section hidden={activeTab !== "cv"} className="space-y-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-400">
                        CV / 이력
                      </p>
                      <h4 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-neutral-950">
                        CV / Exhibition History
                      </h4>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
                        개인전, 단체전, 아트페어, 수상내역, 소장, 출판, 레지던시, 학력, 기타를 type별로 관리합니다.
                        <br />
                        수상내역 | Honors and Awards, Honors and Awards, Honors, Awards, Award 섹션은 type: award로 자동 분류됩니다.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSaveCvAndArchive("cv")}
                      disabled={!selectedArtist || isSaving}
                      className={saveButtonClassName}
                    >
                      {isSaving ? "저장 중..." : "CV 저장"}
                    </button>
                  </div>

                  <div className="space-y-4 rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5 md:p-6">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={addCvItem}
                        disabled={!selectedArtist}
                        className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] px-4 text-sm text-[var(--foreground)] transition hover:border-white/20 hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-60 disabled:text-[var(--muted)]"
                      >
                        항목 추가
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsBulkPasteOpen((current) => !current)}
                        disabled={!selectedArtist}
                        className="inline-flex h-11 items-center justify-center rounded-full border border-[#F37021]/45 bg-white/[0.06] px-4 text-sm text-[#f2b17a] transition hover:border-[#F37021]/65 hover:bg-[#F37021] hover:text-[#171717] disabled:cursor-not-allowed disabled:border-[#F37021]/25 disabled:bg-white/[0.04] disabled:text-white/45 disabled:opacity-80"
                      >
                        CV 텍스트 붙여넣기
                      </button>
                    </div>

                    {isBulkPasteOpen ? (
                      <div className="rounded-[1.5rem] border border-white/10 bg-[var(--background-soft)] p-4 md:p-5">
                        <TextareaField
                          label="CV 텍스트"
                          value={bulkPasteText}
                          onChange={(value) => setBulkPasteText(value)}
                          rows={6}
                        />
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setBulkPasteMode("append")}
                            title="기존 CV에 추가"
                            className={`inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm transition ${
                              bulkPasteMode === "append"
                                ? "border-[#F37021]/45 bg-[#F37021] text-[#171717]"
                                : "border-white/10 bg-white/[0.06] text-[var(--foreground)] hover:border-white/20 hover:bg-white/[0.1]"
                            }`}
                            aria-pressed={bulkPasteMode === "append"}
                          >
                            추가
                          </button>
                          <button
                            type="button"
                            onClick={() => setBulkPasteMode("replace")}
                            title="기존 CV를 지우고 새 CV로 교체"
                            className={`inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm transition ${
                              bulkPasteMode === "replace"
                                ? "border-[#F37021]/45 bg-[#F37021] text-[#171717]"
                                : "border-white/10 bg-white/[0.06] text-[var(--foreground)] hover:border-white/20 hover:bg-white/[0.1]"
                            }`}
                            aria-pressed={bulkPasteMode === "replace"}
                          >
                            교체
                          </button>
                        </div>
                        {bulkPasteMode === "replace" ? (
                          <p className="mt-3 rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                            기존 CV 항목이 화면상에서 새 항목으로 교체됩니다. 저장 전까지는 Firestore에 반영되지 않습니다.
                          </p>
                        ) : null}
                        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                          섹션 제목이 있으면 개인전, 단체전, 아트페어, 수상내역 등을 자동 분류합니다.
                        </p>
                        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <button
                            type="button"
                            onClick={convertBulkPasteToDrafts}
                            disabled={!selectedArtist}
                            className="inline-flex h-11 items-center justify-center rounded-full bg-[#242424] px-5 text-sm font-medium text-[var(--foreground)] transition hover:bg-[#2f2f2f] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            초안으로 변환
                          </button>
                          <p className="text-sm leading-6 text-[var(--muted)]">
                            수상내역 | Honors and Awards, Honors and Awards, Honors, Awards, Award 섹션은 award로 분류됩니다.
                          </p>
                        </div>
                        {bulkPasteMessage ? (
                          <div className="mt-4 rounded-[1.25rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
                            {bulkPasteMessage}
                          </div>
                        ) : null}
                        {bulkPasteError ? (
                          <div className="mt-4 rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                            {bulkPasteError}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="grid gap-4 xl:grid-cols-2">
                      {cvGroups.map((group) => {
                        const isExpanded =
                          expandedCvGroups[group.type] ?? group.items.length > 0;

                        return (
                          <div
                            key={group.type}
                            className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-4 text-[var(--foreground)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] md:p-5"
                          >
                            <button
                              type="button"
                              onClick={() => toggleCvGroup(group.type, !isExpanded)}
                              className="flex w-full items-start justify-between gap-3 text-left"
                              aria-expanded={isExpanded}
                            >
                              <div>
                                <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">
                                  Category
                                </p>
                                <h5 className="mt-2 text-[1.02rem] font-semibold tracking-[-0.03em] text-[var(--foreground)]">
                                  {group.label}
                                </h5>
                                <p className="mt-1 text-xs uppercase tracking-[0.22em] text-white/45">
                                  {group.items.length} items
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="inline-flex shrink-0 rounded-full border border-[#F37021]/35 bg-[#F37021]/15 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-[#f6b27b]">
                                  {group.items.length}
                                </span>
                                <span className="text-base text-white/45">
                                  {isExpanded ? "▾" : "▸"}
                                </span>
                              </div>
                            </button>

                            <div className="mt-4 flex justify-end">
                              <button
                                type="button"
                                onClick={() => clearCvGroup(group.type)}
                                disabled={group.items.length === 0}
                                className="inline-flex h-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] px-3 text-xs text-[var(--foreground)] transition hover:border-[#F37021]/50 hover:bg-[#F37021] hover:text-[#171717] disabled:cursor-not-allowed disabled:opacity-40 disabled:text-white/45"
                              >
                                그룹 비우기
                              </button>
                            </div>

                            {isExpanded ? (
                              <div className="mt-4 max-h-[360px] space-y-3 overflow-y-auto pr-1">
                                {group.items.length > 0 ? (
                                  group.items.map((item, index) => (
                                    <div
                                      key={item.id}
                                      className="rounded-[1.25rem] border border-white/10 bg-white/[0.06] p-4"
                                    >
                                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                        <div>
                                          <p className="text-[10px] uppercase tracking-[0.24em] text-white/35">
                                            CV Item {String(index + 1).padStart(2, "0")}
                                          </p>
                                          <p className="mt-2 text-sm font-medium text-[var(--foreground)]">
                                            {item.title || "Untitled"}
                                          </p>
                                          <p className="mt-1 text-xs leading-5 text-white/55">
                                            {item.year || "—"} · {group.label}
                                          </p>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                          <button
                                            type="button"
                                            onClick={() => moveCvItem(item.id, -1)}
                                            disabled={
                                              cvItems.findIndex(
                                                (current) => current.id === item.id
                                              ) === 0
                                            }
                                            className="inline-flex h-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] px-3 text-xs text-[var(--foreground)] transition hover:border-[#F37021]/50 hover:bg-[#F37021] hover:text-[#171717] disabled:cursor-not-allowed disabled:opacity-40 disabled:text-white/45"
                                          >
                                            Up
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => moveCvItem(item.id, 1)}
                                            disabled={
                                              cvItems.findIndex(
                                                (current) => current.id === item.id
                                              ) === cvItems.length - 1
                                            }
                                            className="inline-flex h-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] px-3 text-xs text-[var(--foreground)] transition hover:border-[#F37021]/50 hover:bg-[#F37021] hover:text-[#171717] disabled:cursor-not-allowed disabled:opacity-40 disabled:text-white/45"
                                          >
                                            Down
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => deleteCvItem(item.id)}
                                            className="inline-flex h-9 items-center justify-center rounded-full border border-red-200 bg-red-50 px-3 text-xs text-red-700 transition hover:border-red-300"
                                          >
                                            삭제
                                          </button>
                                        </div>
                                      </div>

                                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                                        <TextField
                                          label="year"
                                          value={item.year}
                                          onChange={(value) =>
                                            updateCvItem(item.id, "year", value)
                                          }
                                        />
                                        <SelectField
                                          label="type"
                                          value={item.type}
                                          onChange={(value) =>
                                            updateCvItem(
                                              item.id,
                                              "type",
                                              value as ArtistCvItem["type"]
                                            )
                                          }
                                        >
                                          {ARTIST_CV_TYPE_OPTIONS.map((option) => (
                                            <option key={option.value} value={option.value}>
                                              {option.label}
                                            </option>
                                          ))}
                                        </SelectField>
                                      </div>

                                      <div className="mt-4 grid gap-4 md:grid-cols-3">
                                        <TextField
                                          label="title"
                                          value={item.title}
                                          onChange={(value) =>
                                            updateCvItem(item.id, "title", value)
                                          }
                                        />
                                        <TextField
                                          label="venue"
                                          value={item.venue}
                                          onChange={(value) =>
                                            updateCvItem(item.id, "venue", value)
                                          }
                                        />
                                        <TextField
                                          label="location"
                                          value={item.location}
                                          onChange={(value) =>
                                            updateCvItem(item.id, "location", value)
                                          }
                                        />
                                      </div>

                                      <div className="mt-4">
                                        <TextareaField
                                          label="note"
                                          value={item.note ?? ""}
                                          onChange={(value) =>
                                            updateCvItem(item.id, "note", value)
                                          }
                                          rows={3}
                                        />
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="rounded-[1.25rem] border border-dashed border-white/10 bg-white/[0.04] px-4 py-5 text-sm leading-7 text-white/45">
                                    No items yet.
                                  </div>
                                )}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleSaveCvAndArchive("cv")}
                        disabled={!selectedArtist || isSaving}
                        className={saveButtonClassName}
                      >
                        {isSaving ? "저장 중..." : "CV 저장"}
                      </button>
                    </div>
                  </div>
                </section>

                <section hidden={activeTab !== "archive"} className="space-y-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-400">
                        아카이브 링크
                      </p>
                      <h4 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
                        Press and archive links
                      </h4>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                        인터뷰, 기사, 영상, 카탈로그, 웹사이트 링크를 정리합니다. URL은 입력값을 그대로 유지하고 공개용 표시에서만 보정할 수 있습니다.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSaveCvAndArchive("archive")}
                      disabled={!selectedArtist || isSaving}
                      className={saveButtonClassName}
                    >
                      {isSaving ? "저장 중..." : "아카이브 저장"}
                    </button>
                  </div>

                  <div className="space-y-4 rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5 md:p-6">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setIsArchiveBulkPasteOpen((current) => !current)
                        }
                        disabled={!selectedArtist}
                        className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] px-4 text-sm text-[var(--foreground)] transition hover:border-white/20 hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-60 disabled:text-[var(--muted)]"
                      >
                        Archive Bulk Paste
                      </button>
                      <button
                        type="button"
                        onClick={addArchiveLink}
                        disabled={!selectedArtist}
                        className="inline-flex h-11 items-center justify-center rounded-full border border-[#F37021]/45 bg-white/[0.06] px-4 text-sm text-[#f2b17a] transition hover:border-[#F37021]/65 hover:bg-[#F37021] hover:text-[#171717] disabled:cursor-not-allowed disabled:border-[#F37021]/25 disabled:bg-white/[0.04] disabled:text-white/45 disabled:opacity-80"
                      >
                        링크 추가
                      </button>
                    </div>

                    {isArchiveBulkPasteOpen ? (
                      <div className="rounded-[1.5rem] border border-white/10 bg-[var(--background-soft)] p-4 md:p-5">
                        <TextareaField
                          label="Archive Link 텍스트"
                          value={archiveBulkPasteText}
                          onChange={(value) => setArchiveBulkPasteText(value)}
                          rows={6}
                        />
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setArchiveBulkPasteMode("append")}
                            title="기존 Archive Links에 추가"
                            className={`inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm transition ${
                              archiveBulkPasteMode === "append"
                                ? "border-[#F37021]/45 bg-[#F37021] text-[#171717]"
                                : "border-white/10 bg-white/[0.06] text-[var(--foreground)] hover:border-white/20 hover:bg-white/[0.1]"
                            }`}
                            aria-pressed={archiveBulkPasteMode === "append"}
                          >
                            추가
                          </button>
                          <button
                            type="button"
                            onClick={() => setArchiveBulkPasteMode("replace")}
                            title="기존 Archive Links를 지우고 새 링크로 교체"
                            className={`inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm transition ${
                              archiveBulkPasteMode === "replace"
                                ? "border-[#F37021]/45 bg-[#F37021] text-[#171717]"
                                : "border-white/10 bg-white/[0.06] text-[var(--foreground)] hover:border-white/20 hover:bg-white/[0.1]"
                            }`}
                            aria-pressed={archiveBulkPasteMode === "replace"}
                          >
                            교체
                          </button>
                        </div>
                        {archiveBulkPasteMode === "replace" ? (
                          <p className="mt-3 rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                            기존 아카이브 링크가 화면상에서 새 링크로 교체됩니다. 저장 전까지는 Firestore에 반영되지 않습니다.
                          </p>
                        ) : null}
                        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                          인터뷰, 기사, 영상 링크를 여러 줄로 붙여넣으면 Archive Link 초안을 생성합니다. 자동 분류가 완벽하지 않을 수 있으니 저장 전 내용을 확인해주세요.
                        </p>
                        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <button
                            type="button"
                            onClick={convertArchiveBulkPasteToDrafts}
                            disabled={!selectedArtist}
                            className="inline-flex h-11 items-center justify-center rounded-full bg-[#242424] px-5 text-sm font-medium text-[var(--foreground)] transition hover:bg-[#2f2f2f] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            초안으로 변환
                          </button>
                          <p className="text-sm leading-6 text-[var(--muted)]">
                            URL이 있으면 자동으로 분리됩니다.
                          </p>
                        </div>
                        {archiveBulkPasteMessage ? (
                          <div className="mt-4 rounded-[1.25rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
                            {archiveBulkPasteMessage}
                          </div>
                        ) : null}
                        {archiveBulkPasteError ? (
                          <div className="mt-4 rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                            {archiveBulkPasteError}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="max-h-[560px] space-y-4 overflow-y-auto pr-1">
                      {archiveGroups.some((group) => group.items.length > 0) ? (
                        archiveGroups.map((group) => {
                          const isExpanded =
                            expandedArchiveGroups[group.type] ??
                            group.items.length > 0;

                          return (
                            <div
                              key={group.type}
                              className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-4 md:p-5"
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  toggleArchiveGroup(group.type, !isExpanded)
                                }
                                className="flex w-full items-start justify-between gap-3 text-left"
                                aria-expanded={isExpanded}
                              >
                                <div>
                                  <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">
                                    Archive Type
                                  </p>
                                  <p className="mt-2 text-sm font-medium text-[var(--foreground)]">
                                    {group.label}
                                  </p>
                                  <p className="mt-1 text-xs uppercase tracking-[0.22em] text-white/45">
                                    {group.items.length} items
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex shrink-0 rounded-full border border-[#F37021]/35 bg-[#F37021]/15 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-[#f6b27b]">
                                    {group.items.length}
                                  </span>
                                  <span className="text-base text-white/45">
                                    {isExpanded ? "▾" : "▸"}
                                  </span>
                                </div>
                              </button>

                              {isExpanded ? (
                                <div className="mt-4 space-y-3">
                                  {group.items.length > 0 ? (
                                    group.items.map((item, index) => (
                                      <div
                                        key={item.id}
                                        className="rounded-[1.25rem] border border-white/10 bg-white/[0.06] p-4"
                                      >
                                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                          <div>
                                            <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">
                                              Link {String(index + 1).padStart(2, "0")}
                                            </p>
                                            <p className="mt-2 text-sm font-medium text-[var(--foreground)]">
                                              {item.title || "Untitled"}
                                            </p>
                                            <p className="mt-1 text-xs leading-5 text-white/55">
                                              {item.year || "—"} · {group.label}
                                            </p>
                                          </div>

                                          <div className="flex flex-wrap gap-2">
                                            <button
                                              type="button"
                                              onClick={() => moveArchiveLink(item.id, -1)}
                                              disabled={index === 0}
                                              className="inline-flex h-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] px-3 text-xs text-[var(--foreground)] transition hover:border-[#F37021]/50 hover:bg-[#F37021] hover:text-[#171717] disabled:cursor-not-allowed disabled:opacity-40 disabled:text-[var(--muted)]"
                                            >
                                              Up
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => moveArchiveLink(item.id, 1)}
                                              disabled={index === archiveLinks.length - 1}
                                              className="inline-flex h-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] px-3 text-xs text-[var(--foreground)] transition hover:border-[#F37021]/50 hover:bg-[#F37021] hover:text-[#171717] disabled:cursor-not-allowed disabled:opacity-40 disabled:text-[var(--muted)]"
                                            >
                                              Down
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => deleteArchiveLink(item.id)}
                                              className="inline-flex h-9 items-center justify-center rounded-full border border-red-200 bg-red-50 px-3 text-xs text-red-700 transition hover:border-red-300"
                                            >
                                              삭제
                                            </button>
                                          </div>
                                        </div>

                                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                                          <TextField
                                            label="year"
                                            value={item.year}
                                            onChange={(value) =>
                                              updateArchiveLink(item.id, "year", value)
                                            }
                                          />
                                          <SelectField
                                            label="type"
                                            value={item.type}
                                            onChange={(value) =>
                                              updateArchiveLink(
                                                item.id,
                                                "type",
                                                value as ArtistArchiveLink["type"]
                                              )
                                            }
                                          >
                                            {ARTIST_ARCHIVE_LINK_TYPE_OPTIONS.map((option) => (
                                              <option key={option.value} value={option.value}>
                                                {option.label}
                                              </option>
                                            ))}
                                          </SelectField>
                                        </div>

                                        <div className="mt-4 grid gap-4 md:grid-cols-3">
                                          <TextField
                                            label="title"
                                            value={item.title}
                                            onChange={(value) =>
                                              updateArchiveLink(item.id, "title", value)
                                            }
                                          />
                                          <TextField
                                            label="source"
                                            value={item.source}
                                            onChange={(value) =>
                                              updateArchiveLink(item.id, "source", value)
                                            }
                                          />
                                          <TextField
                                            label="url"
                                            value={item.url}
                                            onChange={(value) =>
                                              updateArchiveLink(item.id, "url", value)
                                            }
                                          />
                                        </div>

                                        <div className="mt-4">
                                          <TextareaField
                                            label="description"
                                            value={item.description ?? ""}
                                            onChange={(value) =>
                                              updateArchiveLink(
                                                item.id,
                                                "description",
                                                value
                                              )
                                            }
                                            rows={3}
                                          />
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.04] px-5 py-8 text-sm leading-7 text-white/45">
                                      아직 Archive Link가 없습니다. 인터뷰, 기사, 영상, 카탈로그 링크를 등록할 수 있습니다.
                                    </div>
                                  )}
                                </div>
                              ) : null}
                            </div>
                          );
                        })
                      ) : (
                        <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.04] px-5 py-8 text-sm leading-7 text-white/45">
                          아직 Archive Link가 없습니다. 인터뷰, 기사, 영상, 카탈로그 링크를 등록할 수 있습니다.
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleSaveCvAndArchive("archive")}
                        disabled={!selectedArtist || isSaving}
                        className={saveButtonClassName}
                      >
                        {isSaving ? "저장 중..." : "아카이브 저장"}
                      </button>
                    </div>
                  </div>
                </section>

                <section hidden={activeTab !== "meta"} className="space-y-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">
                        Admin Meta
                      </p>
                      <h4 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
                        Firestore and admin metadata
                      </h4>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                        공개 페이지 연결과 관리 디버그에 필요한 메타 정보만 모았습니다.
                      </p>
                    </div>

                    <Link
                      href={publicHref}
                      className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] px-5 text-sm text-[var(--foreground)] transition hover:border-white/20 hover:bg-white/[0.1]"
                    >
                      공개 페이지
                    </Link>
                  </div>

                  {selectedArtistIsRepresented ? (
                    <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-900">
                      전속 작가의 email, slug, type, role은 보호됩니다. 변경이 필요한 경우 공개 구조와 로그인 흐름에 영향이 없는지 먼저 확인해주세요.
                    </div>
                  ) : null}

                  <div className="grid gap-5 md:grid-cols-2">
                    <ReadOnlyField
                      label="Firestore Document ID"
                      value={selectedArtist?.id || "—"}
                    />
                    <ReadOnlyField
                      label="Slug"
                      value={selectedForm.slug || "—"}
                    />
                    <ReadOnlyField
                      label="Type"
                      value={selectedForm.type}
                    />
                    <ReadOnlyField
                      label="Status"
                      value={selectedForm.status}
                    />
                    <ReadOnlyField
                      label="Role"
                      value={selectedForm.role}
                    />
                    <ReadOnlyField
                      label="Source"
                      value={selectedArtist?.source ?? "Firestore"}
                    />
                  </div>
                </section>
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-6 shadow-sm md:p-7">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-400">
                    Project Artist
                  </p>
                  <h3 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-neutral-950">
                    Create new project profile
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-neutral-600">
                    로그인 계정 없이 공개 페이지용 작가를 만들 수 있습니다.
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-5">
                <div className="grid gap-5 md:grid-cols-2">
                  <TextField
                    label="name"
                    value={projectForm.name}
                    onChange={(value) => updateProjectField("name", value)}
                  />
                  <TextField
                    label="nameKo"
                    value={projectForm.nameKo}
                    onChange={(value) => updateProjectField("nameKo", value)}
                  />
                </div>

                <TextField
                  label="공개 주소"
                  value={projectForm.slug}
                  onChange={(value) => updateProjectField("slug", value)}
                />

                <div className="grid gap-5 md:grid-cols-3">
                  <ReadOnlyField label="type" value="project" />
                  <ReadOnlyField label="status" value="active" />
                  <ReadOnlyField label="role" value="artist" />
                </div>

                <TextField
                  label="tagline"
                  value={projectForm.tagline}
                  onChange={(value) => updateProjectField("tagline", value)}
                />
                <TextareaField
                  label="bio"
                  value={projectForm.bio}
                  onChange={(value) => updateProjectField("bio", value)}
                  rows={4}
                />
                <TextareaField
                  label="bioEn"
                  value={projectForm.bioEn}
                  onChange={(value) => updateProjectField("bioEn", value)}
                  rows={4}
                />

                <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 md:p-6">
                  <div className="max-w-3xl">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">
                      Gallery Note
                    </p>
                    <h5 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-[#F7F1E8]">
                      갤러리 노트
                    </h5>
                    <p className="mt-2 text-sm leading-6 text-white/62">
                      KÜN’S Gallery가 작가의 작업을 공식적으로 소개하는 큐레이토리얼 코멘트입니다.
                    </p>
                  </div>

                  <div className="mt-5 grid gap-5 md:grid-cols-2">
                    <TextareaField
                      label="Gallery Note KR"
                      value={projectForm.galleryNote || ""}
                      onChange={(value) =>
                        updateProjectField("galleryNote", value)
                      }
                      rows={7}
                      placeholder="KÜN’S Gallery가 바라보는 작가의 작업 세계와 주요 특징을 작성해주세요."
                    />
                    <TextareaField
                      label="Gallery Note EN"
                      value={projectForm.galleryNoteEn || ""}
                      onChange={(value) =>
                        updateProjectField("galleryNoteEn", value)
                      }
                      rows={7}
                      placeholder="Write KÜN’S Gallery’s curatorial note on the artist’s practice."
                    />
                  </div>
                </div>

                <TextField
                  label="location"
                  value={projectForm.location}
                  onChange={(value) => updateProjectField("location", value)}
                />

                <R2ImageUploadField
                  label="profileImageUrl"
                  description="프로젝트 작가의 프로필 이미지를 업로드하거나 URL로 직접 입력할 수 있습니다."
                  value={projectForm.profileImageUrl}
                  onChange={(value) => updateProjectField("profileImageUrl", value)}
                  target="profile"
                  artistSlug={projectForm.slug}
                />

                <div className="grid gap-5 md:grid-cols-[0.75fr_1fr]">
                  <SelectField
                    label="Profile Image Position"
                    value={projectForm.profileImagePosition || "center center"}
                    onChange={(value) =>
                      updateProjectField("profileImagePosition", value)
                    }
                  >
                    <option value="center center">Center</option>
                    <option value="center top">Top</option>
                    <option value="center 28%">Upper Portrait</option>
                    <option value="center 38%">Face Higher</option>
                    <option value="center 62%">Face Lower</option>
                    <option value="center bottom">Bottom</option>
                    <option value="left center">Left</option>
                    <option value="right center">Right</option>
                  </SelectField>
                  <TextField
                    label="Custom CSS Position"
                    value={projectForm.profileImagePosition || ""}
                    onChange={(value) =>
                      updateProjectField("profileImagePosition", value)
                    }
                    placeholder="center 38%"
                  />
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <TextField
                    label="instagramUrl"
                    value={projectForm.instagramUrl}
                    onChange={(value) => updateProjectField("instagramUrl", value)}
                  />
                  <TextField
                    label="youtubeUrl"
                    value={projectForm.youtubeUrl}
                    onChange={(value) => updateProjectField("youtubeUrl", value)}
                  />
                  <TextField
                    label="cvUrl"
                    value={projectForm.cvUrl}
                    onChange={(value) => updateProjectField("cvUrl", value)}
                  />
                  <TextField
                    label="artsyUrl"
                    value={projectForm.artsyUrl}
                    onChange={(value) => updateProjectField("artsyUrl", value)}
                  />
                  <TextField
                    label="websiteUrl"
                    value={projectForm.websiteUrl}
                    onChange={(value) => updateProjectField("websiteUrl", value)}
                  />
                </div>

                <div className="flex flex-col gap-3 pt-2 md:flex-row md:items-center md:justify-between">
                  <button
                    type="button"
                    onClick={handleCreateProjectArtist}
                    disabled={isCreating}
                    className="inline-flex h-12 items-center justify-center rounded-full bg-neutral-950 px-6 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isCreating ? "Creating..." : "프로젝트 작가 생성"}
                  </button>

                  <p className="text-sm leading-6 text-neutral-500">
                    프로젝트 작가는 공개용 데이터로만 사용됩니다.
                  </p>
                </div>
              </div>
            </section>

            {createMessage ? (
              <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50 p-5 text-sm leading-7 text-emerald-800">
                {createMessage}
              </div>
            ) : null}

            {createError ? (
              <div className="rounded-[1.75rem] border border-red-200 bg-red-50 p-5 text-sm leading-7 text-red-700">
                {createError}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function TextField({
  label,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-[0.24em] text-white/45">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 h-13 w-full rounded-[1.25rem] border border-white/15 bg-white/[0.085] px-4 text-sm text-[#F7F1E8] placeholder:text-white/35 outline-none transition focus:border-[#F37021] disabled:cursor-not-allowed disabled:bg-white/[0.055] disabled:text-white/45"
        disabled={disabled}
      />
    </label>
  );
}

function TextareaField({
  label,
  value,
  rows,
  onChange,
  disabled,
  placeholder,
}: {
  label: string;
  value: string;
  rows: number;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-[0.24em] text-white/45">
        {label}
      </span>
      <textarea
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-[1.25rem] border border-white/15 bg-white/[0.085] px-4 py-4 text-sm leading-7 text-[#F7F1E8] placeholder:text-white/35 outline-none transition focus:border-[#F37021] disabled:cursor-not-allowed disabled:bg-white/[0.055] disabled:text-white/45"
        disabled={disabled}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-[0.24em] text-white/45">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-13 w-full rounded-[1.25rem] border border-white/15 bg-white/[0.085] px-4 text-sm text-[#F7F1E8] outline-none transition focus:border-[#F37021] disabled:cursor-not-allowed disabled:bg-white/[0.055] disabled:text-white/45"
        disabled={disabled}
      >
        {children}
      </select>
    </label>
  );
}

function ReadOnlyField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.045] px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">
        {label}
      </p>
      <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">{value}</p>
    </div>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.5rem] bg-white/[0.045] px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">
        {label}
      </p>
      <p className="mt-2 break-words text-sm leading-6 text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}
