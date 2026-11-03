"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCity } from "@/components/city";
import { ListingForm, emptyListing, listingPayload } from "@/components/listing-form";
import { useSession } from "@/components/session";
import { api } from "@/lib/client";
import type { VenueDto } from "@/lib/types";

export function NewVenue() {
  const { user, loading } = useSession();
  const { city, center } = useCity();
  const router = useRouter();

  if (loading) return <p className="text-sm text-muted">Loading…</p>;
  if (!user) {
    return (
      <p className="text-sm">
        <Link href="/login?next=/owner/venues/new" className="font-semibold text-pitch">
          Log in
        </Link>{" "}
        before listing a ground.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <Link href="/owner" className="text-sm font-semibold text-pitch">
        ← Host
      </Link>
      <h1 className="font-display text-4xl text-pitch">List a ground</h1>
      <p className="max-w-xl text-sm leading-6 text-muted">
        This creates a real listing under your account. It is bookable as soon as you save hours and a price.
      </p>
      <ListingForm
        initial={emptyListing(city, center)}
        submitLabel="Publish ground"
        onSubmit={async (values) => {
          const data = await api<{ venue: VenueDto }>("/api/venues", {
            method: "POST",
            body: JSON.stringify(listingPayload(values)),
          });
          router.push(`/owner/venues/${data.venue.id}`);
        }}
      />
    </div>
  );
}
