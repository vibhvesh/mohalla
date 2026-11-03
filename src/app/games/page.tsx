import type { Metadata } from "next";
import { GamesView } from "@/components/games-view";

export const metadata: Metadata = { title: "Pickup games" };

export default function GamesPage() {
  return <GamesView />;
}
