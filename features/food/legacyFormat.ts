/**
 * Display formats taken from the old food tracker screens.
 * Dutch copy still uses a dot decimal and a comma thousands separator.
 */

export function formatTableNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Macro cell: `1,195.7kcal` or `33.1g`, unit attached. */
export function formatMacroAmount(value: number, unit: string): string {
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
  return `${formatted}${unit}`;
}

/** Category cell: `250g` or `2000ml`. Fractions keep one decimal. */
export function formatCategoryAmount(value: number, unit: "g" | "ml"): string {
  const rounded = Math.round(value * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text}${unit}`;
}

export function progressRatio(value: number, limit: number): number {
  if (limit <= 0) return value > 0 ? 100 : 0;
  return (value / limit) * 100;
}

export function formatProgressPercent(value: number, limit: number): string {
  return `${progressRatio(value, limit).toFixed(1)}%`;
}

export function isOverGoal(value: number, limit: number): boolean {
  return limit <= 0 ? value > 0 : value > limit;
}
