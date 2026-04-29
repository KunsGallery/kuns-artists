export function normalizeExternalUrl(url?: string | null) {
  if (!url) return "";

  const trimmed = url.trim();

  if (!trimmed || trimmed === "#") return "";

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return `https://${trimmed}`;
}
