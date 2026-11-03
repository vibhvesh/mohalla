"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ListingForm, emptyListing, listingPayload, type ListingValues } from "@/components/listing-form";
import { BrowseMap } from "@/components/maps";
import { useCity } from "@/components/city";
import { useSession } from "@/components/session";
import { Banner, Button } from "@/components/ui";
import { api } from "@/lib/client";
import { formatInr } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { sportLabel } from "@/lib/sports";
import { civilToday, type Slot } from "@/lib/slots";
import type { VenueDto } from "@/lib/types";

type RazorpaySuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

export function VenueDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { user } = useSession();
  const { city, center, timezone } = useCity();
  const [venue, setVenue] = useState<VenueDto | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(() => civilToday(timezone));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookable, setBookable] = useState(false);
  const [sport, setSport] = useState("");
  const [start, setStart] = useState("");
  const [hours, setHours] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [razorpayEnabled, setRazorpayEnabled] = useState(false);
  const [payOnline, setPayOnline] = useState(false);

  useEffect(() => {
    api<{ razorpayEnabled: boolean }>("/api/config")
      .then((config) => setRazorpayEnabled(config.razorpayEnabled))
      .catch(() => setRazorpayEnabled(false));
  }, []);

  useEffect(() => {
    let ignore = false;
    api<{ venue: VenueDto; isOwner: boolean }>(`/api/venues/${id}`)
      .then((data) => {
        if (ignore) return;
        setVenue(data.venue);
        setIsOwner(data.isOwner);
        setSport(data.venue.sports[0] ?? "");
      })
      .catch((err: unknown) => {
        if (!ignore) setError(err instanceof Error ? err.message : "Could not load this ground");
      });
    return () => {
      ignore = true;
    };
  }, [id]);

  useEffect(() => {
    if (!date) return;
    api<{ slots: Slot[]; bookable: boolean }>(`/api/venues/${id}/slots?date=${date}`)
      .then((data) => {
        setSlots(data.slots);
        setBookable(data.bookable);
        setStart((current) => (data.slots.some((slot) => slot.start === current && slot.available) ? current : ""));
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load slots"));
  }, [id, date]);

  const dates = upcomingDates(timezone, 7);
  const startSlot = slots.find((slot) => slot.start === start);
  const second = startSlot ? slots.find((slot) => slot.start === addHour(startSlot.start)) : undefined;
  const duration = hours === 2 && second?.available ? 2 : 1;
  const end = start ? addHour(start, duration) : "";
  const amount = venue?.hourlyPrice != null && start ? venue.hourlyPrice * duration : null;

  async function book() {
    if (!venue || !start || !end) return;
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      const result = await api<{
        booking: { id: string };
        razorpay: { orderId: string; amount: number; currency: "INR"; keyId: string } | null;
        notice?: string;
      }>("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          venueId: venue.id,
          sport,
          date,
          startTime: start,
          endTime: end,
          paymentMethod: payOnline ? "razorpay" : "pay_at_venue",
        }),
      });
      if (result.razorpay?.keyId) {
        try {
          const payment = await openRazorpay({
            keyId: result.razorpay.keyId,
            amount: result.razorpay.amount,
            orderId: result.razorpay.orderId,
            description: `${venue.name} ${date} ${start}`,
          });
          await api("/api/payments/verify", {
            method: "POST",
            body: JSON.stringify({
              bookingId: result.booking.id,
              orderId: payment.razorpay_order_id,
              paymentId: payment.razorpay_payment_id,
              signature: payment.razorpay_signature,
            }),
          });
        } catch {
          await api(`/api/bookings/${result.booking.id}`, {
            method: "PATCH",
            body: JSON.stringify({ action: "pay_at_venue" }),
          });
          setNotice("Online payment was not completed. The request is in, and you can pay at the venue.");
        }
      } else if (result.notice) {
        setNotice(result.notice);
      }
      router.push("/bookings");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not book");
    } finally {
      setPending(false);
    }
  }

  if (error && !venue) {
    return <Banner>{error}</Banner>;
  }
  if (!venue) return <p className="text-sm text-muted">Loading ground…</p>;

  const claimInitial: ListingValues = {
    ...emptyListing(venue.city || city, { lat: venue.lat, lng: venue.lng }),
    name: venue.name,
    description: venue.description,
    address: venue.address || venue.area || venue.city,
    area: venue.area,
    city: venue.city,
    lat: venue.lat,
    lng: venue.lng,
    sports: venue.sports.length ? venue.sports : ["cricket"],
    photos: venue.photos.join("\n"),
  };

  return (
    <div className="space-y-4">
      <Link href="/" className="text-sm font-semibold text-pitch">
        ← All grounds
      </Link>
      <div className="overflow-hidden rounded-3xl bg-card ring-1 ring-line">
        <div className="h-48">
          {venue.photos[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={venue.photos[0]} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="pitch-pattern h-full w-full" />
          )}
        </div>
        <div className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            {!venue.claimed ? <span className="text-sm font-semibold text-clay">Unclaimed — claim this turf</span> : null}
            {venue.source === "osm" ? <span className="text-xs text-muted">OpenStreetMap {venue.osmId}</span> : null}
          </div>
          <h1 className="font-display text-4xl leading-none text-pitch">{venue.name}</h1>
          <p className="text-sm text-muted">{[venue.address, venue.area, venue.city].filter(Boolean).join(", ")}</p>
          <div className="flex flex-wrap gap-2">
            {(venue.sports.length ? venue.sports : ["Sport not tagged"]).map((item) => (
              <span key={item} className="rounded-full bg-paper px-2.5 py-1 text-xs font-semibold">
                {item === "Sport not tagged" ? item : sportLabel(item)}
              </span>
            ))}
          </div>
          <p className="text-lg font-semibold">{venue.hourlyPrice != null ? `${formatInr(venue.hourlyPrice)} per hour` : "Price not listed yet"}</p>
          {venue.description ? <p className="text-sm leading-6">{venue.description}</p> : null}
          {venue.contactPhone ? (
            <p className="text-sm">
              <a className="font-semibold text-pitch" href={`tel:${venue.contactPhone}`}>
                {formatPhone(venue.contactPhone)}
              </a>
              {venue.contactEmail ? ` · ${venue.contactEmail}` : ""}
            </p>
          ) : null}
        </div>
      </div>

      <div className="h-52 overflow-hidden rounded-3xl ring-1 ring-line">
        <BrowseMap
          center={center}
          venues={[
            {
              id: venue.id,
              name: venue.name,
              area: venue.area,
              lat: venue.lat,
              lng: venue.lng,
              claimed: venue.claimed,
              hourlyPrice: venue.hourlyPrice,
            },
          ]}
        />
      </div>

      {!venue.claimed ? (
        <section className="space-y-3 rounded-3xl bg-lime/40 p-4">
          <h2 className="font-display text-2xl text-pitch">Claim this turf</h2>
          <p className="text-sm leading-6">
            This pin comes from public map data. It is not a verified listing and cannot take bookings until an owner adds
            hours, a price, and a contact number.
          </p>
          {user ? (
            claiming ? (
              <ListingForm
                initial={claimInitial}
                submitLabel="Publish and claim"
                onSubmit={async (values) => {
                  const data = await api<{ venue: VenueDto }>(`/api/venues/${venue.id}/claim`, {
                    method: "POST",
                    body: JSON.stringify(listingPayload(values)),
                  });
                  setVenue(data.venue);
                  setIsOwner(true);
                  setClaiming(false);
                  setBookable(true);
                }}
              />
            ) : (
              <Button type="button" onClick={() => setClaiming(true)}>
                Claim this turf
              </Button>
            )
          ) : (
            <Link href={`/login?next=/venues/${venue.id}`} className="inline-flex rounded-full bg-pitch px-4 py-2.5 text-sm font-semibold text-lime">
              Log in to claim
            </Link>
          )}
        </section>
      ) : (
        <section className="space-y-3">
          <h2 className="font-display text-2xl text-pitch">Book a slot</h2>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {dates.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setDate(item)}
                className={item === date ? "shrink-0 rounded-2xl bg-pitch px-3 py-2 text-left text-lime" : "shrink-0 rounded-2xl bg-card px-3 py-2 text-left ring-1 ring-line"}
              >
                <span className="block text-xs">{weekdayLabel(item)}</span>
                <span className="text-sm font-semibold">{item.slice(8)} {monthLabel(item)}</span>
              </button>
            ))}
          </div>
          {venue.sports.length > 1 ? (
            <div className="flex flex-wrap gap-2">
              {venue.sports.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setSport(item)}
                  className={sport === item ? "rounded-full bg-pitch px-3 py-1.5 text-sm font-semibold text-lime" : "rounded-full bg-card px-3 py-1.5 text-sm ring-1 ring-line"}
                >
                  {sportLabel(item)}
                </button>
              ))}
            </div>
          ) : null}
          {slots.length === 0 ? (
            <p className="text-sm text-muted">No hours published for this day.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((slot) => (
                <button
                  key={slot.start}
                  type="button"
                  disabled={!slot.available}
                  title={slot.reason ?? "Open"}
                  onClick={() => setStart(slot.start)}
                  className={
                    start === slot.start
                      ? "rounded-2xl bg-pitch px-2 py-3 text-sm font-semibold text-lime"
                      : slot.available
                        ? "rounded-2xl bg-card px-2 py-3 text-sm font-semibold ring-1 ring-line"
                        : "rounded-2xl bg-paper px-2 py-3 text-sm text-muted line-through"
                  }
                >
                  {slot.start}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button type="button" className={duration === 1 ? "rounded-full bg-pitch px-3 py-1.5 text-sm text-lime" : "rounded-full bg-card px-3 py-1.5 text-sm ring-1 ring-line"} onClick={() => setHours(1)}>
              1 hour
            </button>
            <button
              type="button"
              disabled={!second?.available}
              className={duration === 2 ? "rounded-full bg-pitch px-3 py-1.5 text-sm text-lime" : "rounded-full bg-card px-3 py-1.5 text-sm ring-1 ring-line disabled:opacity-40"}
              onClick={() => setHours(2)}
            >
              2 hours
            </button>
          </div>
          {razorpayEnabled ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={payOnline} onChange={(event) => setPayOnline(event.target.checked)} />
              Pay online with Razorpay
            </label>
          ) : (
            <p className="text-sm text-muted">Pay at the venue. Online payment stays off until Razorpay keys are set.</p>
          )}
          {error ? <Banner>{error}</Banner> : null}
          {notice ? <Banner tone="info">{notice}</Banner> : null}
          <div className="sticky bottom-20 z-20 flex items-center justify-between gap-3 rounded-3xl bg-pitch px-4 py-3 text-lime md:bottom-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-lime/80">{start && end ? `${start}–${end}` : "Pick a slot"}</p>
              <p className="font-semibold">{amount != null ? formatInr(amount) : "—"}</p>
            </div>
            {user ? (
              <Button variant="lime" type="button" disabled={!bookable || !start || !sport || pending} onClick={() => void book()}>
                {pending ? "Booking…" : "Request slot"}
              </Button>
            ) : (
              <Link href={`/login?next=/venues/${id}`} className="rounded-full bg-lime px-4 py-2.5 text-sm font-semibold text-pitch">
                Log in to book
              </Link>
            )}
          </div>
          {isOwner ? (
            <Link href={`/owner/venues/${venue.id}`} className="inline-flex text-sm font-semibold text-pitch">
              Manage this ground
            </Link>
          ) : null}
        </section>
      )}
    </div>
  );
}

