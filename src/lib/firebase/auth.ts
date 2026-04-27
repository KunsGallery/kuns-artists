import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  User,
} from "firebase/auth";
import { auth } from "./client";
import {
  createArtistProfileFromSeed,
  getArtistProfileByUid,
} from "./firestore";
import { getAllowedArtistByEmail } from "@/lib/artistAccess";

const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: "select_account",
});

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function logout() {
  await signOut(auth);
}

export async function assertAllowedArtist(user: User) {
  if (!user.email) {
    throw new Error("이 계정에는 이메일 정보가 없습니다.");
  }

  const allowedArtist = getAllowedArtistByEmail(user.email);

  if (!allowedArtist) {
    throw new Error("등록되지 않은 작가 계정입니다.");
  }

  const existingArtistDoc = await getArtistProfileByUid(user.uid);

  if (existingArtistDoc) {
    return existingArtistDoc;
  }

  return await createArtistProfileFromSeed(user.uid, allowedArtist);
}