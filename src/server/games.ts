import { AppError } from "@/lib/errors"
import { prisma } from "@/lib/prisma"
import { isFutureSlot } from "@/lib/slots"
import { parseGameInput } from "@/lib/validators"

function serialize(game: {
  id: string
  hostId: string
  sport: string
  title: string
  area: string
  city: string
  date: string
  time: string
  playersNeeded: number
  note: string
  status: string
  venueId: string | null
  host: { id: string; name: string }
  venue: { id: string; name: string } | null
  joins: { userId: string; user: { name: string } }[]
}, viewerId?: string | null) {
  const spotsLeft = Math.max(0, game.playersNeeded - game.joins.length)
  return {
    id: game.id,
    sport: game.sport,
    title: game.title,
    area: game.area,
    city: game.city,
    date: game.date,
    time: game.time,
    playersNeeded: game.playersNeeded,
    spotsLeft,
    note: game.note,
    status: spotsLeft === 0 && game.status !== "cancelled" ? "full" : game.status,
    venue: game.venue ? { id: game.venue.id, name: game.venue.name } : null,
    host: { id: game.host.id, name: game.host.name },
    players: game.joins.map((join) => join.user.name),
    joined: Boolean(viewerId && game.joins.some((join) => join.userId === viewerId)),
    hosting: viewerId === game.hostId,
  }
}

const include = {
  host: { select: { id: true, name: true } },
  venue: { select: { id: true, name: true } },
  joins: { include: { user: { select: { name: true } } } },
} as const

export async function listGames(city: string | undefined, viewerId?: string | null) {
  const games = await prisma.pickupGame.findMany({
    where: {
      status: { not: "cancelled" },
      ...(city ? { city: { equals: city, mode: "insensitive" } } : {}),
    },
    include,
    orderBy: [{ date: "asc" }, { time: "asc" }],
  })
  return games.map((game) => serialize(game, viewerId))
}

export async function createGame(hostId: string, input: unknown) {
  const data = parseGameInput(input)
  const timezone = process.env.NEXT_PUBLIC_DEFAULT_TIMEZONE || "Asia/Kolkata"
  if (!isFutureSlot(data.date, data.time, timezone)) {
    throw new AppError("Pick a time that has not already passed")
  }
  if (data.venueId) {
    const venue = await prisma.venue.findUnique({ where: { id: data.venueId } })
    if (!venue || !venue.active) throw new AppError("That ground is not available")
  }
  const game = await prisma.pickupGame.create({
    data: {
      hostId,
      sport: data.sport,
      title: data.title,
      area: data.area,
      city: data.city,
      date: data.date,
      time: data.time,
      playersNeeded: data.playersNeeded,
      note: data.note,
      venueId: data.venueId,
    },
    include,
  })
  return serialize(game, hostId)
}

export async function joinGame(userId: string, gameId: string) {
  return prisma.$transaction(async (tx) => {
    const game = await tx.pickupGame.findUnique({ where: { id: gameId }, include })
    if (!game || game.status === "cancelled") throw new AppError("Game not found", 404)
    if (game.hostId === userId) throw new AppError("You are already hosting this game")
    if (game.joins.some((join) => join.userId === userId)) throw new AppError("You have already joined")
    if (game.joins.length >= game.playersNeeded) throw new AppError("This game is full")
    await tx.pickupJoin.create({ data: { gameId, userId } })
    const spots = game.playersNeeded - (game.joins.length + 1)
    if (spots <= 0) {
      await tx.pickupGame.update({ where: { id: gameId }, data: { status: "full" } })
    }
    const updated = await tx.pickupGame.findUniqueOrThrow({ where: { id: gameId }, include })
    return serialize(updated, userId)
  })
}

export async function leaveGame(userId: string, gameId: string) {
  const join = await prisma.pickupJoin.findUnique({ where: { gameId_userId: { gameId, userId } } })
  if (!join) throw new AppError("You are not in this game", 404)
  await prisma.pickupJoin.delete({ where: { id: join.id } })
  await prisma.pickupGame.update({
    where: { id: gameId },
    data: { status: "open" },
  })
  const game = await prisma.pickupGame.findUniqueOrThrow({ where: { id: gameId }, include })
  return serialize(game, userId)
}
