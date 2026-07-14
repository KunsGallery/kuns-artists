"use client";

import type { ArtworkSourceLoadError } from "@/lib/ar-v2";

export type ImageLoadStatus = "idle" | "loading" | "ready" | "error";

type Props = {
  status: ImageLoadStatus;
  coverImageUrl: string;
  image: HTMLImageElement | null;
  error: ArtworkSourceLoadError | null;
  siteOrigin: string;
  onRetry: () => void;
};

export function ArV2SourceImageStatus({
  status,
  coverImageUrl,
  image,
  error,
  siteOrigin,
  onRetry,
}: Props) {
  const host = getHostName(coverImageUrl);
  const canRetry = status === "error" && Boolean(coverImageUrl);
  const badgeLabel =
    status === "ready"
      ? "Source Ready"
      : status === "loading"
        ? "Loading"
        : status === "error"
          ? "CORS Error"
          : "Missing Source";
  const badgeClass =
    status === "ready"
      ? "border-emerald-300/35 bg-emerald-400/15 text-emerald-50"
      : status === "loading"
        ? "border-amber-300/35 bg-amber-400/15 text-amber-50"
        : status === "error"
          ? "border-rose-300/35 bg-rose-500/15 text-rose-50"
          : "border-white/10 bg-white/5 text-white/60";

  return (
    <div className="rounded-[1.4rem] border border-white/10 bg-slate-950/80 p-4 text-white shadow-sm ring-1 ring-white/5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">
            Source Status
          </p>
          <p className="mt-2 text-sm leading-7 text-white/80">
            {status === "loading"
              ? "Loading artwork source…"
              : status === "ready"
                ? "Artwork source is ready for preview build."
                : status === "error"
                  ? "Artwork source could not be loaded."
                  : "No artwork image URL."}
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.22em] ${badgeClass}`}
        >
          {badgeLabel}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <InfoRow label="Site origin" value={error?.siteOrigin || siteOrigin || "—"} />
        <InfoRow label="Image host" value={error?.imageHost || host || "—"} />
        <InfoRow label="Required method" value="GET / HEAD" />
        <InfoRow
          label="Status"
          value={
            status === "error"
              ? "CORS blocked"
              : status === "loading"
                ? "Loading"
                : status === "ready"
                  ? "Ready"
                  : "Missing source"
          }
        />
      </div>

      {status === "ready" && image ? (
        <div className="mt-4 rounded-[1.15rem] border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm leading-6 text-emerald-50">
          Decoded image: {image.naturalWidth} × {image.naturalHeight}px
        </div>
      ) : null}

      {status === "error" ? (
        <div className="mt-4 rounded-[1.15rem] border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm leading-6 text-amber-50">
          <p className="font-medium text-amber-50">Artwork source could not be loaded</p>
          <p className="mt-2 text-amber-50/90">
            {error?.detail ||
              "The image URL is public, but JavaScript cannot read it because the R2 response does not allow this site origin."}
          </p>
          <p className="mt-2 text-amber-50/80">
            Cloudflare R2 Bucket Settings의 CORS Policy에 현재 사이트 주소를 추가한 뒤 다시 시도하세요.
          </p>
        </div>
      ) : null}

      {canRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex h-11 items-center justify-center rounded-full border border-white/15 bg-white/8 px-4 text-sm text-white/90 transition hover:border-white/25 hover:bg-white/12"
        >
          Retry Artwork Image
        </button>
      ) : null}
    </div>
  );
}

function getHostName(value: string) {
  try {
    return value ? new URL(value).hostname : "";
  } catch {
    return "";
  }
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1rem] border border-white/10 bg-white/[0.06] px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.24em] text-white/45">{label}</p>
      <p className="mt-2 break-all text-sm leading-6 text-white/85">{value}</p>
    </div>
  );
}
