export const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const
export type DayKey = (typeof DAY_KEYS)[number]

export type DayHours = {
  closed: boolean
  open: string
  close: string
}

export type WeekHours = Record<DayKey, DayHours>

export type Slot = {
  start: string
  end: string
  available: boolean
  reason?: "booked" | "past" | "blocked"
}

const WEEKDAY_TO_KEY: Record<string, DayKey> = {
  Sun: "sun",
  Mon: "mon",
  Tue: "tue",
  Wed: "wed",
  Thu: "thu",
  Fri: "fri",
  Sat: "sat",
}

const HOUR = /^(?:([01]\d|2[0-3]):([0-5]\d)|24:00)$/

export function defaultHours(): WeekHours {
  const day: DayHours = { closed: false, open: "06:00", close: "23:00" }
  return {
    sun: { ...day },
    mon: { ...day },
    tue: { ...day },
    wed: { ...day },
    thu: { ...day },
    fri: { ...day },
    sat: { ...day },
  }
}

export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

export function parseMinutes(value: string): number | null {
  if (value === "24:00") return 24 * 60
  const match = HOUR.exec(value)
  if (!match || match[1] == null || match[2] == null) return null
  return Number(match[1]) * 60 + Number(match[2])
}

export function formatMinutes(minutes: number): string {
  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
}

export function zonedParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  })
  const parts: Record<string, string> = {}
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") parts[part.type] = part.value
  }
  const hour = parts.hour === "24" ? "00" : parts.hour
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${hour}:${parts.minute}`,
    weekday: parts.weekday ?? "Mon",
  }
}

export function weekdayOfCivilDate(date: string, timeZone: string): DayKey {
  const [year, month, day] = date.split("-").map(Number)
  for (let hour = 0; hour < 30; hour += 1) {
    const probe = new Date(Date.UTC(year, month - 1, day, hour, 30, 0))
    const parts = zonedParts(probe, timeZone)
    if (parts.date === date) {
      const key = WEEKDAY_TO_KEY[parts.weekday]
      if (key) return key
    }
  }
  throw new Error(`Could not resolve weekday for ${date}`)
}

export function isPastSlot(date: string, startTime: string, timeZone: string, now = new Date()): boolean {
  const current = zonedParts(now, timeZone)
  if (date < current.date) return true
  if (date > current.date) return false
  return startTime <= current.time
}

export function isFutureSlot(date: string, startTime: string, timeZone: string, now = new Date()): boolean {
  return !isPastSlot(date, startTime, timeZone, now)
}

export function civilToday(timeZone: string, now = new Date()): string {
  return zonedParts(now, timeZone).date
}

export function civilMonth(timeZone: string, now = new Date()): string {
  return civilToday(timeZone, now).slice(0, 7)
}

export function parseHours(value: unknown): WeekHours | null {
  if (!value || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  const hours = {} as WeekHours
  for (const key of DAY_KEYS) {
    const day = record[key]
    if (!day || typeof day !== "object") return null
    const entry = day as Record<string, unknown>
    const open = typeof entry.open === "string" ? entry.open : ""
    const close = typeof entry.close === "string" ? entry.close : ""
    const closed = Boolean(entry.closed)
    if (!closed) {
      const openMin = parseMinutes(open)
      const closeMin = parseMinutes(close)
      if (open === "24:00" || openMin == null || closeMin == null || closeMin <= openMin) return null
      if (!open.endsWith(":00") || !close.endsWith(":00")) return null
    }
    hours[key] = { closed, open: open || "06:00", close: close || "23:00" }
  }
  return hours
}

export function durationHours(start: string, end: string): number | null {
  const startMin = parseMinutes(start)
  const endMin = parseMinutes(end)
  if (startMin == null || endMin == null || endMin <= startMin) return null
  if ((endMin - startMin) % 60 !== 0) return null
  if (!start.endsWith(":00") || !end.endsWith(":00")) return null
  return (endMin - startMin) / 60
}

function rangesOverlap(start: number, end: number, ranges: { start: string; end: string }[]): boolean {
  return ranges.some((range) => {
    const rangeStart = parseMinutes(range.start)
    const rangeEnd = parseMinutes(range.end)
    if (rangeStart == null || rangeEnd == null) return false
    return start < rangeEnd && end > rangeStart
  })
}

export function slotsForDate(input: {
  hours: WeekHours | null
  date: string
  timezone: string
  bookings: { startTime: string; endTime: string; status: string }[]
  blocks: { startTime: string; endTime: string }[]
  now?: Date
}): Slot[] {
  if (!input.hours || !isValidDate(input.date)) return []
  const day = input.hours[weekdayOfCivilDate(input.date, input.timezone)]
  if (!day || day.closed) return []
  const open = parseMinutes(day.open)
  const close = parseMinutes(day.close)
  if (open == null || close == null || close <= open) return []

  const held = input.bookings
    .filter((booking) => booking.status === "pending" || booking.status === "accepted")
    .map((booking) => ({ start: booking.startTime, end: booking.endTime }))
  const blocked = input.blocks.map((block) => ({ start: block.startTime, end: block.endTime }))
  const now = input.now ?? new Date()
  const slots: Slot[] = []

  for (let minute = open; minute + 60 <= close; minute += 60) {
    const start = formatMinutes(minute)
    const end = formatMinutes(minute + 60)
    if (rangesOverlap(minute, minute + 60, blocked)) {
      slots.push({ start, end, available: false, reason: "blocked" })
    } else if (rangesOverlap(minute, minute + 60, held)) {
      slots.push({ start, end, available: false, reason: "booked" })
    } else if (isPastSlot(input.date, start, input.timezone, now)) {
      slots.push({ start, end, available: false, reason: "past" })
    } else {
      slots.push({ start, end, available: true })
    }
  }
  return slots
}

export function coveredByAvailableSlots(slots: Slot[], start: string, end: string): boolean {
  const hours = durationHours(start, end)
  if (hours == null || hours < 1 || hours > 4) return false
  const startMin = parseMinutes(start)
  if (startMin == null) return false
  for (let offset = 0; offset < hours; offset += 1) {
    const slotStart = formatMinutes(startMin + offset * 60)
    const slot = slots.find((item) => item.start === slotStart)
    if (!slot?.available) return false
  }
  return true
}

export function bookingAmount(hourlyPrice: number, start: string, end: string): number | null {
  const hours = durationHours(start, end)
  if (hours == null) return null
  return hourlyPrice * hours
}

export type EarningBooking = {
  status: string
  amountInr: number
  paymentStatus: string
  date: string
}

export function summarizeEarnings(bookings: EarningBooking[], month: string) {
  const accepted = bookings.filter((booking) => booking.status === "accepted")
  const sum = (rows: EarningBooking[]) => rows.reduce((total, booking) => total + booking.amountInr, 0)
  const inMonth = accepted.filter((booking) => booking.date.startsWith(month))
  return {
    month,
    monthGrossInr: sum(inMonth),
    monthCount: inMonth.length,
    allTimeGrossInr: sum(accepted),
    allTimeCount: accepted.length,
    onlineCollectedInr: sum(accepted.filter((booking) => booking.paymentStatus === "paid")),
    payAtVenueInr: sum(
      accepted.filter((booking) => booking.paymentStatus === "pay_at_venue" || booking.paymentStatus === "pending"),
    ),
    pendingCount: bookings.filter((booking) => booking.status === "pending").length,
  }
}
