"use client";

import { formatProgressPercent, isOverGoal, progressRatio } from "./legacyFormat";

export function ProgressCell({
  label,
  value,
  limit,
  valuetext,
}: {
  label: string;
  value: number;
  limit: number;
  valuetext: string;
}) {
  const over = isOverGoal(value, limit);
  const percent = progressRatio(value, limit);
  const width = Math.max(0, Math.min(100, percent));
  const tone = over ? "text-danger" : "text-blue";
  const bar = over ? "bg-danger" : "bg-blue";
  return (
    <div className="min-w-28">
      <div className={`text-right text-sm font-semibold tabular-nums ${tone}`}>
        {formatProgressPercent(value, limit)}
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={Math.max(limit, 0)}
        aria-valuenow={limit > 0 ? Math.min(value, limit) : 0}
        aria-valuetext={valuetext}
        className="mt-1 h-2 overflow-hidden rounded-sm bg-white/10"
      >
        <div className={`h-full ${bar}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
