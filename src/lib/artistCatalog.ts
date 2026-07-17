import { getRepresentedArtists, type Artist } from "@/data/artists";
import type { ArtistDoc } from "@/lib/firebase/firestore";

export type PublicArtistCard = {
  slug: string;
  name: string;
  nameKo?: string;
  type: Artist["type"];
  status?: ArtistDoc["status"];
  tagline?: string;
  location?: string;
  profileImage?: string;
  featuredWorkId?: string;
  featuredWorkSlug?: string;
  featuredWorkTitle?: string;
  featuredWorkImageUrl?: string;
  portfolioPdfUrl?: string;
  portfolioPdfLabel?: string;
  galleryNote?: string;
  galleryNoteEn?: string;
  archives?: Artist["archives"];
};

type SeedArtistWithCollections = Artist & {
  galleryNote?: string;
  galleryNoteEn?: string;
  portfolioPdfUrl?: string;
  portfolioPdfLabel?: string;
};

function sortByEnglishName(left: { name: string }, right: { name: string }) {
  return left.name.localeCompare(right.name, "en");
}

export function resolveProfileImageUrl(
  firestoreArtist?: ArtistDoc | null,
  staticArtist?: Artist
) {
  const firestoreProfileImage = firestoreArtist?.profileImageUrl?.trim() || "";
  const staticProfileImage = staticArtist?.profileImage?.trim() || "";

  return firestoreProfileImage || staticProfileImage;
}

export function mergePublicArtist(
  staticArtist?: Artist,
  firestoreArtist?: ArtistDoc | null
): PublicArtistCard | null {
  const seedArtist = staticArtist as SeedArtistWithCollections | undefined;
  const slug = firestoreArtist?.slug ?? staticArtist?.slug ?? "";
  const name = firestoreArtist?.name ?? staticArtist?.name ?? "";

  if (!slug || !name) {
    return null;
  }

  return {
    slug,
    name,
    nameKo: firestoreArtist?.nameKo ?? staticArtist?.nameKo,
    type: firestoreArtist?.type ?? staticArtist?.type ?? "represented",
    status: firestoreArtist?.status ?? undefined,
    tagline: firestoreArtist?.tagline ?? staticArtist?.tagline,
    location: firestoreArtist?.location ?? staticArtist?.location,
    profileImage: resolveProfileImageUrl(firestoreArtist, staticArtist),
    featuredWorkId: firestoreArtist?.featuredWorkId,
    featuredWorkSlug: firestoreArtist?.featuredWorkSlug,
    featuredWorkTitle: firestoreArtist?.featuredWorkTitle,
    featuredWorkImageUrl: firestoreArtist?.featuredWorkImageUrl,
    portfolioPdfUrl:
      firestoreArtist?.portfolioPdfUrl ?? seedArtist?.portfolioPdfUrl,
    portfolioPdfLabel:
      firestoreArtist?.portfolioPdfLabel ?? seedArtist?.portfolioPdfLabel,
    galleryNote: firestoreArtist?.galleryNote ?? seedArtist?.galleryNote,
    galleryNoteEn: firestoreArtist?.galleryNoteEn ?? seedArtist?.galleryNoteEn,
    archives: staticArtist?.archives,
  };
}

export function buildPublicArtistCollections(
  firestoreArtists: ArtistDoc[] = []
) {
  const representedSeedArtists = getRepresentedArtists();
  const representedBySlug = new Map<string, PublicArtistCard>();
  const representedFirestoreArtists = firestoreArtists.filter(
    (artist) => artist.type === "represented"
  );
  const projectArtists = firestoreArtists
    .filter((artist) => artist.type === "project" && artist.status === "active")
    .map((artist) => mergePublicArtist(undefined, artist))
    .filter((artist): artist is PublicArtistCard => artist !== null)
    .sort(sortByEnglishName);

  for (const seedArtist of representedSeedArtists) {
    const merged = mergePublicArtist(seedArtist);

    if (merged) {
      representedBySlug.set(merged.slug, merged);
    }
  }

  for (const firestoreArtist of representedFirestoreArtists) {
    const staticArtist = representedSeedArtists.find(
      (artist) => artist.slug === firestoreArtist.slug
    );

    const merged = mergePublicArtist(staticArtist, firestoreArtist);

    if (merged) {
      representedBySlug.set(merged.slug, merged);
    }
  }

  const representedArtists = [...representedBySlug.values()].sort(
    sortByEnglishName
  );

  return {
    representedArtists,
    projectArtists,
  };
}
