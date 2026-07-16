import { resolveArtistWorkSlug, type ArtistWorkDoc } from "@/lib/firebase/firestore";
import type { Work } from "@/types/work";

export type PublicArWork = Work & {
  id?: string;
};

export function mapPublicArWork(
  firestoreWork?: ArtistWorkDoc | null,
  fallbackWork?: Work
): PublicArWork | null {
  const slug = firestoreWork
    ? resolveArtistWorkSlug(firestoreWork)
    : fallbackWork?.slug ?? "";
  const artistSlug = firestoreWork?.artistSlug ?? fallbackWork?.artistSlug ?? "";
  const artistName =
    firestoreWork?.artistName ?? fallbackWork?.artistName ?? "";
  const title = firestoreWork?.title ?? fallbackWork?.title ?? "";

  if (!slug || !artistSlug || !artistName || !title) {
    return null;
  }

  return {
    id: firestoreWork?.id,
    slug,
    artistSlug,
    artistName,
    title,
    year: firestoreWork?.year ?? fallbackWork?.year,
    medium: firestoreWork?.medium ?? fallbackWork?.medium,
    dimensions: firestoreWork?.dimensions ?? fallbackWork?.dimensions,
    description: firestoreWork?.description ?? fallbackWork?.description,
    coverImage: firestoreWork?.coverImageUrl ?? fallbackWork?.coverImage,
    coverImageUrl: firestoreWork?.coverImageUrl ?? fallbackWork?.coverImageUrl,
    modelGlb:
      firestoreWork?.generatedGlbUrl ??
      firestoreWork?.modelGlb ??
      fallbackWork?.modelGlb,
    modelUsdz:
      firestoreWork?.generatedUsdzUrl ??
      firestoreWork?.modelUsdz ??
      fallbackWork?.modelUsdz,
    generatedGlbUrl:
      firestoreWork?.generatedGlbUrl ?? fallbackWork?.generatedGlbUrl,
    generatedUsdzUrl:
      firestoreWork?.generatedUsdzUrl ?? fallbackWork?.generatedUsdzUrl,
    arV2Config: firestoreWork?.arV2Config ?? fallbackWork?.arV2Config,
    arV2Asset: firestoreWork?.arV2Asset ?? fallbackWork?.arV2Asset,
    docentAudioEnabled:
      firestoreWork?.docentAudioEnabled ?? fallbackWork?.docentAudioEnabled,
    docentAudioUrl:
      firestoreWork?.docentAudioUrl ?? fallbackWork?.docentAudioUrl,
    docentAudioTitle:
      firestoreWork?.docentAudioTitle ?? fallbackWork?.docentAudioTitle,
    docentAudioDescription:
      firestoreWork?.docentAudioDescription ??
      fallbackWork?.docentAudioDescription,
    widthCm: firestoreWork?.widthCm ?? fallbackWork?.widthCm,
    heightCm: firestoreWork?.heightCm ?? fallbackWork?.heightCm,
    depthCm: firestoreWork?.depthCm ?? fallbackWork?.depthCm,
    frontRotationXDeg:
      firestoreWork?.frontRotationXDeg ?? fallbackWork?.frontRotationXDeg,
    frontRotationYDeg:
      firestoreWork?.frontRotationYDeg ?? fallbackWork?.frontRotationYDeg,
    sideMode: firestoreWork?.sideMode ?? fallbackWork?.sideMode,
    showBackLabel:
      firestoreWork?.showBackLabel ?? fallbackWork?.showBackLabel,
    isPublished: firestoreWork?.isPublished ?? fallbackWork?.isPublished,
    archived: firestoreWork?.archived ?? fallbackWork?.archived,
  };
}

export function getPublicArWorkRouteSlug(work: PublicArWork) {
  return work.slug
    ? work.slug
    : work.id
      ? resolveArtistWorkSlug({
          id: work.id,
          slug: work.slug,
          title: work.title,
          artistSlug: work.artistSlug,
        })
      : "";
}

export function getPublicArWorkHref(work: PublicArWork) {
  const routeSlug = getPublicArWorkRouteSlug(work);

  return routeSlug ? `/works/${routeSlug}` : "/works";
}

export function getPublicArtistHref(work?: PublicArWork | null) {
  return work?.artistSlug ? `/artists/${work.artistSlug}` : "/artists";
}

