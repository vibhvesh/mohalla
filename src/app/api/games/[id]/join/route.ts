import { jsonError } from "@/lib/errors"
import { joinGame, leaveGame } from "@/server/games"
import { currentUser } from "@/server/session"

type Context = { params: Promise<{ id: string }> }

export async function POST(_request: Request, context: Context) {
  try {
    const user = await currentUser()
    if (!user) return Response.json({ error: "Log in to continue" }, { status: 401 })
    const { id } = await context.params
    return Response.json({ game: await joinGame(user.id, id) })
  } catch (error) {
    return jsonError(error)
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const user = await currentUser()
    if (!user) return Response.json({ error: "Log in to continue" }, { status: 401 })
    const { id } = await context.params
    return Response.json({ game: await leaveGame(user.id, id) })
  } catch (error) {
    return jsonError(error)
  }
}
