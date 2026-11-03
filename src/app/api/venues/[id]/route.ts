import { jsonError } from "@/lib/errors"
import { currentUser } from "@/server/session"
import { getVenue, setVenueActive, updateVenue } from "@/server/venues"

type Context = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params
    const user = await currentUser()
    return Response.json(await getVenue(id, user?.id))
  } catch (error) {
    return jsonError(error)
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await currentUser()
    if (!user) return Response.json({ error: "Log in to continue" }, { status: 401 })
    const { id } = await context.params
    const body = await request.json()
    if (typeof body.active === "boolean" && Object.keys(body).length === 1) {
      const venue = await setVenueActive(user.id, id, body.active)
      return Response.json({ venue })
    }
    const venue = await updateVenue(user.id, id, body)
    return Response.json({ venue })
  } catch (error) {
    return jsonError(error)
  }
}
