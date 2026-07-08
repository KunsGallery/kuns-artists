"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import LogoutButton from "@/components/auth/LogoutButton";
import R2ImageUploadField from "@/components/shared/R2ImageUploadField";
import { useProtectedArtist } from "@/hooks/useProtectedArtist";
import {
  createExhibitionForAdmin,
  deleteExhibitionForAdmin,
  getAllArtistsForAdmin,
  getAllExhibitionsForAdmin,
  updateExhibitionForAdmin,
  type ArtistDoc,
} from "@/lib/firebase/firestore";
import { deleteR2ObjectsByPublicUrls } from "@/lib/r2/client";
import {
  sortExhibitionsByStartDateDesc,
  type ExhibitionDoc,
  type ExhibitionSavePayload,
} from "@/types/exhibition";

type ExhibitionFormValues = ExhibitionSavePayload;
type ExhibitionStatus = "published" | "pending" | "archived";

const EMPTY_FORM: ExhibitionFormValues = {
  title: "",
  venue: "",
  location: "",
  description: "",
  imageUrl: "",
  startDate: "",
  endDate: "",
  isPublished: true,
  archived: false,
};

function normalizeOptionalText(value: string) {
  const trimmed = value.trim();
  return trimmed || undefined;
}

function toFormValues(exhibition: ExhibitionDoc): ExhibitionFormValues {
  return {
    title: exhibition.title || "",
    venue: exhibition.venue || "",
    location: exhibition.location || "",
    description: exhibition.description || "",
    imageUrl: exhibition.imageUrl || "",
    startDate: exhibition.startDate || "",
    endDate: exhibition.endDate || "",
    isPublished: exhibition.isPublished !== false,
    archived: exhibition.archived === true,
  };
}

function buildSavePayload(values: ExhibitionFormValues): ExhibitionSavePayload {
  return {
    title: values.title.trim(),
    venue: values.venue.trim(),
    location: values.location.trim(),
    description: values.description.trim(),
    imageUrl: values.imageUrl.trim(),
    startDate: values.startDate.trim(),
    endDate: normalizeOptionalText(values.endDate || ""),
    isPublished: values.isPublished !== false,
    archived: values.archived === true,
  };
}

function getExhibitionStatus(exhibition: ExhibitionDoc): ExhibitionStatus {
  if (exhibition.archived === true) {
    return "archived";
  }

  if (exhibition.isPublished === true) {
    return "published";
  }

  return "pending";
}

function getStatusLabel(status: ExhibitionStatus) {
  if (status === "published") return "Published";
  if (status === "archived") return "Archived";
  return "Review Pending";
}

function getStatusTone(status: ExhibitionStatus) {
  if (status === "published") return "published";
  if (status === "archived") return "archived";
  return "pending";
}

function getDeleteConfirmMessage(status: ExhibitionStatus) {
  const base =
    "이 전시를 영구 삭제할까요? Firestore 전시 문서가 삭제되며, 공개 작가 페이지에서도 더 이상 보이지 않습니다.";

  if (status === "published") {
    return `${base}\n\n현재 공개 중인 전시입니다. 삭제하면 공개 페이지에서도 즉시 사라집니다.`;
  }

  return base;
}

