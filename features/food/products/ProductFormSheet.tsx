"use client";

import { useAction, useMutation } from "convex/react";
import dynamic from "next/dynamic";
import { useId, useRef, useState, type ReactNode } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { Nutrients } from "@/shared/lib/nutrients";
import { SheetHeader } from "@/shared/ui/SheetHeader";
import { useSheet } from "@/shared/ui/SheetHost";
import { useFocusTrap } from "@/shared/ui/useFocusTrap";
import { PRODUCTS_COPY } from "./copy";
import { FIELD_CLASS, FOCUS_RING } from "./focus";
import {
  NUTRIENT_FIELD_KEYS,
  emptyProductForm,
  formFromLookup,
  formFromProduct,
  nutrientLabel,
  validateProductForm,
  type NutrientFieldKey,
  type ProductFormInput,
} from "./productForm";

const BarcodeScanner = dynamic(
  () => import("./BarcodeScanner").then((mod) => mod.BarcodeScanner),
  {
    ssr: false,
    loading: () => <p className="text-sm text-muted">{PRODUCTS_COPY.cameraStarting}</p>,
  },
);

type ExistingProduct = {
  _id: Id<"foodProducts">;
  name: string;
  barcode?: string;
  per100g: Nutrients;
};

export function ProductFormSheet({
  existing,
  onSaved,
}: {
  existing?: ExistingProduct | null;
  onSaved: (message: string) => void;
}) {
  const { pop } = useSheet();
  const createProduct = useMutation(api.foodProducts.create);
  const updateProduct = useMutation(api.foodProducts.update);
  const lookup = useAction(api.openFoodFacts.lookup);

  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(true, panelRef);

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
        onSaved(PRODUCTS_COPY.updated);
      } else {
        await createProduct({
          name: result.value.name,
          per100g: result.value.per100g,
          ...(result.value.barcode ? { barcode: result.value.barcode } : {}),
        });
        onSaved(PRODUCTS_COPY.added);
      }
      pop();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : PRODUCTS_COPY.saveFailed);
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
        setScanError(PRODUCTS_COPY.notFound(code));
        return;
      }
      const digits = code.replace(/\D/g, "");
      setForm(formFromLookup(found, digits || code));
      setErrors({});
      setScanning(false);
    } catch (error) {
      setScanError(error instanceof Error ? error.message : PRODUCTS_COPY.lookupFailed);
    } finally {
      setLookingUp(false);
    }
  }

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="px-4 pb-6"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          if (scanning) setScanning(false);
          else pop();
        }
      }}
    >
      <SheetHeader
        titleId={titleId}
        title={existing ? PRODUCTS_COPY.editTitle : PRODUCTS_COPY.createTitle}
        onClose={() => (scanning ? setScanning(false) : pop())}
        closeIcon={scanning ? "back" : "x"}
      />

      {scanning ? (
        <BarcodeScanner
          busy={lookingUp}
          error={scanError}
          onCode={(code) => void lookupCode(code)}
          onCameraError={() => setScanError(PRODUCTS_COPY.cameraFailed)}
          onClose={() => setScanning(false)}
          onRetry={() => setScanError(null)}
        />
      ) : (
        <form
          className="flex flex-col gap-3"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <Field
            id={fieldDomId("name")}
            label={PRODUCTS_COPY.nameLabel}
            error={errors.name}
          >
            <input
              id={fieldDomId("name")}
              data-autofocus
              value={form.name}
              onChange={(event) => setField("name", event.target.value)}
              placeholder={PRODUCTS_COPY.namePlaceholder}
              autoComplete="off"
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? errorId("name") : undefined}
              className={FIELD_CLASS}
            />
          </Field>

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 text-[12.5px] font-semibold text-muted">
              {PRODUCTS_COPY.per100gLegend}
            </legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {NUTRIENT_FIELD_KEYS.map((key) => (
                <Field key={key} id={fieldDomId(key)} label={nutrientLabel(key)} error={errors[key]}>
                  <input
                    id={fieldDomId(key)}
                    inputMode="decimal"
                    autoComplete="off"
                    value={form[key]}
                    onChange={(event) => setField(key, event.target.value)}
                    aria-invalid={errors[key] ? true : undefined}
                    aria-describedby={errors[key] ? errorId(key) : undefined}
                    className={FIELD_CLASS}
                  />
                </Field>
              ))}
            </div>
          </fieldset>

          <Field
            id={fieldDomId("barcode")}
            label={PRODUCTS_COPY.barcodeLabel}
            hint={PRODUCTS_COPY.barcodeHint}
            error={errors.barcode}
          >
            <input
              id={fieldDomId("barcode")}
              inputMode="numeric"
              autoComplete="off"
              spellCheck={false}
              value={form.barcode}
              onChange={(event) => setField("barcode", event.target.value)}
              placeholder={PRODUCTS_COPY.barcodePlaceholder}
              aria-invalid={errors.barcode ? true : undefined}
              aria-describedby={describedBy("barcode", Boolean(errors.barcode), true)}
              className={FIELD_CLASS}
            />
          </Field>

          {formError ? (
            <p role="alert" className="text-sm text-danger">
              {formError}
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => {
              setScanError(null);
              setScanning(true);
            }}
            className={`rounded-xl border border-line bg-surface py-3 text-sm font-bold text-ink ${FOCUS_RING}`}
          >
            {PRODUCTS_COPY.scan}
          </button>
          <button
            type="submit"
            disabled={saving}
            className={`rounded-2xl bg-blue py-4 text-[15.5px] font-bold text-black disabled:opacity-60 ${FOCUS_RING}`}
          >
            {existing ? PRODUCTS_COPY.saveEdit : PRODUCTS_COPY.saveCreate}
          </button>
        </form>
      )}
    </div>
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
