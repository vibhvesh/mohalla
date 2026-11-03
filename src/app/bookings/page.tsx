import type { Metadata } from "next";
import { BookingsView } from "@/components/bookings-view";

export const metadata: Metadata = { title: "My bookings" };

export default function BookingsPage() {
  return <BookingsView />;
}
