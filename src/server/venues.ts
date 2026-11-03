import type { Prisma } from "@/generated/prisma/client"
import { AppError } from "@/lib/errors"
import { prisma } from "@/lib/prisma"
import {
  coveredByAvailableSlots,
  parseHours,
  slotsForDate,
  type WeekHours,
} from "@/lib/slots"
import type { VenueDto } from "@/lib/types"
import { parseBlockInput, parseClaimInput, parseVenueInput } from "@/lib/validators"

type VenueRecord = {
  id: string
  name: string
  description: string
  address: string
  area: string
  city: string
  lat: number
  lng: number
  sports: string[]
  hourlyPrice: number | null
  photos: string[]
  contactPhone: string | null
  contactEmail: string | null
  openingHours: Prisma.JsonValue | null
  timezone: string
  claimed: boolean
  source: string
  osmId: string | null
  active: boolean
}

export function serializeVenue(venue: VenueRecord): VenueDto {
  return {
    id: venue.id,
    name: venue.name,
    description: venue.description,
    address: venue.address,
    area: venue.area,
    city: venue.city,
    lat: venue.lat,
    lng: venue.lng,
    sports: venue.sports,
    hourlyPrice: venue.hourlyPrice,
    photos: venue.photos,
    contactPhone: venue.contactPhone,
    contactEmail: venue.contactEmail,
    openingHours: parseHours(venue.openingHours),
    timezone: venue.timezone,
    claimed: venue.claimed,
    source: venue.source,
    osmId: venue.osmId,
    active: venue.active,
  }
}

function listingData(input: ReturnType<typeof parseVenueInput>) {
  return {
    name: input.name,
    description: input.description,
    address: input.address,
    area: input.area,
    city: input.city,
    lat: input.lat,
    lng: input.lng,
    sports: input.sports,
    hourlyPrice: input.hourlyPrice,
    photos: input.photos,
    contactPhone: input.contactPhone,
    contactEmail: input.contactEmail,
    openingHours: input.openingHours,
    timezone: input.timezone,
    claimed: true,
    active: true,
  }
}

export async function createVenue(ownerId: string, input: unknown) {
  const data = parseVenueInput(input)
  const venue = await prisma.venue.create({
    data: {
      ...listingData(data),
      ownerId,
      source: "owner",
    },
  })
  return serializeVenue(venue)
}

export async function updateVenue(ownerId: string, venueId: string, input: unknown) {
  const existing = await prisma.venue.findUnique({ where: { id: venueId } })
  if (!existing || existing.ownerId !== ownerId) throw new AppError("Venue not found", 404)
  const data = parseVenueInput(input)
  const venue = await prisma.venue.update({
    where: { id: venueId },
    data: listingData(data),
  })
  return serializeVenue(venue)
}

export async function setVenueActive(ownerId: string, venueId: string, active: boolean) {
  const existing = await prisma.venue.findUnique({ where: { id: venueId } })
  if (!existing || existing.ownerId !== ownerId) throw new AppError("Venue not found", 404)
  const venue = await prisma.venue.update({ where: { id: venueId }, data: { active } })
  return serializeVenue(venue)
}

export async function claimVenue(ownerId: string, venueId: string, input: unknown) {
  const existing = await prisma.venue.findUnique({ where: { id: venueId } })
  if (!existing) throw new AppError("Venue not found", 404)
  if (existing.claimed) throw new AppError("This turf has already been claimed", 409)
  const data = parseClaimInput(input)
  const venue = await prisma.venue.update({
    where: { id: venueId },
    data: {
      ...listingData(data),
      ownerId,
      source: existing.source,
      osmId: existing.osmId,
    },
  })
  return serializeVenue(venue)
}

export async function getVenue(id: string, viewerId?: string | null) {
  const venue = await prisma.venue.findUnique({ where: { id } })
  if (!venue) throw new AppError("Venue not found", 404)
  if (!venue.active && venue.ownerId !== viewerId) throw new AppError("Venue not found", 404)
  return { venue: serializeVenue(venue), isOwner: venue.ownerId === viewerId }
}

