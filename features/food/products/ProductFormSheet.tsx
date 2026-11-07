"use client";

import { useAction, useMutation } from "convex/react";
import { ScanBarcode } from "lucide-react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useId, useState, type ReactNode } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { Nutrients } from "@/shared/lib/nutrients";
import { FOCUS_RING, GHOST_BUTTON, LEGACY_FIELD, PRIMARY_BUTTON } from "./focus";
import {
  NUTRIENT_FIELD_KEYS,
  emptyProductForm,
  formFromLookup,
  formFromProduct,
  validateProductForm,
  type NutrientFieldKey,
  type ProductFormInput,
} from "./productForm";

function ScannerLoading() {
  const t = useTranslations("food.products");
  return <p className="text-sm text-muted">{t("cameraStarting")}</p>;
}

const BarcodeScanner = dynamic(
  () => import("./BarcodeScanner").then((mod) => mod.BarcodeScanner),
  { ssr: false, loading: () => <ScannerLoading /> },
);

type ExistingProduct = {
  _id: Id<"foodProducts">;
  name: string;
  barcode?: string;
  per100g: Nutrients;
};

const FIELD_LABEL: Record<NutrientFieldKey, "fieldKcal" | "fieldFat" | "fieldSaturated" | "fieldCarbs" | "fieldSugar" | "fieldProtein"> = {
  kcal: "fieldKcal",
  fat: "fieldFat",
  saturatedFat: "fieldSaturated",
  carbs: "fieldCarbs",
  sugar: "fieldSugar",
  protein: "fieldProtein",
};

export function ProductFormSheet({
  existing,
  onSaved,
  onCancel,
}: {
  existing?: ExistingProduct | null;
  onSaved: (message: string) => void;
  onCancel?: () => void;
}) {
  const t = useTranslations("food.products");
  const common = useTranslations("common");
  const createProduct = useMutation(api.foodProducts.create);
  const updateProduct = useMutation(api.foodProducts.update);
  const lookup = useAction(api.openFoodFacts.lookup);

  const titleId = useId();
  const formId = useId();

  const [form, setForm] = useState<ProductFormInput>(() =>
    existing ? formFromProduct(existing) : emptyProductForm(),
  );
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormInput, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  function setField(key: keyof ProductFormInput, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    const result = validateProductForm(form);
    if (!result.ok) {
      setErrors(result.errors);
      const firstInvalid = Object.keys(result.errors)[0];
      if (firstInvalid) {
        document.getElementById(fieldDomId(firstInvalid))?.focus();
      }
      return;
    }
    setErrors({});
    setFormError(null);
    setSaving(true);
    try {
      if (existing) {
        await updateProduct({
          id: existing._id,
          name: result.value.name,
          per100g: result.value.per100g,
          barcode: result.value.barcode ?? null,
        });
        onSaved(t("updated"));
      } else {
        await createProduct({
          name: result.value.name,
          per100g: result.value.per100g,
          ...(result.value.barcode ? { barcode: result.value.barcode } : {}),
        });
        onSaved(t("added"));
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function lookupCode(code: string) {
    if (lookingUp) return;
    setScanError(null);
    setLookingUp(true);
    try {
      const found = await lookup({ barcode: code });
      if (!found) {
        setScanError(t("notFound", { barcode: code }));
        return;
      }
      const digits = code.replace(/\D/g, "");
      setForm(formFromLookup(found, digits || code));
      setErrors({});
      setScanning(false);
    } catch (error) {
      setScanError(error instanceof Error ? error.message : t("lookupFailed"));
    } finally {
      setLookingUp(false);
    }
  }

  return (
    <section aria-labelledby={titleId} className="rounded-2xl border border-line px-4 py-4">
      <h1 id={titleId} className="mb-3 text-sm font-medium text-ink">
        {existing ? t("editTitle") : t("cardTitle")}
      </h1>

      {scanning ? (
        <div className="mb-3">
          <BarcodeScanner
            busy={lookingUp}
            error={scanError}
            onCode={(code) => void lookupCode(code)}
            onCameraError={() => setScanError(t("cameraFailed"))}
            onClose={() => setScanning(false)}
            onRetry={() => setScanError(null)}
          />
        </div>
      ) : null}

      <form
        id={formId}
        className="flex flex-col gap-3"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <Field
          id={fieldDomId("name")}
          label={t("nameLabel")}
          error={errors.name ? t(errors.name) : undefined}
        >
          <input
            id={fieldDomId("name")}
            value={form.name}
            onChange={(event) => setField("name", event.target.value)}
            autoComplete="off"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? errorId("name") : undefined}
            className={LEGACY_FIELD}
          />
        </Field>

        {NUTRIENT_FIELD_KEYS.map((key) => (
          <Field key={key} id={fieldDomId(key)} label={t(FIELD_LABEL[key])} error={errors[key] ? t(errors[key]) : undefined}>
            <input
              id={fieldDomId(key)}
              inputMode="decimal"
              autoComplete="off"
              value={form[key]}
              onChange={(event) => setField(key, event.target.value)}
              aria-invalid={errors[key] ? true : undefined}
              aria-describedby={errors[key] ? errorId(key) : undefined}
              className={LEGACY_FIELD}
            />
          </Field>
        ))}

        <Field
          id={fieldDomId("barcode")}
          label={t("barcodeLabel")}
          hint={t("barcodeHint")}
          error={errors.barcode ? t(errors.barcode) : undefined}
        >
          <input
            id={fieldDomId("barcode")}
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            value={form.barcode}
            onChange={(event) => setField("barcode", event.target.value)}
            placeholder={t("barcodePlaceholder")}
            aria-invalid={errors.barcode ? true : undefined}
            aria-describedby={describedBy("barcode", Boolean(errors.barcode), true)}
            className={LEGACY_FIELD}
          />
        </Field>

        {formError ? (
          <p role="alert" className="text-sm text-danger">
            {formError}
          </p>
        ) : null}
      </form>

      <div className="mt-3 flex flex-col gap-3">
        <button
          type="button"
          onClick={() => {
            setScanError(null);
            setScanning((open) => !open);
          }}
          className={GHOST_BUTTON}
        >
          <ScanBarcode className="mr-2 h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          {scanning ? t("closeScanner") : t("scan")}
        </button>
        <button type="submit" form={formId} disabled={saving} className={PRIMARY_BUTTON}>
          {existing ? t("saveEdit") : t("saveCreate")}
        </button>
        {existing && onCancel ? (
          <button type="button" onClick={onCancel} className={`text-sm font-semibold text-muted ${FOCUS_RING}`}>
            {common("cancel")}
          </button>
        ) : null}
      </div>
    </section>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[12.5px] font-semibold text-muted">
        {label}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="mb-1.5 text-[12px] text-muted">
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-[12.5px] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function fieldDomId(key: string): string {
  return `product-${key}`;
}

function errorId(key: string): string {
  return `${fieldDomId(key)}-error`;
}

function describedBy(key: NutrientFieldKey | "barcode" | "name", hasError: boolean, hasHint: boolean): string | undefined {
  const ids = [
    hasHint ? `${fieldDomId(key)}-hint` : null,
    hasError ? errorId(key) : null,
  ].filter(Boolean);
  return ids.length > 0 ? ids.join(" ") : undefined;
}
