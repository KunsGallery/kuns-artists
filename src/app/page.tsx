import type { Metadata } from "next";
import HomeArchiveWall from "@/components/public/HomeArchiveWall";

export const metadata: Metadata = {
  title: "KÜN’S Gallery Artists",
  description:
    "Represented artists and selected works from KÜN’S Gallery.",
};

export default function HomePage() {
  return <HomeArchiveWall />;
}
