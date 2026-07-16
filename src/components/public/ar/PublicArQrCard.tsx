"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";

type PublicArQrCardProps = {
  url: string;
};

type QrState = {
  sourceUrl: string;
  dataUrl: string;
  error: string;
};

export function PublicArQrCard({ url }: PublicArQrCardProps) {
  const [qrState, setQrState] = useState<QrState>({
    sourceUrl: "",
    dataUrl: "",
    error: "",
  });

  useEffect(() => {
    if (!url) {
      return;
    }

    let cancelled = false;

    QRCode.toDataURL(url, {
      errorCorrectionLevel: "M",
      width: 512,
      margin: 1,
      color: {
        dark: "#171717",
        light: "#FFFFFF",
      },
    })
      .then((dataUrl) => {
        if (cancelled) {
          return;
        }

        setQrState({
          sourceUrl: url,
          dataUrl,
          error: "",
        });
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setQrState({
          sourceUrl: url,
          dataUrl: "",
          error: "QR 코드를 만들지 못했습니다.",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  const qrDataUrl = qrState.sourceUrl === url ? qrState.dataUrl : "";
  const qrError = qrState.sourceUrl === url ? qrState.error : "";

  return (
    <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.016)),#161616] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.24)] md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.34em] text-white/42">
            QR 연결
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#F7F1E8]">
            휴대폰으로 이어서 보기
          </h2>
        </div>

        <span className="inline-flex rounded-full border border-[#F37021]/25 bg-[#F37021]/10 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-[#FFB37B]">
          QR
        </span>
      </div>

      <p className="mt-4 text-sm leading-7 text-white/64">
        코드를 스캔하면 현재 작품의 모바일 AR 페이지가 열립니다.
      </p>

      <div className="mt-5 flex justify-center rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
        {qrDataUrl ? (
          <Image
            src={qrDataUrl}
            alt="작품 AR 페이지 QR 코드"
            width={240}
            height={240}
            unoptimized
            className="h-auto w-full max-w-[240px] rounded-[1rem] bg-white p-2"
          />
        ) : qrError ? (
          <div className="flex h-[220px] w-[220px] items-center justify-center rounded-[1rem] border border-white/10 bg-white/[0.04] text-sm text-white/50">
            {qrError}
          </div>
        ) : (
          <div className="flex h-[220px] w-[220px] items-center justify-center rounded-[1rem] border border-white/10 bg-white/[0.04] text-sm text-white/50">
            QR 코드를 준비하는 중입니다.
          </div>
        )}
      </div>
    </section>
  );
}
