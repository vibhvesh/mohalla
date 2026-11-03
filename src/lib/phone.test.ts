import { describe, expect, it } from "vitest";
import { formatPhone, normalizePhone } from "@/lib/phone";
import { distanceKm } from "@/lib/money";

describe("phone and distance", () => {
  it("normalises Indian mobiles and keeps other numbers", () => {
    expect(normalizePhone("98765 43210")).toBe("+919876543210");
    expect(normalizePhone("+91 98765 43210")).toBe("+919876543210");
    expect(normalizePhone("12345")).toBeNull();
    expect(formatPhone("+919876543210")).toBe("+91 98765 43210");
  });

  it("measures a short hop inside Vadodara", () => {
    const km = distanceKm(22.3072, 73.1812, 22.31, 73.19);
    expect(km).toBeGreaterThan(0);
    expect(km).toBeLessThan(5);
  });
});
