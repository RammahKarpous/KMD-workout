import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { DEFAULT_NUTRITION_LIMITS } from "../shared/lib/goals";
import { assertNutrients, type Nutrients } from "../shared/lib/nutrients";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./lib/auth";
import { nutrientsValidator } from "./lib/food";

/**
 * The signed-in user's daily targets, or the Laravel column defaults when
 * they haven't saved any. Signed-out callers get those same defaults —
 * they are not another user's row.
 */
export const get = query({
  args: {},
  returns: nutrientsValidator,
  handler: async (ctx): Promise<Nutrients> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { ...DEFAULT_NUTRITION_LIMITS };
    const row = await ctx.db
      .query("nutritionLimits")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!row) return { ...DEFAULT_NUTRITION_LIMITS };
    return {
      kcal: row.kcal,
      fat: row.fat,
      saturatedFat: row.saturatedFat,
      carbs: row.carbs,
      sugar: row.sugar,
      protein: row.protein,
    };
  },
});

export const upsert = mutation({
  args: {
    kcal: v.number(),
    fat: v.number(),
    saturatedFat: v.number(),
    carbs: v.number(),
    sugar: v.number(),
    protein: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const limits = assertNutrients(args);
    const existing = await ctx.db
      .query("nutritionLimits")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, limits);
      return existing._id;
    }
    return ctx.db.insert("nutritionLimits", { userId, ...limits });
  },
});
