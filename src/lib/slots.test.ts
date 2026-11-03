import { describe, expect, it } from "vitest";
import {
  coveredByAvailableSlots,
  defaultHours,
  isPastSlot,
  slotsForDate,
  summarizeEarnings,
} from "@/lib/slots";

const timezone = "Asia/Kolkata";

describe("slots", () => {
  it("builds hourly slots and hides closed days", () => {
    const hours = defaultHours();
    hours.sun.closed = true;
    expect(slotsForDate({ hours, date: "2026-11-08", timezone, bookings: [], blocks: [] })).toEqual([]);
    const tuesday = slotsForDate({
      hours,
      date: "2026-11-10",
      timezone,
      bookings: [],
      blocks: [],
      now: new Date("2026-11-03T12:00:00+05:30"),
    });
    expect(tuesday[0]).toMatchObject({ start: "06:00", end: "07:00", available: true });
    expect(tuesday.at(-1)).toMatchObject({ start: "22:00", end: "23:00", available: true });
    expect(tuesday).toHaveLength(17);
  });

  it("treats pending bookings and blocks as unavailable, and ignores rejected ones", () => {
    const slots = slotsForDate({
      hours: defaultHours(),
      date: "2026-11-10",
      timezone,
      now: new Date("2026-11-03T12:00:00+05:30"),
      bookings: [
        { startTime: "18:00", endTime: "19:00", status: "pending" },
        { startTime: "16:00", endTime: "17:00", status: "rejected" },
      ],
      blocks: [{ startTime: "19:00", endTime: "21:00" }],
    });
    expect(slots.find((slot) => slot.start === "16:00")?.available).toBe(true);
    expect(slots.find((slot) => slot.start === "18:00")).toMatchObject({ available: false, reason: "booked" });
    expect(slots.find((slot) => slot.start === "19:00")).toMatchObject({ available: false, reason: "blocked" });
    expect(slots.find((slot) => slot.start === "20:00")?.available).toBe(false);
    expect(coveredByAvailableSlots(slots, "18:00", "20:00")).toBe(false);
    expect(coveredByAvailableSlots(slots, "21:00", "23:00")).toBe(true);
  });

  it("marks earlier hours today as past", () => {
    expect(isPastSlot("2026-11-03", "18:00", timezone, new Date("2026-11-03T18:30:00+05:30"))).toBe(true);
    const slots = slotsForDate({
      hours: defaultHours(),
      date: "2026-11-03",
      timezone,
      bookings: [],
      blocks: [],
      now: new Date("2026-11-03T18:30:00+05:30"),
    });
    expect(slots.find((slot) => slot.start === "18:00")?.reason).toBe("past");
    expect(slots.find((slot) => slot.start === "19:00")?.available).toBe(true);
  });

  it("summarises accepted earnings for the month", () => {
    const summary = summarizeEarnings(
      [
        { status: "accepted", amountInr: 1000, paymentStatus: "pay_at_venue", date: "2026-11-10" },
        { status: "accepted", amountInr: 500, paymentStatus: "paid", date: "2026-10-02" },
        { status: "pending", amountInr: 800, paymentStatus: "pay_at_venue", date: "2026-11-11" },
        { status: "rejected", amountInr: 900, paymentStatus: "pay_at_venue", date: "2026-11-11" },
      ],
      "2026-11",
    );
    expect(summary.monthGrossInr).toBe(1000);
    expect(summary.allTimeGrossInr).toBe(1500);
    expect(summary.onlineCollectedInr).toBe(500);
    expect(summary.payAtVenueInr).toBe(1000);
    expect(summary.pendingCount).toBe(1);
  });
});
