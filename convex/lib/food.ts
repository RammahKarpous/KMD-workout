import { v } from "convex/values";
import type { FoodCategory, FoodMoment } from "../../shared/lib/food";

export const nutrientsValidator = v.object({
  kcal: v.number(),
  fat: v.number(),
  saturatedFat: v.number(),
  carbs: v.number(),
  sugar: v.number(),
  protein: v.number(),
});

// Keys are the shared union, so adding a moment or category there fails
// this file's typecheck until the validator grows with it.
const momentLiterals = {
  ontbijt: v.literal("ontbijt"),
  lunch: v.literal("lunch"),
  tussendoor: v.literal("tussendoor"),
  diner: v.literal("diner"),
  voor_training: v.literal("voor_training"),
  na_training: v.literal("na_training"),
} satisfies Record<FoodMoment, unknown>;

export const foodMomentValidator = v.union(
  momentLiterals.ontbijt,
  momentLiterals.lunch,
  momentLiterals.tussendoor,
  momentLiterals.diner,
  momentLiterals.voor_training,
  momentLiterals.na_training,
);

const categoryLiterals = {
  groente: v.literal("groente"),
  fruit: v.literal("fruit"),
  koolhydraten: v.literal("koolhydraten"),
  vlees: v.literal("vlees"),
  noten: v.literal("noten"),
  zuivel: v.literal("zuivel"),
  kaas: v.literal("kaas"),
  bereidingsvet: v.literal("bereidingsvet"),
  margarine: v.literal("margarine"),
  onbekend: v.literal("onbekend"),
  vocht: v.literal("vocht"),
} satisfies Record<FoodCategory, unknown>;

export const foodCategoryValidator = v.union(
  categoryLiterals.groente,
  categoryLiterals.fruit,
  categoryLiterals.koolhydraten,
  categoryLiterals.vlees,
  categoryLiterals.noten,
  categoryLiterals.zuivel,
  categoryLiterals.kaas,
  categoryLiterals.bereidingsvet,
  categoryLiterals.margarine,
  categoryLiterals.onbekend,
  categoryLiterals.vocht,
);
