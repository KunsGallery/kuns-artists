export type ArtistType = "represented" | "project";

export type ArtistLink = {
  instagram?: string;
  youtube?: string;
  cv?: string;
  artsy?: string;
};

export type ArtistArchiveItem = {
  title: string;
  subtitle?: string;
  image?: string;
  href?: string;
};

export type Artist = {
  slug: string;
  name: string;
  nameKo?: string;
  type: ArtistType;
  tagline?: string;
  bio?: string;
  bioEn?: string;
  location?: string;
  profileImage?: string;
  links?: ArtistLink;
  archives?: {
    exhibitions?: ArtistArchiveItem[];
    fairs?: ArtistArchiveItem[];
    texts?: ArtistArchiveItem[];
    media?: ArtistArchiveItem[];
  };
};

export const artists: Artist[] = [
  {
    slug: "jessup-choi",
    name: "Jessup Choi",
    nameKo: "최재섭",
    type: "represented",
    location: "Lives & works in Seoul, Korea",
    tagline: "억압된 감정과 자유로운 표현의 흔적을 회화로 풀어내는 작가",
    bio: "Jessup Choi는 억압된 감정과 내면의 응축된 상태를 화면 위에서 직면하게 만드는 작가입니다. 그의 작업은 감정을 정제해 설명하기보다, 밀도와 흔적, 충돌과 여백의 방식으로 감각하게 만듭니다. 화면 안에서 긴장과 흐름이 동시에 생성되며, 그것은 단순한 이미지가 아니라 감정의 구조에 가까운 상태로 남습니다.",
    bioEn:
      "Jessup Choi explores compressed emotion and inner tension through painting. Rather than translating feeling into a fixed narrative, he builds a visual field where traces, density, pressure, and release coexist. His work holds the viewer in a suspended state between restraint and eruption, allowing emotion to be felt as structure rather than simply described.",
    profileImage: "/images/artists/jessup-choi.jpg",
    links: {
      instagram: "#",
      cv: "#",
      artsy: "#",
    },
    archives: {
      exhibitions: [
        { title: "Four Seasons", subtitle: "Solo Exhibition", image: "/images/artists/jessup-choi.jpg" },
        { title: "Proposal Viewing", subtitle: "KÜN’S GALLERY", image: "/images/artists/jessup-choi.jpg" },
      ],
      fairs: [
        { title: "DKAF 2025", subtitle: "KÜN’S GALLERY", image: "/images/artists/jessup-choi.jpg" },
      ],
      texts: [
        { title: "Artist Note", subtitle: "Writing & Statement", image: "/images/artists/jessup-choi.jpg" },
      ],
      media: [
        { title: "Interview Clip", subtitle: "Studio & Process", image: "/images/artists/jessup-choi.jpg" },
      ],
    },
  },
  {
    slug: "jung-boram",
    name: "Jung Boram",
    nameKo: "정보람",
    type: "represented",
    location: "Lives & works in Seoul, Korea",
    tagline: "감정과 흐름을 시각적 쓰기의 방식으로 전개하는 작가",
    bio: "정보람은 문자와 기호를 넘어, 감정과 흐름의 시각적 언어로서 ‘쓰기’의 개념을 확장하는 작가입니다. 그녀의 작업은 단순히 텍스트의 의미를 전달하는 것을 넘어, 붓질의 움직임과 감정의 유동성을 포착하며 캘리그라피를 역동적이고 유기적인 예술 표현으로 변화시킵니다. 반복되는 선과 번짐, 손으로 염색한 한지의 질감은 쓰기를 기록이 아닌 감각적 경험으로 전환시킵니다.",
    bioEn:
      "Jung Boram expands the concept of writing beyond symbols and characters, transforming it into a visual language of emotion and flow. Her work captures the movement of brushstrokes and the fluidity of feeling, turning calligraphy into a dynamic and organic artistic expression. Repetition, absorption, and the tactile presence of hand-dyed hanji create a field where writing is experienced not as text alone, but as rhythm and sensation.",
    profileImage: "/images/artists/jung-boram.jpg",
    links: {
      instagram: "#",
      youtube: "#",
      cv: "#",
      artsy: "#",
    },
    archives: {
      exhibitions: [
        { title: "Selected Exhibition 01", subtitle: "KÜN’S GALLERY", image: "/images/artists/jung-boram.jpg" },
        { title: "Selected Exhibition 02", subtitle: "Solo", image: "/images/artists/jung-boram.jpg" },
        { title: "Selected Exhibition 03", subtitle: "Group", image: "/images/artists/jung-boram.jpg" },
      ],
      fairs: [
        { title: "Art Fair 01", subtitle: "Booth Presentation", image: "/images/artists/jung-boram.jpg" },
        { title: "Art Fair 02", subtitle: "KÜN’S GALLERY", image: "/images/artists/jung-boram.jpg" },
      ],
      texts: [
        { title: "Press 01", subtitle: "Article / Interview", image: "/images/artists/jung-boram.jpg" },
        { title: "Press 02", subtitle: "Critical Text", image: "/images/artists/jung-boram.jpg" },
      ],
      media: [
        { title: "Studio Film", subtitle: "Process Clip", image: "/images/artists/jung-boram.jpg" },
      ],
    },
  },
  {
    slug: "kim-hwan",
    name: "Kim Hwan",
    nameKo: "김환",
    type: "represented",
    location: "Lives & works in Seoul, Korea",
    tagline: "빛과 색의 파장을 통해 행복과 내면의 의식을 시각화하는 작가",
    bio: "김환은 행복이라는 보편적이면서도 깊은 주제를 빛과 색의 파장으로 시각화하는 작가입니다. 그의 작업은 보이는 형상 너머의 진동과 감각을 통해 내면의 평온과 의식의 층위를 환기합니다. 다층적인 재료와 축적된 표면은 감상자를 화면 앞에 머물게 하며, 시각을 넘어선 정서적 울림을 만들어냅니다.",
    bioEn:
      "Kim Hwan visualizes happiness and inner consciousness through waves of light and color. His paintings seek not only visual beauty but also a meditative resonance that unfolds in layered surfaces and subtle vibration. Through accumulated materials and chromatic movement, his work invites the viewer into a deeper state of reflection and calm.",
    profileImage: "/images/artists/kim-hwan.jpg",
    links: {
      instagram: "#",
      cv: "#",
      artsy: "#",
    },
    archives: {
      exhibitions: [
        { title: "Mind Spectrum", subtitle: "Solo Exhibition", image: "/images/artists/kim-hwan.jpg" },
        { title: "Mind Spectrum_Tangle", subtitle: "New Series", image: "/images/artists/kim-hwan.jpg" },
      ],
      fairs: [
        { title: "Art Fair Presentation", subtitle: "KÜN’S GALLERY", image: "/images/artists/kim-hwan.jpg" },
      ],
      texts: [
        { title: "Artist Statement", subtitle: "Philosophy & Process", image: "/images/artists/kim-hwan.jpg" },
      ],
      media: [
        { title: "Interview", subtitle: "Exhibition Feature", image: "/images/artists/kim-hwan.jpg" },
      ],
    },
  },
  {
    slug: "rosa-kang",
    name: "Rosa Kang",
    nameKo: "강로사",
    type: "represented",
    location: "Lives & works in Seoul, Korea",
    tagline: "불안과 왜곡된 시선을 재료로 삼아 유동적인 감각을 구축하는 작가",
    bio: "Rosa Kang은 루틴과 반복 속에서 감정의 균열과 인식의 흔들림을 포착하는 작가입니다. 작업은 명확한 결론보다는 감각의 변형과 지속에 가깝고, 고정되지 않은 시선과 태도는 화면 안에서 끊임없이 미세한 긴장을 만들어냅니다. 그녀의 회화는 불안과 왜곡을 부정하지 않고, 그것을 재료 삼아 새로운 조형 감각으로 전환합니다.",
    bioEn:
      "Rosa Kang builds her work from repetition, instability, and the subtle fractures of perception. Rather than arriving at fixed conclusions, her paintings remain in motion, holding tension through shifting attitudes and fluid forms. Anxiety and distortion are not erased but transformed into the very material language of the work.",
    profileImage: "/images/artists/rosa-kang.jpg",
    links: {
      instagram: "#",
      cv: "#",
      artsy: "#",
    },
    archives: {
      exhibitions: [
        { title: "Solo Presentation", subtitle: "KÜN’S GALLERY", image: "/images/artists/rosa-kang.jpg" },
      ],
      fairs: [
        { title: "Fair Archive", subtitle: "Selected Booth", image: "/images/artists/rosa-kang.jpg" },
      ],
      texts: [
        { title: "Artist Essay", subtitle: "Writing", image: "/images/artists/rosa-kang.jpg" },
      ],
      media: [
        { title: "Conversation", subtitle: "Recorded Interview", image: "/images/artists/rosa-kang.jpg" },
      ],
    },
  },
];

export function getArtistBySlug(slug: string) {
  return artists.find((artist) => artist.slug === slug);
}

export function getRepresentedArtists() {
  return artists
    .filter((artist) => artist.type === "represented")
    .sort((a, b) => a.name.localeCompare(b.name));
}