import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./client";

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

export async function getArtistDocByUid(uid: string) {
  const artistRef = doc(db, "artists", uid);
  const snapshot = await getDoc(artistRef);

  if (!snapshot.exists()) return null;

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

export async function assertAllowedArtist(user: User) {
  if (!user.email) {
    throw new Error("이 계정에는 이메일 정보가 없습니다.");
  }

  const artistDoc = await getArtistDocByUid(user.uid);

  if (!artistDoc) {
    throw new Error("등록되지 않은 작가 계정입니다.");
  }

  const artistEmail =
    typeof artistDoc.email === "string" ? artistDoc.email.toLowerCase() : "";

  if (artistEmail !== user.email.toLowerCase()) {
    throw new Error("이메일 정보가 일치하지 않습니다.");
  }

  return artistDoc;
}