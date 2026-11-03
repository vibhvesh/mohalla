import type { WeekHours } from "@/lib/slots"

export type PublicUser = {
  id: string
  name: string
  email: string | null
  phone: string | null
}

export type VenueDto = {
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
  openingHours: WeekHours | null
  timezone: string
  claimed: boolean
  source: string
  osmId: string | null
  active: boolean
}

export type BookingDto = {
  id: string
  venueId: string
  venueName: string
  area: string
  city: string
  sport: string
  date: string
  startTime: string
  endTime: string
  status: string
  amountInr: number
  paymentMethod: string
  paymentStatus: string
  createdAt: string
  playerName?: string
  playerPhone?: string | null
}
