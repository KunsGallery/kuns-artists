import type { Work } from "@/types/work";

export const works: Work[] = [
  {
    slug: "jessup-choi-sample-01",
    artistSlug: "jessup-choi",
    artistName: "Jessup Choi",
    title: "Sample Work 01",
    year: "2026",
    medium: "Mixed Media on Canvas",
    dimensions: "130.3 x 162.2 cm",
    description:
      "Jessup Choi의 AR 기능 테스트용 샘플 작품입니다. 추후 실제 작품명과 모델 파일로 교체하면 됩니다.",
    coverImage: "/images/works/jessup-choi-sample-01.jpg",
    modelGlb: "/models/jessup-choi-sample-01.glb",
    modelUsdz: "/models/jessup-choi-sample-01.usdz",
    widthCm: 162.2,
    heightCm: 130.3,
    depthCm: 4,
  },
  {
    slug: "jung-boram-sample-01",
    artistSlug: "jung-boram",
    artistName: "Jung Boram",
    title: "Sample Work 01",
    year: "2026",
    medium: "Ink and Mixed Media on Hanji",
    dimensions: "91.0 x 72.7 cm",
    description:
      "Jung Boram의 AR 기능 테스트용 샘플 작품입니다. 추후 실제 작품명과 모델 파일로 교체하면 됩니다.",
    coverImage: "/images/works/jung-boram-sample-01.jpg",
    modelGlb: "/models/jung-boram-sample-01.glb",
    modelUsdz: "/models/jung-boram-sample-01.usdz",
    widthCm: 72.7,
    heightCm: 91,
    depthCm: 4,
  },
  {
    slug: "kim-hwan-sample-01",
    artistSlug: "kim-hwan",
    artistName: "Kim Hwan",
    title: "Sample Work 01",
    year: "2026",
    medium: "Acrylic and Pigment on Canvas",
    dimensions: "210 x 91.0 cm",
    description:
      "Kim Hwan의 AR 기능 테스트용 샘플 작품입니다. 추후 실제 작품명과 모델 파일로 교체하면 됩니다.",
    coverImage: "/images/works/kim-hwan-sample-01.jpg",
    modelGlb: "/models/kim-hwan-sample-01.glb",
    modelUsdz: "/models/kim-hwan-sample-01.usdz",
    widthCm: 91,
    heightCm: 116.8,
    depthCm: 4,
  },
  {
    slug: "rosa-kang-sample-01",
    artistSlug: "rosa-kang",
    artistName: "Rosa Kang",
    title: "Sample Work 01",
    year: "2026",
    medium: "Acrylic on Canvas",
    dimensions: "116.8 x 91.0 cm",
    description:
      "Rosa Kang의 AR 기능 테스트용 샘플 작품입니다. 추후 실제 작품명과 모델 파일로 교체하면 됩니다.",
    coverImage: "/images/works/rosa-kang-sample-01.jpg",
    modelGlb: "/models/rosa-kang-sample-01.glb",
    modelUsdz: "/models/rosa-kang-sample-01.usdz",
    widthCm: 91,
    heightCm: 116.8,
    depthCm: 4,
  },
];

export function getWorkBySlug(slug: string) {
  return works.find((work) => work.slug === slug);
}
