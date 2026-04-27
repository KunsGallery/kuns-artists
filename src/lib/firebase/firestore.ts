import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "./client";
import type { AllowedArtistSeed } from "@/lib/artistAccess";

export type ArtistRole = "admin" | "artist";
export type ArtistType = "represented" | "project";
export type ArtistStatus = "active" | "inactive";

export type ArtistDoc = {
  id: string;
  slug?: string;
  name?: string;
  nameKo?: string;
  email?: string;
  type?: ArtistType;
  status?: ArtistStatus;
  role?: ArtistRole;
  tagline?: string;
  bio?: string;
  bioEn?: string;
  location?: string;
  profileImageUrl?: string;
  instagramUrl?: string;
  youtubeUrl?: string;
  cvUrl?: string;
  artsyUrl?: string;
  websiteUrl?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type ArtistProfileUpdatePayload = {
  name?: string;
  nameKo?: string;
  tagline?: string;
  bio?: string;
  bioEn?: string;
  location?: string;
  profileImageUrl?: string;
  instagramUrl?: string;
  youtubeUrl?: string;
  cvUrl?: string;
  artsyUrl?: string;
  websiteUrl?: string;
};

export async function getArtistProfileByUid(
  uid: string
): Promise<ArtistDoc | null> {
  const ref = doc(db, "artists", uid);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) return null;

  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as ArtistDoc;
}

export async function createArtistProfileFromSeed(
  uid: string,
  seed: AllowedArtistSeed
): Promise<ArtistDoc> {
  const ref = doc(db, "artists", uid);

  const payload = {
    ...seed,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(ref, payload);

  return {
    id: uid,
    ...payload,
  };
}

export async function updateArtistProfile(
  uid: string,
  payload: ArtistProfileUpdatePayload
) {
  const ref = doc(db, "artists", uid);

  await updateDoc(ref, {
    ...payload,
    updatedAt: serverTimestamp(),
  });
}