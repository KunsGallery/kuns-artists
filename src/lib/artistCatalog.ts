import { getRepresentedArtists, type Artist } from "@/data/artists";
import type { ArtistDoc } from "@/lib/firebase/firestore";

export type PublicArtistCard = {
  slug: string;
  name: string;
  nameKo?: string;
  type: Artist["type"];
  status?: ArtistDoc["status"];
  tagline?: string;
  profileImage?: string;
  archives?: Artist["archives"];
};

function sortByEnglishName(left: { name: string }, right: { name: string }) {
  return left.name.localeCompare(right.name, "en");
}

export function mergePublicArtist(
  staticArtist?: Artist,
  firestoreArtist?: ArtistDoc | null
): PublicArtistCard | null {
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
    profileImage:
      firestoreArtist?.profileImageUrl ?? staticArtist?.profileImage,
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
