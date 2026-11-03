export const SPORTS = [
  { id: "cricket", label: "Cricket" },
  { id: "football", label: "Football" },
  { id: "box-cricket", label: "Box cricket" },
  { id: "badminton", label: "Badminton" },
  { id: "tennis", label: "Tennis" },
  { id: "basketball", label: "Basketball" },
  { id: "volleyball", label: "Volleyball" },
  { id: "hockey", label: "Hockey" },
  { id: "pickleball", label: "Pickleball" },
  { id: "futsal", label: "Futsal" },
] as const

export type SportId = (typeof SPORTS)[number]["id"]

const LABELS = new Map(SPORTS.map((sport) => [sport.id, sport.label]))

export function sportLabel(id: string): string {
  return LABELS.get(id as SportId) ?? id.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
}

export function isKnownSport(id: string): boolean {
  return LABELS.has(id as SportId)
}
