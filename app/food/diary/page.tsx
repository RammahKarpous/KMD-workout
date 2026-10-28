import type { Metadata } from "next";
import { DIARY_COPY } from "@/features/food/diary/copy";
import { DiaryScreen } from "@/features/food/diary/DiaryScreen";

export const metadata: Metadata = {
  title: DIARY_COPY.pageTitle,
};

export default function FoodDiaryPage() {
  return <DiaryScreen />;
}
