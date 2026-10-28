import type { Metadata } from "next";
import { OVERVIEW_COPY } from "@/features/food/overview/copy";
import { OverviewScreen } from "@/features/food/overview/OverviewScreen";

export const metadata: Metadata = {
  title: OVERVIEW_COPY.pageTitle,
};

export default function FoodOverviewPage() {
  return <OverviewScreen />;
}