function formatDate(value?: string) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return "날짜 미입력";
  }

  const parsed = new Date(`${trimmed}T00:00:00Z`);

  if (Number.isNaN(parsed.getTime())) {
    return trimmed;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

function formatDateRange(startDate?: string, endDate?: string) {
  const start = formatDate(startDate);
  const end = endDate?.trim() ? formatDate(endDate) : "";

  if (!end) {
    return start;
  }

  return `${start} - ${end}`;
}

function toSlugPart(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function buildExhibitionUploadSlug(
  title: string,
  artistSlug?: string,
  exhibitionSlug?: string,
  exhibitionId?: string
) {
  const artistPart = toSlugPart(artistSlug || "artist");
  const titlePart = toSlugPart(title);
  const base = exhibitionSlug || titlePart;

  if (base) {
    return `${artistPart}-${base}`;
  }

  if (exhibitionId) {
    return `${artistPart}-exhibition-${exhibitionId.slice(0, 6)}`;
  }

  return `${artistPart}-exhibition-temp`;
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
  description?: string;
}) {
  return (
    <label className="block rounded-[1.25rem] border border-black/10 bg-white px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[13px] font-medium tracking-[-0.01em] text-neutral-700">
          {label}
        </span>
        <span className="rounded-full border border-[#F37021]/35 bg-[#F37021]/10 px-2.5 py-1 text-[10px] tracking-[0.18em] text-[#B85D18]">
          TOGGLE
        </span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="h-4 w-4 rounded border-black/20"
        />
        <span className="text-sm leading-6 text-neutral-600">
          {description || "옵션을 전환합니다."}
        </span>
      </div>
    </label>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "date";
}) {
  return (
    <label className="block">
      <span className="text-[13px] font-medium tracking-[-0.01em] text-neutral-700">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 h-13 w-full rounded-[1.25rem] border border-black/10 bg-white px-4 text-sm text-neutral-900 outline-none transition focus:border-black/20"
      />
    </label>
  );
}

function TextareaField({
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
      <span className="text-[13px] font-medium tracking-[-0.01em] text-neutral-700">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={6}
        placeholder={placeholder}
        className="mt-2 w-full rounded-[1.25rem] border border-black/10 bg-white px-4 py-4 text-sm leading-7 text-neutral-900 outline-none transition focus:border-black/20"
      />
    </label>
  );
}

function Badge({
  tone,
  children,
}: {
  tone: "published" | "pending" | "archived" | "neutral";
  children: React.ReactNode;
}) {
  const toneClass = {
    published: "border-[#F37021]/35 bg-[#F37021]/10 text-[#b85d18]",
    pending: "border-amber-200 bg-amber-50 text-amber-900",
    archived: "border-slate-200 bg-slate-50 text-slate-600",
    neutral: "border-black/10 bg-[#f7f6f2] text-neutral-600",
  }[tone];

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.24em] ${toneClass}`}
    >
      {children}
    </span>
  );
}

function ExhibitionCard({
  exhibition,
  active,
  onSelect,
}: {
  exhibition: ExhibitionDoc;
  active: boolean;
  onSelect: () => void;
}) {
  const status = getExhibitionStatus(exhibition);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-[1.5rem] border bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-black/15 hover:shadow-[0_20px_40px_rgba(0,0,0,0.04)] ${
        active ? "border-black/20 ring-1 ring-black/10" : "border-black/8"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
            {formatDateRange(exhibition.startDate, exhibition.endDate)}
          </p>
          <h3 className="mt-3 text-xl font-semibold tracking-[-0.04em] text-neutral-950">
            {exhibition.title || "Untitled Exhibition"}
          </h3>
        </div>
        <Badge tone={getStatusTone(status)}>{getStatusLabel(status)}</Badge>
      </div>
      <p className="mt-3 text-sm leading-6 text-neutral-500">
        {exhibition.venue || exhibition.location || "전시 정보 없음"}
      </p>
    </button>
  );
}

function AdminExhibitionsPageContent() {
  const searchParams = useSearchParams();
  const requestedArtist = searchParams.get("artist")?.trim() || "";
  const { errorMessage } = useProtectedArtist({
    requireAdmin: true,
    fallbackErrorMessage: "관리자 정보를 불러오는 중 오류가 발생했습니다.",
  });

  const [artists, setArtists] = useState<ArtistDoc[]>([]);
  const [exhibitions, setExhibitions] = useState<ExhibitionDoc[]>([]);
  const [selectedArtistId, setSelectedArtistId] = useState("");
  const [artistFilterId, setArtistFilterId] = useState("all");
  const [selectedExhibitionId, setSelectedExhibitionId] = useState("new");
  const [selectedForm, setSelectedForm] =
    useState<ExhibitionFormValues>(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveErrorMessage, setSaveErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let isActive = true;

    void (async () => {
      try {
        setIsLoading(true);
        const [artistResult, exhibitionResult] = await Promise.all([
          getAllArtistsForAdmin(),
          getAllExhibitionsForAdmin(),
        ]);

        if (!isActive) {
          return;
        }

        setArtists(artistResult);
        setExhibitions(exhibitionResult);
        setSelectedArtistId((current) => {
          const matchedArtist = requestedArtist
            ? artistResult.find(
                (artist) =>
                  artist.id === requestedArtist || artist.slug === requestedArtist
              )
            : null;

          if (matchedArtist) {
            setArtistFilterId(matchedArtist.id);
            return matchedArtist.id;
          }

          const nextSelectedArtistId = current || artistResult[0]?.id || "";

          setArtistFilterId(requestedArtist ? "all" : nextSelectedArtistId || "all");

          return nextSelectedArtistId;
        });
        setSaveErrorMessage("");
      } catch (error) {
        if (!isActive) {
          return;
        }

        setArtists([]);
        setExhibitions([]);
        setSaveErrorMessage(
          error instanceof Error
            ? error.message
            : "전시 목록을 불러오는 중 오류가 발생했습니다."
        );
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [requestedArtist]);

  const selectedArtist = useMemo(
    () => artists.find((artist) => artist.id === selectedArtistId) ?? null,
    [artists, selectedArtistId]
  );

  const selectedArtistExhibitions = useMemo(
    () =>
      sortExhibitionsByStartDateDesc(
        exhibitions.filter(
          (exhibition) =>
            exhibition.artistId === selectedArtistId ||
            exhibition.artistSlug === selectedArtist?.slug
        )
      ),
    [exhibitions, selectedArtist, selectedArtistId]
  );

  const visibleExhibitions = useMemo(() => {
    if (artistFilterId === "all") {
      return exhibitions;
    }

    const filteredArtist = artists.find((artist) => artist.id === artistFilterId);

    if (!filteredArtist) {
      return exhibitions;
    }

    return sortExhibitionsByStartDateDesc(
      exhibitions.filter(
        (exhibition) =>
          exhibition.artistId === filteredArtist.id ||
          exhibition.artistSlug === filteredArtist.slug
      )
    );
  }, [artistFilterId, artists, exhibitions]);

  const selectedExhibition = useMemo(
    () =>
      selectedExhibitionId === "new"
        ? null
        : visibleExhibitions.find(
            (exhibition) => exhibition.id === selectedExhibitionId
          ) ?? null,
    [selectedExhibitionId, visibleExhibitions]
  );

  useEffect(() => {
    if (!selectedArtist) {
      setSelectedForm(EMPTY_FORM);
      return;
    }

    if (selectedExhibition) {
      setSelectedForm(toFormValues(selectedExhibition));
      return;
    }

    setSelectedForm({
      ...EMPTY_FORM,
      isPublished: true,
    });
  }, [selectedArtist, selectedExhibition]);

  useEffect(() => {
    if (!selectedArtist) {
      setSelectedExhibitionId("new");
      return;
    }

    if (
      selectedExhibitionId !== "new" &&
      !visibleExhibitions.some(
        (exhibition) => exhibition.id === selectedExhibitionId
      )
    ) {
      setSelectedExhibitionId(visibleExhibitions[0]?.id || "new");
    }
  }, [selectedArtist, selectedExhibitionId, visibleExhibitions]);

  function updateSelectedField<K extends keyof ExhibitionFormValues>(
    key: K,
    value: ExhibitionFormValues[K]
  ) {
    setSelectedForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function loadExhibitions(nextSelectedId?: string) {
    const refreshed = await getAllExhibitionsForAdmin();
    setExhibitions(refreshed);

    if (nextSelectedId) {
      setSelectedExhibitionId(nextSelectedId);
      return;
    }

    if (
      selectedExhibitionId !== "new" &&
      refreshed.some((exhibition) => exhibition.id === selectedExhibitionId)
    ) {
      setSelectedExhibitionId(selectedExhibitionId);
      return;
    }

    if (selectedArtistId) {
      const firstMatch = refreshed.find(
        (exhibition) =>
          exhibition.artistId === selectedArtistId ||
          exhibition.artistSlug === selectedArtist?.slug
      );
      setSelectedExhibitionId(firstMatch?.id || "new");
    }
  }

  function handleSelectExhibition(exhibition: ExhibitionDoc) {
    const matchedArtist = artists.find(
      (artist) =>
        artist.id === exhibition.artistId || artist.slug === exhibition.artistSlug
    );

    if (matchedArtist) {
      setSelectedArtistId(matchedArtist.id);
      setArtistFilterId(matchedArtist.id);
    }

    setSelectedExhibitionId(exhibition.id);
  }

  async function handleSave() {
    if (!selectedArtist) {
      throw new Error("작가를 선택해주세요.");
    }

    setIsSaving(true);
    setSaveMessage("");
    setSaveErrorMessage("");

    try {
      const payload = buildSavePayload(selectedForm);

      if (!payload.title) {
        throw new Error("전시 제목은 필수입니다.");
      }

      if (!payload.startDate) {
        throw new Error("전시 시작일은 필수입니다.");
      }

      if (selectedExhibition) {
        await updateExhibitionForAdmin(
          selectedExhibition.id,
          selectedArtist.id,
          selectedArtist,
          payload
        );
        await loadExhibitions(selectedExhibition.id);
        setSaveMessage("전시 정보가 저장되었습니다.");
        return;
      }

      const createdId = await createExhibitionForAdmin(
        selectedArtist.id,
        selectedArtist,
        payload
      );
      await loadExhibitions(createdId);
      setSaveMessage("전시가 등록되었습니다.");
      setSelectedExhibitionId(createdId);
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

  async function handleDeleteSelected() {
    if (!selectedExhibition) {
      return;
    }

    const confirmed = window.confirm(
      getDeleteConfirmMessage(getExhibitionStatus(selectedExhibition))
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setSaveMessage("");
    setSaveErrorMessage("");

    try {
      const deletedExhibition = await deleteExhibitionForAdmin(
        selectedExhibition.id
      );

      void deleteR2ObjectsByPublicUrls(
        [deletedExhibition.imageUrl].filter(
          (value): value is string => Boolean(value && value.trim())
        )
      ).catch(() => undefined);

      await loadExhibitions();
      setSelectedExhibitionId("new");
      setSaveMessage("전시가 삭제되었습니다.");
    } catch (error) {
      setSaveErrorMessage(
        error instanceof Error
          ? error.message
          : "전시 삭제에 실패했습니다. 잠시 후 다시 시도해주세요."
      );
    } finally {
      setIsDeleting(false);
    }
  }

  const selectedArtistSlug = selectedArtist?.slug || "";
  const selectedExhibitionSlug = buildExhibitionUploadSlug(
    selectedForm.title,
    selectedArtistSlug,
    selectedExhibition?.slug,
    selectedExhibition?.id
  );
  const selectedStatus = selectedExhibition
    ? getExhibitionStatus(selectedExhibition)
    : selectedForm.archived
      ? "archived"
      : selectedForm.isPublished
        ? "published"
        : "pending";
  const imageUrl = selectedForm.imageUrl.trim();
  const dateLabel = formatDateRange(
    selectedForm.startDate,
    selectedForm.endDate || undefined
  );

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
              href="/admin/works"
              className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm"
            >
              작품 관리
            </Link>

            <Link
              href="/admin/works/new"
              className="inline-flex h-11 items-center rounded-full border border-black/10 bg-white px-5 text-sm text-neutral-900 transition hover:border-black/20 hover:shadow-sm"
            >
              새 작품 등록
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
              Exhibitions Management
            </p>

            <h1 className="mt-5 text-5xl font-semibold tracking-[-0.04em] text-neutral-950 md:text-7xl md:leading-[0.95]">
              Exhibitions
              <br />
              Management.
            </h1>

            <p className="mt-8 max-w-2xl text-sm leading-7 text-neutral-600 md:text-[15px]">
              작가별 전시를 관리하고 공개 페이지의 EXHIBITIONS 섹션에 바로
              반영합니다. 전시는 시작일 기준으로 최신순 정렬됩니다.
            </p>
          </div>

          <aside className="rounded-[2rem] border border-black/10 bg-white/85 p-5 backdrop-blur-sm md:p-6">
            <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">
              Target Artist
            </p>

            <label className="mt-4 block">
              <span className="text-[13px] font-medium tracking-[-0.01em] text-neutral-700">
                대상 작가
              </span>
              <select
                value={selectedArtistId}
                onChange={(event) => {
                  const nextArtistId = event.target.value;
                  setSelectedArtistId(nextArtistId);
                  setArtistFilterId(nextArtistId);
                }}
                className="mt-2 h-13 w-full rounded-[1.25rem] border border-black/10 bg-white px-4 text-sm text-neutral-900 outline-none transition focus:border-black/20"
                disabled={isLoading}
              >
                {artists.map((artist) => (
                  <option key={artist.id} value={artist.id}>
                    {artist.name || artist.slug || artist.id}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-4 block">
              <span className="text-[13px] font-medium tracking-[-0.01em] text-neutral-700">
                목록 범위
              </span>
              <select
                value={artistFilterId}
                onChange={(event) => setArtistFilterId(event.target.value)}
                className="mt-2 h-13 w-full rounded-[1.25rem] border border-black/10 bg-white px-4 text-sm text-neutral-900 outline-none transition focus:border-black/20"
                disabled={isLoading}
              >
                <option value="all">All Artists</option>
                {artists.map((artist) => (
                  <option key={artist.id} value={artist.id}>
                    {artist.name || artist.slug || artist.id}
                  </option>
                ))}
              </select>
            </label>

            <p className="mt-4 text-sm leading-7 text-neutral-600">
              {selectedArtist
                ? `${selectedArtist.name || selectedArtist.slug}의 전시를 관리합니다.`
                : "작가를 먼저 선택해주세요."}
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.25rem] border border-black/8 bg-[#f7f6f2] px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                  Total
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-neutral-950">
                  {selectedArtistExhibitions.length}
                </p>
              </div>
              <div className="rounded-[1.25rem] border border-black/8 bg-[#f7f6f2] px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                  Published
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-neutral-950">
                  {
                    selectedArtistExhibitions.filter(
                      (exhibition) =>
                        exhibition.isPublished === true &&
                        exhibition.archived !== true
                    ).length
                  }
                </p>
              </div>
              <div className="rounded-[1.25rem] border border-black/8 bg-[#f7f6f2] px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                  Drafts
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-neutral-950">
                  {
                    selectedArtistExhibitions.filter(
                      (exhibition) =>
                        exhibition.isPublished !== true &&
                        exhibition.archived !== true
                    ).length
                  }
                </p>
              </div>
            </div>

            {errorMessage || saveErrorMessage ? (
              <div className="mt-5 rounded-[1.5rem] border border-red-200 bg-red-50 px-4 py-4 text-sm leading-6 text-red-700">
                {errorMessage || saveErrorMessage}
              </div>
            ) : null}
          </aside>
        </section>

        <section className="grid gap-6 border-t border-black/5 py-8 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <div className="rounded-[1.75rem] border border-black/8 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                    전시 목록
                  </p>
                  <p className="mt-2 text-sm leading-6 text-neutral-500">
                    전시를 선택하거나 새 전시를 등록하세요.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedExhibitionId("new");
                    setSelectedForm({
                      ...EMPTY_FORM,
                      isPublished: true,
                    });
                  }}
                  className="inline-flex h-10 items-center rounded-full border border-[#F37021]/35 bg-[#F37021]/10 px-4 text-sm text-[#b85d18] transition hover:border-[#F37021]/50 hover:bg-[#F37021]/15"
                >
                  새 전시
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <ExhibitionCard
                  exhibition={{
                    id: "new",
                    title: "새 전시 등록",
                    venue: "",
                    location: "",
                    startDate: "",
                    isPublished: true,
                    archived: false,
                  }}
                  active={selectedExhibitionId === "new"}
                  onSelect={() => {
                    setSelectedExhibitionId("new");
                    setSelectedForm({
                      ...EMPTY_FORM,
                      isPublished: true,
                    });
                  }}
                />

                {visibleExhibitions.map((exhibition) => (
                  <ExhibitionCard
                    key={exhibition.id}
                    exhibition={exhibition}
                    active={selectedExhibitionId === exhibition.id}
                    onSelect={() => handleSelectExhibition(exhibition)}
                  />
                ))}
              </div>
            </div>
          </aside>

          <div className="space-y-6">
            {selectedArtist ? (
              <>
                <section className="rounded-[1.75rem] border border-black/8 bg-white p-6 shadow-sm md:p-7">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                        Current Selection
                      </p>
                      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-neutral-950">
                        {selectedExhibition?.title || "새 전시 등록"}
                      </h2>
                      <p className="mt-2 text-sm leading-7 text-neutral-600">
                        {selectedExhibition
                          ? `${selectedArtist.name || selectedArtist.slug}의 기존 전시를 수정합니다.`
                          : `${selectedArtist.name || selectedArtist.slug}에 새 전시를 추가합니다.`}
                      </p>
                    </div>

                    <Badge tone={getStatusTone(selectedStatus)}>
                      {getStatusLabel(selectedStatus)}
                    </Badge>
                  </div>

                  <div className="mt-6 grid gap-3 md:grid-cols-3">
                    <div className="rounded-[1.25rem] border border-black/8 bg-[#f7f6f2] px-4 py-4">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                        Artist
                      </p>
                      <p className="mt-2 text-sm leading-6 text-neutral-600">
                        {selectedArtist.name || selectedArtist.slug || selectedArtist.id}
                      </p>
                    </div>
                    <div className="rounded-[1.25rem] border border-black/8 bg-[#f7f6f2] px-4 py-4">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                        Period
                      </p>
                      <p className="mt-2 text-sm leading-6 text-neutral-600">
                        {dateLabel}
                      </p>
                    </div>
                    <div className="rounded-[1.25rem] border border-black/8 bg-[#f7f6f2] px-4 py-4">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                        Upload Path
                      </p>
                      <p className="mt-2 break-all text-sm leading-6 text-neutral-600">
                        {selectedArtistSlug
                          ? `exhibition-images/${selectedArtistSlug}/${selectedExhibitionSlug}`
                          : "작가 선택 필요"}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                  <div className="space-y-6">
                    <div className="rounded-[1.75rem] border border-black/8 bg-white p-6 shadow-sm md:p-7">
                      <div className="mb-6 space-y-2">
                        <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                          Exhibition Form
                        </p>
                        <p className="text-sm leading-7 text-neutral-600">
                          전시 제목, 날짜, 이미지와 간단한 설명을 입력하세요.
                        </p>
                      </div>

                      <div className="space-y-5">
                        <InputField
                          label="전시 제목"
                          value={selectedForm.title}
                          onChange={(value) => updateSelectedField("title", value)}
                          placeholder="전시 제목"
                        />

                        <div className="grid gap-4 md:grid-cols-2">
                          <InputField
                            label="전시 기간 시작"
                            value={selectedForm.startDate}
                            onChange={(value) =>
                              updateSelectedField("startDate", value)
                            }
                            type="date"
                          />

                          <InputField
                            label="전시 기간 종료"
                            value={selectedForm.endDate || ""}
                            onChange={(value) =>
                              updateSelectedField("endDate", value)
                            }
                            type="date"
                          />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <InputField
                            label="Venue"
                            value={selectedForm.venue}
                            onChange={(value) => updateSelectedField("venue", value)}
                            placeholder="전시 장소"
                          />

                          <InputField
                            label="Location"
                            value={selectedForm.location}
                            onChange={(value) =>
                              updateSelectedField("location", value)
                            }
                            placeholder="도시 / 국가"
                          />
                        </div>

                        <TextareaField
                          label="Description"
                          value={selectedForm.description}
                          onChange={(value) =>
                            updateSelectedField("description", value)
                          }
                          placeholder="전시 소개를 입력하세요."
                        />

                        <div className="rounded-[1.45rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(243,112,33,0.12),transparent_34%),linear-gradient(180deg,#1a1a1a_0%,#141414_100%)] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.24)] md:p-5">
                          <p className="text-[11px] uppercase tracking-[0.24em] text-white/42">
                            Exhibition Image
                          </p>
                          <p className="mt-2 text-sm leading-7 text-white/60">
                            전시 대표 이미지를 업로드하거나 공개 URL을 붙여넣을 수 있습니다.
                          </p>
                          <div className="mt-4">
                            <R2ImageUploadField
                              label="Exhibition Image"
                              description="전시 대표 이미지를 업로드하세요. 공개 작가 페이지의 EXHIBITIONS 섹션에 사용됩니다."
                              value={selectedForm.imageUrl}
                              onChange={(value) =>
                                updateSelectedField("imageUrl", value)
                              }
                              target="exhibition-image"
                              artistSlug={selectedArtistSlug}
                              workSlug={selectedExhibitionSlug}
                              disabled={!selectedArtistSlug}
                            />
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <ToggleField
                            label="isPublished"
                            checked={selectedForm.isPublished === true}
                            onChange={(checked) =>
                              updateSelectedField("isPublished", checked)
                            }
                            description="공개 작가 페이지에 전시를 표시합니다."
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

                        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                          <button
                            type="button"
                            onClick={() => void handleSave()}
                            disabled={isSaving}
                            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-neutral-950 px-6 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-500 sm:flex-1"
                          >
                            {isSaving ? "저장 중..." : selectedExhibition ? "전시 저장" : "전시 등록"}
                          </button>

                          {selectedExhibition ? (
                            <button
                              type="button"
                              onClick={() => void handleDeleteSelected()}
                              disabled={isDeleting}
                              className="inline-flex h-12 w-full items-center justify-center rounded-full border border-red-200 bg-red-50 px-6 text-sm font-medium text-red-700 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                            >
                              {isDeleting ? "삭제 중..." : "전시 삭제"}
                            </button>
                          ) : null}
                        </div>

                        {saveMessage ? (
                          <div
                            role="status"
                            aria-live="polite"
                            className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800"
                          >
                            {saveMessage}
                          </div>
                        ) : null}

                        {saveErrorMessage ? (
                          <div
                            role="alert"
                            aria-live="assertive"
                            className="rounded-[1.5rem] border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"
                          >
                            {saveErrorMessage}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <aside className="space-y-4">
                    <div className="rounded-[2rem] border border-black/8 bg-white p-6 shadow-sm md:p-7">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                        Preview
                      </p>
                      <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-neutral-950">
                        {selectedForm.title || "전시 제목"}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-neutral-500">
                        {dateLabel}
                      </p>

                      <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-black/8 bg-[#f7f6f2]">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={selectedForm.title || "Exhibition preview"}
                            className="aspect-[4/5] w-full object-cover"
                          />
                        ) : (
                          <div className="flex aspect-[4/5] items-center justify-center px-6 text-center text-sm leading-7 text-neutral-400">
                            전시 이미지를 업로드하면 미리보기가 표시됩니다.
                          </div>
                        )}
                      </div>

                      <div className="mt-4 space-y-3 rounded-[1.25rem] bg-[#f7f6f2] p-4">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                            Venue
                          </p>
                          <p className="mt-2 text-sm leading-6 text-neutral-700">
                            {selectedForm.venue || "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                            Location
                          </p>
                          <p className="mt-2 text-sm leading-6 text-neutral-700">
                            {selectedForm.location || "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-400">
                            Status
                          </p>
                          <p className="mt-2 text-sm leading-6 text-neutral-700">
                            {getStatusLabel(selectedStatus)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </aside>
                </section>
              </>
            ) : (
              <section className="rounded-[2rem] border border-black/8 bg-white px-6 py-8 text-sm leading-7 text-neutral-600">
                전시를 관리하려면 먼저 작가를 선택해주세요.
              </section>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default function AdminExhibitionsPage() {
  return (
    <Suspense
      fallback={
        <main className="theme-dark min-h-screen bg-[#f5f3ee] text-neutral-950" />
      }
    >
      <AdminExhibitionsPageContent />
    </Suspense>
  );
}
