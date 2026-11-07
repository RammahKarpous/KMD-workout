"use client";

import { useTranslations } from "next-intl";
import { useRef, useState, type ReactNode } from "react";

const REVEAL = 76;
/** Minimum horizontal movement, and clearly more horizontal than vertical,
 * before a drag is treated as a swipe — below this a pointer-down is left
 * alone so tapping an input/button or scrolling the page still works. */
const THRESHOLD = 8;

/**
 * Wraps a row (e.g. a set) so it can be dragged left with touch or mouse to
 * reveal a "Delete" button underneath, instead of a permanently-visible
 * remove button. Pointer Events cover touch/mouse/pen in one code path, so
 * no gesture library is needed.
 */
export function SwipeToDelete({
  onDelete,
  children,
  className = "",
}: {
  onDelete: () => void;
  children: ReactNode;
  className?: string;
}) {
  const [dragX, setDragX] = useState(0);
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const engaged = useRef(false);
  const t = useTranslations("common");

  function onPointerDown(e: React.PointerEvent) {
    origin.current = { x: e.clientX, y: e.clientY };
    engaged.current = false;
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!origin.current) return;
    const dx = e.clientX - origin.current.x;
    const dy = e.clientY - origin.current.y;

    if (!engaged.current) {
      if (Math.abs(dx) < THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;
      engaged.current = true;
      setDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    }

    const base = open ? -REVEAL : 0;
    setDragX(Math.min(0, Math.max(-REVEAL, base + dx)));
  }

  function endDrag() {
    if (engaged.current) {
      const shouldOpen = dragX < -REVEAL / 2;
      setOpen(shouldOpen);
      setDragX(shouldOpen ? -REVEAL : 0);
    }
    origin.current = null;
    engaged.current = false;
    setDragging(false);
  }

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ touchAction: "pan-y" }}>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setDragX(0);
          onDelete();
        }}
        style={{ width: REVEAL }}
        className="absolute inset-y-0 right-0 flex items-center justify-center rounded-lg bg-danger text-[13px] font-bold text-black"
        aria-label={t("delete")}
      >
        {t("delete")}
      </button>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{
          transform: `translateX(${dragX}px)`,
          transition: dragging ? "none" : "transform 200ms ease",
        }}
        className="relative bg-surface"
      >
        {children}
      </div>
    </div>
  );
}
