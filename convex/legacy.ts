import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internalMutation } from "./_generated/server";
import { foodCategoryValidator, foodMomentValidator, nutrientsValidator } from "./lib/food";

/** Same cap as `scripts/legacy/import.ts`. One mutation stays a small batch. */
const MAX_BATCH = 200;

const productRow = v.object({
  email: v.string(),
  legacyId: v.number(),
  legacyUserId: v.number(),
  name: v.string(),
  per100g: nutrientsValidator,
  createdAt: v.number(),
});

const entryRow = v.object({
  email: v.string(),
  legacyId: v.number(),
  legacyUserId: v.number(),
  productName: v.string(),
  productLegacyId: v.optional(v.number()),
  date: v.string(),
  moment: foodMomentValidator,
  category: v.optional(foodCategoryValidator),
  isRedMeat: v.boolean(),
  grams: v.optional(v.number()),
  ml: v.optional(v.number()),
  totals: nutrientsValidator,
  createdAt: v.number(),
});

const limitRow = v.object({
  email: v.string(),
  legacyUserId: v.number(),
  kcal: v.number(),
  fat: v.number(),
  saturatedFat: v.number(),
  carbs: v.number(),
  sugar: v.number(),
  protein: v.number(),
});

/**
 * Import one batch of the Laravel dump. The caller already mapped rows.
 * Products and diary rows are skipped when `legacyId` is already stored,
 * so a rerun does not duplicate them. Limits are upserted per user.
 * Totals are written as given: they are historical snapshots, not recomputed.
 * The account must already exist (log in once). This does not read `users`
 * password hashes and does not create accounts.
 */
export const importLegacy = internalMutation({
  args: {
    kind: v.union(v.literal("products"), v.literal("entries"), v.literal("limits")),
    products: v.optional(v.array(productRow)),
    entries: v.optional(v.array(entryRow)),
    limits: v.optional(v.array(limitRow)),
  },
  returns: v.object({
    inserted: v.number(),
    skipped: v.number(),
    upserted: v.number(),
  }),
  handler: async (ctx, args) => {
    if (args.kind === "products") {
      const rows = args.products ?? [];
      assertBatch(rows.length);
      return insertProducts(ctx, rows);
    }
    if (args.kind === "entries") {
      const rows = args.entries ?? [];
      assertBatch(rows.length);
      return insertEntries(ctx, rows);
    }
    const rows = args.limits ?? [];
    assertBatch(rows.length);
    return upsertLimits(ctx, rows);
  },
});

async function insertProducts(
  ctx: MutationCtx,
  rows: {
    email: string;
    legacyId: number;
    name: string;
    per100g: {
      kcal: number;
      fat: number;
      saturatedFat: number;
      carbs: number;
      sugar: number;
      protein: number;
    };
    createdAt: number;
  }[],
): Promise<{ inserted: number; skipped: number; upserted: number }> {
  const users = await usersByEmail(ctx, rows.map((row) => row.email));
  let inserted = 0;
  let skipped = 0;
  for (const row of rows) {
    const userId = users.get(row.email)!;
    const existing = await ctx.db
      .query("foodProducts")
      .withIndex("by_legacyId", (q) => q.eq("legacyId", row.legacyId))
      .take(2);
    if (existing.length > 1) {
      throw new Error(`More than one product with legacyId ${row.legacyId}`);
    }
    if (existing.length === 1) {
      if (existing[0]!.userId !== userId) {
        throw new Error(`Product legacyId ${row.legacyId} belongs to another account`);
      }
      skipped += 1;
      continue;
    }
    await ctx.db.insert("foodProducts", {
      userId,
      name: row.name,
      per100g: row.per100g,
      legacyId: row.legacyId,
      createdAt: row.createdAt,
    });
    inserted += 1;
  }
  return { inserted, skipped, upserted: 0 };
}

