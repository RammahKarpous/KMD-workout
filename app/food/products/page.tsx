import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ProductsScreen } from "@/features/food/products/ProductsScreen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("food.products");
  return { title: t("pageTitle") };
}

export default function FoodProductsPage() {
  return <ProductsScreen />;
}
