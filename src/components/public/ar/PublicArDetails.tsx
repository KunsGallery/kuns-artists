"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { PublicArWork, PublicArSource } from "./types";

type PublicArDetailsProps = {
  work: PublicArWork;
  workHref: string;
  artistHref: string;
  source: PublicArSource;
  debugMessage?: string;
  footer?: ReactNode;
};

function DevelopmentDetails({
  source,
  debugMessage,
}: {
  source: PublicArSource;
  debugMessage?: string;
}) {
  const showDebugNote = process.env.NODE_ENV === "development";

  if (!showDebugNote || !debugMessage) {
    return null;
  }

  return (
    <details className="mt-6 rounded-[1.4rem] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-white/62">
      <summary className="cursor-pointer list-none text-[11px] uppercase tracking-[0.22em] text-white/40">
        Development
      </summary>
      <p className="mt-3 text-[11px] uppercase tracking-[0.22em] text-white/42">
        Source: {source}
      </p>
      <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-white/42">
        {debugMessage}
      </p>
    </details>
  );
}

export function PublicArDetails({
  work,
  workHref,
  artistHref,
  source,
  debugMessage,
  footer,
}: PublicArDetailsProps) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.018)),#151515] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.24)] md:p-6">
      <p className="text-[11px] uppercase tracking-[0.34em] text-white/42">
        작품 상세
      </p>

      <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#F7F1E8]">
        {work.artistName}의 작품을 더 자세히 봅니다.
      </h2>

      <div className="mt-5 space-y-4">
        {work.description ? (
          <div className="space-y-4 text-[15px] leading-8 text-white/68">
            {work.description.split("\n").map((paragraph, index) => (
              <p key={`${work.slug}-description-${index}`}>{paragraph}</p>
            ))}
          </div>
        ) : (
          <p className="text-sm leading-7 text-white/54">
            작품 설명이 준비 중입니다.
          </p>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href={workHref}
          className="inline-flex h-11 items-center justify-center rounded-full border border-[#F37021]/35 bg-[#F37021]/10 px-4 text-sm text-[#F7F1E8] transition hover:border-[#F37021]/55 hover:bg-[#F37021]/16"
        >
          작품 상세 보기
        </Link>
        <Link
          href={artistHref}
          className="inline-flex h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.035] px-4 text-sm text-[#F7F1E8] transition hover:border-[#F37021]/35 hover:bg-[#F37021]/10"
        >
          작가 소개 보기
        </Link>
      </div>

      {footer ? <div className="mt-6">{footer}</div> : null}

      <DevelopmentDetails source={source} debugMessage={debugMessage} />
    </section>
  );
}
