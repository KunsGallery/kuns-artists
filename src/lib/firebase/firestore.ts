import {
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./client";

export type ArtistDoc = {
  id: string;
  slug?: string;
  name?: string;
  nameKo?: string;
  email?: string;
  type?: string;
  status?: string;
  tagline?: string;
  bio?: string;
  profileImageUrl?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export async function getArtistProfileByUid(uid: string): Promise<ArtistDoc | null> {
  const ref = doc(db, "artists", uid);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) return null;

  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as ArtistDoc;
}

export async function updateArtistProfile(
  uid: string,
  payload: {
    name?: string;
    nameKo?: string;
    tagline?: string;
    bio?: string;
    profileImageUrl?: string;
  }
) {
  const ref = doc(db, "artists", uid);

  await updateDoc(ref, {
    ...payload,
    updatedAt: serverTimestamp(),
  });
}