import type { Metadata } from "next";
import { LIMITS_COPY } from "@/features/food/settings/copy";
import { LimitsScreen } from "@/features/food/settings/LimitsScreen";

export const metadata: Metadata = {
  title: LIMITS_COPY.pageTitle,
};

export default function FoodLimitsPage() {
  return <LimitsScreen />;
}
