export type AllowedArtistRole = "admin" | "artist";
export type AllowedArtistType = "represented" | "project";
export type AllowedArtistStatus = "active" | "inactive";

export type AllowedArtistSeed = {
  email: string;
  slug: string;
  name: string;
  nameKo: string;
  type: AllowedArtistType;
  status: AllowedArtistStatus;
  role: AllowedArtistRole;
  tagline: string;
  bio: string;
  bioEn: string;
  location: string;
  profileImageUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
  cvUrl: string;
  artsyUrl: string;
  websiteUrl: string;
};

export const allowedArtistsByEmail: Record<string, AllowedArtistSeed> = {
  "gallerykuns@gmail.com": {
    email: "gallerykuns@gmail.com",
    slug: "kim-hwan",
    name: "Kim Hwan",
    nameKo: "김환",
    type: "represented",
    status: "active",
    role: "admin",
    tagline: "빛과 색의 파장을 통해 행복과 내면의 의식을 시각화하는 작가",
    bio: "",
    bioEn: "",
    location: "Lives & works in Seoul, Korea",
    profileImageUrl: "",
    instagramUrl: "",
    youtubeUrl: "",
    cvUrl: "",
    artsyUrl: "",
    websiteUrl: "",
  },

  "boramine5255@gmail.com": {
    email: "boramine5255@gmail.com",
    slug: "jung-boram",
    name: "Jung Boram",
    nameKo: "정보람",
    type: "represented",
    status: "active",
    role: "artist",
    tagline: "감정과 흐름을 시각적 쓰기의 방식으로 전개하는 작가",
    bio: "",
    bioEn: "",
    location: "Lives & works in Uijeongbu, Korea",
    profileImageUrl: "",
    instagramUrl: "",
    youtubeUrl: "",
    cvUrl: "",
    artsyUrl: "",
    websiteUrl: "",
  },

  "wwwrosaweb@gmail.com": {
    email: "wwwrosaweb@gmail.com",
    slug: "rosa-kang",
    name: "Rosa Kang",
    nameKo: "강로사",
    type: "represented",
    status: "active",
    role: "artist",
    tagline: "불안과 왜곡된 시선을 재료로 삼아 유동적인 감각을 구축하는 작가",
    bio: "",
    bioEn: "",
    location: "Lives & works in Daejeon, Korea",
    profileImageUrl: "",
    instagramUrl: "",
    youtubeUrl: "",
    cvUrl: "",
    artsyUrl: "",
    websiteUrl: "",
  },

  "chlwotjq127@gmail.com": {
    email: "chlwotjq127@gmail.com",
    slug: "jessup-choi",
    name: "Jessup Choi",
    nameKo: "최재섭",
    type: "represented",
    status: "active",
    role: "artist",
    tagline: "억압된 감정과 자유로운 표현의 흔적을 회화로 풀어내는 작가",
    bio: "",
    bioEn: "",
    location: "Lives & works in Seoul, Korea",
    profileImageUrl: "",
    instagramUrl: "",
    youtubeUrl: "",
    cvUrl: "",
    artsyUrl: "",
    websiteUrl: "",
  },
};

export function getAllowedArtistByEmail(email?: string | null) {
  if (!email) return null;

  return allowedArtistsByEmail[email.toLowerCase()] || null;
}