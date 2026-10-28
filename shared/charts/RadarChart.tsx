"use client";

import { useTranslations } from "next-intl";

import { useState } from "react";

export type RadarChartAxis = { label: string; current: number; previous: number };

/**
 * Hand-drawn SVG radar chart for the Statistics tab's "this week vs last
 * week" comparison (6 broad muscle-group axes). Two series → unlike the
 * single-series LineChart/BarChart, this always ships a legend (current in
 * accent blue, previous in the app's recessive muted-gray — the same pair
 * BarChart already reserves for "highlighted vs rest", so this reads as the
 * same system rather than a new palette). Mark specs: 2px stroke, a 2px
 * surface ring on each vertex dot so overlapping marks stay separable, one
 * hairline grid ring set, and a per-axis tap/hover tooltip (this is a plot,
 * not a bare stat tile, so it gets the interaction layer other charts have).
 */
export function RadarChart({ axes }: { axes: RadarChartAxis[] }) {
  const [active, setActive] = useState<number | null>(null);
  const t = useTranslations("stats");

  const n = axes.length;
  const cx = 140;
  const cy = 138;
  const R = 98;
  const maxV = Math.max(1, ...axes.map((a) => a.current), ...axes.map((a) => a.previous));

  const angleAt = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const pointAt = (i: number, v: number) => {
    const ang = angleAt(i);
    const r = R * (v / maxV);
    return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)] as const;
  };
  const polygon = (values: number[]) =>
    values.map((v, i) => pointAt(i, v).map((c) => c.toFixed(1)).join(",")).join(" ");

  const activeAxis = active !== null ? axes[active] : null;
  const activePos = active !== null ? pointAt(active, maxV * 1.12) : null;

  return (
    <div className="relative">
      <svg
        viewBox="0 0 280 276"
        className="mx-auto block w-full max-w-82.5 touch-none select-none"
        onPointerLeave={() => setActive(null)}
      >
        {[1, 2, 3, 4].map((ring) => (
          <polygon
            key={ring}
            points={Array.from({ length: n }, (_, i) => {
              const ang = angleAt(i);
              const r = (R * ring) / 4;
              return `${(cx + r * Math.cos(ang)).toFixed(1)},${(cy + r * Math.sin(ang)).toFixed(1)}`;
            }).join(" ")}
            fill="none"
            stroke="var(--color-line)"
            strokeWidth={1}
          />
        ))}

        {axes.map((a, i) => {
          const ang = angleAt(i);
          const ex = cx + R * Math.cos(ang);
          const ey = cy + R * Math.sin(ang);
          const lx = cx + (R + 20) * Math.cos(ang);
          const ly = cy + (R + 16) * Math.sin(ang);
          return (
            <g key={i}>
              <line x1={cx} y1={cy} x2={ex} y2={ey} stroke="var(--color-line)" strokeWidth={1} />
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-muted text-[11px]"
              >
                {a.label}
              </text>
            </g>
          );
        })}

        <polygon
          points={polygon(axes.map((a) => a.previous))}
          fill="var(--color-muted)"
          fillOpacity={0.14}
          stroke="var(--color-muted)"
          strokeWidth={2}
        />
        <polygon
          points={polygon(axes.map((a) => a.current))}
          fill="var(--color-blue)"
          fillOpacity={0.2}
          stroke="var(--color-blue)"
          strokeWidth={2}
        />

        {axes.map((a, i) => {
          const [x, y] = pointAt(i, a.current);
          return (
            <circle
              key={`c-${i}`}
              cx={x}
              cy={y}
              r={4}
              fill="var(--color-blue)"
              stroke="var(--color-bg)"
              strokeWidth={2}
            />
          );
        })}

        {axes.map((_, i) => {
          const ang = angleAt(i);
          const hx = cx + (R + 24) * Math.cos(ang);
          const hy = cy + (R + 24) * Math.sin(ang);
          return (
            <circle
              key={`hit-${i}`}
              cx={hx}
              cy={hy}
              r={22}
              fill="transparent"
              onPointerEnter={() => setActive(i)}
              onClick={() => setActive((cur) => (cur === i ? null : i))}
            />
          );
        })}
      </svg>

      {activeAxis && activePos && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[11px] shadow-lg"
          style={{ left: `${(activePos[0] / 280) * 100}%`, top: `${(activePos[1] / 276) * 100}%` }}
        >
          <div className="font-bold text-ink">{activeAxis.label}</div>
          <div className="text-blue">{t("current")}: {Math.round(activeAxis.current * 10) / 10}</div>
          <div className="text-muted-2">{t("previous")}: {Math.round(activeAxis.previous * 10) / 10}</div>
        </div>
      )}

      <div className="mt-2 flex items-center justify-center gap-4 text-[12px] text-muted-2">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue" />
          {t("current")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-muted" />
          {t("previous")}
        </span>
      </div>
    </div>
  );
}
