"use client";

import { formatDiaryDate } from "@/features/food/diary/diaryModel";
import { FOCUS_RING } from "@/features/food/products/focus";

export function FoodDateNav({
  date,
  valid,
  locale,
  emptyLabel,
  dateLabel,
  previousLabel,
  nextLabel,
  onPrevious,
  onNext,
  onChange,
  inputId,
}: {
  date: string;
  valid: boolean;
  locale: string;
  emptyLabel: string;
  dateLabel: string;
  previousLabel: string;
  nextLabel: string;
  onPrevious: () => void;
  onNext: () => void;
  onChange: (value: string) => void;
  inputId: string;
}) {
  const visible = valid ? capitalize(formatDiaryDate(date, locale)) : emptyLabel;
  return (
    <div className="flex items-center justify-center gap-1">
      <button
        type="button"
        aria-label={previousLabel}
        disabled={!valid}
        onClick={onPrevious}
        className={`inline-flex min-h-11 min-w-11 items-center justify-center text-xl leading-none text-blue disabled:opacity-40 ${FOCUS_RING}`}
      >
        <span aria-hidden="true">←</span>
      </button>
      <div className="relative min-w-0">
        <span aria-hidden="true" className="block px-1 text-center text-[15px] font-medium text-blue">
          {visible}
        </span>
        <label htmlFor={inputId} className="sr-only">
          {dateLabel}
        </label>
        <input
          id={inputId}
          type="date"
          value={valid ? date : ""}
          aria-label={dateLabel}
          onChange={(event) => onChange(event.target.value)}
          className={`absolute inset-0 cursor-pointer opacity-0 ${FOCUS_RING}`}
        />
      </div>
      <button
        type="button"
        aria-label={nextLabel}
        disabled={!valid}
        onClick={onNext}
        className={`inline-flex min-h-11 min-w-11 items-center justify-center text-xl leading-none text-blue disabled:opacity-40 ${FOCUS_RING}`}
      >
        <span aria-hidden="true">→</span>
      </button>
    </div>
  );
}

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toLocaleUpperCase() + value.slice(1);
}
