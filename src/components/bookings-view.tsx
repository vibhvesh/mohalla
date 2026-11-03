"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "@/components/session";
import { Banner, Button, EmptyState, StatusPill } from "@/components/ui";
import { api } from "@/lib/client";
import { formatInr } from "@/lib/money";
import { sportLabel } from "@/lib/sports";
import type { BookingDto } from "@/lib/types";

export function BookingsView() {
  const { user, loading } = useSession();
  const [bookings, setBookings] = useState<BookingDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  function load() {
    api<{ bookings: BookingDto[] }>("/api/bookings")
      .then((data) => setBookings(data.bookings))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load bookings"));
  }

  useEffect(() => {
    if (user) load();
  }, [user]);

  if (loading) return <p className="text-sm text-muted">Loading…</p>;
  if (!user) {
    return (
      <EmptyState
        title="Your bookings live here"
        body="Log in with your email or mobile number to request a slot and follow whether the ground accepted it."
        action={
          <Link href="/login?next=/bookings" className="inline-flex rounded-full bg-pitch px-4 py-2 text-sm font-semibold text-lime">
            Log in
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl text-pitch">My bookings</h1>
      {error ? <Banner>{error}</Banner> : null}
      {bookings.length === 0 ? (
        <EmptyState title="No bookings yet" body="When you request an hour, it shows up here as pending until the owner accepts." />
      ) : (
        bookings.map((booking) => (
          <article key={booking.id} className="space-y-2 rounded-3xl bg-card p-4 ring-1 ring-line">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl text-pitch">{booking.venueName}</h2>
                <p className="text-sm text-muted">
                  {sportLabel(booking.sport)} · {booking.date} · {booking.startTime}–{booking.endTime}
                </p>
              </div>
              <StatusPill status={booking.status} />
            </div>
            <p className="text-sm font-semibold">
              {formatInr(booking.amountInr)} · {booking.paymentStatus === "paid" ? "Paid online" : booking.paymentStatus === "pending" ? "Payment unfinished" : "Pay at venue"}
            </p>
            {booking.status === "pending" || booking.status === "accepted" ? (
              <Button
                variant="ghost"
                type="button"
                onClick={() => {
                  api(`/api/bookings/${booking.id}`, { method: "PATCH", body: JSON.stringify({ action: "cancel" }) })
                    .then(load)
                    .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not cancel"));
                }}
              >
                Cancel
              </Button>
            ) : null}
          </article>
        ))
      )}
    </div>
  );
}
