"use client";

import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Nutrients } from "@/shared/lib/nutrients";
import { FOCUS_RING, FIELD_CLASS } from "@/features/food/products/focus";
import { LIMITS_COPY } from "./copy";
import {
  LIMIT_FIELDS,
  defaultsHint,
  formFromLimits,
  validateLimitsForm,
  type LimitsFieldErrors,
  type LimitsFormInput,
} from "./limitsForm";

export function LimitsScreen() {
  const limits = useQuery(api.nutritionLimits.get);
  return (
    <div className="pt-2">
      <div className="flex items-baseline justify-between gap-3 pt-6.5 pb-4.5">
        <h1 className="text-[26px] font-extrabold tracking-tight">{LIMITS_COPY.heading}</h1>
        <Link href="/food" className={`text-[13px] font-semibold text-blue underline ${FOCUS_RING}`}>
          {LIMITS_COPY.backToFood}
        </Link>
      </div>
      <p className="mb-2 text-sm text-muted">{LIMITS_COPY.intro}</p>
      <p className="mb-4 text-sm text-muted">{defaultsHint()}</p>
      {limits === undefined ? (
        <p className="text-sm text-muted">{LIMITS_COPY.loading}</p>
      ) : (
        <LimitsForm initial={limits} />
      )}
    </div>
  );
}

function LimitsForm({ initial }: { initial: Nutrients }) {
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
      const first = LIMIT_FIELDS.find((field) => result.errors[field.key]);
      if (first) document.getElementById(`limit-${first.key}`)?.focus();
      return;
    }
    setErrors({});
    setFormError(null);
    setSaving(true);
    try {
      await upsert(result.value);
      setStatus(LIMITS_COPY.saved);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : LIMITS_COPY.saveFailed);
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
      {LIMIT_FIELDS.map((field) => {
        const error = errors[field.key];
        const errorId = `limit-${field.key}-error`;
        return (
          <div key={field.key}>
            <label htmlFor={`limit-${field.key}`} className="mb-1.5 block text-[12.5px] font-semibold text-muted">
              {field.label}
            </label>
            <input
              id={`limit-${field.key}`}
              inputMode="decimal"
              autoComplete="off"
              value={form[field.key]}
              onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              className={FIELD_CLASS}
            />
            {error ? (
              <p id={errorId} className="mt-1.5 text-[12.5px] text-danger">
                {error}
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
        {saving ? LIMITS_COPY.saving : LIMITS_COPY.save}
      </button>
    </form>
  );
}
