import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import {
  assertProductName,
  canonicalIsoDate,
  DRINK_CATEGORY,
  entryAmount,
  inclusiveIsoDayCount,
  resolveEntryAmount,
  resolveIsRedMeat,
  type FoodCategory,
} from "../shared/lib/food";
import {
  assertNutrients,
  rescaleTotals,
  totalsForAmount,
  type Nutrients,
} from "../shared/lib/nutrients";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./lib/auth";
import { foodCategoryValidator, foodMomentValidator, nutrientsValidator } from "./lib/food";

/** A normal day is a handful of rows. The extra read tells us we hit the cap. */
const MAX_ENTRIES_PER_DAY = 200;
/** Overview is one day; the dietist week is Monday–Friday. A month is the longest single read. */
const MAX_RANGE_DAYS = 31;
const MAX_ENTRIES_IN_RANGE = 1_000;

export const listByDate = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const day = canonicalIsoDate(date);
    const rows = await ctx.db
      .query("foodEntries")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", day))
      .take(MAX_ENTRIES_PER_DAY + 1);
    return newestFirst(cap(rows, MAX_ENTRIES_PER_DAY));
  },
});

/**
 * Inclusive `YYYY-MM-DD` range for the overview and dietist pages.
 * `date` sorts lexicographically, so `gte`/`lte` on the index is a real
 * range — no `.filter()`.
 */
export const listByDateRange = query({
  args: { startDate: v.string(), endDate: v.string() },
  handler: async (ctx, { startDate, endDate }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const start = canonicalIsoDate(startDate);
    const end = canonicalIsoDate(endDate);
    if (start > end) throw new Error("Start date must be on or before the end date.");
    const days = inclusiveIsoDayCount(start, end);
    if (days > MAX_RANGE_DAYS) {
      throw new Error(`Date range is limited to ${MAX_RANGE_DAYS} days.`);
    }
    const rows = await ctx.db
      .query("foodEntries")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).gte("date", start).lte("date", end),
      )
      .take(MAX_ENTRIES_IN_RANGE + 1);
    return chronological(cap(rows, MAX_ENTRIES_IN_RANGE));
  },
});

