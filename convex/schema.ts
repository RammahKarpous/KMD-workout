import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  foodCategoryValidator,
  foodMomentValidator,
  nutrientsValidator,
} from "./lib/food";

const strengthSetTarget = v.object({
  weight: v.optional(v.string()),
  reps: v.optional(v.string()),
  min: v.optional(v.string()),
  warmup: v.optional(v.boolean()),
});

const routineExercise = v.object({
  name: v.string(),
  cardio: v.boolean(),
  sets: v.array(strengthSetTarget),
});

const loggedSet = v.object({
  weight: v.optional(v.string()),
  reps: v.optional(v.string()),
  min: v.optional(v.string()),
  done: v.optional(v.boolean()),
  warmup: v.optional(v.boolean()),
});

const loggedExercise = v.object({
  name: v.string(),
  cardio: v.boolean(),
  sets: v.array(loggedSet),
  notes: v.optional(v.string()),
});

export default defineSchema({
  // Convex Auth already indexes `users.email` (index name `email`).
  // The legacy import looks accounts up by that index; don't drop it.
  ...authTables,

  // --- workout: folders + routines ---
  folders: defineTable({
    userId: v.id("users"),
    name: v.string(),
    collapsed: v.boolean(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  routines: defineTable({
    userId: v.id("users"),
    name: v.string(),
    folderId: v.optional(v.id("folders")),
    exercises: v.array(routineExercise),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_folder", ["userId", "folderId"]),

  // --- logging: sessions ---
  sessions: defineTable({
    userId: v.id("users"),
    type: v.union(v.literal("strength"), v.literal("cardio")),
    ts: v.number(),
    durationSec: v.number(),
    notes: v.optional(v.string()),
    // The routine this session was logged from, by id — the source of
    // truth for "which routine's history is this" so two different
    // routines that happen to share a name never get credited with each
    // other's sessions. `routineName` is kept alongside it as a plain
    // display label (and as the join key `backfillRoutineIds` in
    // logging.ts used once to populate `routineId` on sessions logged
    // before this field existed).
    routineId: v.optional(v.id("routines")),
    routineName: v.optional(v.string()),
    exercises: v.optional(v.array(loggedExercise)),
    cardioType: v.optional(v.string()),
    duration: v.optional(v.number()),
    intensity: v.optional(v.string()),
  })
    .index("by_user_ts", ["userId", "ts"])
    .index("by_user_routineId", ["userId", "routineId"]),

  // --- logging: denormalized per-user counters (kept in sync on both
  // insert and delete of a session — see logging.ts — since per Convex
  // guidelines, `.collect().length` isn't safe once a table can grow
  // unbounded, so the Progress tab's "total sessions" tile reads this
  // instead of scanning every session) ---
  userStats: defineTable({
    userId: v.id("users"),
    totalSessions: v.number(),
  }).index("by_user", ["userId"]),

  // --- exercises: user-defined custom exercises ---
  customExercises: defineTable({
    userId: v.id("users"),
    name: v.string(),
    primaryMuscle: v.string(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_name", ["userId", "name"]),

  // --- stats: body measurements over time (one entry per calendar day) ---
  measurements: defineTable({
    userId: v.id("users"),
    ts: v.number(),
    weight: v.optional(v.number()),
    bust: v.optional(v.number()),
    waist: v.optional(v.number()),
    hips: v.optional(v.number()),
    leftThigh: v.optional(v.number()),
    rightThigh: v.optional(v.number()),
  }).index("by_user_ts", ["userId", "ts"]),

  // --- stats: stable profile fields for derived metrics (e.g. BMI needs
  // height, which doesn't change per-entry the way weight does) ---
  userProfile: defineTable({
    userId: v.id("users"),
    heightCm: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  // --- stats: weekly muscle-group set targets ---
  targets: defineTable({
    userId: v.id("users"),
    group: v.string(),
    min: v.number(),
    max: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_group", ["userId", "group"]),

  // --- food tracker ---
  // Ported from the Laravel app. Dutch columns map as:
  // naam→name, vet→fat, verzadigd→saturatedFat, koolhydraten→carbs,
  // suiker→sugar, eiwit→protein, gram→grams, datum→date.
  // The unused `dietist_entries` table is intentionally not ported.
  //
  // Nutrients on a product are per 100g (per 100ml for drinks). A diary
  // row copies the name and the scaled totals at save time, so later
  // edits to the product don't rewrite history.
  foodProducts: defineTable({
    userId: v.id("users"),
    name: v.string(),
    barcode: v.optional(v.string()),
    per100g: nutrientsValidator,
    // MySQL id from the Laravel `products` table, for the later import.
    legacyId: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    // Ordered listing. Not a uniqueness constraint — the Laravel app
    // allowed two products with the same name.
    .index("by_user_name", ["userId", "name"])
    .index("by_user_barcode", ["userId", "barcode"])
    .index("by_legacyId", ["legacyId"])
    // Full-text search is prefix/token match, not SQL `LIKE '%term%'`.
    // `userId` is a filter field so a search can't cross users.
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["userId"],
    }),

  foodEntries: defineTable({
    userId: v.id("users"),
    productId: v.optional(v.id("foodProducts")),
    productName: v.string(),
    date: v.string(),
    moment: foodMomentValidator,
    category: v.optional(foodCategoryValidator),
    isRedMeat: v.boolean(),
    grams: v.optional(v.number()),
    // Drinks (`vocht`) store ml instead of grams.
    ml: v.optional(v.number()),
    totals: nutrientsValidator,
    legacyId: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user_date", ["userId", "date"])
    .index("by_legacyId", ["legacyId"]),

  // One row per user. Absent row → defaults in `nutritionLimits.get`.
  nutritionLimits: defineTable({
    userId: v.id("users"),
    kcal: v.number(),
    fat: v.number(),
    saturatedFat: v.number(),
    carbs: v.number(),
    sugar: v.number(),
    protein: v.number(),
  }).index("by_user", ["userId"]),
});
