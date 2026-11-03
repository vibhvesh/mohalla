import { jsonError } from "@/lib/errors"
import { currentUser } from "@/server/session"
import { ownerVenueDetail } from "@/server/venues"

type Context = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: Context) {
  try {
    const user = await currentUser()
    if (!user) return Response.json({ error: "Log in to continue" }, { status: 401 })
    const { id } = await context.params
    return Response.json(await ownerVenueDetail(user.id, id))
  } catch (error) {
    return jsonError(error)
  }
}
