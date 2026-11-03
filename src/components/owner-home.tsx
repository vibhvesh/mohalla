"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "@/components/session";
import { Banner, Button, EmptyState, StatusPill } from "@/components/ui";
import { api } from "@/lib/client";
import { formatInr } from "@/lib/money";
import { sportLabel } from "@/lib/sports";
import type { BookingDto } from "@/lib/types";

type Overview = {
  venues: {
    id: string;
    name: string;
    area: string;
    city: string;
    active: boolean;
    hourlyPrice: number | null;
    sports: string[];
  }[];
  pending: BookingDto[];
  earnings: {
    monthGrossInr: number;
    monthCount: number;
    allTimeGrossInr: number;
    allTimeCount: number;
    onlineCollectedInr: number;
    payAtVenueInr: number;
    pendingCount: number;
  };
};

export function OwnerHome() {
  const { user, loading } = useSession();
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    api<Overview>("/api/owner/overview")
      .then(setData)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load your grounds"));
  }

  useEffect(() => {
    if (user) load();
  }, [user]);

  if (loading) return <p className="text-sm text-muted">Loading…</p>;
  if (!user) {
    return (
      <EmptyState
        title="List the ground you run"
        body="Owners use the same login. Add a pin, sports, photos, an hourly price, and opening hours."
        action={
          <Link href="/login?next=/owner" className="inline-flex rounded-full bg-pitch px-4 py-2 text-sm font-semibold text-lime">
            Log in
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pitch-soft">Host</p>
          <h1 className="font-display text-4xl text-pitch">Your grounds</h1>
        </div>
        <Link href="/owner/venues/new" className="rounded-full bg-pitch px-4 py-2 text-sm font-semibold text-lime">
          Add
        </Link>
      </div>
      {error ? <Banner>{error}</Banner> : null}
      {data ? (
        <section className="grid grid-cols-2 gap-3">
          <Stat label="This month" value={formatInr(data.earnings.monthGrossInr)} detail={`${data.earnings.monthCount} accepted`} />
          <Stat label="All time" value={formatInr(data.earnings.allTimeGrossInr)} detail={`${data.earnings.allTimeCount} accepted`} />
          <Stat label="Pay at venue" value={formatInr(data.earnings.payAtVenueInr)} detail="Expected on site" />
          <Stat label="Paid online" value={formatInr(data.earnings.onlineCollectedInr)} detail="Razorpay" />
        </section>
      ) : null}
      <section className="space-y-3">
        <h2 className="font-display text-2xl text-pitch">Requests to accept</h2>
        {data && data.pending.length === 0 ? <p className="text-sm text-muted">No pending bookings.</p> : null}
        {data?.pending.map((booking) => (
          <article key={booking.id} className="space-y-2 rounded-3xl bg-card p-4 ring-1 ring-line">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{booking.venueName}</h3>
                <p className="text-sm text-muted">
                  {booking.playerName} · {sportLabel(booking.sport)} · {booking.date} {booking.startTime}–{booking.endTime}
                </p>
                <p className="text-sm font-semibold">{formatInr(booking.amountInr)}</p>
              </div>
              <StatusPill status="pending" />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() =>
                  api(`/api/owner/bookings/${booking.id}`, { method: "PATCH", body: JSON.stringify({ action: "accept" }) })
                    .then(load)
                    .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not accept"))
                }
              >
                Accept
              </Button>
              <Button
                variant="ghost"
                type="button"
                onClick={() =>
                  api(`/api/owner/bookings/${booking.id}`, { method: "PATCH", body: JSON.stringify({ action: "reject" }) })
                    .then(load)
                    .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not reject"))
                }
              >
                Reject
              </Button>
            </div>
          </article>
        ))}
      </section>
      <section className="space-y-3">
        <h2 className="font-display text-2xl text-pitch">Listings</h2>
        {data && data.venues.length === 0 ? (
          <EmptyState title="No grounds yet" body="Add your first turf. Players will see it on the map as soon as it is saved." />
        ) : null}
        {data?.venues.map((venue) => (
          <Link key={venue.id} href={`/owner/venues/${venue.id}`} className="block rounded-3xl bg-card p-4 ring-1 ring-line">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-2xl text-pitch">{venue.name}</h3>
                <p className="text-sm text-muted">
                  {[venue.area, venue.city].filter(Boolean).join(" · ")} · {venue.sports.map(sportLabel).join(", ")}
                </p>
              </div>
              <span className="text-sm font-semibold">{venue.active ? formatInr(venue.hourlyPrice) : "Paused"}</span>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-3xl bg-card p-4 ring-1 ring-line">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl text-pitch">{value}</p>
      <p className="text-xs text-muted">{detail}</p>
    </div>
  );
}
