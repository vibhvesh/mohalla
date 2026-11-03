import { Suspense } from "react";
import { VenueDetail } from "@/components/venue-detail";

export default function VenuePage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading ground…</p>}>
      <VenueDetail />
    </Suspense>
  );
}
