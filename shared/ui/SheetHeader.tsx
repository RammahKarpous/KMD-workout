"use client";

import type { ReactNode } from "react";
import { BackIcon, CloseIcon } from "./icons";

export function SheetHeader({
  title,
  titleId,
  onClose,
  closeIcon = "x",
  right,
}: {
  title: string;
  titleId?: string;
  onClose: () => void;
  closeIcon?: "x" | "back";
  right?: ReactNode;
}) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between gap-2.5 bg-bg py-4">
      <div className="flex min-w-11 items-center justify-start gap-1">{right}</div>
      <h2 id={titleId} className="flex-1 truncate text-center text-[19px] font-bold">
        {title}
      </h2>
      <button
        type="button"
        onClick={onClose}
        className="flex items-center justify-center rounded-lg p-1.5 text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-blue"
        aria-label={closeIcon === "back" ? "Back" : "Close"}
      >
        {closeIcon === "back" ? <BackIcon /> : <CloseIcon />}
      </button>
    </div>
  );
}
