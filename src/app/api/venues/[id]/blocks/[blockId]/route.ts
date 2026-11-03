import { jsonError } from "@/lib/errors"
import { currentUser } from "@/server/session"
import { removeBlock } from "@/server/venues"

type Context = { params: Promise<{ id: string; blockId: string }> }

export async function DELETE(_request: Request, context: Context) {
  try {
    const user = await currentUser()
    if (!user) return Response.json({ error: "Log in to continue" }, { status: 401 })
    const { id, blockId } = await context.params
    await removeBlock(user.id, id, blockId)
    return Response.json({ ok: true })
  } catch (error) {
    return jsonError(error)
  }
}
