"use client";

import { useTranslations } from "next-intl";
import { foodsByCategory, type CategoryEntry } from "@/features/food/dietist/dietistModel";
import { formatCategoryAmount } from "@/features/food/legacyFormat";

export function EatenTodayList({
  entries,
  emptyLabel,
}: {
  entries: readonly CategoryEntry[];
  emptyLabel: string;
}) {
  const t = useTranslations("food");
  const categories = useTranslations("food.categories");
  const groups = foodsByCategory(entries);

  return (
    <section aria-labelledby="eaten-today" className="mt-6 overflow-hidden rounded-lg border border-line">
      <h2 id="eaten-today" className="border-b border-line px-3 py-3 text-sm font-medium text-ink">
        {t("eatenToday")}
      </h2>
      {groups.length === 0 ? (
        <p className="px-3 py-3 text-sm text-muted">{emptyLabel}</p>
      ) : (
        groups.map((group) => (
          <div key={group.category} className="border-b border-line last:border-b-0">
            <h3 className="px-3 pt-3 pb-1 text-sm text-ink">{categories(group.category)}</h3>
            <ul>
              {group.items.map((item, index) => (
                <li
                  key={`${item.name}-${index}`}
                  className="flex items-center justify-between gap-3 border-t border-line/80 px-3 py-2.5 text-sm"
                >
                  <span className="min-w-0 text-ink">{item.name}</span>
                  <span className="shrink-0 font-semibold text-blue tabular-nums">
                    {formatCategoryAmount(item.amount, item.unit)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}
