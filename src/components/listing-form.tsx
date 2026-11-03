"use client";

import { useState } from "react";
import { LocationPicker } from "@/components/maps";
import { Banner, Button, Field, inputClass } from "@/components/ui";
import { api } from "@/lib/client";
import { SPORTS } from "@/lib/sports";
import { DAY_KEYS, defaultHours, type WeekHours } from "@/lib/slots";

export type ListingValues = {
  name: string;
  description: string;
  address: string;
  area: string;
  city: string;
  lat: number;
  lng: number;
  sports: string[];
  hourlyPrice: string;
  photos: string;
  contactPhone: string;
  contactEmail: string;
  openingHours: WeekHours;
};

export function emptyListing(city: string, center: { lat: number; lng: number }): ListingValues {
  return {
    name: "",
    description: "",
    address: "",
    area: "",
    city,
    lat: center.lat,
    lng: center.lng,
    sports: ["cricket"],
    hourlyPrice: "",
    photos: "",
    contactPhone: "",
    contactEmail: "",
    openingHours: defaultHours(),
  };
}

export function listingPayload(values: ListingValues) {
  return {
    name: values.name,
    description: values.description,
    address: values.address,
    area: values.area,
    city: values.city,
    lat: Number(values.lat),
    lng: Number(values.lng),
    sports: values.sports,
    hourlyPrice: Number(values.hourlyPrice),
    photos: values.photos
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean),
    contactPhone: values.contactPhone,
    contactEmail: values.contactEmail,
    openingHours: values.openingHours,
    timezone: "Asia/Kolkata",
  };
}

const dayLabel: Record<(typeof DAY_KEYS)[number], string> = {
  sun: "Sun",
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
};

function hourChoices(includeMidnight: boolean) {
  const last = includeMidnight ? 24 : 23;
  return Array.from({ length: last + 1 }, (_, hour) => `${String(hour).padStart(2, "0")}:00`);
}

