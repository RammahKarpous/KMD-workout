/** User-facing strings for the products screen. The next-intl PR can replace this module. */

export const PRODUCTS_COPY = {
  pageTitle: "Products",
  heading: "Products",
  backToFood: "Food",
  add: "Add product",
  searchLabel: "Search products",
  searchPlaceholder: "Search by name",
  per100gLegend: "Per 100 g",
  nameLabel: "Product name",
  namePlaceholder: "Product name",
  barcodeLabel: "Barcode",
  barcodeHint: "Optional. Filled in when you scan.",
  barcodePlaceholder: "Digits from the package",
  calories: "Calories",
  fat: "Fat",
  saturatedFat: "Saturated fat",
  carbs: "Carbs",
  sugar: "Sugar",
  protein: "Protein",
  unitKcal: "kcal",
  unitGrams: "g",
  createTitle: "Add a product",
  editTitle: "Edit product",
  saveCreate: "Add product",
  saveEdit: "Save changes",
  cancel: "Cancel",
  edit: "Edit",
  delete: "Delete",
  scan: "Scan barcode",
  scanTitle: "Scan a barcode",
  scanAgain: "Scan again",
  manualLabel: "Barcode",
  manualPlaceholder: "Enter a barcode",
  lookup: "Look up",
  lookingUp: "Looking up…",
  cameraStarting: "Starting the camera…",
  cameraFailed: "The camera couldn't start. Enter the barcode instead.",
  closeScanner: "Back to the form",
  loadMore: "Load more",
  loading: "Loading products.",
  loadingMore: "Loading more products.",
  added: "Product added.",
  updated: "Product updated.",
  deleted: "Product deleted.",
  saveFailed: "Couldn't save the product.",
  deleteFailed: "Couldn't delete the product.",
  lookupFailed: "Couldn't look up that barcode.",
  nameRequired: "Product name is required.",
  nameTooLong: "Product name is too long.",
  nutrientInvalid: "Enter a number that is 0 or more.",
  barcodeInvalid: "Enter a barcode made of digits.",
  deleteConfirm: (name: string) => `Delete "${name}"? This can't be undone.`,
  notFound: (barcode: string) => `No product found for barcode ${barcode}.`,
  editNamed: (name: string) => `Edit ${name}`,
  deleteNamed: (name: string) => `Delete ${name}`,
} as const;

export function productResultSummary(input: {
  query: string;
  count: number;
  status: "loading" | "loading-more" | "ready";
  canLoadMore: boolean;
}): string {
  if (input.status === "loading") return PRODUCTS_COPY.loading;
  if (input.status === "loading-more") return PRODUCTS_COPY.loadingMore;
  const noun = input.count === 1 ? "product" : "products";
  if (input.query) {
    if (input.count === 0) return `No products match "${input.query}".`;
    const match = input.count === 1 ? "matches" : "match";
    const more = input.canLoadMore ? " More are available." : "";
    return `${input.count} ${noun} ${match} "${input.query}".${more}`;
  }
  if (input.count === 0) return "No products yet.";
  const more = input.canLoadMore ? " More are available." : "";
  return `Showing ${input.count} ${noun}.${more}`;
}
