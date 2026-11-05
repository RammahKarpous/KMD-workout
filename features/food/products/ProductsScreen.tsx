"use client";

import { useMutation, usePaginatedQuery } from "convex/react";
import { Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { FOCUS_RING, LEGACY_FIELD } from "./focus";
import { ProductFormSheet } from "./ProductFormSheet";
import { productQuery, productSummary } from "./productForm";

const PAGE_SIZE = 20;
const SEARCH_DELAY_MS = 300;

export function ProductsScreen() {
  const t = useTranslations("food.products");
  const removeProduct = useMutation(api.foodProducts.remove);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Doc<"foodProducts"> | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Doc<"foodProducts"> | null>(null);
  const [formKey, setFormKey] = useState(0);
  const formAnchor = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!editing) return;
    formAnchor.current?.scrollIntoView({ block: "start" });
  }, [editing]);

  const plan = productQuery(debouncedSearch);
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

  function finishSave(message: string) {
    setStatusMessage(message);
    setEditing(null);
    setFormKey((key) => key + 1);
  }

  return (
    <div className="mx-auto w-full max-w-md pt-2">
      <div ref={formAnchor}>
        <ProductFormSheet
          key={editing ? editing._id : `new-${formKey}`}
          existing={editing}
          onSaved={finishSave}
          onCancel={() => {
            setEditing(null);
            setFormKey((key) => key + 1);
          }}
        />
      </div>

      <div className="mt-4">
        <label htmlFor="product-search" className="sr-only">
          {t("searchLabel")}
        </label>
        <input
          id="product-search"
          type="search"
          value={search}
          maxLength={64}
          autoComplete="off"
          placeholder={t("searchPlaceholder")}
          onChange={(event) => {
            const next = event.target.value;
            setSearch(next);
            if (searchTimer.current) clearTimeout(searchTimer.current);
            searchTimer.current = setTimeout(() => setDebouncedSearch(next), SEARCH_DELAY_MS);
          }}
          className={LEGACY_FIELD}
        />
      </div>

      <p aria-live="polite" aria-atomic="true" className="sr-only">
        {(() => {
          const summary = productSummary({
            query: plan.mode === "search" ? plan.query : "",
            count: active.results.length,
            status: summaryStatus,
            canLoadMore: active.status === "CanLoadMore" || active.status === "LoadingMore",
          });
          return t(summary.key, summary.values);
        })()}
      </p>
      <p aria-live="polite" className="sr-only">
        {statusMessage ?? ""}
      </p>
      {statusMessage ? (
        <p className="mt-3 rounded-xl border border-green/40 bg-green/10 px-3 py-2 text-sm text-ink">
          {statusMessage}
        </p>
      ) : null}
      {deleteError ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {deleteError}
        </p>
      ) : null}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">{t("listCaption")}</caption>
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="px-1 py-2 text-center text-sm font-medium text-ink">
                {t("nameColumn")}
              </th>
              <th scope="col" className="sr-only">
                {t("edit")}
              </th>
            </tr>
          </thead>
          <tbody>
            {summaryStatus === "loading" ? (
              <tr>
                <td colSpan={2} className="px-1 py-3 text-sm text-muted">
                  {t("loading")}
                </td>
              </tr>
            ) : active.results.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-1 py-3 text-sm text-muted">
                  {plan.mode === "search" ? t("summaryEmptySearch", { query: plan.query }) : t("summaryEmpty")}
                </td>
              </tr>
            ) : (
              active.results.map((product) => (
                <tr key={product._id} className="border-b border-line">
                  <th scope="row" className="px-1 py-2 text-left text-sm font-normal text-ink">
                    {product.name}
                    {product.barcode ? (
                      <span className="mt-0.5 block text-[12px] text-muted">{product.barcode}</span>
                    ) : null}
                  </th>
                  <td className="w-px px-1 py-1">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError(null);
                          setEditing(product);
                        }}
                        aria-label={t("editNamed", { name: product.name })}
                        className={`inline-flex min-h-11 min-w-11 items-center justify-center text-[#f0c14a] ${FOCUS_RING}`}
                      >
                        <Pencil className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError(null);
                          setPendingDelete(product);
                        }}
                        aria-label={t("deleteNamed", { name: product.name })}
                        className={`inline-flex min-h-11 min-w-11 items-center justify-center text-muted ${FOCUS_RING}`}
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {active.status === "CanLoadMore" ? (
        <button
          type="button"
          onClick={() => active.loadMore(PAGE_SIZE)}
          className={`mt-3 w-full rounded-xl bg-surface py-3 text-[13.5px] font-bold text-blue ${FOCUS_RING}`}
        >
          {t("loadMore")}
        </button>
      ) : null}
      {active.status === "LoadingMore" ? (
        <div className="mt-3 h-11 animate-pulse rounded-xl bg-surface" aria-hidden="true" />
      ) : null}

      <ConfirmDialog
        open={pendingDelete !== null}
        danger
        message={pendingDelete ? t("deleteConfirm", { name: pendingDelete.name }) : ""}
        confirmLabel={t("delete")}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          const product = pendingDelete;
          setPendingDelete(null);
          if (!product) return;
          if (editing?._id === product._id) setEditing(null);
          void removeProduct({ id: product._id })
            .then(() => setStatusMessage(t("deleted")))
            .catch(() => setDeleteError(t("deleteFailed")));
        }}
      />
    </div>
  );
}
