"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

type QRCodePanelProps = {
  url: string;
};

export default function QRCodePanel({ url }: QRCodePanelProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    QRCode.toDataURL(url, {
      width: 320,
      margin: 2,
    })
      .then((dataUrl: string) => {
        if (mounted) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (mounted) setQrDataUrl("");
      });

    return () => {
      mounted = false;
    };
  }, [url]);

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015)),#151515] p-5 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-white/42">
            QR Access
          </p>
          <h3 className="mt-3 text-[1.5rem] font-medium tracking-[-0.03em] text-[#F7F1E8]">
            Scan to continue in the mobile viewing room.
          </h3>
        </div>

        <span className="text-sm text-white/38">AR</span>
      </div>

      <p className="mt-5 text-sm leading-7 text-white/62">
        Desktop users can scan the QR code to continue on mobile. The layout stays restrained so the artwork remains the focus.
      </p>

      <div className="mt-6 flex justify-center rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt="QR Code"
            className="h-[210px] w-[210px] rounded-[1rem] bg-white p-2"
          />
        ) : (
          <div className="flex h-[210px] w-[210px] items-center justify-center rounded-[1rem] border border-white/10 bg-white/[0.04] text-sm text-white/50">
            Generating QR...
          </div>
        )}
      </div>

      <div className="mt-5 rounded-[1.25rem] border border-white/10 bg-white/[0.03] px-4 py-4 text-xs leading-6 text-white/45 break-all">
        {url}
      </div>
    </section>
  );
}