export function ListingForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial: ListingValues;
  submitLabel: string;
  onSubmit: (values: ListingValues) => Promise<void>;
}) {
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function patch(partial: Partial<ListingValues>) {
    setValues((current) => ({ ...current, ...partial }));
  }

  async function locate() {
    setError(null);
    const query = [values.address, values.area, values.city].filter(Boolean).join(", ");
    if (query.length < 3) {
      setError("Add an address before searching the map");
      return;
    }
    try {
      const data = await api<{ results: { lat: number; lng: number }[] }>(
        `/api/geocode?q=${encodeURIComponent(query)}`,
      );
      const hit = data.results[0];
      if (!hit) {
        setError("No map match. Drop the pin yourself.");
        return;
      }
      patch({ lat: hit.lat, lng: hit.lng });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not search the map");
    }
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        onSubmit(values)
          .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not save"))
          .finally(() => setPending(false));
      }}
    >
      <section className="space-y-3 rounded-3xl bg-card p-4 ring-1 ring-line">
        <h2 className="font-display text-2xl text-pitch">The ground</h2>
        <Field label="Name">
          <input className={inputClass} value={values.name} onChange={(event) => patch({ name: event.target.value })} required />
        </Field>
        <Field label="About" hint="What should a player know before they book?">
          <textarea
            className={inputClass}
            rows={3}
            value={values.description}
            onChange={(event) => patch({ description: event.target.value })}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Address">
            <input className={inputClass} value={values.address} onChange={(event) => patch({ address: event.target.value })} required />
          </Field>
          <Field label="Area" hint="Alkapuri, Gotri, Manjalpur…">
            <input className={inputClass} value={values.area} onChange={(event) => patch({ area: event.target.value })} />
          </Field>
        </div>
        <Field label="City">
          <input className={inputClass} value={values.city} onChange={(event) => patch({ city: event.target.value })} required />
        </Field>
      </section>

      <section className="space-y-3 rounded-3xl bg-card p-4 ring-1 ring-line">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl text-pitch">Map pin</h2>
          <Button type="button" variant="ghost" onClick={() => void locate()}>
            Find address
          </Button>
        </div>
        <p className="text-sm text-muted">Tap the map to drop the pin. Players see this exact spot.</p>
        <div className="h-56 overflow-hidden rounded-2xl ring-1 ring-line">
          <LocationPicker lat={values.lat} lng={values.lng} onPick={(lat, lng) => patch({ lat, lng })} />
        </div>
        <p className="text-xs text-muted">
          {values.lat.toFixed(5)}, {values.lng.toFixed(5)}
        </p>
      </section>

      <section className="space-y-3 rounded-3xl bg-card p-4 ring-1 ring-line">
        <h2 className="font-display text-2xl text-pitch">Sports and price</h2>
        <div className="flex flex-wrap gap-2">
          {SPORTS.map((sport) => {
            const on = values.sports.includes(sport.id);
            return (
              <button
                key={sport.id}
                type="button"
                aria-pressed={on}
                className={on ? "rounded-full bg-pitch px-3 py-1.5 text-sm font-semibold text-lime" : "rounded-full bg-paper px-3 py-1.5 text-sm font-semibold ring-1 ring-line"}
                onClick={() =>
                  patch({
                    sports: on ? values.sports.filter((id) => id !== sport.id) : [...values.sports, sport.id],
                  })
                }
              >
                {sport.label}
              </button>
            );
          })}
        </div>
        <Field label="Hourly price (₹)">
          <input
            className={inputClass}
            inputMode="numeric"
            placeholder="1200"
            value={values.hourlyPrice}
            onChange={(event) => patch({ hourlyPrice: event.target.value.replace(/[^\d]/g, "") })}
            required
          />
        </Field>
      </section>

      <section className="space-y-3 rounded-3xl bg-card p-4 ring-1 ring-line">
        <h2 className="font-display text-2xl text-pitch">Opening hours</h2>
        <p className="text-sm text-muted">Hours are on the hour. A 6:00–23:00 day can be booked from 6am through 10pm.</p>
        <div className="space-y-2">
          {DAY_KEYS.map((day) => {
            const hours = values.openingHours[day];
            return (
              <div key={day} className="grid grid-cols-[3.5rem_1fr_1fr_auto] items-center gap-2 text-sm">
                <span className="font-semibold">{dayLabel[day]}</span>
                <select
                  className={inputClass}
                  disabled={hours.closed}
                  value={hours.open}
                  onChange={(event) =>
                    patch({
                      openingHours: { ...values.openingHours, [day]: { ...hours, open: event.target.value } },
                    })
                  }
                >
                  {hourChoices(false).map((hour) => (
                    <option key={hour}>{hour}</option>
                  ))}
                </select>
                <select
                  className={inputClass}
                  disabled={hours.closed}
                  value={hours.close}
                  onChange={(event) =>
                    patch({
                      openingHours: { ...values.openingHours, [day]: { ...hours, close: event.target.value } },
                    })
                  }
                >
                  {hourChoices(true).map((hour) => (
                    <option key={hour}>{hour}</option>
                  ))}
                </select>
                <label className="flex items-center gap-1 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={hours.closed}
                    onChange={(event) =>
                      patch({
                        openingHours: { ...values.openingHours, [day]: { ...hours, closed: event.target.checked } },
                      })
                    }
                  />
                  Shut
                </label>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3 rounded-3xl bg-card p-4 ring-1 ring-line">
        <h2 className="font-display text-2xl text-pitch">Contact and photos</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Contact phone">
            <input className={inputClass} value={values.contactPhone} onChange={(event) => patch({ contactPhone: event.target.value })} required />
          </Field>
          <Field label="Contact email" hint="Optional">
            <input className={inputClass} value={values.contactEmail} onChange={(event) => patch({ contactEmail: event.target.value })} />
          </Field>
        </div>
        <Field label="Photo URLs" hint="One image link per line. Leave blank if you do not have photos yet.">
          <textarea className={inputClass} rows={3} value={values.photos} onChange={(event) => patch({ photos: event.target.value })} />
        </Field>
      </section>

      {error ? <Banner>{error}</Banner> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
