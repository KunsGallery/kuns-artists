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
      width: 360,
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
    <section className="rounded-[1.75rem] border border-black/8 bg-white p-5 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
            QR Access
          </p>
          <h3 className="mt-3 text-[1.5rem] font-medium tracking-[-0.03em] text-neutral-950">
            Scan on mobile
          </h3>
        </div>

        <span className="text-sm text-neutral-400">AR</span>
      </div>

      <p className="mt-5 text-sm leading-7 text-neutral-600">
        데스크탑에서는 QR을 통해 모바일 페이지로 이동한 뒤, 기기 환경에 맞는 AR
        흐름으로 바로 연결됩니다.
      </p>

      <div className="mt-6 flex justify-center rounded-[1.5rem] bg-[#f7f6f2] p-5">
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt="QR Code"
            className="h-[230px] w-[230px] rounded-[1rem] bg-white p-2"
          />
        ) : (
          <div className="flex h-[230px] w-[230px] items-center justify-center rounded-[1rem] bg-white text-sm text-neutral-500">
            QR 생성 중...
          </div>
        )}
      </div>

      <div className="mt-5 rounded-[1.25rem] bg-[#f7f6f2] px-4 py-4 text-xs leading-6 text-neutral-500 break-all">
        {url}
      </div>
    </section>
  );
}