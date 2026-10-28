import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LimitsScreen } from "@/features/food/settings/LimitsScreen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("food.limits");
  return { title: t("pageTitle") };
}

export default function FoodLimitsPage() {
  return <LimitsScreen />;
}
