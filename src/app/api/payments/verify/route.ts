import { jsonError } from "@/lib/errors"
import { markBookingPaid } from "@/server/bookings"
import { currentUser } from "@/server/session"

export async function POST(request: Request) {
  try {
    const user = await currentUser()
    if (!user) return Response.json({ error: "Log in to continue" }, { status: 401 })
    const body = (await request.json()) as {
      bookingId?: string
      orderId?: string
      paymentId?: string
      signature?: string
    }
    if (!body.bookingId || !body.orderId || !body.paymentId || !body.signature) {
      return Response.json({ error: "Missing payment details" }, { status: 400 })
    }
    const booking = await markBookingPaid(user.id, {
      bookingId: body.bookingId,
      orderId: body.orderId,
      paymentId: body.paymentId,
      signature: body.signature,
    })
    return Response.json({ booking })
  } catch (error) {
    return jsonError(error)
  }
}
