import { canonicalIsoDate, FOOD_CATEGORIES, type FoodCategory, type FoodMoment } from "../../shared/lib/food.ts";
import type { Nutrients } from "../../shared/lib/nutrients.ts";
import { parseInserts, type SqlInsert, type SqlValue } from "./sql.ts";

const NUTRIENT_KEYS = ["kcal", "fat", "saturatedFat", "carbs", "sugar", "protein"] as const satisfies readonly (keyof Nutrients)[];

/**
 * Case-insensitive word or prefix. `rund` matches `Rundergehakt`;
 * `brandade` does not, because the keyword has to start a word.
 * One list, so a dry-run and the import use the same rule.
 */
export const RED_MEAT_KEYWORDS = [
  "rund",
  "rundvlees",
  "runder",
  "gehakt",
  "biefstuk",
  "kalf",
  "kalfs",
  "lam",
  "lams",
] as const;

const MOMENTS: Record<string, FoodMoment> = {
  Ontbijt: "ontbijt",
  Lunch: "lunch",
  Tussendoor: "tussendoor",
  Diner: "diner",
  "Voor training": "voor_training",
  "Na training": "na_training",
};

const TABLES = ["products", "diary_entries", "nutritional_limits"] as const;

export type LegacyProduct = {
  email: string;
  legacyId: number;
  legacyUserId: number;
  name: string;
  per100g: Nutrients;
  createdAt: number;
};

export type LegacyEntry = {
  email: string;
  legacyId: number;
  legacyUserId: number;
  productName: string;
  productLegacyId?: number;
  date: string;
  moment: FoodMoment;
  category?: FoodCategory;
  isRedMeat: boolean;
  grams?: number;
  ml?: number;
  totals: Nutrients;
  createdAt: number;
};

export type LegacyLimit = {
  email: string;
  legacyUserId: number;
  kcal: number;
  fat: number;
  saturatedFat: number;
  carbs: number;
  sugar: number;
  protein: number;
};

export type UnmatchedName = {
  legacyUserId: number;
  email: string;
  name: string;
  count: number;
};

export type RedMeatMatch = {
  legacyId: number;
  legacyUserId: number;
  email: string;
  name: string;
};

export type DayKcal = {
  email: string;
  legacyUserId: number;
  date: string;
  kcal: number;
  entries: number;
};

export type LegacyReport = {
  productsRead: number;
  productsMerged: number;
  productsKept: number;
  mergedLegacyIds: number[];
  entriesRead: number;
  unmatchedEntries: number;
  unmatched: UnmatchedName[];
  redMeat: RedMeatMatch[];
  limits: number;
  dayKcal: DayKcal[];
};

export type LegacyImport = {
  products: LegacyProduct[];
  entries: LegacyEntry[];
  limits: LegacyLimit[];
  report: LegacyReport;
};

type Raw = Record<string, SqlValue>;

/** Trim and collapse every whitespace run, including the double spaces in the dump. */
export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export function nameKey(name: string): string {
  return normalizeName(name).toLocaleLowerCase("nl");
}

export function matchesRedMeat(name: string): boolean {
  const words = nameKey(name).split(/[^\p{L}\p{N}]+/u).filter((word) => word.length > 0);
  return words.some((word) => RED_MEAT_KEYWORDS.some((keyword) => word.startsWith(keyword)));
}

