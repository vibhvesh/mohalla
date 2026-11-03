import type { Metadata } from "next";
import { OwnerHome } from "@/components/owner-home";

export const metadata: Metadata = { title: "Host" };

export default function OwnerPage() {
  return <OwnerHome />;
}
