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
    return {
      ...existingArtistDoc,
      email: allowedArtist.email,
      slug: existingArtistDoc.slug ?? allowedArtist.slug,
      name: existingArtistDoc.name ?? allowedArtist.name,
      nameKo: existingArtistDoc.nameKo ?? allowedArtist.nameKo,
      type: allowedArtist.type,
      status: allowedArtist.status,
      role: allowedArtist.role,
      tagline: existingArtistDoc.tagline ?? allowedArtist.tagline,
      bio: existingArtistDoc.bio ?? allowedArtist.bio,
      bioEn: existingArtistDoc.bioEn ?? allowedArtist.bioEn,
      location: existingArtistDoc.location ?? allowedArtist.location,
      profileImageUrl:
        existingArtistDoc.profileImageUrl ?? allowedArtist.profileImageUrl,
      instagramUrl:
        existingArtistDoc.instagramUrl ?? allowedArtist.instagramUrl,
      youtubeUrl: existingArtistDoc.youtubeUrl ?? allowedArtist.youtubeUrl,
      cvUrl: existingArtistDoc.cvUrl ?? allowedArtist.cvUrl,
      artsyUrl: existingArtistDoc.artsyUrl ?? allowedArtist.artsyUrl,
      websiteUrl: existingArtistDoc.websiteUrl ?? allowedArtist.websiteUrl,
    };
  }

  return await createArtistProfileFromSeed(user.uid, allowedArtist);
}
