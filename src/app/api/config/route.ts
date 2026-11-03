import { isRazorpayConfigured } from "@/lib/payments"

export async function GET() {
  return Response.json({
    city: process.env.NEXT_PUBLIC_DEFAULT_CITY || "Vadodara",
    lat: Number(process.env.NEXT_PUBLIC_DEFAULT_LAT || 22.3072),
    lng: Number(process.env.NEXT_PUBLIC_DEFAULT_LNG || 73.1812),
    timezone: process.env.NEXT_PUBLIC_DEFAULT_TIMEZONE || "Asia/Kolkata",
    razorpayEnabled: isRazorpayConfigured(),
    razorpayKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || null,
  })
}
