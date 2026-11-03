import { AppError, jsonError } from "@/lib/errors"
import { cancelBooking, keepPayAtVenue } from "@/server/bookings"
import { currentUser } from "@/server/session"

type Context = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, context: Context) {
  try {
    const user = await currentUser()
    if (!user) return Response.json({ error: "Log in to continue" }, { status: 401 })
    const body = (await request.json()) as { action?: string }
    const { id } = await context.params
    if (body.action === "cancel") return Response.json({ booking: await cancelBooking(user.id, id) })
    if (body.action === "pay_at_venue") return Response.json({ booking: await keepPayAtVenue(user.id, id) })
    throw new AppError("Unsupported action")
  } catch (error) {
    return jsonError(error)
  }
}
