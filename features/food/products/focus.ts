/** Keyboard focus ring that stays visible on the dark background (WCAG 2.4.7 / 2.4.13). */
export const FOCUS_RING =
  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-blue";

export const FIELD_CLASS = `w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-base text-ink focus:border-blue ${FOCUS_RING}`;
