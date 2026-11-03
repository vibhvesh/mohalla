import { jsonError } from "@/lib/errors"
import { currentUser } from "@/server/session"
import { createVenue, listVenues } from "@/server/venues"

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams
    const price = params.get("priceMax")
    const venues = await listVenues({
      city: params.get("city") || undefined,
      sport: params.get("sport") || undefined,
      q: params.get("q") || undefined,
      area: params.get("area") || undefined,
      priceMax: price ? Number(price) : undefined,
      date: params.get("date") || undefined,
      time: params.get("time") || undefined,
    })
    return Response.json({ venues })
  } catch (error) {
    return jsonError(error)
  }
}

export async function POST(request: Request) {
  try {
    const user = await currentUser()
    if (!user) return Response.json({ error: "Log in to continue" }, { status: 401 })
    const venue = await createVenue(user.id, await request.json())
    return Response.json({ venue }, { status: 201 })
  } catch (error) {
    return jsonError(error)
  }
}
