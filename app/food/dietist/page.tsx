import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DietistScreen } from "@/features/food/dietist/DietistScreen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("food.dietist");
  return { title: t("pageTitle") };
}

export default function FoodDietistPage() {
  return <DietistScreen />;
}
