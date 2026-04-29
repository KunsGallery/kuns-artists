import {
  collection,
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

export type ArtistRole = "admin" | "artist";
export type ArtistType = "represented" | "project";
export type ArtistStatus = "active" | "inactive";
export type WorkSideMode = "canvas" | "image";

export type ArtistDoc = {
  id: string;
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
};

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
  isPublished?: boolean;
  archived?: boolean;
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

function toArtistDoc(id: string, rawData: Record<string, unknown>): ArtistDoc {
  return {
    id,
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
    isPublished: toOptionalBoolean(rawData.isPublished),
    archived: toOptionalBoolean(rawData.archived),
    createdAt: rawData.createdAt,
    updatedAt: rawData.updatedAt,
  };
}

function buildArtistWorkEditablePayload(payload: ArtistWorkSavePayload) {
  return {
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

export async function getAllWorksForTool(): Promise<WorkToolDoc[]> {
  const snapshot = await getDocs(collection(db, "works"));
  const works = snapshot.docs.map((document) =>
    toArtistWorkDoc(
      document.id,
      document.data() as Record<string, unknown>
    )
  );

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
  const snapshot = await getDocs(
    query(collection(db, "artists"), where("slug", "==", slug), limit(1))
  );

  if (snapshot.empty) {
    return null;
  }

  const document = snapshot.docs[0];

  return toArtistDoc(
    document.id,
    document.data() as Record<string, unknown>
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
  const snapshot = await getDocs(
    query(collection(db, "works"), where("slug", "==", slug), limit(1))
  );

  if (snapshot.empty) {
    const fallbackSnapshot = await getDocs(collection(db, "works"));
    const fallbackWorks = fallbackSnapshot.docs
      .map((document) =>
        toArtistWorkDoc(
          document.id,
          document.data() as Record<string, unknown>
        )
      )
      .filter((work) => work.isPublished === true);

    return (
      fallbackWorks.find((work) => resolveArtistWorkSlug(work) === slug) ?? null
    );
  }

  const work = toArtistWorkDoc(
    snapshot.docs[0].id,
    snapshot.docs[0].data() as Record<string, unknown>
  );

  return work.isPublished === true ? work : null;
}

export async function getPublicWorksForArtistSlug(
  artistSlug: string
): Promise<ArtistWorkDoc[]> {
  const snapshot = await getDocs(
    query(collection(db, "works"), where("artistSlug", "==", artistSlug))
  );

  return snapshot.docs
    .map((document) =>
      toArtistWorkDoc(
        document.id,
        document.data() as Record<string, unknown>
      )
    )
    .filter((work) => work.isPublished === true)
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

export async function createWorkForArtist(
  artistId: string,
  artist: ArtistDoc,
  payload: ArtistWorkSavePayload
) {
  const documentRef = doc(collection(db, "works"));
  const slug = buildWorkSlug(
    payload.title,
    artist.slug ?? artistId,
    documentRef.id
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
