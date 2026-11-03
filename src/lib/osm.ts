const SPORT_MAP: Record<string, string> = {
  soccer: "football",
  football: "football",
  cricket: "cricket",
  tennis: "tennis",
  badminton: "badminton",
  basketball: "basketball",
  volleyball: "volleyball",
  hockey: "hockey",
  field_hockey: "hockey",
  futsal: "futsal",
  pickleball: "pickleball",
  "box cricket": "box-cricket",
  box_cricket: "box-cricket",
}

export type OsmElement = {
  type: string
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

export type MappedPitch = {
  osmId: string
  name: string
  description: string
  address: string
  area: string
  city: string
  lat: number
  lng: number
  sports: string[]
  claimed: false
  source: "osm"
}

export function sportsFromOsmTag(tag: string | undefined): string[] {
  if (!tag) return []
  const ids = new Set<string>()
  for (const part of tag.split(/[;,]/)) {
    const key = part.trim().toLowerCase()
    if (!key) continue
    if (key === "multi") {
      ids.add("football")
      ids.add("cricket")
      continue
    }
    const mapped = SPORT_MAP[key]
    if (mapped) ids.add(mapped)
  }
  return [...ids]
}

export function mapOsmElement(element: OsmElement, city: string): MappedPitch | null {
  const lat = element.lat ?? element.center?.lat
  const lng = element.lon ?? element.center?.lon
  if (lat == null || lng == null || Number.isNaN(lat) || Number.isNaN(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null

  const tags = element.tags ?? {}
  const osmId = `${element.type}/${element.id}`
  const named = tags.name?.trim() ?? ""
  const sports = sportsFromOsmTag(tags.sport)
  const area = tags["addr:suburb"] || tags["addr:neighbourhood"] || tags["addr:quarter"] || ""
  const street = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ")
  const address = [street, area, tags["addr:city"] || city].filter(Boolean).join(", ")
  const sportWord = sports[0]?.replace("-", " ") ?? "sports"
  const name = named || "Unnamed pitch"
  const description = named
    ? `Imported from OpenStreetMap (${osmId}). Unclaimed — claim this turf to publish hours and a price. Mohalla has not verified this listing.`
    : `Unnamed ${sportWord} pitch from OpenStreetMap (${osmId}). Unclaimed — claim this turf to add hours, price, and a contact. Mohalla has not verified this listing.`

  return {
    osmId,
    name,
    description,
    address,
    area,
    city,
    lat,
    lng,
    sports,
    claimed: false,
    source: "osm",
  }
}
