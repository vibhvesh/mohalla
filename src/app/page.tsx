import type { Metadata } from "next";
import { Explore } from "@/components/explore";

export const metadata: Metadata = {
  title: "Find a ground",
};

export default function HomePage() {
  return <Explore />;
}
