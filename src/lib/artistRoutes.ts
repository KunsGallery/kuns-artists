import type { ArtistRole } from "@/lib/firebase/firestore";

export function getArtistHomePath(role?: ArtistRole) {
  return role === "admin" ? "/admin" : "/artist/dashboard";
}
