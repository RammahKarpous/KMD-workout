import { Skeleton } from "@/shared/ui/Skeleton";

export default function FoodOverviewLoading() {
  return (
    <div className="pt-2">
      <Skeleton className="mt-6.5 mb-4 h-7 w-32" />
      <Skeleton className="mb-4 h-12 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-card" />
    </div>
  );
}
