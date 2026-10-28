"use client";

import { useEffect, useId, useRef } from "react";
import { useFocusTrap } from "./useFocusTrap";

export function ConfirmDialog({
  open,
  message,
  danger,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  message: string;
  danger?: boolean;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useFocusTrap(open, panelRef);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-200 flex items-center justify-center bg-black/62 p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-85 rounded-2xl border border-line bg-surface p-5.5"
      >
        <p id={titleId} className="mb-5 text-[15px] leading-snug text-ink">
          {message}
        </p>
        <div className="flex justify-end gap-2.5">
          <button
            type="button"
            data-autofocus
            onClick={onCancel}
            className="rounded-[10px] bg-surface-2 px-4.5 py-2.75 text-sm font-bold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-blue"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-[10px] px-4.5 py-2.75 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-blue ${
              danger ? "bg-danger text-black" : "bg-blue text-black"
            }`}
          >
            {confirmLabel ?? (danger ? "Delete" : "OK")}
          </button>
        </div>
      </div>
    </div>
  );
}
