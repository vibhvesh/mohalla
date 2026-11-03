# Mohalla

Mohalla is a two-sided marketplace for booking neighbourhood turfs and sports venues. It launches with Vadodara as the default city and works for any other city you set. Players browse a map and a list, filter by sport, area, price, and time, request a slot, and post or join pickup games. Turf owners list a ground, block hours, accept bookings, and see a simple earnings view.

Listings are never invented. A ground appears only after an owner publishes it, or after you import real pitches from OpenStreetMap. Imported pitches stay marked **Unclaimed — claim this turf** and cannot be booked until an owner adds hours, a price, and a contact.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Postgres + Prisma
- Leaflet + OpenStreetMap
- Installable PWA (web manifest + service worker)
- Phone or email login with a password (no SMS vendor required)
- Payments default to pay at the venue. Razorpay turns on when its env vars are set.

## Run locally

You need Node 20+ and Postgres 16. Docker is optional.

```bash
cp .env.example .env
# Put a long random value in AUTH_SECRET
docker compose up -d
npm install
npx prisma migrate deploy
npm run dev
```

Without Docker, create the same database the example URL expects:

```bash
# Postgres superuser shell
CREATE USER mohalla WITH PASSWORD 'mohalla';
CREATE DATABASE mohalla OWNER mohalla;
```

Open [http://localhost:3000](http://localhost:3000).

### Try the two flows

1. Create an account (email, mobile, or both) and open **Host → Add**. Drop a map pin, pick sports, set an hourly price and opening hours, then publish.
2. Log in as a second person (or stay on the same account). Open the ground, pick a free hour, and request it. Pay-at-venue is the default.
3. Back on **Host**, accept the request. **My bookings** shows the accepted slot. Earnings count accepted bookings.
4. Post a pickup game from **Games**, then join it from another account.

### Import real Vadodara pitches

This writes public `leisure=pitch` features from OpenStreetMap. It does not invent names, prices, or hours. Re-running it refreshes unclaimed rows and leaves claimed listings alone.

```bash
npm run import:osm -- --city Vadodara --country India
# preview only:
npm run import:osm -- --city Vadodara --dry-run
```

Any other city works the same way: `--city Pune`. Change the in-app city chip, or `NEXT_PUBLIC_DEFAULT_CITY`, to browse it.

## Tests and lint

```bash
npm test
npm run lint
```

Tests use a separate database, `mohalla_test`, on the same Postgres server:

```sql
CREATE DATABASE mohalla_test OWNER mohalla;
```

`npm test` applies migrations to that database before the suite. The integration test refuses to run unless `DATABASE_URL` points at `mohalla_test`.

## Deploy to Vercel

1. Create a Postgres database (Neon, Supabase, or Vercel Postgres). Use a pooled connection string if the host provides one.
2. Import this repo in Vercel. Framework preset: Next.js.
3. Set every variable from `.env.example` that you need. `DATABASE_URL` and `AUTH_SECRET` are required. Leave the Razorpay keys empty to keep pay-at-venue.
4. Build command (already the `npm run build` script):

```bash
prisma generate && prisma migrate deploy && next build
```

`postinstall` runs `prisma generate`, so the client exists before the build. `migrate deploy` applies `prisma/migrations` on each deploy.

5. After the first deploy, run the OSM import from a machine that can reach the database:

```bash
DATABASE_URL="your-production-url" npm run import:osm -- --city Vadodara
```

Photos are URLs the owner pastes. To store uploads in Vercel Blob later, set `BLOB_READ_WRITE_TOKEN`. The app does not upload files yet.

## Environment

See `.env.example` for the full list.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Postgres connection |
| `AUTH_SECRET` | Yes | Signs the login cookie. At least 16 characters |
| `NEXT_PUBLIC_DEFAULT_CITY` | No | City the app opens on. Default Vadodara |
| `NEXT_PUBLIC_DEFAULT_LAT` / `LNG` | No | Map centre before any venues load |
| `NEXT_PUBLIC_DEFAULT_TIMEZONE` | No | Default `Asia/Kolkata` |
| `NEXT_PUBLIC_APP_URL` | No | Public origin, used in docs and future links |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | No | Server keys. When both are set, players can pay online |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | No | Public key used by Razorpay Checkout. Usually the same as `RAZORPAY_KEY_ID` |
| `SMS_PROVIDER` and MSG91 / Twilio keys | No | Reserved. Login is email or mobile plus a password, so SMS is not used |
| `BLOB_READ_WRITE_TOKEN` | No | Reserved for Vercel Blob photo uploads |

Razorpay amounts are sent in paise. The server verifies `order_id|payment_id` with HMAC SHA256 before marking a booking paid. If checkout is dismissed or the order call fails, the booking stays a pay-at-venue request.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` | Generate Prisma client, migrate, production build |
| `npm test` | Unit tests plus the booking / owner integration test |
| `npm run lint` | ESLint |
| `npm run import:osm` | Import OpenStreetMap pitches for a city |
| `npx prisma migrate deploy` | Apply SQL migrations |
