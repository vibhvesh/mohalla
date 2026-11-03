import { jsonError } from "@/lib/errors"
import { createBooking, listMyBookings } from "@/server/bookings"
import { currentUser } from "@/server/session"

export async function GET() {
  try {
    const user = await currentUser()
    if (!user) return Response.json({ error: "Log in to continue" }, { status: 401 })
    return Response.json({ bookings: await listMyBookings(user.id) })
  } catch (error) {
    return jsonError(error)
  }
}

export async function POST(request: Request) {
  try {
    const user = await currentUser()
    if (!user) return Response.json({ error: "Log in to continue" }, { status: 401 })
    const result = await createBooking(user.id, await request.json())
    return Response.json(result, { status: 201 })
  } catch (error) {
    return jsonError(error)
  }
}
