"use client";

import { useMutation, usePaginatedQuery } from "convex/react";
import { useEffect, useId, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { FOOD_CATEGORIES, FOOD_MOMENTS, type FoodCategory, type FoodMoment } from "@/shared/lib/food";
import { SheetHeader } from "@/shared/ui/SheetHeader";
import { useSheet } from "@/shared/ui/SheetHost";
import { useFocusTrap } from "@/shared/ui/useFocusTrap";
import { productResultSummary } from "@/features/food/products/copy";
import { productQuery } from "@/features/food/products/productForm";
import { FIELD_CLASS, FOCUS_RING } from "@/features/food/products/focus";
import { CATEGORY_LABEL, DIARY_COPY, MOMENT_LABEL } from "./copy";
import {
  portionKind,
  validateEntryForm,
  type EntryFormErrors,
} from "./diaryModel";

const PAGE_SIZE = 20;
const SEARCH_DELAY_MS = 300;

export type DiaryEntryDraft = {
  _id: Id<"foodEntries">;
  productId?: Id<"foodProducts">;
  productName: string;
  moment: FoodMoment;
  category?: FoodCategory;
  isRedMeat: boolean;
  grams?: number;
  ml?: number;
};

export function EntryFormSheet({
  date,
  existing,
  onSaved,
}: {
  date: string;
  existing?: DiaryEntryDraft | null;
  onSaved: (message: string) => void;
}) {
  const { pop } = useSheet();
  const addEntry = useMutation(api.foodEntries.add);
  const updateEntry = useMutation(api.foodEntries.update);
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(true, panelRef);

  const initialAmount = existing
    ? String(existing.category === "vocht" ? (existing.ml ?? "") : (existing.grams ?? ""))
    : "";
  const [moment, setMoment] = useState(existing?.moment ?? "");
  const [category, setCategory] = useState(existing?.category ?? "");
  const [amount, setAmount] = useState(initialAmount);
  const [isRedMeat, setIsRedMeat] = useState(existing?.isRedMeat ?? false);
  const [productId, setProductId] = useState<Id<"foodProducts"> | null>(existing?.productId ?? null);
  const [productName, setProductName] = useState(existing?.productName ?? "");
  const [errors, setErrors] = useState<EntryFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const drink = portionKind(category) === "ml";

  async function save() {
    const result = validateEntryForm({
      moment,
      category,
      amount,
      isRedMeat,
      productId,
    });
    if (!result.ok) {
      setErrors(result.errors);
      const first = (["moment", "category", "productId", "amount"] as const).find((key) => result.errors[key]);
      if (first) document.getElementById(fieldId(first))?.focus();
      return;
    }
    setErrors({});
    setFormError(null);
    setSaving(true);
    const portion = drink ? { ml: result.value.amount } : { grams: result.value.amount };
    try {
      if (existing) {
        await updateEntry({
          id: existing._id,
          productId: result.value.productId as Id<"foodProducts">,
          moment: result.value.moment,
          category: result.value.category,
          isRedMeat: result.value.isRedMeat,
          ...portion,
        });
        onSaved(DIARY_COPY.updated);
      } else {
        await addEntry({
          productId: result.value.productId as Id<"foodProducts">,
          date,
          moment: result.value.moment,
          category: result.value.category,
          isRedMeat: result.value.isRedMeat,
          ...portion,
        });
        onSaved(DIARY_COPY.added);
      }
      pop();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : DIARY_COPY.saveFailed);
    } finally {
      setSaving(false);
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
          pop();
        }
      }}
    >
      <SheetHeader
        titleId={titleId}
        title={existing ? DIARY_COPY.editTitle : DIARY_COPY.createTitle}
        onClose={pop}
      />
      <form
        className="flex flex-col gap-3"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <SelectField
          id={fieldId("moment")}
          label={DIARY_COPY.momentLabel}
          value={moment}
          placeholder={DIARY_COPY.momentPlaceholder}
          error={errors.moment}
          onChange={setMoment}
          options={FOOD_MOMENTS.map((value) => ({ value, label: MOMENT_LABEL[value] }))}
        />
        <SelectField
          id={fieldId("category")}
          label={DIARY_COPY.categoryLabel}
          value={category}
          placeholder={DIARY_COPY.categoryPlaceholder}
          error={errors.category}
          onChange={(next) => {
            setCategory(next);
            if (next !== "vlees") setIsRedMeat(false);
          }}
          options={FOOD_CATEGORIES.map((value) => ({ value, label: CATEGORY_LABEL[value] }))}
        />
        {category === "vlees" ? (
          <label className="flex min-h-11 items-center gap-2.5 text-sm text-ink">
            <input
              type="checkbox"
              checked={isRedMeat}
              onChange={(event) => setIsRedMeat(event.target.checked)}
              className={`h-5 w-5 accent-blue ${FOCUS_RING}`}
            />
            {DIARY_COPY.redMeatToggle}
          </label>
        ) : null}

        <ProductPicker
          selectedId={productId}
          selectedName={productName}
          error={errors.productId}
          onSelect={(product) => {
            setProductId(product._id);
            setProductName(product.name);
            setErrors((current) => ({ ...current, productId: undefined }));
          }}
          onClear={() => {
            setProductId(null);
            setProductName("");
          }}
        />

        <div>
          <label htmlFor={fieldId("amount")} className="mb-1.5 block text-[12.5px] font-semibold text-muted">
            {drink ? DIARY_COPY.amountMl : DIARY_COPY.amountGrams}
          </label>
          <input
            id={fieldId("amount")}
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            aria-invalid={errors.amount ? true : undefined}
            aria-describedby={errors.amount ? errorDomId("amount") : undefined}
            className={FIELD_CLASS}
          />
          {errors.amount ? (
            <p id={errorDomId("amount")} className="mt-1.5 text-[12.5px] text-danger">
              {errors.amount}
            </p>
          ) : null}
        </div>

        {formError ? (
          <p role="alert" className="text-sm text-danger">
            {formError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={saving}
          className={`rounded-2xl bg-blue py-4 text-[15.5px] font-bold text-black disabled:opacity-60 ${FOCUS_RING}`}
        >
          {existing ? DIARY_COPY.saveEdit : DIARY_COPY.saveCreate}
        </button>
      </form>
    </div>
  );
}

function ProductPicker({
  selectedId,
  selectedName,
  error,
  onSelect,
  onClear,
}: {
  selectedId: Id<"foodProducts"> | null;
  selectedName: string;
  error?: string;
  onSelect: (product: Doc<"foodProducts">) => void;
  onClear: () => void;
}) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const plan = productQuery(debounced);
  const list = usePaginatedQuery(
    api.foodProducts.list,
    plan.mode === "list" ? {} : "skip",
    { initialNumItems: PAGE_SIZE },
  );
  const found = usePaginatedQuery(
    api.foodProducts.search,
    plan.mode === "search" ? { query: plan.query } : "skip",
    { initialNumItems: PAGE_SIZE },
  );
  const active = plan.mode === "search" ? found : list;
  const summaryStatus =
    active.status === "LoadingFirstPage"
      ? "loading"
      : active.status === "LoadingMore"
        ? "loading-more"
        : "ready";

  return (
    <div>
      <label htmlFor={fieldId("productId")} className="mb-1.5 block text-[12.5px] font-semibold text-muted">
        {DIARY_COPY.productLabel}
      </label>
      {selectedId && selectedName ? (
        <p className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink">
          <span>
            {DIARY_COPY.selectedProduct}: {selectedName}
          </span>
          <button
            type="button"
            onClick={() => {
              onClear();
              searchRef.current?.focus();
            }}
            className={`shrink-0 font-semibold text-blue underline ${FOCUS_RING}`}
          >
            {DIARY_COPY.clearProduct}
          </button>
        </p>
      ) : null}
      <input
        ref={searchRef}
        id={fieldId("productId")}
        type="search"
        value={search}
        maxLength={64}
        autoComplete="off"
        placeholder={DIARY_COPY.productPlaceholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorDomId("productId") : "entry-product-summary"}
        aria-controls="entry-product-results"
        onChange={(event) => {
          const next = event.target.value;
          setSearch(next);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => setDebounced(next), SEARCH_DELAY_MS);
        }}
        className={FIELD_CLASS}
      />
      <p id="entry-product-summary" aria-live="polite" className="mt-1.5 text-[12.5px] text-muted">
        {productResultSummary({
          query: plan.mode === "search" ? plan.query : "",
          count: active.results.length,
          status: summaryStatus,
          canLoadMore: active.status === "CanLoadMore" || active.status === "LoadingMore",
        })}
      </p>
      <ul id="entry-product-results" aria-label={DIARY_COPY.productLabel} className="mt-2 flex max-h-48 flex-col gap-1 overflow-y-auto">
        {active.results.map((product) => (
          <li key={product._id}>
            <button
              type="button"
              aria-pressed={product._id === selectedId}
              onClick={() => onSelect(product)}
              className={`min-h-11 w-full rounded-xl px-3 text-left text-sm font-semibold ${
                product._id === selectedId ? "bg-blue text-black" : "bg-surface-2 text-ink"
              } ${FOCUS_RING}`}
            >
              {product.name}
            </button>
          </li>
        ))}
      </ul>
      {active.status === "CanLoadMore" ? (
        <button
          type="button"
          onClick={() => active.loadMore(PAGE_SIZE)}
          className={`mt-2 w-full rounded-xl bg-surface py-2 text-sm font-bold text-blue ${FOCUS_RING}`}
        >
          {DIARY_COPY.loadMore}
        </button>
      ) : null}
      {error ? (
        <p id={errorDomId("productId")} className="mt-1.5 text-[12.5px] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function SelectField({
  id,
  label,
  value,
  placeholder,
  error,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  error?: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[12.5px] font-semibold text-muted">
        {label}
      </label>
      <select
        id={id}
        data-autofocus={id === "entry-moment" ? true : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={FIELD_CLASS}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? (
        <p id={errorId} className="mt-1.5 text-[12.5px] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function fieldId(key: string): string {
  return `entry-${key}`;
}

function errorDomId(key: string): string {
  return `${fieldId(key)}-error`;
}
