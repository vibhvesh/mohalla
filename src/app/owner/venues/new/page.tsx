import type { Metadata } from "next";
import { NewVenue } from "@/components/new-venue";

export const metadata: Metadata = { title: "List a ground" };

export default function NewVenuePage() {
  return <NewVenue />;
}
