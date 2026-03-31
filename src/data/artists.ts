export type ArtistType = "represented" | "project";

export type Artist = {
  slug: string;
  name: string;
  nameKo?: string;
  type: ArtistType;
  tagline?: string;
  bio?: string;
  profileImage?: string;
};

export const artists: Artist[] = [
  {
    slug: "jessup-choi",
    name: "Jessup Choi",
    nameKo: "최재섭",
    type: "represented",
    tagline: "억압된 감정과 자유로운 표현의 흔적을 회화로 풀어내는 작가",
    bio: "감정의 자유로운 표출과 내면의 응축된 상태를 시각적으로 풀어내며, 화면 안에서 긴장과 흐름을 동시에 구축합니다.",
    profileImage: "/images/artists/jessup-choi.jpg",
  },
  {
    slug: "rosa-kang",
    name: "Rosa Kang",
    nameKo: "강로사",
    type: "represented",
    tagline: "불안과 왜곡된 시선을 재료로 삼아 유동적인 감각을 구축하는 작가",
    bio: "루틴과 반복을 기반으로 작업을 이어가며, 고정되지 않은 태도와 변화의 감각을 중심으로 회화의 결을 확장합니다.",
    profileImage: "/images/artists/rosa-kang.jpg",
  },
  {
    slug: "jung-boram",
    name: "Jung Boram",
    nameKo: "정보람",
    type: "represented",
    tagline: "감정과 흐름을 시각적 쓰기의 방식으로 전개하는 작가",
    bio: "반복되는 선, 번짐, 붓질의 리듬을 통해 문자와 기호를 넘어서는 감각적 흐름을 구축합니다.",
    profileImage: "/images/artists/jung-boram.jpg",
  },
  {
    slug: "kim-hwan",
    name: "Kim Hwan",
    nameKo: "김환",
    type: "represented",
    tagline: "빛과 색의 파장을 통해 행복과 내면의 의식을 시각화하는 작가",
    bio: "행복이라는 보편적이고도 깊은 주제를 바탕으로, 빛과 색의 파장을 통해 내면의 평온과 의식의 층위를 탐구합니다.",
    profileImage: "/images/artists/kim-hwan.jpg",
  },
];

export function getArtistBySlug(slug: string) {
  return artists.find((artist) => artist.slug === slug);
}

export function getRepresentedArtists() {
  return artists.filter((artist) => artist.type === "represented");
}

export function getProjectArtists() {
  return artists.filter((artist) => artist.type === "project");
}