export function buildLegacyImport(sql: string, users: ReadonlyMap<number, string>): LegacyImport {
  const byTable = new Map<string, Raw[]>();
  for (const insert of parseInserts(sql)) {
    const table = insert.table.toLowerCase();
    if (!TABLES.includes(table as (typeof TABLES)[number])) continue;
    const rows = byTable.get(table) ?? [];
    rows.push(...rowsFrom(insert));
    byTable.set(table, rows);
  }

  const needed = new Set<number>();
  for (const table of TABLES) {
    for (const row of byTable.get(table) ?? []) needed.add(asInt(row.user_id, "user_id"));
  }
  const missing = [...needed].filter((id) => !users.has(id)).sort((a, b) => a - b);
  if (missing.length > 0) {
    throw new Error(
      `No email for Laravel user id ${missing.join(", ")}. Pass --user ${missing[0]}=name@example.com`,
    );
  }

  const products = mergeProducts(byTable.get("products") ?? [], users);
  const linked = linkEntries(byTable.get("diary_entries") ?? [], products.kept, users);
  const limits = mapLimits(byTable.get("nutritional_limits") ?? [], users);

  return {
    products: products.kept,
    entries: linked.entries,
    limits,
    report: {
      productsRead: products.read,
      productsMerged: products.mergedLegacyIds.length,
      productsKept: products.kept.length,
      mergedLegacyIds: products.mergedLegacyIds,
      entriesRead: linked.entries.length,
      unmatchedEntries: linked.unmatchedEntries,
      unmatched: linked.unmatched,
      redMeat: linked.redMeat,
      limits: limits.length,
      dayKcal: dayKcal(linked.entries),
    },
  };
}

export function formatReport(report: LegacyReport): string {
  const lines = [
    `Producten: ${report.productsRead} gelezen, ${report.productsMerged} samengevoegd, ${report.productsKept} te importeren`,
    `Dagboekregels: ${report.entriesRead} gelezen, ${report.unmatchedEntries} zonder product`,
    "Namen zonder product:",
  ];
  if (report.unmatched.length === 0) lines.push("  (geen)");
  for (const row of report.unmatched) {
    lines.push(`  - ${row.name} (gebruiker ${row.legacyUserId}, ${row.email}, ${row.count}×)`);
  }
  lines.push("Rood vlees (trefwoord, categorie vlees):");
  if (report.redMeat.length === 0) lines.push("  (geen)");
  for (const row of report.redMeat) {
    lines.push(`  - ${row.name} (regel ${row.legacyId}, ${row.email})`);
  }
  lines.push(`Limieten: ${report.limits}`);
  lines.push("Kcal per dag (opgeslagen totalen):");
  if (report.dayKcal.length === 0) lines.push("  (geen)");
  for (const day of report.dayKcal) {
    const rows = day.entries === 1 ? "regel" : "regels";
    lines.push(`  - ${day.date} ${day.email}: ${day.kcal} kcal over ${day.entries} ${rows}`);
  }
  return lines.join("\n");
}

function mergeProducts(
  rows: Raw[],
  users: ReadonlyMap<number, string>,
): { read: number; kept: LegacyProduct[]; mergedLegacyIds: number[] } {
  const groups = new Map<string, LegacyProduct[]>();
  for (const row of rows) {
    const legacyUserId = asInt(row.user_id, "user_id");
    const product = mapProduct(row, legacyUserId, emailFor(users, legacyUserId));
    const key = `${legacyUserId}\0${product.name}\0${nutrientKey(product.per100g)}`;
    const group = groups.get(key) ?? [];
    group.push(product);
    groups.set(key, group);
  }
  const kept: LegacyProduct[] = [];
  const mergedLegacyIds: number[] = [];
  for (const group of groups.values()) {
    group.sort((a, b) => a.legacyId - b.legacyId);
    kept.push(group[0]!);
    for (const duplicate of group.slice(1)) mergedLegacyIds.push(duplicate.legacyId);
  }
  kept.sort((a, b) => a.legacyId - b.legacyId);
  mergedLegacyIds.sort((a, b) => a - b);
  return { read: rows.length, kept, mergedLegacyIds };
}

function mapProduct(row: Raw, legacyUserId: number, email: string): LegacyProduct {
  return {
    email,
    legacyId: asInt(row.id, "id"),
    legacyUserId,
    name: normalizeName(asString(row.naam, "naam")),
    per100g: nutrientsFrom(row),
    createdAt: parseUtcTimestamp(asString(row.created_at, "created_at")),
  };
}

