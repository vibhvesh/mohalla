import { z } from "zod"
import { AppError } from "@/lib/errors"
import { normalizePhone } from "@/lib/phone"
import { isKnownSport } from "@/lib/sports"
import { defaultHours, isValidDate, parseHours, type WeekHours } from "@/lib/slots"

const hourField = z.string().regex(/^(?:[01]\d|2[0-3]):00$|^24:00$/, "Use a whole hour, like 18:00")

const daySchema = z.object({
  closed: z.boolean(),
  open: hourField,
  close: hourField,
})

const hoursSchema = z.object({
  sun: daySchema,
  mon: daySchema,
  tue: daySchema,
  wed: daySchema,
  thu: daySchema,
  fri: daySchema,
  sat: daySchema,
})

function fail(error: z.ZodError): never {
  const message = error.issues[0]?.message || "Check the form and try again"
  throw new AppError(message)
}

export function parseSignup(input: unknown) {
  const schema = z.object({
    name: z.string().trim().min(2, "Enter your name").max(80),
    email: z.string().trim().optional().default(""),
    phone: z.string().trim().optional().default(""),
    password: z.string().min(8, "Use at least 8 characters").max(72),
  })
  const parsed = schema.safeParse(input)
  if (!parsed.success) fail(parsed.error)
  const emailRaw = parsed.data.email.toLowerCase()
  const phoneRaw = parsed.data.phone
  let email: string | null = null
  let phone: string | null = null
  if (emailRaw) {
    const emailCheck = z.email().safeParse(emailRaw)
    if (!emailCheck.success) throw new AppError("Enter a valid email")
    email = emailCheck.data
  }
  if (phoneRaw) {
    phone = normalizePhone(phoneRaw)
    if (!phone) throw new AppError("Enter a valid mobile number")
  }
  if (!email && !phone) throw new AppError("Add an email or a mobile number")
  return { name: parsed.data.name, email, phone, password: parsed.data.password }
}

export function parseLogin(input: unknown) {
  const schema = z.object({
    identifier: z.string().trim().min(3, "Enter your email or mobile number").max(120),
    password: z.string().min(1, "Enter your password").max(72),
  })
  const parsed = schema.safeParse(input)
  if (!parsed.success) fail(parsed.error)
  const identifier = parsed.data.identifier
  if (identifier.includes("@")) {
    return { email: identifier.toLowerCase(), phone: null as string | null, password: parsed.data.password }
  }
  const phone = normalizePhone(identifier)
  if (!phone) throw new AppError("Enter a valid email or mobile number")
  return { email: null as string | null, phone, password: parsed.data.password }
}

function photoList(value: unknown): string[] {
  const parsed = z.array(z.string().trim().max(500)).max(8).safeParse(value ?? [])
  if (!parsed.success) throw new AppError("Add up to 8 photo links")
  const photos = parsed.data
  return photos.filter(Boolean).map((photo) => {
    let url: URL
    try {
      url = new URL(photo)
    } catch {
      throw new AppError("Photo links must be full http or https URLs")
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new AppError("Photo links must be full http or https URLs")
    }
    return url.toString()
  })
}

function sportsList(value: unknown): string[] {
  const parsed = z.array(z.string().trim()).max(8).safeParse(value)
  if (!parsed.success || parsed.data.length === 0) throw new AppError("Pick at least one sport")
  const sports = parsed.data
  for (const sport of sports) {
    if (!isKnownSport(sport)) throw new AppError(`Unknown sport: ${sport}`)
  }
  return [...new Set(sports)]
}

export function parseHoursInput(value: unknown): WeekHours {
  const parsed = hoursSchema.safeParse(value ?? defaultHours())
  if (!parsed.success) fail(parsed.error)
  const hours = parseHours(parsed.data)
  if (!hours) throw new AppError("Opening hours need a start before the close, on the hour")
  return hours
}

