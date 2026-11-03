import { Prisma } from "@/generated/prisma/client"
import { AppError, isRetryableTransaction } from "@/lib/errors"
import { prisma } from "@/lib/prisma"
import {
  createRazorpayOrder,
  isRazorpayConfigured,
  selectPaymentMethod,
  verifyRazorpaySignature,
} from "@/lib/payments"
import {
  bookingAmount,
  civilMonth,
  coveredByAvailableSlots,
  isFutureSlot,
  parseHours,
  slotsForDate,
  summarizeEarnings,
} from "@/lib/slots"
import type { BookingDto } from "@/lib/types"
import { parseBookingInput } from "@/lib/validators"

function toDto(
  booking: {
    id: string
    venueId: string
    sport: string
    date: string
    startTime: string
    endTime: string
    status: string
    amountInr: number
    paymentMethod: string
    paymentStatus: string
    createdAt: Date
    venue: { name: string; area: string; city: string }
    user?: { name: string; phone: string | null }
  },
  includePlayer = false,
): BookingDto {
  return {
    id: booking.id,
    venueId: booking.venueId,
    venueName: booking.venue.name,
    area: booking.venue.area,
    city: booking.venue.city,
    sport: booking.sport,
    date: booking.date,
    startTime: booking.startTime,
    endTime: booking.endTime,
    status: booking.status,
    amountInr: booking.amountInr,
    paymentMethod: booking.paymentMethod,
    paymentStatus: booking.paymentStatus,
    createdAt: booking.createdAt.toISOString(),
    ...(includePlayer && booking.user
      ? { playerName: booking.user.name, playerPhone: booking.user.phone }
      : {}),
  }
}

async function writeBooking(input: ReturnType<typeof parseBookingInput> & { userId: string }) {
  const run = () =>
    prisma.$transaction(
      async (tx) => {
        const venue = await tx.venue.findUnique({ where: { id: input.venueId } })
        if (!venue || !venue.active) throw new AppError("Venue not found", 404)
        if (!venue.claimed || venue.hourlyPrice == null) {
          throw new AppError("This turf is not open for booking until an owner claims it")
        }
        const hours = parseHours(venue.openingHours)
        if (!hours) throw new AppError("This turf has no opening hours yet")
        if (!venue.sports.includes(input.sport)) throw new AppError("That sport is not offered here")

        const bookings = await tx.booking.findMany({
          where: { venueId: venue.id, date: input.date, status: { in: ["pending", "accepted"] } },
        })
        const blocks = await tx.slotBlock.findMany({ where: { venueId: venue.id, date: input.date } })
        const slots = slotsForDate({
          hours,
          date: input.date,
          timezone: venue.timezone,
          bookings,
          blocks,
        })
        if (!coveredByAvailableSlots(slots, input.startTime, input.endTime)) {
          throw new AppError("That slot is no longer available")
        }
        const amountInr = bookingAmount(venue.hourlyPrice, input.startTime, input.endTime)
        if (amountInr == null) throw new AppError("Book between 1 and 4 hours")
        const method = selectPaymentMethod(input.paymentMethod, isRazorpayConfigured())
        return tx.booking.create({
          data: {
            venueId: venue.id,
            userId: input.userId,
            sport: input.sport,
            date: input.date,
            startTime: input.startTime,
            endTime: input.endTime,
            amountInr,
            paymentMethod: method,
            paymentStatus: method === "razorpay" ? "pending" : "pay_at_venue",
            status: "pending",
          },
          include: { venue: true },
        })
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    )

  try {
    return await run()
  } catch (error) {
    if (!isRetryableTransaction(error)) throw error
    return run()
  }
}

export async function createBooking(userId: string, input: unknown) {
  const data = parseBookingInput(input)
  const booking = await writeBooking({ ...data, userId })
  let razorpay: { orderId: string; amount: number; currency: "INR"; keyId: string } | null = null

  if (booking.paymentMethod === "razorpay") {
    try {
      const order = await createRazorpayOrder({
        amountInr: booking.amountInr,
        receipt: booking.id,
      })
      const updated = await prisma.booking.update({
        where: { id: booking.id },
        data: { razorpayOrderId: order.id },
        include: { venue: true },
      })
      razorpay = {
        orderId: order.id,
        amount: order.amount,
        currency: "INR",
        keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || "",
      }
      return { booking: toDto(updated), razorpay }
    } catch (error) {
      console.error(error)
      const updated = await prisma.booking.update({
        where: { id: booking.id },
        data: { paymentMethod: "pay_at_venue", paymentStatus: "pay_at_venue", razorpayOrderId: null },
        include: { venue: true },
      })
      return { booking: toDto(updated), razorpay: null, notice: "Online payment is unavailable. Pay at the venue." }
    }
  }

  return { booking: toDto(booking), razorpay }
}

export async function listMyBookings(userId: string) {
  const bookings = await prisma.booking.findMany({
    where: { userId },
    include: { venue: true },
    orderBy: [{ date: "desc" }, { startTime: "desc" }],
  })
  return bookings.map((booking) => toDto(booking))
}

export async function keepPayAtVenue(userId: string, bookingId: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { venue: true } })
  if (!booking || booking.userId !== userId) throw new AppError("Booking not found", 404)
  if (booking.paymentStatus !== "pending") return toDto(booking)
  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { paymentMethod: "pay_at_venue", paymentStatus: "pay_at_venue" },
    include: { venue: true },
  })
  return toDto(updated)
}

