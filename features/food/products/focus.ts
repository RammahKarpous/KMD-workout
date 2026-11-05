/** Keyboard focus ring that stays visible on the dark background (WCAG 2.4.7 / 2.4.13). */
export const FOCUS_RING =
  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-blue";

export const FIELD_CLASS = `w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-base text-ink focus:border-blue ${FOCUS_RING}`;

/** Stacked inputs from the old tracker: dark fill, full width, ~44px tall. */
export const LEGACY_FIELD = `w-full min-h-11 rounded-md border border-line bg-black px-3 py-2.5 text-base text-ink focus:border-blue ${FOCUS_RING}`;

export const PRIMARY_BUTTON = `inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-blue px-4 py-3 text-[15px] font-bold text-black disabled:opacity-60 ${FOCUS_RING}`;

export const GHOST_BUTTON = `inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-line bg-black px-4 py-3 text-sm font-semibold text-ink disabled:opacity-60 ${FOCUS_RING}`;