export const add = mutation({
  args: {
    productId: v.optional(v.id("foodProducts")),
    productName: v.optional(v.string()),
    per100g: v.optional(nutrientsValidator),
    date: v.string(),
    moment: foodMomentValidator,
    category: v.optional(foodCategoryValidator),
    isRedMeat: v.optional(v.boolean()),
    grams: v.optional(v.number()),
    ml: v.optional(v.number()),
    legacyId: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const resolved = resolveEntryAmount(args.category, args.grams, args.ml);
    const source = await productSource(ctx, userId, {
      productId: args.productId,
      productName: args.productName,
      per100g: args.per100g,
    });
    const legacyId = args.legacyId === undefined ? undefined : assertLegacyId(args.legacyId);
    return ctx.db.insert("foodEntries", {
      userId,
      ...(source.productId ? { productId: source.productId } : {}),
      productName: source.productName,
      date: canonicalIsoDate(args.date),
      moment: args.moment,
      ...(args.category ? { category: args.category } : {}),
      isRedMeat: resolveIsRedMeat(args.category, args.isRedMeat ?? false),
      ...(resolved.grams !== undefined ? { grams: resolved.grams } : {}),
      ...(resolved.ml !== undefined ? { ml: resolved.ml } : {}),
      totals: totalsForAmount(source.per100g, resolved.amount),
      ...(legacyId !== undefined ? { legacyId } : {}),
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("foodEntries"),
    productId: v.optional(v.id("foodProducts")),
    productName: v.optional(v.string()),
    per100g: v.optional(nutrientsValidator),
    date: v.optional(v.string()),
    moment: v.optional(foodMomentValidator),
    category: v.optional(v.union(foodCategoryValidator, v.null())),
    isRedMeat: v.optional(v.boolean()),
    grams: v.optional(v.number()),
    ml: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await requireOwnedEntry(ctx, userId, args.id);
    const category: FoodCategory | undefined =
      args.category === null ? undefined : (args.category ?? existing.category);
    const categoryChanged = args.category !== undefined && category !== existing.category;
    const amountChanged = args.grams !== undefined || args.ml !== undefined || categoryChanged;

    let grams = existing.grams;
    let ml = existing.ml;
    if (amountChanged) {
      const resolved = resolveEntryAmount(
        category,
        category === DRINK_CATEGORY ? args.grams : (args.grams ?? existing.grams),
        category === DRINK_CATEGORY ? (args.ml ?? existing.ml) : args.ml,
      );
      grams = resolved.grams;
      ml = resolved.ml;
    }

    let productId = existing.productId;
    // An explicit name always wins. Otherwise a nutrient refresh snapshots
    // the linked product's current name.
    let productName =
      args.productName === undefined ? existing.productName : assertProductName(args.productName);
    let totals = existing.totals;
    const refreshNutrients =
      amountChanged || args.productId !== undefined || args.per100g !== undefined;
    if (refreshNutrients) {
      const amount = category === DRINK_CATEGORY ? ml : grams;
      if (amount === undefined) throw new Error("Entry is missing an amount.");
      const next = await recomputeTotals(ctx, userId, existing, {
        productId: args.productId,
        productName: args.productName === undefined ? undefined : productName,
        per100g: args.per100g,
        amount,
      });
      productId = next.productId;
      if (args.productName === undefined) productName = next.productName;
      totals = next.totals;
    }

    await ctx.db.replace(existing._id, {
      userId: existing.userId,
      ...(productId ? { productId } : {}),
      productName,
      date: args.date === undefined ? existing.date : canonicalIsoDate(args.date),
      moment: args.moment ?? existing.moment,
      ...(category ? { category } : {}),
      isRedMeat: resolveIsRedMeat(category, args.isRedMeat ?? existing.isRedMeat),
      ...(grams !== undefined ? { grams } : {}),
      ...(ml !== undefined ? { ml } : {}),
      totals,
      ...(existing.legacyId !== undefined ? { legacyId: existing.legacyId } : {}),
      createdAt: existing.createdAt,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("foodEntries") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const existing = await requireOwnedEntry(ctx, userId, id);
    await ctx.db.delete(existing._id);
  },
});

/**
 * Totals are derived, never taken from the client as a finished number.
 * A linked product wins (`per100g * amount / 100`) and its name is
 * snapshotted. With no product, the caller supplies per-100g values
 * (legacy import, or a food that was never saved). If the linked product
 * was deleted, the previous snapshot is scaled to the new amount.
 */
async function recomputeTotals(
  ctx: MutationCtx,
  userId: Id<"users">,
  existing: Doc<"foodEntries">,
  args: {
    productId?: Id<"foodProducts">;
    productName?: string;
    per100g?: Nutrients;
    amount: number;
  },
): Promise<{ productId?: Id<"foodProducts">; productName: string; totals: Nutrients }> {
  if (args.productId !== undefined) {
    const source = await productSource(ctx, userId, {
      productId: args.productId,
      productName: args.productName,
    });
    return {
      productId: source.productId,
      productName: source.productName,
      totals: totalsForAmount(source.per100g, args.amount),
    };
  }

  const linkedId = existing.productId;
  if (linkedId !== undefined && args.per100g === undefined) {
    const product = await ctx.db.get(linkedId);
    if (product && product.userId === userId) {
      return {
        productId: product._id,
        productName: args.productName ?? product.name,
        totals: totalsForAmount(product.per100g, args.amount),
      };
    }
    return {
      productName: args.productName ?? existing.productName,
      totals: rescaleTotals(existing.totals, entryAmount(existing), args.amount),
    };
  }

  if (args.per100g !== undefined) {
    if (linkedId !== undefined) {
      const product = await ctx.db.get(linkedId);
      if (product && product.userId === userId) {
        throw new Error("Per-100g nutrients come from the linked product.");
      }
    }
    return {
      productName: args.productName ?? existing.productName,
      totals: totalsForAmount(assertNutrients(args.per100g), args.amount),
    };
  }

  return {
    productId: linkedId,
    productName: existing.productName,
    totals: rescaleTotals(existing.totals, entryAmount(existing), args.amount),
  };
}

async function productSource(
  ctx: MutationCtx,
  userId: Id<"users">,
  args: {
    productId?: Id<"foodProducts">;
    productName?: string;
    per100g?: Nutrients;
  },
): Promise<{ productId?: Id<"foodProducts">; productName: string; per100g: Nutrients }> {
  if (args.productId !== undefined) {
    const product = await ctx.db.get(args.productId);
    if (!product || product.userId !== userId) throw new Error("Product not found");
    return {
      productId: product._id,
      productName: args.productName ? assertProductName(args.productName) : product.name,
      per100g: assertNutrients(product.per100g),
    };
  }
  if (args.productName === undefined || args.per100g === undefined) {
    throw new Error("Choose a product, or provide a name and per-100g nutrients.");
  }
  return {
    productName: assertProductName(args.productName),
    per100g: assertNutrients(args.per100g),
  };
}


async function requireOwnedEntry(
  ctx: MutationCtx,
  userId: Id<"users">,
  id: Id<"foodEntries">,
): Promise<Doc<"foodEntries">> {
  const doc = await ctx.db.get(id);
  if (!doc || doc.userId !== userId) throw new Error("Not found");
  return doc;
}

function cap<T>(rows: T[], limit: number): T[] {
  // `.take(limit + 1)` so a diary that exceeds the budget fails loudly
  // instead of hiding meals. `.collect()` would be unbounded.
  if (rows.length > limit) {
    throw new Error("Too many food entries in that range.");
  }
  return rows;
}

function newestFirst(rows: Doc<"foodEntries">[]): Doc<"foodEntries">[] {
  // Inside one date the index only tie-breaks on `_creationTime`.
  // `createdAt` is the timestamp we set (an import can preserve the
  // Laravel `created_at`), so sort this day-sized batch on that.
  return [...rows].sort(
    (a, b) => b.createdAt - a.createdAt || b._creationTime - a._creationTime,
  );
}

function chronological(rows: Doc<"foodEntries">[]): Doc<"foodEntries">[] {
  return [...rows].sort(
    (a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt || a._creationTime - b._creationTime,
  );
}

function assertLegacyId(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error("Legacy id must be a non-negative integer.");
  }
  return value;
}
