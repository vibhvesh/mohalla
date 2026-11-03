"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCity } from "@/components/city";
import { BrowseMap } from "@/components/maps";
import { EmptyState } from "@/components/ui";
import { cx } from "@/lib/client";
import { distanceKm, formatInr } from "@/lib/money";
import { SPORTS, sportLabel } from "@/lib/sports";
import type { VenueDto } from "@/lib/types";

const prices = [
  { label: "Any price", value: "" },
  { label: "≤ ₹800", value: "800" },
  { label: "≤ ₹1,500", value: "1500" },
  { label: "≤ ₹2,500", value: "2500" },
];

export function Explore() {
  const { city, center } = useCity();
  const [sport, setSport] = useState("");
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [view, setView] = useState<"list" | "map">("list");
  const [venues, setVenues] = useState<VenueDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [here, setHere] = useState<{ lat: number; lng: number } | null>(null);
  const [debounced, setDebounced] = useState({ query: "", area: "" });

  useEffect(() => {
    const timer = setTimeout(() => setDebounced({ query, area }), 250);
    return () => clearTimeout(timer);
  }, [query, area]);

  useEffect(() => {
    const params = new URLSearchParams({ city });
    if (sport) params.set("sport", sport);
    if (debounced.query) params.set("q", debounced.query);
    if (debounced.area) params.set("area", debounced.area);
    if (priceMax) params.set("priceMax", priceMax);
    if (date) params.set("date", date);
    if (date && time) params.set("time", time);
    const controller = new AbortController();
    fetch(`/api/venues?${params}`, { signal: controller.signal })
      .then(async (response) => {
        const data = (await response.json()) as { venues?: VenueDto[]; error?: string };
        if (!response.ok) throw new Error(data.error || "Could not load grounds");
        setVenues(data.venues ?? []);
        setError(null);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Could not load grounds");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [city, sport, debounced, priceMax, date, time]);

  const ordered = useMemo(() => {
    if (!here) return venues;
    return [...venues].sort(
      (a, b) => distanceKm(here.lat, here.lng, a.lat, a.lng) - distanceKm(here.lat, here.lng, b.lat, b.lng),
    );
  }, [venues, here]);

  return (
    <div className="space-y-4">
      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pitch-soft">{city}</p>
        <h1 className="mt-1 max-w-xl font-display text-4xl leading-[0.95] text-pitch sm:text-5xl">
          Find a ground tonight.
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
          Turfs and sports venues in the neighbourhood. Book an hour, or put together a pickup side. Grounds only appear
          when an owner lists them, or when a public pitch is imported and marked unclaimed.
        </p>
      </section>

      <div className="space-y-3 rounded-3xl bg-card p-3 ring-1 ring-line">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name or area"
          aria-label="Search grounds"
          className="w-full rounded-2xl border border-line bg-paper px-3 py-2.5 text-sm"
        />
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          <FilterChip active={sport === ""} onClick={() => setSport("")}>
            All sports
          </FilterChip>
          {SPORTS.map((item) => (
            <FilterChip key={item.id} active={sport === item.id} onClick={() => setSport(item.id)}>
              {item.label}
            </FilterChip>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <input
            value={area}
            onChange={(event) => setArea(event.target.value)}
            placeholder="Area"
            aria-label="Area"
            className="rounded-2xl border border-line px-3 py-2 text-sm"
          />
          <select
            aria-label="Maximum price"
            value={priceMax}
            onChange={(event) => setPriceMax(event.target.value)}
            className="rounded-2xl border border-line px-3 py-2 text-sm"
          >
            {prices.map((price) => (
              <option key={price.label} value={price.value}>
                {price.label}
              </option>
            ))}
          </select>
          <input
            type="date"
            aria-label="Date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="rounded-2xl border border-line px-3 py-2 text-sm"
          />
          <select
            aria-label="Start time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            className="rounded-2xl border border-line px-3 py-2 text-sm"
          >
            <option value="">Any time</option>
            {Array.from({ length: 17 }, (_, index) => {
              const hour = `${String(index + 6).padStart(2, "0")}:00`;
              return (
                <option key={hour} value={hour}>
                  {hour}
                </option>
              );
            })}
          </select>
        </div>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            className="text-sm font-semibold text-pitch"
            onClick={() => {
              navigator.geolocation?.getCurrentPosition((position) => {
                setHere({ lat: position.coords.latitude, lng: position.coords.longitude });
              });
            }}
          >
            {here ? "Sorted near you" : "Sort near me"}
          </button>
          <div className="flex rounded-full bg-paper p-1 lg:hidden">
            <button type="button" className={cx("rounded-full px-3 py-1 text-sm font-semibold", view === "list" && "bg-pitch text-lime")} onClick={() => setView("list")}>
              List
            </button>
            <button type="button" className={cx("rounded-full px-3 py-1 text-sm font-semibold", view === "map" && "bg-pitch text-lime")} onClick={() => setView("map")}>
              Map
            </button>
          </div>
        </div>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="lg:grid lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-start lg:gap-4">
        <div className={cx("space-y-3", view === "map" && "hidden lg:block")}>
          <p className="text-sm text-muted">{loading ? "Looking…" : `${ordered.length} ground${ordered.length === 1 ? "" : "s"}`}</p>
          {!loading && ordered.length === 0 ? (
            <EmptyState
              title="No grounds in this view"
              body={`Nothing in ${city} matches these filters. Owners can list a venue, or you can import public pitches from OpenStreetMap — they stay marked unclaimed until someone claims them.`}
              action={
                <Link href="/owner/venues/new" className="inline-flex rounded-full bg-pitch px-4 py-2 text-sm font-semibold text-lime">
                  List a ground
                </Link>
              }
            />
          ) : null}
          {ordered.map((venue) => (
            <VenueCard key={venue.id} venue={venue} here={here} />
          ))}
        </div>
        <div className={cx("h-[70vh] overflow-hidden rounded-3xl ring-1 ring-line lg:sticky lg:top-20 lg:h-[calc(100vh-6.5rem)]", view === "list" && "hidden lg:block")}>
          <BrowseMap
            center={center}
            venues={ordered.map((venue) => ({
              id: venue.id,
              name: venue.name,
              area: venue.area,
              lat: venue.lat,
              lng: venue.lng,
              claimed: venue.claimed,
              hourlyPrice: venue.hourlyPrice,
            }))}
          />
        </div>
      </div>
    </div>
  );
}

function FilterChip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold",
        active ? "bg-pitch text-lime" : "bg-paper text-ink ring-1 ring-line",
      )}
    >
      {children}
    </button>
  );
}

function VenueCard({ venue, here }: { venue: VenueDto; here: { lat: number; lng: number } | null }) {
  const photo = venue.photos[0];
  const km = here ? distanceKm(here.lat, here.lng, venue.lat, venue.lng) : null;
  return (
    <Link href={`/venues/${venue.id}`} className="block overflow-hidden rounded-3xl bg-card ring-1 ring-line">
      <div className="relative h-36">
        {photo ? (
          // Owner-supplied URLs are arbitrary, so a plain image is more reliable than the optimizer.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="pitch-pattern h-full w-full" />
        )}
        {!venue.claimed ? (
          <span className="absolute left-3 top-3 rounded-full bg-card px-2.5 py-1 text-xs font-semibold text-clay">
            Unclaimed — claim this turf
          </span>
        ) : null}
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl leading-none text-pitch">{venue.name}</h2>
            <p className="mt-1 text-sm text-muted">
              {[venue.area, venue.city].filter(Boolean).join(" · ") || venue.city}
              {km != null ? ` · ${km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`}` : ""}
            </p>
          </div>
          <p className="shrink-0 text-sm font-semibold">{venue.hourlyPrice != null ? `${formatInr(venue.hourlyPrice)}/hr` : "Price on claim"}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(venue.sports.length ? venue.sports : ["Sport not tagged"]).map((sport) => (
            <span key={sport} className="rounded-full bg-paper px-2 py-0.5 text-xs font-medium">
              {sport === "Sport not tagged" ? sport : sportLabel(sport)}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
