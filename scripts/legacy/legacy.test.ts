import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { totalsForAmount } from "@/shared/lib/nutrients";
import { parseArgs } from "./parse-dump.ts";
import { parseInserts } from "./sql.ts";
import {
  RED_MEAT_KEYWORDS,
  buildLegacyImport,
  formatReport,
  matchesRedMeat,
  normalizeName,
  parseUtcTimestamp,
} from "./transform.ts";

const fixturePath = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixture.sql");
const users = new Map<number, string>([
  [1, "a@x.com"],
  [2, "b@y.com"],
]);

describe("parseInserts", () => {
  it("reads escapes, doubled quotes, NULL, and decimals", () => {
    const inserts = parseInserts(`
      INSERT INTO \`products\` (\`id\`, \`naam\`, \`kcal\`) VALUES
      (1, 'O\\'Brien', 102.00),
      (2, 'it''s oats', NULL);
    `);
    expect(inserts).toHaveLength(1);
    expect(inserts[0]?.table).toBe("products");
    expect(inserts[0]?.rows).toEqual([
      [1, "O'Brien", 102],
      [2, "it's oats", null],
    ]);
  });

  it("keeps commas and parentheses inside strings and skips other statements", () => {
    const inserts = parseInserts(`
      CREATE TABLE \`products\` (\`id\` int);
      INSERT INTO \`demo\`.\`products\` (\`naam\`) VALUES ('Soep (kop), groot');
    `);
    expect(inserts).toEqual([
      { table: "products", columns: ["naam"], rows: [["Soep (kop), groot"]] },
    ]);
  });
});

describe("matchesRedMeat", () => {
  it("uses one keyword list as a case-insensitive word or prefix", () => {
    expect(RED_MEAT_KEYWORDS).toContain("rund");
    expect(RED_MEAT_KEYWORDS).toContain("lams");
    expect(matchesRedMeat("Rundergehakt")).toBe(true);
    expect(matchesRedMeat("een biefstuk")).toBe(true);
    expect(matchesRedMeat("Lamskotelet")).toBe(true);
    expect(matchesRedMeat("Gehaktbal")).toBe(true);
    expect(matchesRedMeat("Kipfilet")).toBe(false);
    expect(matchesRedMeat("brandade")).toBe(false);
  });
});

describe("buildLegacyImport", () => {
  const result = buildLegacyImport(readFileSync(fixturePath, "utf8"), users);

  it("merges exact duplicates, keeps per-portion products, and ignores the users table", () => {
    expect(normalizeName("  Haver  mout ")).toBe("Haver mout");
    expect(result.report.productsRead).toBe(11);
    expect(result.report.productsMerged).toBe(1);
    expect(result.report.mergedLegacyIds).toEqual([2]);
    expect(result.products.map((product) => product.legacyId)).toEqual([1, 3, 4, 5, 6, 7, 8, 9, 18, 19]);
    expect(result.products.find((product) => product.legacyId === 1)?.name).toBe("Haver mout");
    expect(result.products.find((product) => product.name === "Test1")?.per100g.kcal).toBe(100);
    expect(result.products.find((product) => product.name === "Portie pindakaas")?.per100g.kcal).toBe(850);
    expect(result.products.find((product) => product.legacyId === 6)?.name).toBe("O'Brien oats");
    expect(result.products.every((product) => product.email !== "secret-hash-owner@example.com")).toBe(true);
  });

  it("links by normalized name, keeps snapshot totals, and stores drinks as ml", () => {
    const oats = result.entries.find((entry) => entry.legacyId === 10);
    expect(oats?.productLegacyId).toBe(1);
    expect(oats?.productName).toBe("HAVER mout");
    expect(oats?.totals.kcal).toBe(999);
    expect(oats?.moment).toBe("ontbijt");
    expect(oats?.grams).toBe(50);
    const product = result.products.find((row) => row.legacyId === 1);
    expect(product).toBeDefined();
    expect(oats?.totals.kcal).not.toBe(
      totalsForAmount(product!.per100g, oats?.grams ?? 0).kcal,
    );

    const water = result.entries.find((entry) => entry.legacyId === 11);
    expect(water?.category).toBe("vocht");
    expect(water?.ml).toBe(300);
    expect(water?.grams).toBeUndefined();
    expect(water?.totals.kcal).toBe(15);

    const miscategorized = result.entries.find((entry) => entry.legacyId === 14);
    expect(miscategorized?.category).toBe("vocht");
    expect(miscategorized?.ml).toBe(80);
    expect(miscategorized?.grams).toBeUndefined();
    expect(miscategorized?.isRedMeat).toBe(false);

    const unmatched = result.entries.find((entry) => entry.legacyId === 15);
    expect(unmatched?.productLegacyId).toBeUndefined();
    expect(unmatched?.category).toBeUndefined();
    expect(unmatched?.moment).toBe("voor_training");
    expect(result.report.unmatched.map((row) => row.name)).toEqual(["Fantasiesoep", "it's a snack"]);

    const after = result.entries.find((entry) => entry.legacyId === 16);
    expect(after?.moment).toBe("na_training");
    expect(after?.productName).toBe("it's a snack");
    expect(parseUtcTimestamp("2024-05-02 07:15:00")).toBe(Date.parse("2024-05-02T07:15:00Z"));
    expect(oats?.createdAt).toBe(Date.parse("2024-05-02T07:15:00Z"));
    expect(oats?.date).toBe("2024-05-02");
  });

  it("backfills red meat only for vlees names that hit the keyword list", () => {
    const mince = result.entries.find((entry) => entry.legacyId === 12);
    const chicken = result.entries.find((entry) => entry.legacyId === 13);
    expect(mince?.isRedMeat).toBe(true);
    expect(chicken?.isRedMeat).toBe(true);
    expect(result.report.redMeat.map((row) => row.name)).toEqual(["Rundergehakt"]);
    expect(formatReport(result.report)).toContain("Rundergehakt");
    expect(formatReport(result.report)).not.toContain("Kipfilet");
  });

  it("maps limits and sums stored kcal per day", () => {
    expect(result.limits).toEqual([
      {
        email: "a@x.com",
        legacyUserId: 1,
        kcal: 2000,
        fat: 50,
        saturatedFat: 15,
        carbs: 220,
        sugar: 30,
        protein: 130,
      },
      {
        email: "b@y.com",
        legacyUserId: 2,
        kcal: 1800,
        fat: 40,
        saturatedFat: 12,
        carbs: 200,
        sugar: 25,
        protein: 110,
      },
    ]);
    const day = result.report.dayKcal.find((row) => row.date === "2024-05-02" && row.legacyUserId === 1);
    expect(day?.kcal).toBe(999 + 15 + 240 + 110);
    expect(day?.entries).toBe(4);
  });

  it("refuses a user id that has no email", () => {
    expect(() => buildLegacyImport(readFileSync(fixturePath, "utf8"), new Map([[1, "a@x.com"]]))).toThrow(
      /user id 2/,
    );
  });
});

describe("parseArgs", () => {
  it("reads repeated user mappings", () => {
    const args = parseArgs(["--dump", "dump.sql", "--user", "1=A@x.com", "--user", "2=b@y.com", "--dry-run"]);
    expect(args.dryRun).toBe(true);
    expect(args.users.get(1)).toBe("a@x.com");
    expect(args.users.get(2)).toBe("b@y.com");
  });
});
