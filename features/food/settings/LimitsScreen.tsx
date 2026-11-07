"use client";

import { useMutation, useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { DEFAULT_NUTRITION_LIMITS } from "@/shared/lib/goals";
import type { NutrientKey, Nutrients } from "@/shared/lib/nutrients";
import { LEGACY_FIELD, PRIMARY_BUTTON } from "@/features/food/products/focus";
import {
  LIMIT_FIELD_KEYS,
  defaultLimitValues,
  formFromLimits,
  validateLimitsForm,
  type LimitsFieldErrors,
  type LimitsFormInput,
} from "./limitsForm";

const LIMIT_LABEL: Record<NutrientKey, "calories" | "fat" | "saturatedFat" | "carbs" | "sugar" | "protein"> = {
  kcal: "calories",
  fat: "fat",
  saturatedFat: "saturatedFat",
  carbs: "carbs",
  sugar: "sugar",
  protein: "protein",
};

export function LimitsScreen() {
  const t = useTranslations("food.limits");
  const limits = useQuery(api.nutritionLimits.get);
  const defaults = defaultLimitValues();

  return (
    <div className="mx-auto w-full max-w-md pt-4">
      <LimitsForm initial={limits} defaultsHint={t("defaultsHint", defaults)} />
    </div>
  );
}

function LimitsForm({ initial, defaultsHint }: { initial: Nutrients | undefined; defaultsHint: string }) {
  const t = useTranslations("food.limits");
  const upsert = useMutation(api.nutritionLimits.upsert);
  const [draft, setDraft] = useState<LimitsFormInput | null>(null);
  const form = draft ?? withTwoDecimals(formFromLimits(initial ?? DEFAULT_NUTRITION_LIMITS));
  const [errors, setErrors] = useState<LimitsFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    const result = validateLimitsForm(form);
    if (!result.ok) {
      setErrors(result.errors);
      const first = LIMIT_FIELD_KEYS.find((key) => result.errors[key]);
      if (first) document.getElementById(`limit-${first}`)?.focus();
      return;
    }
    setErrors({});
    setFormError(null);
    setSaving(true);
    try {
      await upsert(result.value);
      setDraft(withTwoDecimals(formFromLimits(result.value)));
      setStatus(t("saved"));
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="rounded-2xl border border-line px-4 py-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <h1 className="mb-1 text-sm font-medium text-ink">{t("cardTitle")}</h1>
      <p className="mb-4 text-[12.5px] text-muted">{defaultsHint}</p>
      <div className="flex flex-col gap-3">
        {LIMIT_FIELD_KEYS.map((key) => {
          const error = errors[key];
          const errorId = `limit-${key}-error`;
          return (
            <div key={key}>
              <label htmlFor={`limit-${key}`} className="mb-1.5 block text-[12.5px] font-semibold text-muted">
                {t(LIMIT_LABEL[key])}
              </label>
              <input
                id={`limit-${key}`}
                inputMode="decimal"
                autoComplete="off"
                value={form[key]}
                onChange={(event) => {
                  setDraft({ ...form, [key]: event.target.value });
                }}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                className={LEGACY_FIELD}
              />
              {error ? (
                <p id={errorId} className="mt-1.5 text-[12.5px] text-danger">
                  {t("invalid")}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
      {formError ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {formError}
        </p>
      ) : null}
      <p aria-live="polite" className="sr-only">
        {status ?? ""}
      </p>
      {status ? (
        <p className="mt-3 rounded-xl border border-green/40 bg-green/10 px-3 py-2 text-sm text-ink">{status}</p>
      ) : null}
      <button type="submit" disabled={saving} className={`mt-4 ${PRIMARY_BUTTON}`}>
        {saving ? t("saving") : t("save")}
      </button>
    </form>
  );
}

function withTwoDecimals(form: LimitsFormInput): LimitsFormInput {
  const next = { ...form };
  for (const key of LIMIT_FIELD_KEYS) {
    const value = Number(form[key]);
    if (Number.isFinite(value)) next[key] = value.toFixed(2);
  }
  return next;
}
