import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { assertProductName, normalizeBarcode } from "../shared/lib/food";
import { assertNutrients } from "../shared/lib/nutrients";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./lib/auth";
import { nutrientsValidator } from "./lib/food";

const emptyPage = { page: [], isDone: true, continueCursor: "" };

/**
 * Alphabetical page of the signed-in user's products.
 * Uses `by_user_name` rather than `.filter()` / `.collect()` so the read
 * stays bounded. A blank search is not this function — see `search`.
 */
export const list = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return emptyPage;
    return ctx.db
      .query("foodProducts")
      .withIndex("by_user_name", (q) => q.eq("userId", userId))
      .paginate(paginationOpts);
  },
});

/**
 * Full-text search over `search_name`, always filtered to the caller.
 * A search cursor is only valid for this same index and term, so an empty
 * query errors instead of falling back to `list` (mixing the two indexes
 * mid-pagination would resume from the wrong place). Convex also rejects
 * an empty search string.
 */
export const search = query({
  args: {
    query: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { query: term, paginationOpts }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return emptyPage;
    const trimmed = term.trim();
    if (!trimmed) throw new Error("Enter a search term.");
    if (trimmed.length > 64) throw new Error("Search term is too long.");
    return ctx.db
      .query("foodProducts")
      .withSearchIndex("search_name", (q) =>
        q.search("name", trimmed).eq("userId", userId),
      )
      .paginate(paginationOpts);
  },
});

export const get = query({
  args: { id: v.id("foodProducts") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return ownedProduct(ctx, userId, id);
  },
});

export const getByBarcode = query({
  args: { barcode: v.string() },
  handler: async (ctx, { barcode }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    let digits: string;
    try {
      digits = normalizeBarcode(barcode);
    } catch {
      return null;
    }
    return ctx.db
      .query("foodProducts")
      .withIndex("by_user_barcode", (q) =>
        q.eq("userId", userId).eq("barcode", digits),
      )
      .unique();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    barcode: v.optional(v.string()),
    per100g: nutrientsValidator,
    legacyId: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const name = assertProductName(args.name);
    const per100g = assertNutrients(args.per100g);
    const barcode = args.barcode === undefined ? undefined : normalizeBarcode(args.barcode);
    if (barcode !== undefined) {
      await assertBarcodeAvailable(ctx, userId, barcode);
    }
    const legacyId = args.legacyId === undefined ? undefined : assertLegacyId(args.legacyId);
    return ctx.db.insert("foodProducts", {
      userId,
      name,
      per100g,
      createdAt: Date.now(),
      ...(barcode !== undefined ? { barcode } : {}),
      ...(legacyId !== undefined ? { legacyId } : {}),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("foodProducts"),
    name: v.optional(v.string()),
    barcode: v.optional(v.union(v.string(), v.null())),
    per100g: v.optional(nutrientsValidator),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existing = await requireOwnedProduct(ctx, userId, args.id);
    const name = args.name === undefined ? existing.name : assertProductName(args.name);
    const per100g = args.per100g === undefined ? existing.per100g : assertNutrients(args.per100g);

    let barcode = existing.barcode;
    if (args.barcode === null) {
      barcode = undefined;
    } else if (args.barcode !== undefined) {
      barcode = normalizeBarcode(args.barcode);
    }
    if (barcode !== undefined && barcode !== existing.barcode) {
      await assertBarcodeAvailable(ctx, userId, barcode);
    }

    // `replace` (not `patch`) so a cleared barcode is actually removed.
    // `patch` treats `undefined` as "leave this field alone".
    // Diary entries keep the totals they snapshotted; changing a product
    // does not rewrite history. Editing an entry re-reads the product.
    await ctx.db.replace(existing._id, {
      userId: existing.userId,
      name,
      per100g,
      createdAt: existing.createdAt,
      ...(barcode !== undefined ? { barcode } : {}),
      ...(existing.legacyId !== undefined ? { legacyId: existing.legacyId } : {}),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("foodProducts") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const existing = await requireOwnedProduct(ctx, userId, id);
    // Entries keep their snapshotted name and totals. `productId` may
    // dangle; entry edits fall back to scaling that snapshot.
    await ctx.db.delete(existing._id);
  },
});

async function ownedProduct(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  id: Id<"foodProducts">,
): Promise<Doc<"foodProducts"> | null> {
  const doc = await ctx.db.get(id);
  if (!doc || doc.userId !== userId) return null;
  return doc;
}

async function requireOwnedProduct(
  ctx: MutationCtx,
  userId: Id<"users">,
  id: Id<"foodProducts">,
): Promise<Doc<"foodProducts">> {
  const doc = await ownedProduct(ctx, userId, id);
  if (!doc) throw new Error("Not found");
  return doc;
}

async function assertBarcodeAvailable(
  ctx: MutationCtx,
  userId: Id<"users">,
  barcode: string,
): Promise<void> {
  // The index isn't a unique constraint; the check is what enforces
  // one product per barcode per user.
  const existing = await ctx.db
    .query("foodProducts")
    .withIndex("by_user_barcode", (q) =>
      q.eq("userId", userId).eq("barcode", barcode),
    )
    .unique();
  if (existing) throw new Error("You already have a product with this barcode.");
}

function assertLegacyId(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error("Legacy id must be a non-negative integer.");
  }
  return value;
}
