import type { Work } from "@/types/work";

export type PublicArViewport = "pending" | "mobile" | "desktop";

export type PublicArSource = "Firestore" | "Seed";

export type PublicArWork = Work & {
  id?: string;
};

export type PublicArLayoutProps = {
  work: PublicArWork;
  workHref: string;
  artistHref: string;
  publicArUrl: string;
  arMediaUrl: string;
  source: PublicArSource;
  debugMessage?: string;
  docentAudioEnabled: boolean;
  docentAudioUrl: string;
  docentAudioTitle: string;
  docentAudioDescription: string;
};
