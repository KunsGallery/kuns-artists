import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "KÜN’S Gallery Artists",
    template: "%s | KÜN’S Gallery Artists",
  },
  description:
    "KÜN’S Gallery artist archive and AR viewing system for represented artists and selected works.",
  applicationName: "KÜN’S Gallery Artists",
  keywords: [
    "KÜN’S Gallery",
    "Kuns Gallery",
    "Artists",
    "Contemporary Art",
    "AR Viewing",
    "Gallery Archive",
  ],
  authors: [{ name: "KÜN’S Gallery" }],
  creator: "KÜN’S Gallery",
  publisher: "KÜN’S Gallery",
  metadataBase: new URL("https://kuns-artists.netlify.app"),
  openGraph: {
    title: "KÜN’S Gallery Artists",
    description:
      "Artist archive and AR viewing system for KÜN’S Gallery represented artists.",
    siteName: "KÜN’S Gallery Artists",
    type: "website",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: "KÜN’S Gallery Artists",
    description:
      "Artist archive and AR viewing system for KÜN’S Gallery represented artists.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#f5f3ee",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko-KR" className="h-full bg-[#f5f3ee]">
      <body className="min-h-full bg-[#f5f3ee] text-neutral-950 antialiased">
        {children}
      </body>
    </html>
  );
}