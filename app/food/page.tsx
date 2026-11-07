import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("food");
  return { title: t("brand") };
}

export default function FoodPage() {
  redirect("/food/products");
}
