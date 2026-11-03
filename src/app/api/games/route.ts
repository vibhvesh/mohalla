import { jsonError } from "@/lib/errors"
import { createGame, listGames } from "@/server/games"
import { currentUser } from "@/server/session"

export async function GET(request: Request) {
  try {
    const city = new URL(request.url).searchParams.get("city") || undefined
    const user = await currentUser()
    return Response.json({ games: await listGames(city, user?.id) })
  } catch (error) {
    return jsonError(error)
  }
}

export async function POST(request: Request) {
  try {
    const user = await currentUser()
    if (!user) return Response.json({ error: "Log in to continue" }, { status: 401 })
    const game = await createGame(user.id, await request.json())
    return Response.json({ game }, { status: 201 })
  } catch (error) {
    return jsonError(error)
  }
}
