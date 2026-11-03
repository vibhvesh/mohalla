import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  createRazorpayOrder,
  inrToPaise,
  isRazorpayConfigured,
  selectPaymentMethod,
  verifyRazorpaySignature,
} from "@/lib/payments";

describe("payments", () => {
  it("keeps pay-at-venue unless Razorpay keys exist", () => {
    expect(isRazorpayConfigured({})).toBe(false);
    expect(selectPaymentMethod("razorpay", false)).toBe("pay_at_venue");
    expect(selectPaymentMethod("pay_at_venue", true)).toBe("pay_at_venue");
    expect(selectPaymentMethod("razorpay", true)).toBe("razorpay");
    expect(inrToPaise(1200)).toBe(120000);
  });

  it("verifies the Razorpay signature", () => {
    const secret = "secret";
    const signature = createHmac("sha256", secret).update("order_1|pay_1").digest("hex");
    expect(verifyRazorpaySignature("order_1", "pay_1", signature, secret)).toBe(true);
    expect(verifyRazorpaySignature("order_1", "pay_1", "nope", secret)).toBe(false);
  });

  it("creates an order against the Razorpay API shape", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetchImpl: typeof fetch = async (url, init) => {
      calls.push({ url: String(url), init });
      return new Response(JSON.stringify({ id: "order_123", amount: 150000 }), { status: 200 });
    };
    const order = await createRazorpayOrder({
      amountInr: 1500,
      receipt: "booking",
      fetchImpl,
      env: { RAZORPAY_KEY_ID: "rzp_test", RAZORPAY_KEY_SECRET: "sekret" },
    });
    expect(order.id).toBe("order_123");
    const body = JSON.parse(String(calls[0]?.init?.body));
    expect(body).toMatchObject({ amount: 150000, currency: "INR", receipt: "booking" });
    expect(String((calls[0]?.init?.headers as Record<string, string>).authorization)).toMatch(/^Basic /);
  });
});
