"use client";

import { useMutation, usePaginatedQuery } from "convex/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { useSheet } from "@/shared/ui/SheetHost";
import { PRODUCTS_COPY, productResultSummary } from "./copy";
import { FOCUS_RING } from "./focus";
import { ProductFormSheet } from "./ProductFormSheet";
import { formatPer100g, nutrientLabel, productQuery, NUTRIENT_FIELD_KEYS } from "./productForm";

const PAGE_SIZE = 20;
const SEARCH_DELAY_MS = 300;

export function ProductsScreen() {
  const { push } = useSheet();
  const removeProduct = useMutation(api.foodProducts.remove);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Doc<"foodProducts"> | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  const plan = productQuery(debouncedSearch);
  // Only one of these runs. Switching indexes mid-pagination would reuse a
  // cursor that belongs to the other query, so an empty box skips search
  // and a real query skips the alphabetical list.
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

  function openCreate() {
    push(
      "product-form",
      <ProductFormSheet onSaved={setStatusMessage} />,
    );
  }

  function openEdit(product: Doc<"foodProducts">) {
    push(
      "product-form",
      <ProductFormSheet existing={product} onSaved={setStatusMessage} />,
    );
  }

  return (
    <div className="pt-2">
      <div className="flex items-baseline justify-between gap-3 pt-6.5 pb-4.5">
        <h1 className="text-[26px] font-extrabold tracking-tight">{PRODUCTS_COPY.heading}</h1>
        <Link href="/food" className={`text-[13px] font-semibold text-blue underline ${FOCUS_RING}`}>
          {PRODUCTS_COPY.backToFood}
        </Link>
      </div>

      <button
        type="button"
        onClick={openCreate}
        className={`mb-4 w-full rounded-2xl bg-blue py-4 text-[15.5px] font-bold text-black ${FOCUS_RING}`}
      >
        {PRODUCTS_COPY.add}
      </button>

      <div className="mb-3">
        <label htmlFor="product-search" className="mb-1.5 block text-[12.5px] font-semibold text-muted">
          {PRODUCTS_COPY.searchLabel}
        </label>
        <input
          id="product-search"
          type="search"
          value={search}
          maxLength={64}
          autoComplete="off"
          placeholder={PRODUCTS_COPY.searchPlaceholder}
          onChange={(event) => {
            const next = event.target.value;
            setSearch(next);
            if (searchTimer.current) clearTimeout(searchTimer.current);
            searchTimer.current = setTimeout(() => setDebouncedSearch(next), SEARCH_DELAY_MS);
          }}
          className={`w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-base text-ink focus:border-blue ${FOCUS_RING}`}
        />
      </div>

      <p aria-live="polite" aria-atomic="true" className="mb-3 text-sm text-muted">
        {productResultSummary({
          query: plan.mode === "search" ? plan.query : "",
          count: active.results.length,
          status: summaryStatus,
          canLoadMore: active.status === "CanLoadMore" || active.status === "LoadingMore",
        })}
      </p>
      <p aria-live="polite" className="sr-only">
        {statusMessage ?? ""}
      </p>
      {statusMessage ? (
        <p className="mb-3 rounded-xl border border-green/40 bg-green/10 px-3 py-2 text-sm text-ink">
          {statusMessage}
        </p>
      ) : null}
      {deleteError ? (
        <p role="alert" className="mb-3 text-sm text-danger">
          {deleteError}
        </p>
      ) : null}

      {summaryStatus === "loading" ? (
        <div className="flex flex-col gap-2" aria-hidden="true">
          <div className="h-24 animate-pulse rounded-card bg-surface" />
          <div className="h-24 animate-pulse rounded-card bg-surface" />
        </div>
      ) : active.results.length === 0 ? null : (
        <ul className="flex flex-col gap-2">
          {active.results.map((product) => (
            <li key={product._id}>
              <ProductCard
                product={product}
                onEdit={() => openEdit(product)}
                onDelete={() => {
                  setDeleteError(null);
                  setPendingDelete(product);
                }}
              />
            </li>
          ))}
        </ul>
      )}

      {active.status === "CanLoadMore" ? (
        <button
          type="button"
          onClick={() => active.loadMore(PAGE_SIZE)}
          className={`mt-3 w-full rounded-xl bg-surface py-3 text-[13.5px] font-bold text-blue ${FOCUS_RING}`}
        >
          {PRODUCTS_COPY.loadMore}
        </button>
      ) : null}
      {active.status === "LoadingMore" ? (
        <div className="mt-3 h-11 animate-pulse rounded-xl bg-surface" aria-hidden="true" />
      ) : null}

      <ConfirmDialog
        open={pendingDelete !== null}
        danger
        message={pendingDelete ? PRODUCTS_COPY.deleteConfirm(pendingDelete.name) : ""}
        confirmLabel={PRODUCTS_COPY.delete}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          const product = pendingDelete;
          setPendingDelete(null);
          if (!product) return;
          void removeProduct({ id: product._id })
            .then(() => setStatusMessage(PRODUCTS_COPY.deleted))
            .catch(() => setDeleteError(PRODUCTS_COPY.deleteFailed));
        }}
      />
    </div>
  );
}

function ProductCard({
  product,
  onEdit,
  onDelete,
}: {
  product: Doc<"foodProducts">;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const titleId = `product-card-${product._id}`;
  return (
    <article aria-labelledby={titleId} className="rounded-card border border-line bg-surface p-3.5">
      <h2 id={titleId} className="truncate text-[16px] font-bold text-ink">
        {product.name}
      </h2>
      {product.barcode ? (
        <p className="mt-0.5 text-[12px] text-muted">{product.barcode}</p>
      ) : null}
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 sm:grid-cols-3">
        {NUTRIENT_FIELD_KEYS.map((key) => (
          <div key={key}>
            <dt className="text-[11px] font-semibold text-muted">{nutrientLabel(key)}</dt>
            <dd className="text-sm text-ink">
              {formatPer100g(product.per100g[key])}
              <span className="text-muted"> {key === "kcal" ? PRODUCTS_COPY.unitKcal : PRODUCTS_COPY.unitGrams}</span>
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onEdit}
          aria-label={PRODUCTS_COPY.editNamed(product.name)}
          className={`min-h-11 flex-1 rounded-xl bg-surface-2 text-sm font-bold text-ink ${FOCUS_RING}`}
        >
          {PRODUCTS_COPY.edit}
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={PRODUCTS_COPY.deleteNamed(product.name)}
          className={`min-h-11 flex-1 rounded-xl bg-surface-2 text-sm font-bold text-danger ${FOCUS_RING}`}
        >
          {PRODUCTS_COPY.delete}
        </button>
      </div>
    </article>
  );
}
