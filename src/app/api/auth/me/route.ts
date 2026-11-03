import { jsonError } from "@/lib/errors"
import { currentUser } from "@/server/session"

export async function GET() {
  try {
    return Response.json({ user: await currentUser() })
  } catch (error) {
    return jsonError(error)
  }
}
