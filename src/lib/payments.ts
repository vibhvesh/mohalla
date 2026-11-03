import { createHmac, timingSafeEqual } from "node:crypto"

export type PaymentMethod = "pay_at_venue" | "razorpay"

type RazorpayEnv = {
  RAZORPAY_KEY_ID?: string
  RAZORPAY_KEY_SECRET?: string
}

export function isRazorpayConfigured(
  env: RazorpayEnv = {
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
  },
): boolean {
  return Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET)
}

export function selectPaymentMethod(
  requested: PaymentMethod,
  configured: boolean,
): PaymentMethod {
  if (requested === "razorpay" && configured) return "razorpay"
  return "pay_at_venue"
}

export function inrToPaise(amountInr: number): number {
  return Math.round(amountInr * 100)
}

export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string,
): boolean {
  const expected = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex")
  const actual = Buffer.from(signature)
  const wanted = Buffer.from(expected)
  if (actual.length !== wanted.length) return false
  return timingSafeEqual(actual, wanted)
}

export async function createRazorpayOrder(input: {
  amountInr: number
  receipt: string
  fetchImpl?: typeof fetch
  env?: RazorpayEnv
}): Promise<{ id: string; amount: number; currency: "INR" }> {
  const env = input.env ?? {
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
  }
  const keyId = env.RAZORPAY_KEY_ID
  const secret = env.RAZORPAY_KEY_SECRET
  if (!keyId || !secret) {
    throw new Error("Razorpay is not configured")
  }
  const fetchImpl = input.fetchImpl ?? fetch
  const response = await fetchImpl("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${keyId}:${secret}`).toString("base64")}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      amount: inrToPaise(input.amountInr),
      currency: "INR",
      receipt: input.receipt.slice(0, 40),
    }),
  })
  if (!response.ok) {
    throw new Error(`Razorpay order failed (${response.status})`)
  }
  const data = (await response.json()) as { id?: string; amount?: number }
  if (!data.id) throw new Error("Razorpay did not return an order id")
  return { id: data.id, amount: data.amount ?? inrToPaise(input.amountInr), currency: "INR" }
}
