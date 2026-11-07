import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import nl from "../../messages/nl.json";
import { formatDiaryDate } from "@/features/food/diary/diaryModel";
import { isLocale, localeCookie, resolveLocale } from "./locale";

function flatten(value: unknown, prefix = ""): string[] {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value).flatMap(([key, child]) =>
      flatten(child, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [prefix];
}

describe("message catalogs", () => {
  it("has the same keys in Dutch and English", () => {
    expect(flatten(nl).sort()).toEqual(flatten(en).sort());
  });

  it("switches a visible label when the catalog changes", () => {
    expect(en.nav.workout).toBe("Workout");
    expect(nl.nav.workout).toBe("Training");
    expect(en.food.moments.ontbijt).not.toBe(nl.food.moments.ontbijt);
    expect(en.food.categories.groente).toBe("Vegetables");
    expect(nl.food.categories.groente).toBe("Groente");
    expect(en.workout.quickStart).not.toBe(nl.workout.quickStart);
  });
});

describe("localeCookie", () => {
  it("persists the switched language without a URL prefix", () => {
    expect(localeCookie("nl")).toEqual({
      name: "kmd-locale",
      value: "nl",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    expect(localeCookie("en").value).toBe("en");
    expect(resolveLocale(localeCookie("nl").value, "en-US")).toBe("nl");
    expect(resolveLocale(localeCookie("en").value, "nl-NL")).toBe("en");
  });
});

describe("resolveLocale", () => {
  it("keeps a saved choice ahead of the browser language", () => {
    expect(resolveLocale("nl", "en-US,en;q=0.9")).toBe("nl");
    expect(resolveLocale("en", "nl-NL,nl;q=0.9")).toBe("en");
  });

  it("uses Dutch when the browser asks for it and nothing is saved", () => {
    expect(resolveLocale(undefined, "nl-NL,nl;q=0.9,en;q=0.8")).toBe("nl");
    expect(resolveLocale(null, "en-US")).toBe("en");
    expect(resolveLocale("fr", "de")).toBe("en");
    expect(isLocale("nl")).toBe(true);
    expect(isLocale("fr")).toBe(false);
  });
});

describe("formatDiaryDate", () => {
  it("follows the locale", () => {
    expect(formatDiaryDate("2026-10-28", "en")).toContain("October");
    expect(formatDiaryDate("2026-10-28", "nl")).toContain("oktober");
  });
});
