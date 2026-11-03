import "dotenv/config"
import { mapOsmElement, type OsmElement } from "../src/lib/osm"
import { prisma } from "../src/lib/prisma"

type NominatimHit = {
  boundingbox?: string[]
  lat?: string
  lon?: string
  display_name?: string
}

function arg(name: string, fallback: string) {
  const index = process.argv.indexOf(`--${name}`)
  if (index === -1) return fallback
  return process.argv[index + 1] || fallback
}

async function geocodeCity(city: string, country: string) {
  const url = new URL("https://nominatim.openstreetmap.org/search")
  url.searchParams.set("format", "jsonv2")
  url.searchParams.set("limit", "1")
  url.searchParams.set("q", `${city}, ${country}`)
  const response = await fetch(url, {
    headers: { "user-agent": "Mohalla/0.1 (OSM pitch import)", accept: "application/json" },
  })
  if (!response.ok) throw new Error(`Nominatim failed (${response.status})`)
  const hits = (await response.json()) as NominatimHit[]
  const hit = hits[0]
  if (!hit?.boundingbox || hit.boundingbox.length < 4) {
    throw new Error(`Could not find a map boundary for ${city}, ${country}`)
  }
  const [south, north, west, east] = hit.boundingbox.map(Number)
  return { south, north, west, east, label: hit.display_name }
}

async function fetchPitches(bounds: { south: number; west: number; north: number; east: number }) {
  const query = `
    [out:json][timeout:90];
    (
      node["leisure"="pitch"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
      way["leisure"="pitch"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
      relation["leisure"="pitch"](${bounds.south},${bounds.west},${bounds.north},${bounds.east});
    );
    out center tags;
  `
  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.openstreetmap.fr/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
  ]
  let lastError: unknown
  for (const endpoint of endpoints) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "content-type": "application/x-www-form-urlencoded",
            accept: "application/json",
            "user-agent": "Mohalla/0.1 (OSM pitch import)",
          },
          body: `data=${encodeURIComponent(query)}`,
        })
        if (response.status === 429 || response.status >= 500) {
          const detail = (await response.text()).slice(0, 160).replace(/\s+/g, " ")
          throw new Error(`${endpoint} returned ${response.status}: ${detail}`)
        }
        if (!response.ok) {
          const detail = (await response.text()).slice(0, 160).replace(/\s+/g, " ")
          throw new Error(`${endpoint} returned ${response.status}: ${detail}`)
        }
        const payload = (await response.json()) as { elements?: OsmElement[] }
        console.log(`Using ${endpoint}`)
        return payload.elements ?? []
      } catch (error) {
        lastError = error
        const message = error instanceof Error ? error.message : String(error)
        console.error(`Attempt ${attempt} failed: ${message}`)
        if (attempt === 1 && /429|502|503|504|fetch failed|timed out/i.test(message)) {
          await new Promise((resolve) => setTimeout(resolve, 2000))
          continue
        }
        break
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Overpass request failed")
}

async function main() {
  const city = arg("city", process.env.NEXT_PUBLIC_DEFAULT_CITY || "Vadodara")
  const country = arg("country", "India")
  const dryRun = process.argv.includes("--dry-run")
  console.log(`Looking up ${city}, ${country}…`)
  const bounds = await geocodeCity(city, country)
  console.log(`Boundary: ${bounds.label}`)
  const elements = await fetchPitches(bounds)
  console.log(`OpenStreetMap returned ${elements.length} pitch features`)

  let created = 0
  let updated = 0
  let skippedClaimed = 0
  let skippedUnmapped = 0

  for (const element of elements) {
    const pitch = mapOsmElement(element, city)
    if (!pitch) {
      skippedUnmapped += 1
      continue
    }
    if (dryRun) {
      console.log(`• ${pitch.name} (${pitch.osmId}) ${pitch.sports.join(", ") || "sport not tagged"}`)
      created += 1
      continue
    }
    const existing = await prisma.venue.findUnique({ where: { osmId: pitch.osmId } })
    if (existing?.claimed) {
      skippedClaimed += 1
      continue
    }
    if (existing) {
      await prisma.venue.update({
        where: { id: existing.id },
        data: {
          name: pitch.name,
          description: pitch.description,
          address: pitch.address,
          area: pitch.area,
          city: pitch.city,
          lat: pitch.lat,
          lng: pitch.lng,
          sports: pitch.sports,
        },
      })
      updated += 1
    } else {
      await prisma.venue.create({
        data: {
          ...pitch,
          hourlyPrice: null,
          photos: [],
          openingHours: undefined,
          claimed: false,
          source: "osm",
          active: true,
        },
      })
      created += 1
    }
  }

  console.log(
    dryRun
      ? `Dry run: ${created} pitches would be imported. Nothing was written.`
      : `Imported ${created} new pitches, refreshed ${updated}, left ${skippedClaimed} claimed listings alone, skipped ${skippedUnmapped} without coordinates.`,
  )
  console.log("Unclaimed pitches show as “Unclaimed — claim this turf” until an owner publishes hours and a price.")
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    const { prisma: client } = await import("../src/lib/prisma")
    await client.$disconnect()
  })
