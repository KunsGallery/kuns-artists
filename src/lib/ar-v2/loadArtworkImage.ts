import type { LoadedArtworkImage } from "./types";

export type ArtworkSourceLoadErrorKind =
  | "missing-url"
  | "cors-blocked"
  | "http-error"
  | "unsupported-type"
  | "decode-error";

type ArtworkSourceLoadErrorOptions = {
  imageUrl: string;
  siteOrigin?: string;
  responseStatus?: number;
  responseStatusText?: string;
};

export class ArtworkSourceLoadError extends Error {
  kind: ArtworkSourceLoadErrorKind;
  imageUrl: string;
  imageHost: string;
  siteOrigin: string;
  detail: string;
  requiredMethods = ["GET", "HEAD"] as const;
  responseStatus?: number;
  responseStatusText?: string;

  constructor(kind: ArtworkSourceLoadErrorKind, options: ArtworkSourceLoadErrorOptions) {
    const imageHost = getImageHost(options.imageUrl);
    const siteOrigin = options.siteOrigin || "";
    const statusText = getStatusText(kind, imageHost, siteOrigin, options.responseStatus);
    super(statusText.title);
    this.name = "ArtworkSourceLoadError";
    this.kind = kind;
    this.imageUrl = options.imageUrl;
    this.imageHost = imageHost;
    this.siteOrigin = siteOrigin;
    this.detail = statusText.detail;
    this.responseStatus = options.responseStatus;
    this.responseStatusText = options.responseStatusText;
  }
}

function getImageHost(imageUrl: string) {
  try {
    return new URL(imageUrl).hostname;
  } catch {
    return "";
  }
}

function getSiteOrigin() {
  return typeof globalThis.location !== "undefined" ? globalThis.location.origin : "";
}

function getStatusText(
  kind: ArtworkSourceLoadErrorKind,
  imageHost: string,
  siteOrigin: string,
  responseStatus?: number
) {
  if (kind === "http-error") {
    return {
      title: "Artwork source could not be loaded",
      detail: `The image host responded with HTTP ${responseStatus ?? "error"}.`,
    };
  }

  if (kind === "unsupported-type") {
    return {
      title: "Artwork source could not be loaded",
      detail: "The response was not a readable image.",
    };
  }

  if (kind === "decode-error") {
    return {
      title: "Artwork source could not be loaded",
      detail: "The image file could not be decoded.",
    };
  }

  if (kind === "missing-url") {
    return {
      title: "No artwork image URL",
      detail: "The selected work does not have a cover image URL yet.",
    };
  }

  return {
    title: "Artwork source could not be loaded",
    detail: [
      "The image URL is public, but JavaScript cannot read it because the R2 response does not allow this site origin.",
      imageHost ? `Image host: ${imageHost}` : "",
      siteOrigin ? `Site origin: ${siteOrigin}` : "",
      "Required method: GET / HEAD",
      "Status: CORS blocked",
      "Cloudflare R2 Bucket Settings의 CORS Policy에 현재 사이트 주소를 추가한 뒤 다시 시도하세요.",
    ]
      .filter(Boolean)
      .join(" "),
  };
}

export async function loadArtworkImageForArV2(url: string): Promise<LoadedArtworkImage> {
  const trimmedUrl = url.trim();
  if (!trimmedUrl) {
    throw new ArtworkSourceLoadError("missing-url", { imageUrl: trimmedUrl, siteOrigin: getSiteOrigin() });
  }

  let response: Response;
  try {
    response = await fetch(trimmedUrl, {
      mode: "cors",
      credentials: "omit",
      cache: "no-store",
    });
  } catch {
    throw new ArtworkSourceLoadError("cors-blocked", { imageUrl: trimmedUrl, siteOrigin: getSiteOrigin() });
  }

  if (!response.ok) {
    throw new ArtworkSourceLoadError("http-error", {
      imageUrl: trimmedUrl,
      siteOrigin: getSiteOrigin(),
      responseStatus: response.status,
      responseStatusText: response.statusText,
    });
  }

  const blob = await response.blob();
  if (!/^image\/(jpeg|png|webp)$/i.test(blob.type)) {
    throw new ArtworkSourceLoadError("unsupported-type", { imageUrl: trimmedUrl, siteOrigin: getSiteOrigin() });
  }

  const objectUrl = URL.createObjectURL(blob);
  const image = new Image();

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new ArtworkSourceLoadError("decode-error", { imageUrl: trimmedUrl, siteOrigin: getSiteOrigin() }));
      image.src = objectUrl;
    });
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    if (error instanceof ArtworkSourceLoadError) {
      throw error;
    }
    throw new ArtworkSourceLoadError("decode-error", { imageUrl: trimmedUrl, siteOrigin: getSiteOrigin() });
  }

  if (!image.naturalWidth || !image.naturalHeight) {
    URL.revokeObjectURL(objectUrl);
    throw new ArtworkSourceLoadError("decode-error", { imageUrl: trimmedUrl, siteOrigin: getSiteOrigin() });
  }

  return {
    image,
    revoke: () => URL.revokeObjectURL(objectUrl),
  };
}
