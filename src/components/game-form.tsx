"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCity } from "@/components/city";
import { useSession } from "@/components/session";
import { Banner, Button, Field, inputClass } from "@/components/ui";
import { api } from "@/lib/client";
import { SPORTS } from "@/lib/sports";
import { civilToday } from "@/lib/slots";
import type { VenueDto } from "@/lib/types";
import Link from "next/link";

export function GameForm() {
  const { user, loading } = useSession();
  const { city, timezone } = useCity();
  const router = useRouter();
  const [venues, setVenues] = useState<VenueDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState({
    title: "Need players",
    sport: "cricket",
    area: "",
    date: civilToday(timezone),
    time: "19:00",
    playersNeeded: "4",
    note: "",
    venueId: "",
  });

  useEffect(() => {
    api<{ venues: VenueDto[] }>(`/api/venues?city=${encodeURIComponent(city)}`)
      .then((data) => setVenues(data.venues.filter((venue) => venue.claimed)))
      .catch(() => setVenues([]));
  }, [city]);

  if (loading) return <p className="text-sm text-muted">Loading…</p>;
  if (!user) {
    return (
      <p className="text-sm">
        <Link href="/login?next=/games/new" className="font-semibold text-pitch">
          Log in
        </Link>{" "}
        to post a pickup game.
      </p>
    );
  }

  return (
    <form
      className="mx-auto max-w-lg space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        api("/api/games", {
          method: "POST",
          body: JSON.stringify({
            ...form,
            city,
            playersNeeded: Number(form.playersNeeded),
            venueId: form.venueId || null,
          }),
        })
          .then(() => router.push("/games"))
          .catch((err: unknown) => {
            setError(err instanceof Error ? err.message : "Could not post");
            setPending(false);
          });
      }}
    >
      <h1 className="font-display text-4xl text-pitch">Post a game</h1>
      <p className="text-sm text-muted">Example: need 4 for cricket at 7pm in {city}.</p>
      <Field label="Title">
        <input className={inputClass} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
      </Field>
      <Field label="Sport">
        <select className={inputClass} value={form.sport} onChange={(event) => setForm({ ...form, sport: event.target.value })}>
          {SPORTS.map((sport) => (
            <option key={sport.id} value={sport.id}>
              {sport.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Area">
        <input className={inputClass} value={form.area} onChange={(event) => setForm({ ...form, area: event.target.value })} required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date">
          <input type="date" className={inputClass} value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required />
        </Field>
        <Field label="Time">
          <input type="time" step={3600} className={inputClass} value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} required />
        </Field>
      </div>
      <Field label="Players still needed">
        <input
          className={inputClass}
          inputMode="numeric"
          value={form.playersNeeded}
          onChange={(event) => setForm({ ...form, playersNeeded: event.target.value.replace(/[^\d]/g, "") })}
          required
        />
      </Field>
      <Field label="Ground" hint="Optional. Only claimed venues in this city are listed.">
        <select className={inputClass} value={form.venueId} onChange={(event) => setForm({ ...form, venueId: event.target.value })}>
          <option value="">No specific ground</option>
          {venues.map((venue) => (
            <option key={venue.id} value={venue.id}>
              {venue.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Note">
        <textarea className={inputClass} rows={3} value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} />
      </Field>
      {error ? <Banner>{error}</Banner> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Posting…" : "Post game"}
      </Button>
    </form>
  );
}
