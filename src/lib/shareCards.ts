import { toBlob } from "html-to-image";
import { resolveArtistWorkSlug, type ArtistWorkDoc } from "@/lib/firebase/firestore";

export const PUBLIC_SITE_URL = "https://artists.kunsgallery.com";

export function buildArtistPublicUrl(slug: string) {
  const normalizedSlug = slug.trim();

  return normalizedSlug ? `${PUBLIC_SITE_URL}/artists/${normalizedSlug}` : "";
}

export function buildArtistShareCardFilename(
  slug: string,
  template: "card" | "story"
) {
  const normalizedSlug = slug.trim() || "artist";

  return template === "story"
    ? `kuns-artist-story-${normalizedSlug}.png`
    : `kuns-artist-card-${normalizedSlug}.png`;
}

export function buildWorkPublicUrl(
  work: Pick<ArtistWorkDoc, "slug" | "id" | "title" | "artistSlug">
) {
  const normalizedSlug = work.slug?.trim() || resolveArtistWorkSlug(work);

  if (normalizedSlug) {
    return `${PUBLIC_SITE_URL}/ar/${normalizedSlug}`;
  }

  if (work.id?.trim()) {
    return `${PUBLIC_SITE_URL}/ar/${work.id.trim()}`;
  }

  return `${PUBLIC_SITE_URL}/ar`;
}

export function buildWorkShareCardFilename(work: Pick<ArtistWorkDoc, "slug" | "id">) {
  const normalizedId = work.slug?.trim() || work.id?.trim() || "work";

  return `kuns-work-card-${normalizedId}.png`;
}

export function isLikelyR2PublicImageUrl(url: string) {
  const normalizedUrl = url.trim();

  if (!normalizedUrl) {
    return false;
  }

  try {
    const parsedUrl = new URL(normalizedUrl);
    return (
      parsedUrl.hostname.endsWith(".r2.dev") ||
      parsedUrl.hostname === "r2.dev" ||
      parsedUrl.hostname.includes(".r2.dev")
    );
  } catch {
    return normalizedUrl.includes(".r2.dev") || normalizedUrl.includes("r2.dev");
  }
}

export async function imageUrlToDataUrl(url: string): Promise<string | null> {
  if (!url.trim() || isLikelyR2PublicImageUrl(url)) {
    return null;
  }

  try {
    const response = await fetch(url, { mode: "cors" });

    if (!response.ok) {
      return null;
    }

    const blob = await response.blob();

    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () =>
        resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function captureElementAsPng(
  element: HTMLElement,
  options?: {
    backgroundColor?: string;
    pixelRatio?: number;
  }
) {
  const blob = await toBlob(element, {
    cacheBust: true,
    backgroundColor: options?.backgroundColor ?? "#171717",
    pixelRatio: options?.pixelRatio ?? 3,
  });

  if (!blob) {
    throw new Error("카드 이미지를 저장하지 못했습니다.");
  }

  return blob;
}

export function downloadBlob(blob: Blob, filename: string) {
  const downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = filename;
  anchor.rel = "noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(downloadUrl);
}
