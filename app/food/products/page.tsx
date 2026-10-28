import type { Metadata } from "next";
import { PRODUCTS_COPY } from "@/features/food/products/copy";
import { ProductsScreen } from "@/features/food/products/ProductsScreen";

export const metadata: Metadata = {
  title: PRODUCTS_COPY.pageTitle,
};

export default function FoodProductsPage() {
  return <ProductsScreen />;
}
