"use client";

import Link from "next/link";
import type { PublicArWork } from "./types";

type PublicArMetadataProps = {
  work: PublicArWork;
  artistHref: string;
};

function MetadataTile({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  if (!value) {
    return null;
  }

  return (
    <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.03] px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">
        {label}
      </p>
      <p className="mt-2 text-sm leading-6 text-white/80">{value}</p>
    </div>
  );
}

export function PublicArMetadata({ work, artistHref }: PublicArMetadataProps) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.018)),radial-gradient(circle_at_16%_14%,rgba(243,112,33,0.12),transparent_34%),#171717] p-5 shadow-[0_22px_80px_rgba(0,0,0,0.24)] md:p-6">
      <p className="text-[11px] uppercase tracking-[0.34em] text-white/42">
        작품 정보
      </p>

      <h1 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[#F7F1E8] md:text-4xl">
        {work.title}
      </h1>

      <Link
        href={artistHref}
        className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/78 transition hover:border-[#F37021]/35 hover:bg-[#F37021]/10 hover:text-[#F7F1E8]"
      >
        <span>{work.artistName}</span>
        <span className="text-[#FF9B5A]">↗</span>
      </Link>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <MetadataTile label="연도" value={work.year} />
        <MetadataTile label="재료" value={work.medium} />
        <MetadataTile label="크기" value={work.dimensions} />
      </div>
    </section>
  );
}
