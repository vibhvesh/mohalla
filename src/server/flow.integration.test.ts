import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { signup } from "@/server/accounts";
import { createBooking, decideBooking, ownerOverview } from "@/server/bookings";
import { createGame, joinGame } from "@/server/games";
import { addBlock, createVenue } from "@/server/venues";
import { civilToday, defaultHours } from "@/lib/slots";

function plusDays(days: number) {
  const today = civilToday("Asia/Kolkata");
  const [year, month, day] = today.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}
import { AppError } from "@/lib/errors";

const databaseUrl = process.env.DATABASE_URL ?? "";

async function reset() {
  await prisma.pickupJoin.deleteMany();
  await prisma.pickupGame.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.slotBlock.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.user.deleteMany();
}

const listing = {
  name: "Test Ground",
  description: "Created by the automated test. This is not a real Vadodara venue.",
  address: "Test lane",
  area: "Alkapuri",
  city: "Vadodara",
  lat: 22.31,
  lng: 73.18,
  sports: ["cricket", "football"],
  hourlyPrice: 1000,
  photos: [],
  contactPhone: "9876543210",
  contactEmail: "",
  openingHours: defaultHours(),
  timezone: "Asia/Kolkata",
};

describe("booking and host flow", () => {
  beforeEach(async () => {
    expect(databaseUrl).toContain("mohalla_test");
    await reset();
  });

  afterAll(async () => {
    await reset();
    await prisma.$disconnect();
  });

  it("lets an owner list a ground, a player book it, and the owner accept it", async () => {
    const owner = await signup({
      name: "Owner One",
      email: "owner@example.com",
      phone: "",
      password: "password123",
    });
    const player = await signup({
      name: "Player Two",
      email: "",
      phone: "9123456780",
      password: "password123",
    });
    const venue = await createVenue(owner.id, listing);

    const unclaimed = await prisma.venue.create({
      data: {
        name: "Unnamed pitch",
        description: "Imported from OpenStreetMap (node/99). Unclaimed — claim this turf.",
        city: "Vadodara",
        lat: 22.3,
        lng: 73.2,
        sports: ["cricket"],
        claimed: false,
        source: "osm",
        osmId: "node/99",
      },
    });
    await expect(
      createBooking(player.id, {
        venueId: unclaimed.id,
        sport: "cricket",
        date: plusDays(20),
        startTime: "18:00",
        endTime: "19:00",
        paymentMethod: "pay_at_venue",
      }),
    ).rejects.toBeInstanceOf(AppError);

    const first = await createBooking(player.id, {
      venueId: venue.id,
      sport: "cricket",
      date: plusDays(20),
      startTime: "18:00",
      endTime: "20:00",
      paymentMethod: "razorpay",
    });
    expect(first.booking.amountInr).toBe(2000);
    expect(first.booking.status).toBe("pending");
    expect(first.booking.paymentMethod).toBe("pay_at_venue");

    await expect(
      createBooking(player.id, {
        venueId: venue.id,
        sport: "football",
        date: plusDays(20),
        startTime: "19:00",
        endTime: "20:00",
        paymentMethod: "pay_at_venue",
      }),
    ).rejects.toThrow(/no longer available/);

    await addBlock(owner.id, venue.id, {
      date: plusDays(21),
      startTime: "07:00",
      endTime: "09:00",
      reason: "Maintenance",
    });
    await expect(
      createBooking(player.id, {
        venueId: venue.id,
        sport: "cricket",
        date: plusDays(21),
        startTime: "07:00",
        endTime: "08:00",
        paymentMethod: "pay_at_venue",
      }),
    ).rejects.toThrow(/no longer available/);

    const accepted = await decideBooking(owner.id, first.booking.id, "accept");
    expect(accepted.status).toBe("accepted");
    const overview = await ownerOverview(owner.id);
    expect(overview.earnings.allTimeGrossInr).toBe(2000);
    expect(overview.pending).toHaveLength(0);

    const game = await createGame(player.id, {
      title: "Need 1 for cricket at 7pm",
      sport: "cricket",
      area: "Alkapuri",
      city: "Vadodara",
      date: plusDays(30),
      time: "19:00",
      playersNeeded: 1,
      note: "Bring a ball",
      venueId: venue.id,
    });
    const joined = await joinGame(owner.id, game.id);
    expect(joined.spotsLeft).toBe(0);
    expect(joined.status).toBe("full");
    await expect(joinGame(player.id, game.id)).rejects.toThrow(/hosting/);
  });
});
