import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DiaryScreen } from "@/features/food/diary/DiaryScreen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("food.diary");
  return { title: t("pageTitle") };
}

export default function FoodDiaryPage() {
  return <DiaryScreen />;
}
