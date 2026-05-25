export type ArtistCvType =
  | "solo"
  | "group"
  | "fair"
  | "award"
  | "collection"
  | "publication"
  | "residency"
  | "education"
  | "other";

export type ArtistArchiveLinkType =
  | "interview"
  | "article"
  | "video"
  | "catalog"
  | "press"
  | "website"
  | "other";

export type ArtistCvItem = {
  id: string;
  year: string;
  type: ArtistCvType;
  title: string;
  venue: string;
  location: string;
  note?: string;
  order: number;
};

export type ArtistArchiveLink = {
  id: string;
  year: string;
  type: ArtistArchiveLinkType;
  title: string;
  source: string;
  url: string;
  description?: string;
  order: number;
};

export const ARTIST_CV_TYPE_OPTIONS: Array<{
  value: ArtistCvType;
  label: string;
}> = [
  { value: "solo", label: "Solo Exhibition" },
  { value: "group", label: "Group Exhibition" },
  { value: "fair", label: "Art Fair" },
  { value: "award", label: "Honors and Awards" },
  { value: "collection", label: "Collection" },
  { value: "publication", label: "Publication" },
  { value: "residency", label: "Residency" },
  { value: "education", label: "Education" },
  { value: "other", label: "Other" },
];

export const ARTIST_ARCHIVE_LINK_TYPE_OPTIONS: Array<{
  value: ArtistArchiveLinkType;
  label: string;
}> = [
  { value: "interview", label: "Interview" },
  { value: "article", label: "Article" },
  { value: "video", label: "Video" },
  { value: "catalog", label: "Catalog" },
  { value: "press", label: "Press" },
  { value: "website", label: "Website" },
  { value: "other", label: "Other" },
];

const ARTIST_CV_TYPE_DISPLAY_LABELS: Record<
  ArtistCvType,
  { ko: string; en: string }
> = {
  solo: { ko: "개인전", en: "Solo Exhibitions" },
  group: { ko: "단체전", en: "Selected Group Exhibitions" },
  fair: { ko: "아트페어", en: "Art Fairs" },
  award: { ko: "수상내역", en: "Honors and Awards" },
  collection: { ko: "소장", en: "Collections" },
  publication: { ko: "출판", en: "Publications" },
  residency: { ko: "레지던시", en: "Residencies" },
  education: { ko: "학력", en: "Education" },
  other: { ko: "기타", en: "Other" },
};

const ARTIST_ARCHIVE_LINK_DISPLAY_LABELS: Record<
  ArtistArchiveLinkType,
  string
> = {
  interview: "Interview",
  article: "Article",
  video: "Media",
  catalog: "Catalog",
  press: "Press",
  website: "Website",
  other: "Other",
};

export const ARTIST_CV_DISPLAY_ORDER: ArtistCvType[] = [
  "solo",
  "group",
  "fair",
  "award",
  "collection",
  "publication",
  "residency",
  "education",
  "other",
];

export function getArtistCvTypeDisplayLabel(type: ArtistCvType) {
  const label = ARTIST_CV_TYPE_DISPLAY_LABELS[type];

  return `${label.ko} | ${label.en}`;
}

export function getArtistArchiveLinkTypeLabel(type: ArtistArchiveLinkType) {
  return ARTIST_ARCHIVE_LINK_DISPLAY_LABELS[type];
}

export function sortArtistCvItems(items: ArtistCvItem[]) {
  return [...items]
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const leftOrder = Number.isFinite(left.item.order)
        ? left.item.order
        : Number.POSITIVE_INFINITY;
      const rightOrder = Number.isFinite(right.item.order)
        ? right.item.order
        : Number.POSITIVE_INFINITY;

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      const leftYear = Number.parseInt(left.item.year, 10);
      const rightYear = Number.parseInt(right.item.year, 10);

      const leftHasYear = Number.isFinite(leftYear);
      const rightHasYear = Number.isFinite(rightYear);

      if (leftHasYear && rightHasYear && leftYear !== rightYear) {
        return rightYear - leftYear;
      }

      return left.index - right.index;
    })
    .map(({ item }) => item);
}

export function sortArtistArchiveLinks(items: ArtistArchiveLink[]) {
  return [...items]
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const leftOrder = Number.isFinite(left.item.order)
        ? left.item.order
        : Number.POSITIVE_INFINITY;
      const rightOrder = Number.isFinite(right.item.order)
        ? right.item.order
        : Number.POSITIVE_INFINITY;

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      const leftYear = Number.parseInt(left.item.year, 10);
      const rightYear = Number.parseInt(right.item.year, 10);

      const leftHasYear = Number.isFinite(leftYear);
      const rightHasYear = Number.isFinite(rightYear);

      if (leftHasYear && rightHasYear && leftYear !== rightYear) {
        return rightYear - leftYear;
      }

      return left.index - right.index;
    })
    .map(({ item }) => item);
}
