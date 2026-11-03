import { AppError, jsonError } from "@/lib/errors"
import { isValidDate } from "@/lib/slots"
import { slotsForVenue } from "@/server/venues"

type Context = { params: Promise<{ id: string }> }

export async function GET(request: Request, context: Context) {
  try {
    const date = new URL(request.url).searchParams.get("date") || ""
    if (!isValidDate(date)) throw new AppError("Pick a date")
    const { id } = await context.params
    return Response.json(await slotsForVenue(id, date))
  } catch (error) {
    return jsonError(error)
  }
}
