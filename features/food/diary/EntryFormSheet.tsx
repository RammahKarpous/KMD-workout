"use client";

import { useMutation, usePaginatedQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { FOOD_CATEGORIES, FOOD_MOMENTS, type FoodCategory, type FoodMoment } from "@/shared/lib/food";
import { productQuery, productSummary } from "@/features/food/products/productForm";
import { FOCUS_RING, LEGACY_FIELD, PRIMARY_BUTTON } from "@/features/food/products/focus";
import {
  isDiaryDate,
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

export function DiaryEntryForm({
  date,
  existing,
  onSaved,
  onCancel,
}: {
  date: string;
  existing?: DiaryEntryDraft | null;
  onSaved: (message: string) => void;
  onCancel?: () => void;
}) {
  const t = useTranslations("food.diary");
  const common = useTranslations("common");
  const moments = useTranslations("food.moments");
  const categories = useTranslations("food.categories");
  const addEntry = useMutation(api.foodEntries.add);
  const updateEntry = useMutation(api.foodEntries.update);
  const titleId = useId();

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
  const dateReady = isDiaryDate(date);

  async function save() {
    if (!dateReady) return;
    const result = validateEntryForm({
      moment,
      category,
      amount,
      isRedMeat,
      productId,
    });
    if (!result.ok) {
      setErrors(result.errors);
      const first = (["moment", "productId", "amount", "category"] as const).find((key) => result.errors[key]);
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
        onSaved(t("updated"));
      } else {
        await addEntry({
          productId: result.value.productId as Id<"foodProducts">,
          date,
          moment: result.value.moment,
          category: result.value.category,
          isRedMeat: result.value.isRedMeat,
          ...portion,
        });
        onSaved(t("added"));
      }
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
      aria-labelledby={titleId}
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <h1 id={titleId} className="text-sm font-medium text-ink">
        {existing ? t("editTitle") : t("prompt")}
      </h1>
      <SelectField
        id={fieldId("moment")}
        label={t("momentLabel")}
        value={moment}
        placeholder={t("momentPlaceholder")}
        error={errors.moment ? t(errors.moment) : undefined}
        onChange={setMoment}
        options={FOOD_MOMENTS.map((value) => ({ value, label: moments(value) }))}
      />
      <ProductPicker
        selectedId={productId}
        selectedName={productName}
        error={errors.productId ? t(errors.productId) : undefined}
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
        <label htmlFor={fieldId("amount")} className="sr-only">
          {drink ? t("amountMl") : t("amountGrams")}
        </label>
        <input
          id={fieldId("amount")}
          inputMode="decimal"
          autoComplete="off"
          value={amount}
          placeholder={drink ? t("amountPlaceholderMl") : t("amountPlaceholder")}
          onChange={(event) => setAmount(event.target.value)}
          aria-invalid={errors.amount ? true : undefined}
          aria-describedby={errors.amount ? errorDomId("amount") : undefined}
          className={LEGACY_FIELD}
        />
        {errors.amount ? (
          <p id={errorDomId("amount")} className="mt-1.5 text-[12.5px] text-danger">
            {t(errors.amount)}
          </p>
        ) : null}
      </div>
      <SelectField
        id={fieldId("category")}
        label={t("categoryLabel")}
        value={category}
        placeholder={t("categoryPlaceholder")}
        error={errors.category ? t(errors.category) : undefined}
        onChange={(next) => {
          setCategory(next);
          if (next !== "vlees") setIsRedMeat(false);
        }}
        options={FOOD_CATEGORIES.map((value) => ({ value, label: categories(value) }))}
      />
      {category === "vlees" ? (
        <label className="flex min-h-11 items-center gap-2.5 text-sm text-ink">
          <input
            type="checkbox"
            checked={isRedMeat}
            onChange={(event) => setIsRedMeat(event.target.checked)}
            className={`h-5 w-5 accent-blue ${FOCUS_RING}`}
          />
          {t("redMeatToggle")}
        </label>
      ) : null}

      {formError ? (
        <p role="alert" className="text-sm text-danger">
          {formError}
        </p>
      ) : null}

      <button type="submit" disabled={saving || !dateReady} className={PRIMARY_BUTTON}>
        {existing ? t("saveEdit") : t("saveCreate")}
      </button>
      {existing && onCancel ? (
        <button type="button" onClick={onCancel} className={`min-h-11 text-sm font-semibold text-muted ${FOCUS_RING}`}>
          {common("cancel")}
        </button>
      ) : null}
    </form>
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
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("food.diary");
  const productText = useTranslations("food.products");

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

  const summary = productSummary({
    query: plan.mode === "search" ? plan.query : "",
    count: active.results.length,
    status: summaryStatus,
    canLoadMore: active.status === "CanLoadMore" || active.status === "LoadingMore",
  });

  return (
    <div
      ref={rootRef}
      onBlur={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <label htmlFor={fieldId("productId")} className="sr-only">
        {t("productLabel")}
      </label>
      <input
        id={fieldId("productId")}
        type="search"
        role="combobox"
        aria-expanded={open}
        aria-controls="entry-product-results"
        aria-autocomplete="list"
        value={search === "" ? selectedName : search}
        maxLength={64}
        autoComplete="off"
        placeholder={t("productPlaceholder")}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorDomId("productId") : "entry-product-summary"}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          const next = event.target.value;
          setSearch(next);
          if (selectedId) onClear();
          setOpen(true);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => setDebounced(next), SEARCH_DELAY_MS);
        }}
        className={LEGACY_FIELD}
      />
      <p id="entry-product-summary" aria-live="polite" className="sr-only">
        {productText(summary.key, summary.values)}
      </p>
      {open ? (
        <div className="mt-2 rounded-md border border-line bg-black">
          <ul id="entry-product-results" aria-label={t("productLabel")} className="flex max-h-48 flex-col overflow-y-auto">
            {active.results.map((product) => (
              <li key={product._id} className="border-b border-line last:border-b-0">
                <button
                  type="button"
                  aria-pressed={product._id === selectedId}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onSelect(product);
                    setSearch("");
                    setDebounced("");
                    setOpen(false);
                  }}
                  className={`min-h-11 w-full px-3 text-left text-sm ${
                    product._id === selectedId ? "bg-blue font-semibold text-black" : "text-ink"
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
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => active.loadMore(PAGE_SIZE)}
              className={`min-h-11 w-full border-t border-line text-sm font-bold text-blue ${FOCUS_RING}`}
            >
              {t("loadMore")}
            </button>
          ) : null}
        </div>
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
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={LEGACY_FIELD}
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
