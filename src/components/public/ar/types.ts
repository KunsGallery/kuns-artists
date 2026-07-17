import type { PublicArWork } from "@/lib/publicArWork";
export type { PublicArWork } from "@/lib/publicArWork";
import type { WebXrSupportStatus } from "../webxr/useWebXrSupport";

export type PublicArViewport = "pending" | "mobile" | "desktop";

export type PublicArSource = "Firestore" | "Seed";

export type PublicArLayoutProps = {
  work: PublicArWork;
  workHref: string;
  artistHref: string;
  publicArUrl: string;
  quickLookUsdzUrl: string | null;
  webXrHref?: string;
  webXrSupportStatus?: WebXrSupportStatus;
  arMediaUrl: string;
  source: PublicArSource;
  debugMessage?: string;
  docentAudioEnabled: boolean;
  docentAudioUrl: string;
  docentAudioTitle: string;
  docentAudioDescription: string;
};