function linkEntries(
  rows: Raw[],
  products: LegacyProduct[],
  users: ReadonlyMap<number, string>,
): { entries: LegacyEntry[]; unmatched: UnmatchedName[]; unmatchedEntries: number; redMeat: RedMeatMatch[] } {
  const byName = new Map<string, LegacyProduct[]>();
  for (const product of products) {
    const key = `${product.legacyUserId}\0${nameKey(product.name)}`;
    const list = byName.get(key) ?? [];
    list.push(product);
    byName.set(key, list);
  }
  for (const list of byName.values()) list.sort((a, b) => a.legacyId - b.legacyId);

  const entries: LegacyEntry[] = [];
  const unmatchedCounts = new Map<string, UnmatchedName>();
  const redMeat: RedMeatMatch[] = [];
  let unmatchedEntries = 0;

  for (const row of rows) {
    const legacyUserId = asInt(row.user_id, "user_id");
    const email = emailFor(users, legacyUserId);
    const productName = normalizeName(asString(row.product_naam, "product_naam"));
    const category = mapCategory(row.category);
    const amount = row.gram === null || row.gram === undefined ? undefined : asNonNegative(row.gram, "gram");
    const keyword = category === "vlees" && matchesRedMeat(productName);
    const storedRed = asBool(row.is_red_meat);
    const match = byName.get(`${legacyUserId}\0${nameKey(productName)}`)?.[0];
    if (!match) {
      unmatchedEntries += 1;
      const unmatchedKey = `${legacyUserId}\0${nameKey(productName)}`;
      const current = unmatchedCounts.get(unmatchedKey);
      if (current) current.count += 1;
      else unmatchedCounts.set(unmatchedKey, { legacyUserId, email, name: productName, count: 1 });
    }
    if (keyword) {
      redMeat.push({
        legacyId: asInt(row.id, "id"),
        legacyUserId,
        email,
        name: productName,
      });
    }
    const entry: LegacyEntry = {
      email,
      legacyId: asInt(row.id, "id"),
      legacyUserId,
      productName,
      date: canonicalIsoDate(asString(row.datum, "datum").slice(0, 10)),
      moment: mapMoment(asString(row.moment, "moment")),
      isRedMeat: category === "vlees" && (storedRed || keyword),
      totals: nutrientsFrom(row),
      createdAt: parseUtcTimestamp(asString(row.created_at, "created_at")),
    };
    if (match) entry.productLegacyId = match.legacyId;
    if (category) entry.category = category;
    if (category === "vocht") {
      if (amount !== undefined) entry.ml = amount;
    } else if (amount !== undefined) {
      entry.grams = amount;
    }
    entries.push(entry);
  }

  entries.sort((a, b) => a.legacyId - b.legacyId);
  const unmatched = [...unmatchedCounts.values()].sort((a, b) => a.name.localeCompare(b.name, "nl"));
  redMeat.sort((a, b) => a.legacyId - b.legacyId);
  return { entries, unmatched, unmatchedEntries, redMeat };
}

function mapLimits(rows: Raw[], users: ReadonlyMap<number, string>): LegacyLimit[] {
  const byUser = new Map<number, LegacyLimit>();
  for (const row of rows) {
    const legacyUserId = asInt(row.user_id, "user_id");
    byUser.set(legacyUserId, {
      email: emailFor(users, legacyUserId),
      legacyUserId,
      kcal: asNonNegative(row.kcal_limiet, "kcal_limiet"),
      fat: asNonNegative(row.vet_limiet, "vet_limiet"),
      saturatedFat: asNonNegative(row.verzadigd_limiet, "verzadigd_limiet"),
      carbs: asNonNegative(row.koolhydraten_limiet, "koolhydraten_limiet"),
      sugar: asNonNegative(row.suiker_limiet, "suiker_limiet"),
      protein: asNonNegative(row.eiwit_limiet, "eiwit_limiet"),
    });
  }
  return [...byUser.values()].sort((a, b) => a.legacyUserId - b.legacyUserId);
}

