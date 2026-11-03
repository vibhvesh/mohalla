import { jsonError } from "@/lib/errors"
import { clearSessionCookie } from "@/server/session"

export async function POST() {
  try {
    await clearSessionCookie()
    return Response.json({ ok: true })
  } catch (error) {
    return jsonError(error)
  }
}
