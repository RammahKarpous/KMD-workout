"use client";

import { useMutation, useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { NutrientKey, Nutrients } from "@/shared/lib/nutrients";
import { FOCUS_RING, FIELD_CLASS } from "@/features/food/products/focus";
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
    <div className="pt-2">
      <div className="flex items-baseline justify-between gap-3 pt-6.5 pb-4.5">
        <h1 className="text-[26px] font-extrabold tracking-tight">{t("heading")}</h1>
        <Link href="/food" className={`text-[13px] font-semibold text-blue underline ${FOCUS_RING}`}>
          {t("backToFood")}
        </Link>
      </div>
      <p className="mb-2 text-sm text-muted">{t("intro")}</p>
      <p className="mb-4 text-sm text-muted">{t("defaultsHint", defaults)}</p>
      {limits === undefined ? (
        <p className="text-sm text-muted">{t("loading")}</p>
      ) : (
        <LimitsForm initial={limits} />
      )}
    </div>
  );
}

function LimitsForm({ initial }: { initial: Nutrients }) {
  const t = useTranslations("food.limits");
  const upsert = useMutation(api.nutritionLimits.upsert);
  const [form, setForm] = useState<LimitsFormInput>(() => formFromLimits(initial));
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
      setStatus(t("saved"));
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="flex flex-col gap-3"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
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
              onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              className={FIELD_CLASS}
            />
            {error ? (
              <p id={errorId} className="mt-1.5 text-[12.5px] text-danger">
                {t("invalid")}
              </p>
            ) : null}
          </div>
        );
      })}
      {formError ? (
        <p role="alert" className="text-sm text-danger">
          {formError}
        </p>
      ) : null}
      <p aria-live="polite" className="sr-only">
        {status ?? ""}
      </p>
      {status ? (
        <p className="rounded-xl border border-green/40 bg-green/10 px-3 py-2 text-sm text-ink">{status}</p>
      ) : null}
      <button
        type="submit"
        disabled={saving}
        className={`rounded-2xl bg-blue py-4 text-[15.5px] font-bold text-black disabled:opacity-60 ${FOCUS_RING}`}
      >
        {saving ? t("saving") : t("save")}
      </button>
    </form>
  );
}
