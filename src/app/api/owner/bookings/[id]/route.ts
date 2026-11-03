import { AppError, jsonError } from "@/lib/errors"
import { decideBooking } from "@/server/bookings"
import { currentUser } from "@/server/session"

type Context = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await currentUser()
    if (!user) return Response.json({ error: "Log in to continue" }, { status: 401 })
    const body = (await request.json()) as { action?: string }
    if (body.action !== "accept" && body.action !== "reject") throw new AppError("Choose accept or reject")
    const { id } = await context.params
    return Response.json({ booking: await decideBooking(user.id, id, body.action) })
  } catch (error) {
    return jsonError(error)
  }
}
