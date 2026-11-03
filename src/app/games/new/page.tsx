import type { Metadata } from "next";
import { GameForm } from "@/components/game-form";

export const metadata: Metadata = { title: "Post a game" };

export default function NewGamePage() {
  return <GameForm />;
}
