import { jsonError } from "@/lib/errors"
import { signup, toPublicUser } from "@/server/accounts"
import { setSessionCookie } from "@/server/session"

export async function POST(request: Request) {
  try {
    const user = await signup(await request.json())
    await setSessionCookie(user.id)
    return Response.json({ user: toPublicUser(user) })
  } catch (error) {
    return jsonError(error)
  }
}
