"use client";

import { useTranslations } from "next-intl";

export function AlertDialog({
  open,
  message,
  onClose,
}: {
  open: boolean;
  message: string;
  onClose: () => void;
}) {
  const t = useTranslations("common");
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/62 p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-85 rounded-2xl border border-line bg-surface p-5.5">
        <p className="mb-5 text-[15px] leading-snug text-ink">{message}</p>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[10px] bg-blue px-4.5 py-2.75 text-sm font-bold text-white"
          >
            {t("ok")}
          </button>
        </div>
      </div>
    </div>
  );
}