export async function listVenues(query: {
  city?: string
  sport?: string
  q?: string
  area?: string
  priceMax?: number
  date?: string
  time?: string
}) {
  const where: Prisma.VenueWhereInput = { active: true }
  if (query.city) where.city = { equals: query.city, mode: "insensitive" }
  if (query.sport) where.sports = { has: query.sport }
  if (query.priceMax != null && Number.isFinite(query.priceMax)) {
    where.hourlyPrice = { lte: query.priceMax, not: null }
  }
  if (query.area) {
    where.OR = [
      { area: { contains: query.area, mode: "insensitive" } },
      { address: { contains: query.area, mode: "insensitive" } },
    ]
  }
  if (query.q) {
    const search = [
      { name: { contains: query.q, mode: "insensitive" as const } },
      { area: { contains: query.q, mode: "insensitive" as const } },
      { address: { contains: query.q, mode: "insensitive" as const } },
    ]
    where.AND = [{ OR: search }]
  }

  const venues = await prisma.venue.findMany({
    where,
    orderBy: [{ claimed: "desc" }, { name: "asc" }],
  })

  if (!query.date) return venues.map(serializeVenue)

  const ids = venues.map((venue) => venue.id)
  const [bookings, blocks] = await Promise.all([
    prisma.booking.findMany({
      where: { venueId: { in: ids }, date: query.date, status: { in: ["pending", "accepted"] } },
    }),
    prisma.slotBlock.findMany({ where: { venueId: { in: ids }, date: query.date } }),
  ])

  return venues
    .filter((venue) => {
      const hours = parseHours(venue.openingHours)
      const slots = slotsForDate({
        hours,
        date: query.date!,
        timezone: venue.timezone,
        bookings: bookings.filter((booking) => booking.venueId === venue.id),
        blocks: blocks.filter((block) => block.venueId === venue.id),
      })
      if (query.time) {
        const endHour = Number(query.time.slice(0, 2)) + 1
        const end = `${String(endHour).padStart(2, "0")}:00`
        return coveredByAvailableSlots(slots, query.time, end)
      }
      return slots.some((slot) => slot.available)
    })
    .map(serializeVenue)
}

export async function slotsForVenue(venueId: string, date: string) {
  const venue = await prisma.venue.findUnique({ where: { id: venueId } })
  if (!venue || !venue.active) throw new AppError("Venue not found", 404)
  const hours = parseHours(venue.openingHours) as WeekHours | null
  const [bookings, blocks] = await Promise.all([
    prisma.booking.findMany({
      where: { venueId, date, status: { in: ["pending", "accepted"] } },
    }),
    prisma.slotBlock.findMany({ where: { venueId, date } }),
  ])
  return {
    slots: slotsForDate({
      hours,
      date,
      timezone: venue.timezone,
      bookings,
      blocks,
    }),
    bookable: Boolean(venue.claimed && venue.hourlyPrice != null && hours),
  }
}

export async function addBlock(ownerId: string, venueId: string, input: unknown) {
  const venue = await prisma.venue.findUnique({ where: { id: venueId } })
  if (!venue || venue.ownerId !== ownerId) throw new AppError("Venue not found", 404)
  const data = parseBlockInput(input)
  return prisma.slotBlock.create({
    data: { venueId, ...data },
  })
}

export async function removeBlock(ownerId: string, venueId: string, blockId: string) {
  const block = await prisma.slotBlock.findUnique({ where: { id: blockId }, include: { venue: true } })
  if (!block || block.venueId !== venueId || block.venue.ownerId !== ownerId) {
    throw new AppError("Block not found", 404)
  }
  await prisma.slotBlock.delete({ where: { id: blockId } })
}

export async function ownerVenueDetail(ownerId: string, venueId: string) {
  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    include: {
      blocks: { orderBy: [{ date: "asc" }, { startTime: "asc" }] },
      bookings: {
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true, phone: true } } },
        take: 50,
      },
    },
  })
  if (!venue || venue.ownerId !== ownerId) throw new AppError("Venue not found", 404)
  return {
    venue: serializeVenue(venue),
    blocks: venue.blocks.map((block) => ({
      id: block.id,
      date: block.date,
      startTime: block.startTime,
      endTime: block.endTime,
      reason: block.reason,
    })),
    bookings: venue.bookings.map((booking) => ({
      id: booking.id,
      venueId: booking.venueId,
      venueName: venue.name,
      area: venue.area,
      city: venue.city,
      sport: booking.sport,
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      status: booking.status,
      amountInr: booking.amountInr,
      paymentMethod: booking.paymentMethod,
      paymentStatus: booking.paymentStatus,
      createdAt: booking.createdAt.toISOString(),
      playerName: booking.user.name,
      playerPhone: booking.user.phone,
    })),
  }
}
