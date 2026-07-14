"use client";

import type { ArtistWorkDoc } from "@/lib/firebase/firestore";
import type { WorkArV2AssetStatus } from "@/lib/ar-v2";

type StatusTone = "ready" | "missing" | "preparing" | "neutral";

function formatByteSize(value?: number) {
  if (!value || !Number.isFinite(value)) {
    return "—";
  }

  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(2)} MB`;
  }

  if (value >= 1024) {
    return `${Math.round(value / 1024)} KB`;
  }

  return `${Math.round(value)} B`;
}

function formatGeneratedAt(value: unknown) {
  if (!value) {
    return "—";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object" && value && "toDate" in value && typeof (value as { toDate?: unknown }).toDate === "function") {
    try {
      const date = (value as { toDate: () => Date }).toDate();
      return date.toLocaleString();
    } catch {
      return "—";
    }
  }

  if (typeof value === "object" && value && "seconds" in value && typeof (value as { seconds?: unknown }).seconds === "number") {
    return new Date(((value as { seconds: number }).seconds ?? 0) * 1000).toLocaleString();
  }

  return "—";
}

function getStatusTone(status?: WorkArV2AssetStatus): StatusTone {
  if (status === "ready") return "ready";
  if (status === "preview") return "preparing";
  if (status === "error") return "missing";
  return "neutral";
}

function getStatusLabel(work: ArtistWorkDoc) {
  if (work.arV2Asset?.status === "ready" && work.arV2Asset.glbUrl) return "Ready";
  if (work.arV2Asset?.status === "preview") return "Preview";
  if (work.arV2Asset?.status === "error") return "Error";
  if (work.arV2Asset?.status === "none") return "None";
  return "No asset";
}

export function getWorkArV2Summary(work: ArtistWorkDoc) {
  const asset = work.arV2Asset;
  return {
    tone: getStatusTone(asset?.status),
    label: getStatusLabel(work),
    detail:
      asset?.status === "ready" && asset.glbUrl
        ? "AR v2 GLB is ready."
        : asset?.status === "preview"
          ? "Preview exists, but it has not been approved yet."
          : asset?.status === "error"
            ? asset.errorMessage || "The last preview build failed."
            : "No AR v2 asset has been saved yet.",
  } as const;
}

function ToneChip({
  tone,
  children,
}: {
  tone: StatusTone;
  children: React.ReactNode;
}) {
  const toneClass = {
    ready: "border-emerald-400/25 bg-emerald-400/10 text-emerald-100",
    missing: "border-amber-400/25 bg-amber-400/10 text-amber-100",
    preparing: "border-[#F37021]/25 bg-[#F37021]/10 text-[#FFBF8A]",
    neutral: "border-white/10 bg-white/[0.04] text-white/72",
  }[tone];

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.22em] ${toneClass}`}>
      {children}
    </span>
  );
}

export function AdminArV2Status({ work }: { work: ArtistWorkDoc }) {
  const asset = work.arV2Asset;
  const status = getWorkArV2Summary(work);

  return (
    <section className="rounded-[1.6rem] border border-black/8 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
            Stored Asset
          </p>
          <p className="mt-2 text-sm leading-7 text-neutral-600">
            Saved AR v2 model and generator metadata for this work.
          </p>
        </div>
        <ToneChip tone={status.tone}>{status.label}</ToneChip>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <InfoLine label="Status" value={asset?.status || "none"} />
        <InfoLine label="Generator" value={asset?.generatorVersion || "ar-v2.1"} />
        <InfoLine label="Byte Size" value={formatByteSize(asset?.byteSize)} />
        <InfoLine label="Generated At" value={formatGeneratedAt(asset?.generatedAt)} />
        <InfoLine label="Source Signature" value={asset?.sourceSignature || "—"} wide />
        <InfoLine label="GLB URL" value={asset?.glbUrl || "—"} wide link={asset?.glbUrl} />
      </div>

      {asset?.status === "error" && asset.errorMessage ? (
        <p className="mt-4 rounded-[1.15rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          {asset.errorMessage}
        </p>
      ) : null}

      <p className="mt-4 text-[11px] uppercase tracking-[0.24em] text-neutral-400">
        {status.detail}
      </p>
    </section>
  );
}

function InfoLine({
  label,
  value,
  link,
  wide,
}: {
  label: string;
  value: string;
  link?: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "md:col-span-2 rounded-[1.15rem] border border-black/8 bg-[#fcfbf8] px-4 py-3" : "rounded-[1.15rem] border border-black/8 bg-[#fcfbf8] px-4 py-3"}>
      <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
        {label}
      </p>
      {link ? (
        <a href={link} target="_blank" rel="noreferrer" className="mt-2 break-all text-sm leading-6 text-[#b85d18] underline-offset-2 hover:underline">
          {value}
        </a>
      ) : (
        <p className="mt-2 break-all text-sm leading-6 text-neutral-600">
          {value}
        </p>
      )}
    </div>
  );
}