async function insertEntries(
  ctx: MutationCtx,
  rows: {
    email: string;
    legacyId: number;
    productName: string;
    productLegacyId?: number;
    date: string;
    moment: "ontbijt" | "lunch" | "tussendoor" | "diner" | "voor_training" | "na_training";
    category?:
      | "groente"
      | "fruit"
      | "koolhydraten"
      | "vlees"
      | "noten"
      | "zuivel"
      | "kaas"
      | "bereidingsvet"
      | "margarine"
      | "onbekend"
      | "vocht";
    isRedMeat: boolean;
    grams?: number;
    ml?: number;
    totals: {
      kcal: number;
      fat: number;
      saturatedFat: number;
      carbs: number;
      sugar: number;
      protein: number;
    };
    createdAt: number;
  }[],
): Promise<{ inserted: number; skipped: number; upserted: number }> {
  const users = await usersByEmail(ctx, rows.map((row) => row.email));
  let inserted = 0;
  let skipped = 0;
  for (const row of rows) {
    const userId = users.get(row.email)!;
    const existing = await ctx.db
      .query("foodEntries")
      .withIndex("by_legacyId", (q) => q.eq("legacyId", row.legacyId))
      .take(2);
    if (existing.length > 1) {
      throw new Error(`More than one diary row with legacyId ${row.legacyId}`);
    }
    if (existing.length === 1) {
      if (existing[0]!.userId !== userId) {
        throw new Error(`Diary legacyId ${row.legacyId} belongs to another account`);
      }
      skipped += 1;
      continue;
    }
    const productId = await productIdForLegacy(ctx, userId, row.productLegacyId);
    await ctx.db.insert("foodEntries", {
      userId,
      ...(productId ? { productId } : {}),
      productName: row.productName,
      date: row.date,
      moment: row.moment,
      ...(row.category ? { category: row.category } : {}),
      isRedMeat: row.isRedMeat,
      ...(row.grams !== undefined ? { grams: row.grams } : {}),
      ...(row.ml !== undefined ? { ml: row.ml } : {}),
      totals: row.totals,
      legacyId: row.legacyId,
      createdAt: row.createdAt,
    });
    inserted += 1;
  }
  return { inserted, skipped, upserted: 0 };
}

async function upsertLimits(
  ctx: MutationCtx,
  rows: {
    email: string;
    kcal: number;
    fat: number;
    saturatedFat: number;
    carbs: number;
    sugar: number;
    protein: number;
  }[],
): Promise<{ inserted: number; skipped: number; upserted: number }> {
  const users = await usersByEmail(ctx, rows.map((row) => row.email));
  let upserted = 0;
  for (const row of rows) {
    const userId = users.get(row.email)!;
    const limits = {
      kcal: row.kcal,
      fat: row.fat,
      saturatedFat: row.saturatedFat,
      carbs: row.carbs,
      sugar: row.sugar,
      protein: row.protein,
    };
    const existing = await ctx.db
      .query("nutritionLimits")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (existing) await ctx.db.patch(existing._id, limits);
    else await ctx.db.insert("nutritionLimits", { userId, ...limits });
    upserted += 1;
  }
  return { inserted: 0, skipped: 0, upserted };
}

async function usersByEmail(ctx: MutationCtx, emails: string[]): Promise<Map<string, Id<"users">>> {
  const found = new Map<string, Id<"users">>();
  for (const email of new Set(emails)) {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();
    if (!user) {
      throw new Error(`No account for ${email}. Log in to the app with that address first.`);
    }
    found.set(email, user._id);
  }
  return found;
}

async function productIdForLegacy(
  ctx: MutationCtx,
  userId: Id<"users">,
  legacyId: number | undefined,
): Promise<Id<"foodProducts"> | undefined> {
  if (legacyId === undefined) return undefined;
  const matches = await ctx.db
    .query("foodProducts")
    .withIndex("by_legacyId", (q) => q.eq("legacyId", legacyId))
    .take(2);
  if (matches.length === 0) {
    throw new Error(`Product legacyId ${legacyId} is not imported yet. Import products first.`);
  }
  if (matches.length > 1) throw new Error(`More than one product with legacyId ${legacyId}`);
  const product = matches[0]!;
  if (product.userId !== userId) {
    throw new Error(`Product legacyId ${legacyId} belongs to another account`);
  }
  return product._id;
}

function assertBatch(length: number): void {
  if (length > MAX_BATCH) {
    throw new Error(`Batch has ${length} rows. Send at most ${MAX_BATCH}.`);
  }
}
