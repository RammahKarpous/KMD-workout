import { v } from "convex/values";
import { normalizeBarcode } from "../shared/lib/food";
import { parseOpenFoodFactsProduct } from "../shared/lib/openFoodFacts";
import { action } from "./_generated/server";
import { requireUserId } from "./lib/auth";
import { nutrientsValidator } from "./lib/food";

const LOOKUP_TIMEOUT_MS = 10_000;
const USER_AGENT = "KMD-workout/food-tracker (barcode lookup)";

/**
 * Barcode lookup against Open Food Facts. This is an action because it
 * calls the network — queries and mutations can't. It does not write to
 * the database; saving the product is a separate `foodProducts.create`.
 */
export const lookup = action({
  args: { barcode: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      name: v.string(),
      per100g: nutrientsValidator,
    }),
  ),
  handler: async (ctx, { barcode }) => {
    await requireUserId(ctx);
    const digits = normalizeBarcode(barcode);
    // `fields` keeps the payload to the nutrients we map. The full product
    // document includes images and ingredients we don't store.
    const url =
      `https://world.openfoodfacts.org/api/v2/product/${digits}.json` +
      "?fields=product_name,product_name_en,nutriments";
    const response = await fetchOff(url);
    if (response === null) return null;
    return parseOpenFoodFactsProduct(response);
  },
});

async function fetchOff(url: string): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      },
      signal: controller.signal,
    });
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error("Open Food Facts returned an error.");
    }
    return (await response.json()) as unknown;
  } catch (error) {
    if (error instanceof Error && error.message === "Open Food Facts returned an error.") {
      throw error;
    }
    throw new Error("Couldn't reach Open Food Facts.");
  } finally {
    clearTimeout(timer);
  }
}
