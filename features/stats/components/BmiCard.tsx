"use client";

import { useMutation, useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
import {
  bmiCategoryForAdult,
  calculateAdultBmi,
  type BmiCategory,
  validateBmiInputs,
} from "@/shared/lib/bmi";

const CATEGORY_BADGE: Record<BmiCategory, string> = {
  underweight: "bg-blue/15 text-blue",
  healthy: "bg-green/15 text-green",
  overweight: "bg-orange/15 text-orange",
  obesity: "bg-danger/15 text-danger",
};

/** Standalone weight/height -> BMI calculator (docs/bmi-calculation.md).
 * Weight defaults to the most recently logged measurement (if any) but
 * stays freely editable — it does not require a logged entry to work.
 * Height persists to the profile so it doesn't need retyping next time. */
export function BmiCard({ latestWeight }: { latestWeight: number | null }) {
  const t = useTranslations("stats");
  const bmiText = useTranslations("bmi");
  const profile = useQuery(api.profile.get);
  const setHeight = useMutation(api.profile.setHeight);
  const [height, setHeightInput] = useState("");
  const [weight, setWeightInput] = useState("");

  useEffect(() => {
    setHeightInput(profile?.heightCm?.toString() ?? "");
  }, [profile?.heightCm]);

  useEffect(() => {
    setWeightInput((w) => (w === "" && latestWeight !== null ? latestWeight.toString() : w));
  }, [latestWeight]);

  const bothFilled = weight.trim() !== "" && height.trim() !== "";
  const weightKg = Number(weight);
  const heightCm = Number(height);
  const error = bothFilled ? validateBmiInputs(weightKg, heightCm) : null;
  const bmi = bothFilled && !error ? calculateAdultBmi(weightKg, heightCm) : null;
  const category = bmi !== null ? bmiCategoryForAdult(bmi) : null;

  return (
    <div className="mb-4 rounded-card bg-surface p-4">
      <div className="mb-3 text-[12.5px] font-bold uppercase tracking-wide text-muted">
        {t("bmi")}
      </div>

      <div className="mb-3.5 grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-[12.5px] font-semibold text-muted">
            {t("weightKg")}
          </label>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={weight}
            onChange={(e) => setWeightInput(e.target.value)}
            className="w-full min-w-0 rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-base text-ink outline-none focus:border-blue"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[12.5px] font-semibold text-muted">
            {t("heightCm")}
          </label>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={height}
            onChange={(e) => setHeightInput(e.target.value)}
            onBlur={() => {
              const n = Number(height);
              if (Number.isFinite(n) && n > 0) void setHeight({ heightCm: n });
            }}
            className="w-full min-w-0 rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-base text-ink outline-none focus:border-blue"
          />
        </div>
      </div>

      <div className="rounded-xl bg-surface-2 px-4 py-5 text-center">
        {!bothFilled ? (
          <p className="text-[13px] text-muted-2">
            {t("bmiEmpty")}
          </p>
        ) : error ? (
          <p className="text-[13px] text-danger">{error ? bmiText(error) : null}</p>
        ) : (
          <>
            <div className="text-4xl font-extrabold tracking-tight text-ink">
              {bmi!.toFixed(1)}
            </div>
            <span
              className={`mt-2.5 inline-block rounded-full px-3 py-1 text-[12px] font-bold ${CATEGORY_BADGE[category!]}`}
            >
              {bmiText(category!)}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
