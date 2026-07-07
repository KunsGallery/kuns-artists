export type ExhibitionDoc = {
  id: string;
  artistId?: string;
  artistSlug?: string;
  artistName?: string;
  slug?: string;
  title?: string;
  venue?: string;
  location?: string;
  description?: string;
  imageUrl?: string;
  startDate?: string;
  endDate?: string;
  isPublished?: boolean;
  archived?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type ExhibitionSavePayload = {
  title: string;
  venue: string;
  location: string;
  description: string;
  imageUrl: string;
  startDate: string;
  endDate?: string;
  isPublished?: boolean;
  archived?: boolean;
};

export function sortExhibitionsByStartDateDesc(items: ExhibitionDoc[]) {
  return [...items]
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const leftStart = left.item.startDate?.trim() || "";
      const rightStart = right.item.startDate?.trim() || "";

      if (leftStart !== rightStart) {
        return rightStart.localeCompare(leftStart, "en");
      }

      const titleCompare = (left.item.title ?? "").localeCompare(
        right.item.title ?? "",
        "en"
      );

      if (titleCompare !== 0) {
        return titleCompare;
      }

      return left.index - right.index;
    })
    .map(({ item }) => item);
}
