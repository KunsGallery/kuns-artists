import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./client";
import type { AllowedArtistSeed } from "@/lib/artistAccess";
import type {
  ArtistArchiveLink,
  ArtistArchiveLinkType,
  ArtistCvItem,
  ArtistCvType,
  ArtistFeaturedWork,
  ArtistGalleryNote,
  ArtistPortfolioPdf,
} from "@/types/artist";
import type {
  ExhibitionDoc,
  ExhibitionSavePayload,
} from "@/types/exhibition";
import { sortExhibitionsByStartDateDesc } from "@/types/exhibition";

export type ArtistRole = "admin" | "artist";
export type ArtistType = "represented" | "project";
export type ArtistStatus = "active" | "inactive";
export type WorkSideMode = "canvas" | "image";

export type ArtistDoc = ArtistFeaturedWork &
  ArtistGalleryNote &
  ArtistPortfolioPdf & {
  id: string;
  source?: "Firestore" | "Seed";
  slug?: string;
  name?: string;
  nameKo?: string;
  email?: string;
  type?: ArtistType;
  status?: ArtistStatus;
  role?: ArtistRole;
  tagline?: string;
  bio?: string;
  bioEn?: string;
  location?: string;
  profileImageUrl?: string;
  instagramUrl?: string;
  youtubeUrl?: string;
  cvUrl?: string;
  artsyUrl?: string;
  websiteUrl?: string;
  portfolioPdfUrl?: string;
  portfolioPdfLabel?: string;
  cvItems?: ArtistCvItem[];
  archiveLinks?: ArtistArchiveLink[];
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type ArtistProfileUpdatePayload = {
  name?: string;
  nameKo?: string;
  tagline?: string;
  bio?: string;
  bioEn?: string;
  location?: string;
  profileImageUrl?: string;
  instagramUrl?: string;
  youtubeUrl?: string;
  cvUrl?: string;
  artsyUrl?: string;
  websiteUrl?: string;
  portfolioPdfUrl?: string;
  portfolioPdfLabel?: string;
};

export type ArtistAdminSavePayload = {
  email?: string;
  slug: string;
  name: string;
  nameKo: string;
  type: ArtistType;
  status: ArtistStatus;
  role: ArtistRole;
  tagline: string;
  bio: string;
  bioEn: string;
  location: string;
  profileImageUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
  cvUrl: string;
  artsyUrl: string;
  websiteUrl: string;
  cvItems?: ArtistCvItem[];
  archiveLinks?: ArtistArchiveLink[];
} & ArtistFeaturedWork &
  ArtistGalleryNote &
  ArtistPortfolioPdf;

export type ArtistWorkDoc = {
  id: string;
  artistId?: string;
  artistSlug?: string;
  artistName?: string;
  slug?: string;
  title?: string;
  year?: string;
  medium?: string;
  dimensions?: string;
  description?: string;
  coverImageUrl?: string;
  widthCm?: number;
  heightCm?: number;
  depthCm?: number;
  frontRotationXDeg?: number;
  frontRotationYDeg?: number;
  sideMode?: WorkSideMode;
  showBackLabel?: boolean;
  modelGlb?: string;
  modelUsdz?: string;
  generatedGlbUrl?: string;
  generatedUsdzUrl?: string;
  displayOrder?: number;
  isPublished?: boolean;
  archived?: boolean;
  docentAudioEnabled?: boolean;
  docentAudioUrl?: string;
  docentAudioTitle?: string;
  docentAudioDescription?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type WorkToolDoc = Pick<
  ArtistWorkDoc,
  | "id"
  | "slug"
  | "title"
  | "artistName"
  | "year"
  | "medium"
  | "dimensions"
  | "coverImageUrl"
  | "widthCm"
  | "heightCm"
  | "depthCm"
>;

export type ArtistWorkSavePayload = {
  title: string;
  year?: string;
  medium?: string;
  dimensions?: string;
  description?: string;
  coverImageUrl?: string;
  widthCm?: number;
  heightCm?: number;
  depthCm?: number;
  frontRotationXDeg?: number;
  frontRotationYDeg?: number;
  sideMode?: WorkSideMode;
  showBackLabel?: boolean;
  docentAudioEnabled?: boolean;
  docentAudioUrl?: string;
  docentAudioTitle?: string;
  docentAudioDescription?: string;
};

export type ArtistWorkAdminUpdatePayload = {
  isPublished?: boolean;
  archived?: boolean;
  coverImageUrl?: string;
  modelGlb?: string;
  modelUsdz?: string;
  generatedGlbUrl?: string;
  generatedUsdzUrl?: string;
  displayOrder?: number;
  docentAudioEnabled?: boolean;
  docentAudioUrl?: string;
  docentAudioTitle?: string;
  docentAudioDescription?: string;
};

function toOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function toOptionalNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function toOptionalFiniteNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function toOptionalBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function toOptionalSideMode(value: unknown) {
  return value === "canvas" || value === "image" ? value : undefined;
}

function toSafeSlugPart(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function buildWorkSlug(title: string, artistSlug: string, documentId: string) {
  const artistPrefix = toSafeSlugPart(artistSlug) || "artist";
  const titlePart = toSafeSlugPart(title);

  if (titlePart) {
    return `${artistPrefix}-${titlePart}`;
  }

  return `${artistPrefix}-work-${documentId.slice(0, 6).toLowerCase()}`;
}

export function resolveArtistWorkSlug(
  work: Pick<ArtistWorkDoc, "id" | "slug" | "title" | "artistSlug">
) {
  if (work.slug) {
    return work.slug;
  }

  return buildWorkSlug(work.title ?? "", work.artistSlug ?? "artist", work.id);
}

function getTimestampMillis(value: unknown) {
  if (
    value &&
    typeof value === "object" &&
    "seconds" in value &&
    typeof (value as { seconds?: unknown }).seconds === "number"
  ) {
    return ((value as { seconds: number }).seconds ?? 0) * 1000;
  }

  return 0;
}

function toOptionalArtistType(value: unknown) {
  return value === "represented" || value === "project" ? value : undefined;
}

function toOptionalArtistStatus(value: unknown) {
  return value === "active" || value === "inactive" ? value : undefined;
}

function toOptionalArtistRole(value: unknown) {
  return value === "admin" || value === "artist" ? value : undefined;
}

function toOptionalArtistCvType(value: unknown): ArtistCvType | undefined {
  return value === "solo" ||
    value === "group" ||
    value === "fair" ||
    value === "award" ||
    value === "collection" ||
    value === "publication" ||
    value === "residency" ||
    value === "education" ||
    value === "other"
    ? value
    : undefined;
}

function toOptionalArtistArchiveLinkType(
  value: unknown
): ArtistArchiveLinkType | undefined {
  return value === "interview" ||
    value === "article" ||
    value === "video" ||
    value === "catalog" ||
    value === "press" ||
    value === "website" ||
    value === "other"
    ? value
    : undefined;
}

function createFallbackId(prefix: string, index: number) {
  const randomPart =
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

  return `${prefix}-${index}-${randomPart}`;
}

function toArtistCvItem(
  value: unknown,
  index: number
): ArtistCvItem | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Record<string, unknown>;

  return {
    id: toOptionalString(raw.id) ?? createFallbackId("cv", index),
    year: toOptionalString(raw.year) ?? "",
    type: toOptionalArtistCvType(raw.type) ?? "other",
    title: toOptionalString(raw.title) ?? "",
    venue: toOptionalString(raw.venue) ?? "",
    location: toOptionalString(raw.location) ?? "",
    note: toOptionalString(raw.note),
    order:
      toOptionalNumber(raw.order) ??
      toOptionalNumber(raw.sortOrder) ??
      index,
  };
}

function toArtistArchiveLink(
  value: unknown,
  index: number
): ArtistArchiveLink | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Record<string, unknown>;

  return {
    id: toOptionalString(raw.id) ?? createFallbackId("archive", index),
    year: toOptionalString(raw.year) ?? "",
    type: toOptionalArtistArchiveLinkType(raw.type) ?? "other",
    title: toOptionalString(raw.title) ?? "",
    source: toOptionalString(raw.source) ?? "",
    url: toOptionalString(raw.url) ?? "",
    description: toOptionalString(raw.description),
    order:
      toOptionalNumber(raw.order) ??
      toOptionalNumber(raw.sortOrder) ??
      index,
  };
}

function toArtistCvItems(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const items = value
    .map((entry, index) => toArtistCvItem(entry, index))
    .filter((entry): entry is ArtistCvItem => entry !== null);

  return items.length > 0 ? items : [];
}

function toArtistArchiveLinks(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const items = value
    .map((entry, index) => toArtistArchiveLink(entry, index))
    .filter((entry): entry is ArtistArchiveLink => entry !== null);

  return items.length > 0 ? items : [];
}

function toSafeArtistSlugPart(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function toArtistDoc(id: string, rawData: Record<string, unknown>): ArtistDoc {
  return {
    id,
    source: "Firestore",
    slug: toOptionalString(rawData.slug),
    name: toOptionalString(rawData.name),
    nameKo: toOptionalString(rawData.nameKo),
    email: toOptionalString(rawData.email),
    type: toOptionalArtistType(rawData.type),
    status: toOptionalArtistStatus(rawData.status),
    role: toOptionalArtistRole(rawData.role),
    tagline: toOptionalString(rawData.tagline),
    bio: toOptionalString(rawData.bio),
    bioEn: toOptionalString(rawData.bioEn),
    location: toOptionalString(rawData.location),
    profileImageUrl: toOptionalString(rawData.profileImageUrl),
    instagramUrl: toOptionalString(rawData.instagramUrl),
    youtubeUrl: toOptionalString(rawData.youtubeUrl),
    cvUrl: toOptionalString(rawData.cvUrl),
    artsyUrl: toOptionalString(rawData.artsyUrl),
    websiteUrl: toOptionalString(rawData.websiteUrl),
    portfolioPdfUrl: toOptionalString(rawData.portfolioPdfUrl),
    portfolioPdfLabel: toOptionalString(rawData.portfolioPdfLabel),
    featuredWorkId: toOptionalString(rawData.featuredWorkId),
    featuredWorkSlug: toOptionalString(rawData.featuredWorkSlug),
    featuredWorkTitle: toOptionalString(rawData.featuredWorkTitle),
    featuredWorkImageUrl: toOptionalString(rawData.featuredWorkImageUrl),
    galleryNote: toOptionalString(rawData.galleryNote),
    galleryNoteEn: toOptionalString(rawData.galleryNoteEn),
    cvItems: toArtistCvItems(rawData.cvItems),
    archiveLinks: toArtistArchiveLinks(rawData.archiveLinks),
    createdAt: rawData.createdAt,
    updatedAt: rawData.updatedAt,
  };
}

function toArtistWorkDoc(id: string, rawData: Record<string, unknown>): ArtistWorkDoc {
  return {
    id,
    artistId: toOptionalString(rawData.artistId),
    artistSlug: toOptionalString(rawData.artistSlug),
    artistName:
      toOptionalString(rawData.artistName) ?? toOptionalString(rawData.artist),
    slug: toOptionalString(rawData.slug),
    title: toOptionalString(rawData.title),
    year: toOptionalString(rawData.year),
    medium: toOptionalString(rawData.medium),
    dimensions: toOptionalString(rawData.dimensions),
    description: toOptionalString(rawData.description),
    coverImageUrl:
      toOptionalString(rawData.coverImageUrl) ??
      toOptionalString(rawData.coverImage),
    widthCm: toOptionalNumber(rawData.widthCm),
    heightCm: toOptionalNumber(rawData.heightCm),
    depthCm: toOptionalNumber(rawData.depthCm),
    frontRotationXDeg: toOptionalNumber(rawData.frontRotationXDeg),
    frontRotationYDeg: toOptionalNumber(rawData.frontRotationYDeg),
    sideMode: toOptionalSideMode(rawData.sideMode),
    showBackLabel: toOptionalBoolean(rawData.showBackLabel),
    modelGlb: toOptionalString(rawData.modelGlb),
    modelUsdz: toOptionalString(rawData.modelUsdz),
    generatedGlbUrl: toOptionalString(rawData.generatedGlbUrl),
    generatedUsdzUrl: toOptionalString(rawData.generatedUsdzUrl),
    displayOrder: toOptionalFiniteNumber(rawData.displayOrder),
    isPublished: toOptionalBoolean(rawData.isPublished),
    archived: toOptionalBoolean(rawData.archived),
    docentAudioEnabled: toOptionalBoolean(rawData.docentAudioEnabled),
    docentAudioUrl: toOptionalString(rawData.docentAudioUrl),
    docentAudioTitle: toOptionalString(rawData.docentAudioTitle),
    docentAudioDescription: toOptionalString(rawData.docentAudioDescription),
    createdAt: rawData.createdAt,
    updatedAt: rawData.updatedAt,
  };
}

function buildExhibitionSlug(
  title: string,
  artistSlug: string,
  documentId: string
) {
  const artistPrefix = toSafeArtistSlugPart(artistSlug) || "artist";
  const titlePart = toSafeArtistSlugPart(title);

  if (titlePart) {
    return `${artistPrefix}-${titlePart}`;
  }

  return `${artistPrefix}-exhibition-${documentId.slice(0, 6).toLowerCase()}`;
}

async function isSlugInUse(
  collectionName: "works" | "exhibitions",
  slug: string,
  excludeDocId?: string
) {
  const snapshot = await getDocs(
    query(collection(db, collectionName), where("slug", "==", slug))
  );

  return snapshot.docs.some((document) => document.id !== excludeDocId);
}

async function buildUniqueCollectionSlug(
  collectionName: "works" | "exhibitions",
  baseSlug: string,
  excludeDocId?: string
) {
  const normalizedBaseSlug = baseSlug.trim();

  if (!normalizedBaseSlug) {
    return normalizedBaseSlug;
  }

  let candidate = normalizedBaseSlug;
  let suffix = 2;

  while (await isSlugInUse(collectionName, candidate, excludeDocId)) {
    candidate = `${normalizedBaseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function toExhibitionDoc(
  id: string,
  rawData: Record<string, unknown>
): ExhibitionDoc {
  return {
    id,
    artistId: toOptionalString(rawData.artistId),
    artistSlug: toOptionalString(rawData.artistSlug),
    artistName: toOptionalString(rawData.artistName),
    slug: toOptionalString(rawData.slug),
    title: toOptionalString(rawData.title),
    venue: toOptionalString(rawData.venue),
    location: toOptionalString(rawData.location),
    description: toOptionalString(rawData.description),
    imageUrl: toOptionalString(rawData.imageUrl),
    startDate: toOptionalString(rawData.startDate),
    endDate: toOptionalString(rawData.endDate),
    isPublished: toOptionalBoolean(rawData.isPublished),
    archived: toOptionalBoolean(rawData.archived),
    createdAt: rawData.createdAt,
    updatedAt: rawData.updatedAt,
  };
}

function toArtistAdminPayload(payload: ArtistAdminSavePayload) {
  function toPersistedText(value: string | undefined) {
    return value?.trim() ?? "";
  }

  const normalizedPayload = {
    slug: toSafeArtistSlugPart(payload.slug) || payload.slug.trim(),
    name: payload.name.trim(),
    nameKo: payload.nameKo.trim(),
    type: payload.type,
    status: payload.status,
    role: payload.role,
    tagline: payload.tagline.trim(),
    bio: payload.bio.trim(),
    bioEn: payload.bioEn.trim(),
    location: payload.location.trim(),
    profileImageUrl: payload.profileImageUrl.trim(),
    instagramUrl: payload.instagramUrl.trim(),
    youtubeUrl: payload.youtubeUrl.trim(),
    cvUrl: payload.cvUrl.trim(),
    artsyUrl: payload.artsyUrl.trim(),
    websiteUrl: payload.websiteUrl.trim(),
    portfolioPdfUrl: payload.portfolioPdfUrl?.trim() ?? "",
    portfolioPdfLabel: payload.portfolioPdfLabel?.trim() ?? "",
    featuredWorkId: payload.featuredWorkId?.trim() ?? "",
    featuredWorkSlug: payload.featuredWorkSlug?.trim() ?? "",
    featuredWorkTitle: payload.featuredWorkTitle?.trim() ?? "",
    featuredWorkImageUrl: payload.featuredWorkImageUrl?.trim() ?? "",
    galleryNote: payload.galleryNote?.trim() ?? "",
    galleryNoteEn: payload.galleryNoteEn?.trim() ?? "",
  };

  const withOptionalCollections = {
    ...normalizedPayload,
    ...(payload.cvItems !== undefined
      ? {
          cvItems: payload.cvItems.map((item, index) => ({
            id:
              toOptionalString(item.id) ??
              createFallbackId("cv", index),
            year: item.year.trim(),
            type: toOptionalArtistCvType(item.type) ?? "other",
            title: item.title.trim(),
            venue: item.venue.trim(),
            location: item.location.trim(),
            note: toPersistedText(item.note),
            order: Number.isFinite(item.order) ? item.order : index,
          })),
        }
      : {}),
    ...(payload.archiveLinks !== undefined
      ? {
          archiveLinks: payload.archiveLinks.map((item, index) => ({
            id:
              toOptionalString(item.id) ??
              createFallbackId("archive", index),
            year: item.year.trim(),
            type: toOptionalArtistArchiveLinkType(item.type) ?? "other",
            title: item.title.trim(),
            source: item.source.trim(),
            url: item.url.trim(),
            description: toPersistedText(item.description),
            order: Number.isFinite(item.order) ? item.order : index,
          })),
        }
      : {}),
  };

  return payload.email !== undefined
    ? { ...withOptionalCollections, email: payload.email.trim() }
    : withOptionalCollections;
}

export async function findArtistDocIdBySlug(slug: string): Promise<string | null> {
  const normalizedSlug = slug.trim();

  if (!normalizedSlug) {
    return null;
  }

  const slugSnapshot = await getDocs(
    query(
      collection(db, "artists"),
      where("slug", "==", normalizedSlug),
      limit(1)
    )
  );

  if (!slugSnapshot.empty) {
    return slugSnapshot.docs[0].id;
  }

  const docSnapshot = await getDoc(doc(db, "artists", normalizedSlug));

  if (docSnapshot.exists()) {
    return docSnapshot.id;
  }

  return null;
}

async function resolveArtistAdminDocId(
  artistId: string,
  slug?: string
): Promise<string | null> {
  if (slug) {
    const resolvedBySlug = await findArtistDocIdBySlug(slug);

    if (resolvedBySlug) {
      return resolvedBySlug;
    }
  }

  const fallbackSnapshot = await getDoc(doc(db, "artists", artistId));

  return fallbackSnapshot.exists() ? fallbackSnapshot.id : null;
}

async function updateArtistAdminDocument(
  docId: string,
  payload: ArtistAdminSavePayload
) {
  const cleanPayload = toArtistAdminPayload(payload);

  if (process.env.NODE_ENV !== "production") {
    console.log("Admin artist save payload", cleanPayload);
  }

  await updateDoc(doc(db, "artists", docId), {
    ...cleanPayload,
    updatedAt: serverTimestamp(),
  });

  return docId;
}

function buildArtistWorkEditablePayload(payload: ArtistWorkSavePayload) {
  const editablePayload: Record<string, unknown> = {
    title: payload.title.trim(),
    year: payload.year?.trim() ?? "",
    medium: payload.medium?.trim() ?? "",
    dimensions: payload.dimensions?.trim() ?? "",
    description: payload.description?.trim() ?? "",
    coverImageUrl: payload.coverImageUrl?.trim() ?? "",
    widthCm: payload.widthCm ?? null,
    heightCm: payload.heightCm ?? null,
    depthCm: payload.depthCm ?? null,
    frontRotationXDeg: payload.frontRotationXDeg ?? null,
    frontRotationYDeg: payload.frontRotationYDeg ?? null,
    sideMode: payload.sideMode ?? "canvas",
    showBackLabel: payload.showBackLabel ?? true,
  };

  if (payload.docentAudioEnabled !== undefined) {
    editablePayload.docentAudioEnabled = payload.docentAudioEnabled;
  }

  if (payload.docentAudioUrl !== undefined) {
    editablePayload.docentAudioUrl = payload.docentAudioUrl.trim();
  }

  if (payload.docentAudioTitle !== undefined) {
    editablePayload.docentAudioTitle = payload.docentAudioTitle.trim();
  }

  if (payload.docentAudioDescription !== undefined) {
    editablePayload.docentAudioDescription = payload.docentAudioDescription.trim();
  }

  return editablePayload;
}

function buildArtistWorkCreatePayload(
  artistId: string,
  artist: ArtistDoc,
  payload: ArtistWorkSavePayload
) {
  return {
    artistId,
    artistSlug: artist.slug ?? "",
    artistName: artist.name ?? "",
    ...buildArtistWorkEditablePayload(payload),
  };
}

function buildArtistExhibitionEditablePayload(payload: ExhibitionSavePayload) {
  return {
    title: payload.title.trim(),
    venue: payload.venue.trim(),
    location: payload.location.trim(),
    description: payload.description.trim(),
    imageUrl: payload.imageUrl.trim(),
    startDate: payload.startDate.trim(),
    endDate: payload.endDate?.trim() ?? "",
    isPublished: payload.isPublished ?? true,
    archived: payload.archived ?? false,
  };
}

function buildArtistExhibitionCreatePayload(
  artistId: string,
  artist: ArtistDoc,
  payload: ExhibitionSavePayload
) {
  return {
    artistId,
    artistSlug: artist.slug ?? "",
    artistName: artist.name ?? "",
    ...buildArtistExhibitionEditablePayload(payload),
  };
}

async function fetchAllArtistDocs() {
  const snapshot = await getDocs(collection(db, "artists"));

  return snapshot.docs.map((document) =>
    toArtistDoc(document.id, document.data() as Record<string, unknown>)
  );
}

async function fetchAllWorkDocs() {
  const snapshot = await getDocs(collection(db, "works"));

  return snapshot.docs.map((document) =>
    toArtistWorkDoc(document.id, document.data() as Record<string, unknown>)
  );
}

export async function getAllWorksForTool(): Promise<WorkToolDoc[]> {
  const works = await fetchAllWorkDocs();

  return works
    .sort((left, right) => {
      const leftArtist = left.artistName ?? "";
      const rightArtist = right.artistName ?? "";
      const artistCompare = leftArtist.localeCompare(rightArtist, "en");

      if (artistCompare !== 0) return artistCompare;

      return (left.title ?? "").localeCompare(right.title ?? "", "en");
    })
    .map((work) => ({
      id: work.id,
      slug: work.slug,
      title: work.title,
      artistName: work.artistName,
      year: work.year,
      medium: work.medium,
      dimensions: work.dimensions,
      coverImageUrl: work.coverImageUrl,
      widthCm: work.widthCm,
      heightCm: work.heightCm,
      depthCm: work.depthCm,
    }));
}

export async function getAllWorksForAdmin(): Promise<ArtistWorkDoc[]> {
  return (await fetchAllWorkDocs()).sort((left, right) => {
    const artistCompare = (left.artistName ?? "").localeCompare(
      right.artistName ?? "",
      "en"
    );

    if (artistCompare !== 0) return artistCompare;

    return (left.title ?? "").localeCompare(right.title ?? "", "en");
  });
}

async function fetchAllExhibitionDocs() {
  const snapshot = await getDocs(collection(db, "exhibitions"));

  return snapshot.docs.map((document) =>
    toExhibitionDoc(document.id, document.data() as Record<string, unknown>)
  );
}

export async function getAllExhibitionsForAdmin(): Promise<ExhibitionDoc[]> {
  return sortExhibitionsByStartDateDesc(
    await fetchAllExhibitionDocs()
  );
}

export async function getExhibitionsForArtist(
  artistId: string,
  artistSlug?: string
): Promise<ExhibitionDoc[]> {
  const normalizedArtistId = artistId.trim();
  const normalizedArtistSlug = artistSlug?.trim() || "";

  if (!normalizedArtistId && !normalizedArtistSlug) {
    return [];
  }

  const queryPromises: Promise<ExhibitionDoc[]>[] = [];

  if (normalizedArtistId) {
    queryPromises.push(
      getDocs(
        query(collection(db, "exhibitions"), where("artistId", "==", normalizedArtistId))
      ).then((snapshot) =>
        snapshot.docs.map((document) =>
          toExhibitionDoc(
            document.id,
            document.data() as Record<string, unknown>
          )
        )
      )
    );
  }

  if (normalizedArtistSlug && normalizedArtistSlug !== normalizedArtistId) {
    queryPromises.push(
      getDocs(
        query(
          collection(db, "exhibitions"),
          where("artistSlug", "==", normalizedArtistSlug)
        )
      ).then((snapshot) =>
        snapshot.docs.map((document) =>
          toExhibitionDoc(
            document.id,
            document.data() as Record<string, unknown>
          )
        )
      )
    );
  }

  const queriedExhibitions = (await Promise.all(queryPromises)).flat();
  const uniqueExhibitions = Array.from(
    new Map(queriedExhibitions.map((exhibition) => [exhibition.id, exhibition])).values()
  ).filter(
    (exhibition) =>
      (normalizedArtistId && exhibition.artistId === normalizedArtistId) ||
      (normalizedArtistSlug && exhibition.artistSlug === normalizedArtistSlug)
  );

  return sortExhibitionsByStartDateDesc(uniqueExhibitions);
}

export async function getPublicExhibitionsForArtistSlug(
  artistSlug: string
): Promise<ExhibitionDoc[]> {
  const normalizedSlug = artistSlug.trim();

  if (!normalizedSlug) {
    return [];
  }

  const snapshot = await getDocs(
    query(
      collection(db, "exhibitions"),
      where("artistSlug", "==", normalizedSlug)
    )
  );

  return sortExhibitionsByStartDateDesc(
    snapshot.docs
      .map((document) =>
        toExhibitionDoc(document.id, document.data() as Record<string, unknown>)
      )
      .filter(
        (exhibition) =>
          exhibition.isPublished === true && exhibition.archived !== true
      )
  );
}

export async function getWorksForArtist(
  artistId: string
): Promise<ArtistWorkDoc[]> {
  const snapshot = await getDocs(
    query(collection(db, "works"), where("artistId", "==", artistId))
  );

  return snapshot.docs
    .map((document) =>
      toArtistWorkDoc(
        document.id,
        document.data() as Record<string, unknown>
      )
    )
    .sort((left, right) => {
      const timeCompare =
        getTimestampMillis(right.updatedAt ?? right.createdAt) -
        getTimestampMillis(left.updatedAt ?? left.createdAt);

      if (timeCompare !== 0) return timeCompare;

      return (left.title ?? "").localeCompare(right.title ?? "", "en");
    });
}

export async function getPublicArtistBySlug(
  slug: string
): Promise<ArtistDoc | null> {
  const normalizedSlug = slug.trim();

  if (!normalizedSlug) {
    return null;
  }

  const queryCandidates: ArtistDoc[] = [];

  const slugSnapshot = await getDocs(
    query(
      collection(db, "artists"),
      where("slug", "==", normalizedSlug),
      limit(1)
    )
  );

  if (!slugSnapshot.empty) {
    const document = slugSnapshot.docs[0];
    queryCandidates.push(
      toArtistDoc(document.id, document.data() as Record<string, unknown>)
    );
  }

  const idSnapshot = await getDoc(doc(db, "artists", normalizedSlug));

  if (idSnapshot.exists()) {
    queryCandidates.push(
      toArtistDoc(idSnapshot.id, idSnapshot.data() as Record<string, unknown>)
    );
  }

  const matchedQueryCandidate = queryCandidates.find(
    (artist) =>
      artist.status === "active" &&
      (artist.slug === normalizedSlug || artist.id === normalizedSlug)
  );

  if (matchedQueryCandidate) {
    return matchedQueryCandidate;
  }

  const allArtists = await fetchAllArtistDocs();
  const matchedFallback = allArtists.find(
    (artist) =>
      artist.status === "active" &&
      (artist.slug === normalizedSlug || artist.id === normalizedSlug)
  );

  return matchedFallback ?? null;
}

export async function getAllArtistsForAdmin(): Promise<ArtistDoc[]> {
  return (await fetchAllArtistDocs()).sort((left, right) => {
    const typeOrder = left.type === right.type ? 0 : left.type === "represented" ? -1 : 1;

    if (typeOrder !== 0) return typeOrder;

    const statusOrder = left.status === right.status ? 0 : left.status === "active" ? -1 : 1;

    if (statusOrder !== 0) return statusOrder;

    return (left.name ?? "").localeCompare(right.name ?? "", "en");
  });
}

export async function getAllArtistsForPublicDisplay(): Promise<ArtistDoc[]> {
  return (await fetchAllArtistDocs()).filter(
    (artist) => artist.status === "active"
  );
}

export async function getPublicRepresentedArtists(): Promise<ArtistDoc[]> {
  const snapshot = await getDocs(
    query(
      collection(db, "artists"),
      where("type", "==", "represented"),
      where("status", "==", "active")
    )
  );

  return snapshot.docs
    .map((document) =>
      toArtistDoc(
        document.id,
        document.data() as Record<string, unknown>
      )
    )
    .sort((left, right) =>
      (left.name ?? "").localeCompare(right.name ?? "", "en")
    );
}

export async function getPublicWorkBySlug(
  slug: string
): Promise<ArtistWorkDoc | null> {
  const result = await getWorkBySlugForPublicRoute(slug);

  if (!result.work) {
    console.warn("[firestore] public work not found", { slug });
    return null;
  }

  if (result.unpublished) {
    console.warn("[firestore] public work is not published", {
      slug,
      workId: result.work.id,
    });
    return null;
  }

  return result.work;
}

export async function getWorkBySlugOrId(
  slug: string
): Promise<ArtistWorkDoc | null> {
  const normalizedSlug = slug.trim();

  if (!normalizedSlug) {
    return null;
  }

  const slugSnapshot = await getDocs(
    query(collection(db, "works"), where("slug", "==", normalizedSlug), limit(1))
  );

  if (!slugSnapshot.empty) {
    const document = slugSnapshot.docs[0];

    return toArtistWorkDoc(
      document.id,
      document.data() as Record<string, unknown>
    );
  }

  const idSnapshot = await getDoc(doc(db, "works", normalizedSlug));

  if (idSnapshot.exists()) {
    return toArtistWorkDoc(
      idSnapshot.id,
      idSnapshot.data() as Record<string, unknown>
    );
  }

  const allWorks = await fetchAllWorkDocs();

  return (
    allWorks.find(
      (work) => resolveArtistWorkSlug(work) === normalizedSlug
    ) ?? null
  );
}

export async function getArtistWorkForShareByIdOrSlug(
  idOrSlug: string
): Promise<ArtistWorkDoc | null> {
  const normalizedValue = idOrSlug.trim();

  if (!normalizedValue) {
    return null;
  }

  const docSnapshot = await getDoc(doc(db, "works", normalizedValue));

  if (docSnapshot.exists()) {
    return toArtistWorkDoc(
      docSnapshot.id,
      docSnapshot.data() as Record<string, unknown>
    );
  }

  const slugSnapshot = await getDocs(
    query(
      collection(db, "works"),
      where("slug", "==", normalizedValue),
      limit(1)
    )
  );

  if (!slugSnapshot.empty) {
    const document = slugSnapshot.docs[0];

    return toArtistWorkDoc(
      document.id,
      document.data() as Record<string, unknown>
    );
  }

  const allWorks = await fetchAllWorkDocs();

  return (
    allWorks.find(
      (work) => resolveArtistWorkSlug(work) === normalizedValue
    ) ?? null
  );
}

export async function getWorkBySlugForPublicRoute(slug: string): Promise<{
  work: ArtistWorkDoc | null;
  unpublished: boolean;
}> {
  const work = await getWorkBySlugOrId(slug);

  if (!work) {
    return {
      work: null,
      unpublished: false,
    };
  }

  return {
    work,
    unpublished: work.isPublished !== true,
  };
}

export async function getPublicWorksForArtistSlug(
  artistSlug: string
): Promise<ArtistWorkDoc[]> {
  const snapshot = await getDocs(collection(db, "works"));

  return snapshot.docs
    .map((document) =>
      toArtistWorkDoc(document.id, document.data() as Record<string, unknown>)
    )
    .filter(
      (work) =>
        work.artistSlug === artistSlug &&
        work.isPublished === true &&
        work.archived !== true
    )
    .sort((left, right) => {
      const timeCompare =
        getTimestampMillis(right.updatedAt ?? right.createdAt) -
        getTimestampMillis(left.updatedAt ?? left.createdAt);

      if (timeCompare !== 0) return timeCompare;

      return (left.title ?? "").localeCompare(right.title ?? "", "en");
    });
}

export async function getPublicWorksForArtistId(
  artistId: string
): Promise<ArtistWorkDoc[]> {
  const normalizedArtistId = artistId.trim();

  if (!normalizedArtistId) {
    return [];
  }

  const snapshot = await getDocs(
    query(collection(db, "works"), where("artistId", "==", normalizedArtistId))
  );

  return snapshot.docs
    .map((document) =>
      toArtistWorkDoc(document.id, document.data() as Record<string, unknown>)
    )
    .filter(
      (work) =>
        work.artistId === normalizedArtistId &&
        work.isPublished === true &&
        work.archived !== true
    )
    .sort((left, right) => {
      const timeCompare =
        getTimestampMillis(right.updatedAt ?? right.createdAt) -
        getTimestampMillis(left.updatedAt ?? left.createdAt);

      if (timeCompare !== 0) return timeCompare;

      return (left.title ?? "").localeCompare(right.title ?? "", "en");
    });
}

export async function getWorkById(workId: string): Promise<ArtistWorkDoc | null> {
  const snapshot = await getDoc(doc(db, "works", workId));

  if (!snapshot.exists()) return null;

  return toArtistWorkDoc(
    snapshot.id,
    snapshot.data() as Record<string, unknown>
  );
}

export async function createProjectArtistForAdmin(
  payload: ArtistAdminSavePayload
) {
  const documentRef = doc(collection(db, "artists"));

  await setDoc(documentRef, {
    ...toArtistAdminPayload(payload),
    type: "project",
    status: "active",
    role: "artist",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return documentRef.id;
}

export async function updateArtistForAdmin(
  artistId: string,
  payload: ArtistAdminSavePayload
) {
  const resolvedDocId = await resolveArtistAdminDocId(artistId, payload.slug);

  if (!resolvedDocId) {
    throw new Error(
      `Firestore artist document not found for slug: ${payload.slug || artistId}`
    );
  }

  return updateArtistAdminDocument(resolvedDocId, payload);
}

export async function updateArtistForAdminBySlug(
  slug: string,
  payload: ArtistAdminSavePayload
) {
  const resolvedDocId = await findArtistDocIdBySlug(slug);

  if (!resolvedDocId) {
    throw new Error(`Firestore artist document not found for slug: ${slug}`);
  }

  return updateArtistAdminDocument(resolvedDocId, payload);
}

export async function updateWorkForAdmin(
  workId: string,
  payload: ArtistWorkAdminUpdatePayload
) {
  const updatePayload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (payload.isPublished !== undefined) {
    updatePayload.isPublished = payload.isPublished;
  }

  if (payload.archived !== undefined) {
    updatePayload.archived = payload.archived;
  }

  if (payload.coverImageUrl !== undefined) {
    updatePayload.coverImageUrl = payload.coverImageUrl.trim();
  }

  if (payload.modelGlb !== undefined) {
    updatePayload.modelGlb = payload.modelGlb.trim();
  }

  if (payload.modelUsdz !== undefined) {
    updatePayload.modelUsdz = payload.modelUsdz.trim();
  }

  if (payload.generatedGlbUrl !== undefined) {
    updatePayload.generatedGlbUrl = payload.generatedGlbUrl.trim();
  }

  if (payload.generatedUsdzUrl !== undefined) {
    updatePayload.generatedUsdzUrl = payload.generatedUsdzUrl.trim();
  }

  if (payload.displayOrder !== undefined) {
    const normalizedDisplayOrder = toOptionalFiniteNumber(payload.displayOrder);

    if (normalizedDisplayOrder !== undefined) {
      updatePayload.displayOrder = normalizedDisplayOrder;
    }
  }

  if (payload.docentAudioEnabled !== undefined) {
    updatePayload.docentAudioEnabled = payload.docentAudioEnabled;
  }

  if (payload.docentAudioUrl !== undefined) {
    updatePayload.docentAudioUrl = payload.docentAudioUrl.trim();
  }

  if (payload.docentAudioTitle !== undefined) {
    updatePayload.docentAudioTitle = payload.docentAudioTitle.trim();
  }

  if (payload.docentAudioDescription !== undefined) {
    updatePayload.docentAudioDescription = payload.docentAudioDescription.trim();
  }

  await updateDoc(doc(db, "works", workId), updatePayload);
}

export async function deleteArtistWork(workId: string, artistId: string) {
  const workRef = doc(db, "works", workId);
  const snapshot = await getDoc(workRef);

  if (!snapshot.exists()) {
    throw new Error("작품 정보를 불러오지 못했습니다.");
  }

  const work = toArtistWorkDoc(
    snapshot.id,
    snapshot.data() as Record<string, unknown>
  );

  if ((work.artistId ?? "") !== artistId) {
    throw new Error("본인 작품만 삭제할 수 있습니다.");
  }

  await deleteDoc(workRef);

  return work;
}

export async function deleteWorkForAdmin(workId: string) {
  const workRef = doc(db, "works", workId);
  const snapshot = await getDoc(workRef);

  if (!snapshot.exists()) {
    throw new Error("작품 정보를 불러오지 못했습니다.");
  }

  const work = toArtistWorkDoc(
    snapshot.id,
    snapshot.data() as Record<string, unknown>
  );

  await deleteDoc(workRef);

  return work;
}

export async function createWorkForArtist(
  artistId: string,
  artist: ArtistDoc,
  payload: ArtistWorkSavePayload
) {
  const documentRef = doc(collection(db, "works"));
  const slug = await buildUniqueCollectionSlug(
    "works",
    buildWorkSlug(payload.title, artist.slug ?? artistId, documentRef.id)
  );

  await setDoc(documentRef, {
    ...buildArtistWorkCreatePayload(artistId, artist, payload),
    slug,
    modelGlb: "",
    modelUsdz: "",
    generatedGlbUrl: "",
    isPublished: false,
    archived: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return documentRef.id;
}

export async function createWorkForAdmin(
  artistId: string,
  artist: ArtistDoc,
  payload: ArtistWorkSavePayload
) {
  const documentRef = doc(collection(db, "works"));
  const slug = await buildUniqueCollectionSlug(
    "works",
    buildWorkSlug(payload.title, artist.slug ?? artistId, documentRef.id)
  );

  await setDoc(documentRef, {
    ...buildArtistWorkCreatePayload(artistId, artist, payload),
    slug,
    modelGlb: "",
    modelUsdz: "",
    generatedGlbUrl: "",
    generatedUsdzUrl: "",
    isPublished: false,
    archived: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return documentRef.id;
}

export async function updateWorkForArtist(
  workId: string,
  _artistId: string,
  _artist: ArtistDoc,
  payload: ArtistWorkSavePayload
) {
  await updateDoc(doc(db, "works", workId), {
    ...buildArtistWorkEditablePayload(payload),
    updatedAt: serverTimestamp(),
  });
}

export async function getExhibitionById(
  exhibitionId: string
): Promise<ExhibitionDoc | null> {
  const snapshot = await getDoc(doc(db, "exhibitions", exhibitionId));

  if (!snapshot.exists()) return null;

  return toExhibitionDoc(
    snapshot.id,
    snapshot.data() as Record<string, unknown>
  );
}

export async function createExhibitionForAdmin(
  artistId: string,
  artist: ArtistDoc,
  payload: ExhibitionSavePayload
) {
  const documentRef = doc(collection(db, "exhibitions"));
  const slug = await buildUniqueCollectionSlug(
    "exhibitions",
    buildExhibitionSlug(payload.title, artist.slug ?? artistId, documentRef.id)
  );

  await setDoc(documentRef, {
    ...buildArtistExhibitionCreatePayload(artistId, artist, payload),
    slug,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return documentRef.id;
}

export async function updateExhibitionForAdmin(
  exhibitionId: string,
  artistId: string,
  artist: ArtistDoc,
  payload: ExhibitionSavePayload
) {
  const slug = await buildUniqueCollectionSlug(
    "exhibitions",
    buildExhibitionSlug(payload.title, artist.slug ?? artistId, exhibitionId),
    exhibitionId
  );

  await updateDoc(doc(db, "exhibitions", exhibitionId), {
    ...buildArtistExhibitionCreatePayload(artistId, artist, payload),
    slug,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteExhibitionForAdmin(exhibitionId: string) {
  const exhibitionRef = doc(db, "exhibitions", exhibitionId);
  const snapshot = await getDoc(exhibitionRef);

  if (!snapshot.exists()) {
    throw new Error("전시 정보를 불러오지 못했습니다.");
  }

  const exhibition = toExhibitionDoc(
    snapshot.id,
    snapshot.data() as Record<string, unknown>
  );

  await deleteDoc(exhibitionRef);

  return exhibition;
}

export async function getArtistProfileByUid(
  uid: string
): Promise<ArtistDoc | null> {
  const ref = doc(db, "artists", uid);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) return null;

  return toArtistDoc(
    snapshot.id,
    snapshot.data() as Record<string, unknown>
  );
}

export async function createArtistProfileFromSeed(
  uid: string,
  seed: AllowedArtistSeed
): Promise<ArtistDoc> {
  const ref = doc(db, "artists", uid);

  const payload = {
    ...seed,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(ref, payload);

  return {
    id: uid,
    ...payload,
  };
}

export async function updateArtistProfile(
  uid: string,
  payload: ArtistProfileUpdatePayload
) {
  const ref = doc(db, "artists", uid);

  await updateDoc(ref, {
    ...payload,
    updatedAt: serverTimestamp(),
  });
}
