import { describe, expect, it } from "vitest";
import { mapOsmElement, sportsFromOsmTag } from "@/lib/osm";

describe("OpenStreetMap pitches", () => {
  it("maps sport tags without inventing a business name", () => {
    expect(sportsFromOsmTag("soccer;cricket")).toEqual(["football", "cricket"]);
    const unnamed = mapOsmElement(
      { type: "way", id: 42, center: { lat: 22.3, lon: 73.18 }, tags: { leisure: "pitch", sport: "cricket" } },
      "Vadodara",
    );
    expect(unnamed).toMatchObject({
      name: "Unnamed pitch",
      osmId: "way/42",
      claimed: false,
      source: "osm",
      sports: ["cricket"],
      city: "Vadodara",
    });
    expect(unnamed?.description).toContain("Unclaimed");
    expect(unnamed?.description).toContain("claim this turf");
    expect(unnamed).not.toHaveProperty("hourlyPrice");
  });

  it("keeps a real OSM name and skips features without coordinates", () => {
    const named = mapOsmElement(
      {
        type: "node",
        id: 7,
        lat: 22.31,
        lon: 73.17,
        tags: { name: "Akota Ground", sport: "soccer", "addr:suburb": "Akota" },
      },
      "Vadodara",
    );
    expect(named?.name).toBe("Akota Ground");
    expect(named?.area).toBe("Akota");
    expect(named?.sports).toEqual(["football"]);
    expect(mapOsmElement({ type: "way", id: 1, tags: { name: "Missing" } }, "Vadodara")).toBeNull();
  });
});
