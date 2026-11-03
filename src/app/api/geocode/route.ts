import { AppError, jsonError } from "@/lib/errors"

export async function GET(request: Request) {
  try {
    const query = new URL(request.url).searchParams.get("q")?.trim()
    if (!query) return Response.json({ results: [] })
    const url = new URL("https://nominatim.openstreetmap.org/search")
    url.searchParams.set("format", "jsonv2")
    url.searchParams.set("limit", "5")
    url.searchParams.set("q", query)
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": "Mohalla/0.1 (neighbourhood turf booking)",
      },
    })
    if (!response.ok) throw new AppError("Could not look up that place", 502)
    const rows = (await response.json()) as {
      display_name?: string
      lat?: string
      lon?: string
      boundingbox?: string[]
    }[]
    return Response.json({
      results: rows
        .map((row) => ({
          label: row.display_name ?? query,
          lat: Number(row.lat),
          lng: Number(row.lon),
          boundingbox: row.boundingbox ?? null,
        }))
        .filter((row) => Number.isFinite(row.lat) && Number.isFinite(row.lng)),
    })
  } catch (error) {
    return jsonError(error)
  }
}
