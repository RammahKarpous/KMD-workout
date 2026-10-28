/** Stored intensity values stay English. The UI translates the key. */
export function intensityKey(value: string): "easy" | "moderate" | "hard" {
  if (value.startsWith("Easy")) return "easy";
  if (value === "Hard") return "hard";
  return "moderate";
}