export async function cancelBooking(userId: string, bookingId: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { venue: true } })
  if (!booking || booking.userId !== userId) throw new AppError("Booking not found", 404)
  if (booking.status === "cancelled" || booking.status === "rejected") {
    throw new AppError("This booking is already closed")
  }
  if (!isFutureSlot(booking.date, booking.startTime, booking.venue.timezone)) {
    throw new AppError("This slot has already started")
  }
  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "cancelled" },
    include: { venue: true },
  })
  return toDto(updated)
}

export async function decideBooking(ownerId: string, bookingId: string, action: "accept" | "reject") {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { venue: true, user: true } })
  if (!booking || booking.venue.ownerId !== ownerId) throw new AppError("Booking not found", 404)
  if (booking.status !== "pending") throw new AppError("Only pending requests can be updated")
  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: action === "accept" ? "accepted" : "rejected" },
    include: { venue: true, user: true },
  })
  return toDto(updated, true)
}

export async function markBookingPaid(userId: string, input: {
  bookingId: string
  orderId: string
  paymentId: string
  signature: string
}) {
  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!secret || !verifyRazorpaySignature(input.orderId, input.paymentId, input.signature, secret)) {
    throw new AppError("Payment could not be verified", 400)
  }
  const booking = await prisma.booking.findUnique({ where: { id: input.bookingId }, include: { venue: true } })
  if (!booking || booking.userId !== userId) throw new AppError("Booking not found", 404)
  if (booking.razorpayOrderId !== input.orderId) throw new AppError("Payment does not match this booking", 400)
  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { paymentStatus: "paid", razorpayPaymentId: input.paymentId },
    include: { venue: true },
  })
  return toDto(updated)
}

export async function ownerOverview(ownerId: string) {
  const venues = await prisma.venue.findMany({
    where: { ownerId },
    orderBy: { createdAt: "desc" },
  })
  const bookings = await prisma.booking.findMany({
    where: { venue: { ownerId } },
    include: { venue: true, user: { select: { name: true, phone: true } } },
    orderBy: { createdAt: "desc" },
  })
  const timezone = venues[0]?.timezone || process.env.NEXT_PUBLIC_DEFAULT_TIMEZONE || "Asia/Kolkata"
  return {
    venues: venues.map((venue) => ({
      id: venue.id,
      name: venue.name,
      area: venue.area,
      city: venue.city,
      claimed: venue.claimed,
      active: venue.active,
      hourlyPrice: venue.hourlyPrice,
      sports: venue.sports,
    })),
    pending: bookings.filter((booking) => booking.status === "pending").map((booking) => toDto(booking, true)),
    earnings: summarizeEarnings(bookings, civilMonth(timezone)),
  }
}
