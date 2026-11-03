import { jsonError } from "@/lib/errors"
import { currentUser } from "@/server/session"
import { claimVenue } from "@/server/venues"

type Context = { params: Promise<{ id: string }> }

export async function POST(request: Request, context: Context) {
  try {
    const user = await currentUser()
    if (!user) return Response.json({ error: "Log in to continue" }, { status: 401 })
    const { id } = await context.params
    const venue = await claimVenue(user.id, id, await request.json())
    return Response.json({ venue })
  } catch (error) {
    return jsonError(error)
  }
}
