"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ListingForm, listingPayload, type ListingValues } from "@/components/listing-form";
import { Banner, Button, Field, StatusPill, inputClass } from "@/components/ui";
import { api } from "@/lib/client";
import { formatInr } from "@/lib/money";
import { sportLabel } from "@/lib/sports";
import { civilToday, type WeekHours } from "@/lib/slots";
import type { BookingDto, VenueDto } from "@/lib/types";

type Detail = {
  venue: VenueDto;
  blocks: { id: string; date: string; startTime: string; endTime: string; reason: string }[];
  bookings: BookingDto[];
};

export function OwnerManage() {
  const params = useParams<{ id: string }>();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [block, setBlock] = useState({ date: "", startTime: "12:00", endTime: "14:00", reason: "Maintenance" });

  const load = useCallback(() => {
    api<Detail>(`/api/owner/venues/${params.id}`)
      .then((data) => {
        setDetail(data);
        setBlock((current) => ({ ...current, date: current.date || civilToday(data.venue.timezone) }));
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load this ground"));
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (error && !detail) return <Banner>{error}</Banner>;
  if (!detail) return <p className="text-sm text-muted">Loading…</p>;

  const initial: ListingValues = {
    name: detail.venue.name,
    description: detail.venue.description,
    address: detail.venue.address,
    area: detail.venue.area,
    city: detail.venue.city,
    lat: detail.venue.lat,
    lng: detail.venue.lng,
    sports: detail.venue.sports,
    hourlyPrice: detail.venue.hourlyPrice?.toString() ?? "",
    photos: detail.venue.photos.join("\n"),
    contactPhone: detail.venue.contactPhone ?? "",
    contactEmail: detail.venue.contactEmail ?? "",
    openingHours: (detail.venue.openingHours ?? {
      sun: { closed: false, open: "06:00", close: "23:00" },
      mon: { closed: false, open: "06:00", close: "23:00" },
      tue: { closed: false, open: "06:00", close: "23:00" },
      wed: { closed: false, open: "06:00", close: "23:00" },
      thu: { closed: false, open: "06:00", close: "23:00" },
      fri: { closed: false, open: "06:00", close: "23:00" },
      sat: { closed: false, open: "06:00", close: "23:00" },
    }) as WeekHours,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link href="/owner" className="text-sm font-semibold text-pitch">
          ← Host
        </Link>
        <Link href={`/venues/${detail.venue.id}`} className="text-sm font-semibold text-pitch">
          View public page
        </Link>
      </div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-4xl text-pitch">{detail.venue.name}</h1>
        <Button
          variant="ghost"
          type="button"
          onClick={() => {
            api(`/api/venues/${detail.venue.id}`, {
              method: "PATCH",
              body: JSON.stringify({ active: !detail.venue.active }),
            }).then(load);
          }}
        >
          {detail.venue.active ? "Pause bookings" : "Resume bookings"}
        </Button>
      </div>
      {saved ? <Banner tone="info">Saved.</Banner> : null}
      {error ? <Banner>{error}</Banner> : null}
      <ListingForm
        initial={initial}
        submitLabel="Save changes"
        onSubmit={async (values) => {
          await api(`/api/venues/${detail.venue.id}`, {
            method: "PATCH",
            body: JSON.stringify(listingPayload(values)),
          });
          setSaved(true);
          load();
        }}
      />

      <section className="space-y-3 rounded-3xl bg-card p-4 ring-1 ring-line">
        <h2 className="font-display text-2xl text-pitch">Block a slot</h2>
        <p className="text-sm text-muted">Blocked hours stay off the public grid. Existing bookings are left as they are.</p>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            api(`/api/venues/${detail.venue.id}/blocks`, { method: "POST", body: JSON.stringify(block) })
              .then(load)
              .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not block"));
          }}
        >
          <Field label="Date">
            <input type="date" className={inputClass} value={block.date} onChange={(event) => setBlock({ ...block, date: event.target.value })} required />
          </Field>
          <Field label="Reason">
            <input className={inputClass} value={block.reason} onChange={(event) => setBlock({ ...block, reason: event.target.value })} />
          </Field>
          <Field label="From">
            <input type="time" step={3600} className={inputClass} value={block.startTime} onChange={(event) => setBlock({ ...block, startTime: event.target.value })} />
          </Field>
          <Field label="Until">
            <input type="time" step={3600} className={inputClass} value={block.endTime} onChange={(event) => setBlock({ ...block, endTime: event.target.value })} />
          </Field>
          <Button type="submit">Add block</Button>
        </form>
        {detail.blocks.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
            <span>
              {item.date} {item.startTime}–{item.endTime} {item.reason ? `· ${item.reason}` : ""}
            </span>
            <button
              type="button"
              className="font-semibold text-danger"
              onClick={() => api(`/api/venues/${detail.venue.id}/blocks/${item.id}`, { method: "DELETE" }).then(load)}
            >
              Remove
            </button>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-2xl text-pitch">Bookings</h2>
        {detail.bookings.length === 0 ? <p className="text-sm text-muted">No bookings yet.</p> : null}
        {detail.bookings.map((booking) => (
          <article key={booking.id} className="space-y-2 rounded-3xl bg-card p-4 ring-1 ring-line">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{booking.playerName}</h3>
                <p className="text-sm text-muted">
                  {sportLabel(booking.sport)} · {booking.date} {booking.startTime}–{booking.endTime} · {formatInr(booking.amountInr)}
                </p>
                {booking.playerPhone ? <p className="text-sm">{booking.playerPhone}</p> : null}
              </div>
              <StatusPill status={booking.status} />
            </div>
            {booking.status === "pending" ? (
              <div className="flex gap-2">
                <Button type="button" onClick={() => api(`/api/owner/bookings/${booking.id}`, { method: "PATCH", body: JSON.stringify({ action: "accept" }) }).then(load)}>
                  Accept
                </Button>
                <Button variant="ghost" type="button" onClick={() => api(`/api/owner/bookings/${booking.id}`, { method: "PATCH", body: JSON.stringify({ action: "reject" }) }).then(load)}>
                  Reject
                </Button>
              </div>
            ) : null}
          </article>
        ))}
      </section>
    </div>
  );
}
