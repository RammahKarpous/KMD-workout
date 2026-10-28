import { formatDiaryNumber, limitReadout } from "./diaryModel";

/**
 * A meter whose over-limit state is written out, not only colored.
 * The track also gains a border and a stripe when the value is past the limit.
 */
export function LimitMeter({
  label,
  value,
  limit,
  unit,
}: {
  label: string;
  value: number;
  limit: number;
  unit: string;
}) {
  const readout = limitReadout(label, value, limit, unit);
  const labelId = `meter-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span id={labelId} className="text-sm font-semibold text-ink">
          {label}
        </span>
        <span className={`text-sm ${readout.over ? "font-bold text-ink" : "text-muted"}`}>
          {formatDiaryNumber(value)} / {formatDiaryNumber(limit)} {unit}
        </span>
      </div>
      <div
        role="meter"
        aria-labelledby={labelId}
        aria-valuemin={0}
        aria-valuemax={Math.max(limit, 0)}
        aria-valuenow={limit > 0 ? Math.min(value, limit) : 0}
        aria-valuetext={readout.valuetext}
        className={`mt-1.5 h-2.5 overflow-hidden rounded-full bg-surface-2 ${
          readout.over ? "outline outline-2 outline-ink" : ""
        }`}
      >
        <div
          className={`h-full rounded-full ${readout.over ? "bg-danger" : "bg-blue"}`}
          style={{
            width: `${readout.fillPercent}%`,
            backgroundImage: readout.over
              ? "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.45) 4px, rgba(0,0,0,0.45) 8px)"
              : undefined,
          }}
        />
      </div>
      <p className={`mt-1 text-[13px] ${readout.over ? "font-bold text-ink" : "text-muted"}`}>
        {readout.detail}
      </p>
    </div>
  );
}