function dayKcal(entries: LegacyEntry[]): DayKcal[] {
  const days = new Map<string, DayKcal>();
  for (const entry of entries) {
    const key = `${entry.legacyUserId}\0${entry.date}`;
    const current = days.get(key);
    if (current) {
      current.kcal += entry.totals.kcal;
      current.entries += 1;
    } else {
      days.set(key, {
        email: entry.email,
        legacyUserId: entry.legacyUserId,
        date: entry.date,
        kcal: entry.totals.kcal,
        entries: 1,
      });
    }
  }
  return [...days.values()].sort(
    (a, b) => a.date.localeCompare(b.date) || a.legacyUserId - b.legacyUserId,
  );
}

function rowsFrom(insert: SqlInsert): Raw[] {
  return insert.rows.map((values) => {
    const row: Raw = {};
    insert.columns.forEach((column, index) => {
      row[column] = values[index] ?? null;
    });
    return row;
  });
}

function nutrientsFrom(row: Raw): Nutrients {
  return {
    kcal: asNonNegative(row.kcal, "kcal"),
    fat: asNonNegative(row.vet, "vet"),
    saturatedFat: asNonNegative(row.verzadigd, "verzadigd"),
    carbs: asNonNegative(row.koolhydraten, "koolhydraten"),
    sugar: asNonNegative(row.suiker, "suiker"),
    protein: asNonNegative(row.eiwit, "eiwit"),
  };
}

function nutrientKey(nutrients: Nutrients): string {
  return NUTRIENT_KEYS.map((key) => String(nutrients[key])).join("|");
}

function mapCategory(value: SqlValue): FoodCategory | undefined {
  if (value === null) return undefined;
  const category = asString(value, "category").toLowerCase();
  if (category === "") return undefined;
  if (!(FOOD_CATEGORIES as readonly string[]).includes(category)) {
    throw new Error(`Unknown category ${category}`);
  }
  return category as FoodCategory;
}

function mapMoment(value: string): FoodMoment {
  const moment = MOMENTS[value];
  if (!moment) throw new Error(`Unknown moment ${value}`);
  return moment;
}

/** MySQL `DATETIME` is UTC in this dump. `Date.parse` without a zone would use the machine zone. */
export function parseUtcTimestamp(value: string): number {
  const match = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/.exec(value);
  if (!match) throw new Error(`Timestamp ${value} is not YYYY-MM-DD HH:MM:SS`);
  const ms = Date.parse(`${match[1]}T${match[2]}Z`);
  if (Number.isNaN(ms)) throw new Error(`Timestamp ${value} is not a real time`);
  return ms;
}

function emailFor(users: ReadonlyMap<number, string>, legacyUserId: number): string {
  const email = users.get(legacyUserId);
  if (!email) throw new Error(`No email for Laravel user id ${legacyUserId}`);
  return email;
}

function asString(value: SqlValue | undefined, label: string): string {
  if (typeof value !== "string") throw new Error(`${label} must be a string`);
  return value;
}

function asInt(value: SqlValue | undefined, label: string): number {
  const number = asFinite(value, label);
  if (!Number.isSafeInteger(number) || number < 0) throw new Error(`${label} must be a non-negative integer`);
  return number;
}

function asFinite(value: SqlValue | undefined, label: string): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  throw new Error(`${label} must be a number`);
}

function asNonNegative(value: SqlValue | undefined, label: string): number {
  const number = asFinite(value, label);
  if (number < 0) throw new Error(`${label} must be 0 or more`);
  return number;
}

function asBool(value: SqlValue | undefined): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "number") return value !== 0;
  const text = value.trim().toLowerCase();
  if (text === "1" || text === "true") return true;
  if (text === "0" || text === "false" || text === "") return false;
  throw new Error(`is_red_meat ${value} is not 0 or 1`);
}
