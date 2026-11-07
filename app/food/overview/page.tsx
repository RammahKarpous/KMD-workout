import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { OverviewScreen } from "@/features/food/overview/OverviewScreen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("food.overview");
  return { title: t("pageTitle") };
}

export default function FoodOverviewPage() {
  return <OverviewScreen />;
}
