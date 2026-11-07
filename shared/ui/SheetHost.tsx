"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Sheet } from "./Sheet";

type SheetEntry = { key: string; content: ReactNode };

type SheetContextValue = {
  /** Push a new sheet onto the stack (e.g. open the exercise picker on top of the routine editor). */
  push: (key: string, content: ReactNode) => void;
  /** Close the top-most sheet. */
  pop: () => void;
  /** Swap the top-most sheet's content without animating a close/open. */
  replace: (key: string, content: ReactNode) => void;
  /** Close every open sheet. */
  closeAll: () => void;
};

const SheetContext = createContext<SheetContextValue | null>(null);

export function useSheet() {
  const ctx = useContext(SheetContext);
  if (!ctx) throw new Error("useSheet must be used within <SheetHost>");
  return ctx;
}

/**
 * Mounted once in the root layout. Owns a stack of sheet contents so nested
 * flows (e.g. "add exercise" opened from inside the routine editor) are just
 * another push, matching the prototype's single-overlay-with-swapped-contents
 * behavior instead of routes.
 */
export function SheetHost({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<SheetEntry[]>([]);
  // Number of history entries pushed for currently-open sheets. Every push()
  // adds a no-op history entry so the hardware/browser back button closes
  // the top sheet instead of navigating the page away from under it. This is
  // the single source of truth for how many of those entries are pending —
  // both a UI-triggered close and a real back-button press reconcile against
  // it so the two never fight (see the guard in the popstate handler).
  const depthRef = useRef(0);
  // How many upcoming popstate events were triggered by our own pop()/
  // closeAll() (via history.back()/go()) rather than a real back-button
  // press, and are therefore already reflected in the stack. Without this,
  // the popstate handler can't tell the two apart and double-pops: a
  // UI-triggered pop() updates the stack immediately *and* calls
  // history.back() to keep the URL in sync, and that back() still fires its
  // own popstate a moment later.
  const pendingProgrammaticPops = useRef(0);

  // Lock the page behind the sheet while it's open. Without this, focusing
  // an autofocused input inside the fixed-position sheet (e.g. the exercise
  // search box) makes iOS Safari scroll the *background* page to bring the
  // keyboard-obscured sheet into view, which reads as the whole app
  // jumping.
  useEffect(() => {
    if (stack.length === 0) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [stack.length]);

  const push = useCallback((key: string, content: ReactNode) => {
    window.history.pushState({ sheet: true }, "");
    depthRef.current += 1;
    setStack((s) => [...s, { key, content }]);
  }, []);

  const popInternal = useCallback(() => {
    setStack((s) => (s.length > 0 ? s.slice(0, -1) : s));
  }, []);

  // Real back-button press: the browser already navigated, we just need to
  // reflect that in the sheet stack — unless this popstate was actually
  // caused by our own history.back()/go() call below, in which case the
  // stack was already updated synchronously and this is just a no-op to
  // acknowledge.
  useEffect(() => {
    function onPopState() {
      if (pendingProgrammaticPops.current > 0) {
        pendingProgrammaticPops.current -= 1;
        return;
      }
      if (depthRef.current > 0) {
        depthRef.current -= 1;
        popInternal();
      }
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [popInternal]);

  // UI-triggered close (X button, backdrop click, save/discard): update the
  // stack immediately for a snappy close, then consume the matching history
  // entry so a later back-button press doesn't land on a stale dummy entry.
  const pop = useCallback(() => {
    if (depthRef.current === 0) return;
    depthRef.current -= 1;
    popInternal();
    pendingProgrammaticPops.current += 1;
    window.history.back();
  }, [popInternal]);

  const replace = useCallback((key: string, content: ReactNode) => {
    setStack((s) => [...s.slice(0, -1), { key, content }]);
  }, []);

  const closeAll = useCallback(() => {
    const n = depthRef.current;
    if (n === 0) return;
    depthRef.current = 0;
    setStack([]);
    // history.go(-n) jumps directly to the target entry and fires exactly
    // one popstate, however many entries it skips over.
    pendingProgrammaticPops.current += 1;
    window.history.go(-n);
  }, []);

  return (
    <SheetContext.Provider value={{ push, pop, replace, closeAll }}>
      {/* While a sheet is open the page behind it is not a second tab stop.
          The sheet itself is a sibling of this wrapper, so it stays usable. */}
      <div inert={stack.length > 0}>{children}</div>
      <Sheet open={stack.length > 0} onClose={pop}>
        {/* Every stacked entry stays mounted (only display:none'd when not
            on top) so state and timers in a lower sheet (e.g. a routine
            draft, or a running workout timer) survive a nested push/pop
            like opening the exercise picker on top of it. Each entry owns
            its own scroll container so switching the visible entry can't
            leak one sheet's scroll position into another (that leak used to
            read as the whole view "jumping to the top" whenever a nested
            sheet, like the exercise picker, closed). */}
        {stack.map((entry, i) => (
          <div
            key={entry.key}
            hidden={i !== stack.length - 1}
            className="max-h-[92dvh] overflow-y-auto overscroll-contain md:max-h-[88dvh]"
          >
            {entry.content}
          </div>
        ))}
      </Sheet>
    </SheetContext.Provider>
  );
}
