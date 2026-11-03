import { jsonError } from "@/lib/errors"
import { ownerOverview } from "@/server/bookings"
import { currentUser } from "@/server/session"

export async function GET() {
  try {
    const user = await currentUser()
    if (!user) return Response.json({ error: "Log in to continue" }, { status: 401 })
    return Response.json(await ownerOverview(user.id))
  } catch (error) {
    return jsonError(error)
  }
}