const listingShape = {
  name: z.string().trim().min(2, "Enter the ground name").max(80),
  description: z.string().trim().max(1000).optional().default(""),
  address: z.string().trim().min(3, "Enter an address").max(180),
  area: z.string().trim().max(80).optional().default(""),
  city: z.string().trim().min(2, "Enter a city").max(80),
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
  sports: z.array(z.string()),
  hourlyPrice: z.number().int().min(1, "Enter an hourly price").max(100000),
  photos: z.array(z.string()).optional(),
  contactPhone: z.string().trim().min(8, "Add a contact number").max(20),
  contactEmail: z.string().trim().optional().default(""),
  openingHours: z.unknown().optional(),
  timezone: z.string().trim().min(3).max(60).optional(),
}

export function parseVenueInput(input: unknown) {
  const parsed = z.object(listingShape).safeParse(input)
  if (!parsed.success) fail(parsed.error)
  const phone = normalizePhone(parsed.data.contactPhone)
  if (!phone) throw new AppError("Enter a valid contact number")
  let contactEmail: string | null = null
  if (parsed.data.contactEmail) {
    const email = z.email().safeParse(parsed.data.contactEmail.toLowerCase())
    if (!email.success) throw new AppError("Enter a valid contact email")
    contactEmail = email.data
  }
  return {
    name: parsed.data.name,
    description: parsed.data.description,
    address: parsed.data.address,
    area: parsed.data.area,
    city: parsed.data.city,
    lat: parsed.data.lat,
    lng: parsed.data.lng,
    sports: sportsList(parsed.data.sports),
    hourlyPrice: parsed.data.hourlyPrice,
    photos: photoList(parsed.data.photos),
    contactPhone: phone,
    contactEmail,
    openingHours: parseHoursInput(parsed.data.openingHours),
    timezone: validTimeZone(parsed.data.timezone || "Asia/Kolkata"),
  }
}

function validTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return value;
  } catch {
    throw new AppError("Enter a valid timezone, like Asia/Kolkata");
  }
}

export function parseClaimInput(input: unknown) {
  return parseVenueInput(input)
}

export function parseBlockInput(input: unknown) {
  const schema = z.object({
    date: z.string().refine(isValidDate, "Enter a real date"),
    startTime: hourField,
    endTime: hourField,
    reason: z.string().trim().max(140).optional().default(""),
  })
  const parsed = schema.safeParse(input)
  if (!parsed.success) fail(parsed.error)
  if (parsed.data.endTime <= parsed.data.startTime) {
    throw new AppError("Block end must be after the start")
  }
  return parsed.data
}

export function parseBookingInput(input: unknown) {
  const schema = z.object({
    venueId: z.string().min(1),
    sport: z.string().trim().min(1),
    date: z.string().refine(isValidDate, "Enter a real date"),
    startTime: hourField,
    endTime: hourField,
    paymentMethod: z.enum(["pay_at_venue", "razorpay"]).optional().default("pay_at_venue"),
  })
  const parsed = schema.safeParse(input)
  if (!parsed.success) fail(parsed.error)
  if (!isKnownSport(parsed.data.sport)) throw new AppError("Pick a sport")
  return parsed.data
}

export function parseGameInput(input: unknown) {
  const schema = z.object({
    title: z.string().trim().min(3, "Add a short title").max(80),
    sport: z.string().trim(),
    area: z.string().trim().min(2, "Add an area").max(80),
    city: z.string().trim().min(2).max(80),
    date: z.string().refine(isValidDate, "Enter a real date"),
    time: hourField,
    playersNeeded: z.number().int().min(1, "Need at least one more player").max(30),
    note: z.string().trim().max(500).optional().default(""),
    venueId: z.string().trim().optional().nullable(),
  })
  const parsed = schema.safeParse(input)
  if (!parsed.success) fail(parsed.error)
  if (!isKnownSport(parsed.data.sport)) throw new AppError("Pick a sport")
  return { ...parsed.data, venueId: parsed.data.venueId || null }
}

export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/"
  return value
}
