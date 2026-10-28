import type { Metadata } from "next";
import { DIETIST_COPY } from "@/features/food/dietist/copy";
import { DietistScreen } from "@/features/food/dietist/DietistScreen";

export const metadata: Metadata = {
  title: DIETIST_COPY.pageTitle,
};

export default function FoodDietistPage() {
  return <DietistScreen />;
}
