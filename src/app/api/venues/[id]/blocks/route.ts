import { jsonError } from "@/lib/errors"
import { currentUser } from "@/server/session"
import { addBlock } from "@/server/venues"

type Context = { params: Promise<{ id: string }> }

export async function POST(request: Request, context: Context) {
  try {
    const user = await currentUser()
    if (!user) return Response.json({ error: "Log in to continue" }, { status: 401 })
    const { id } = await context.params
    const block = await addBlock(user.id, id, await request.json())
    return Response.json({ block }, { status: 201 })
  } catch (error) {
    return jsonError(error)
  }
}