function upcomingDates(timezone: string, count: number) {
  const today = civilToday(timezone);
  const [year, month, day] = today.split("-").map(Number);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1, day + index));
    return date.toISOString().slice(0, 10);
  });
}

function weekdayLabel(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", { weekday: "short", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, day)));
}

function monthLabel(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", { month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, day)));
}

function addHour(time: string, hours = 1) {
  const hour = Number(time.slice(0, 2)) + hours;
  return `${String(hour).padStart(2, "0")}:00`;
}

function openRazorpay(options: { keyId: string; amount: number; orderId: string; description: string }) {
  return new Promise<RazorpaySuccess>((resolve, reject) => {
    const start = () => {
      const Razorpay = (window as unknown as {
        Razorpay: new (opts: unknown) => { open: () => void };
      }).Razorpay;
      const checkout = new Razorpay({
        key: options.keyId,
        amount: options.amount,
        currency: "INR",
        name: "Mohalla",
        description: options.description,
        order_id: options.orderId,
        handler: (response: RazorpaySuccess) => resolve(response),
        modal: { ondismiss: () => reject(new Error("closed")) },
        theme: { color: "#0e3b2e" },
      });
      checkout.open();
    };
    if ("Razorpay" in window) {
      start();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = start;
    script.onerror = () => reject(new Error("Could not load Razorpay"));
    document.body.appendChild(script);
  });
}
