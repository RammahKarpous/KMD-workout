"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";
import { FIELD_CLASS, FOCUS_RING } from "./focus";

/**
 * Camera barcode scanner. `html5-qrcode` is imported inside the effect so it
 * stays out of the server bundle and out of the first client load. The
 * parent also mounts this component with `next/dynamic`.
 */
export function BarcodeScanner({
  busy,
  error,
  onCode,
  onCameraError,
  onClose,
  onRetry,
}: {
  busy: boolean;
  error: string | null;
  onCode: (barcode: string) => void;
  onCameraError: () => void;
  onClose: () => void;
  onRetry: () => void;
}) {
  const t = useTranslations("food.products");
  const readerId = useId().replace(/:/g, "");
  const manualId = `${readerId}-manual`;
  const manualRef = useRef<HTMLInputElement>(null);
  const onCodeRef = useRef(onCode);
  const onCameraErrorRef = useRef(onCameraError);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    onCodeRef.current = onCode;
    onCameraErrorRef.current = onCameraError;
  }, [onCode, onCameraError]);

  useEffect(() => {
    manualRef.current?.focus();
  }, [attempt]);

  useEffect(() => {
    let cancelled = false;
    let scanner: Html5Qrcode | null = null;
    let handled = false;

    async function start() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;
        const next = new Html5Qrcode(readerId, { verbose: false });
        scanner = next;
        await next.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 150 } },
          (decoded) => {
            if (cancelled || handled) return;
            handled = true;
            void next.stop().catch(() => undefined).then(() => {
              onCodeRef.current(decoded);
            });
          },
          () => {
            // Frame misses are normal while the camera is hunting.
          },
        );
      } catch {
        if (!cancelled) onCameraErrorRef.current();
      }
    }

    void start();
    return () => {
      cancelled = true;
      const current = scanner;
      scanner = null;
      if (!current) return;
      if (current.isScanning) {
        void current.stop().then(() => current.clear()).catch(() => current.clear());
      } else {
        current.clear();
      }
    };
  }, [attempt, readerId]);

  return (
    <div className="flex flex-col gap-3">
      <div
        id={readerId}
        aria-label={t("scanTitle")}
        className="min-h-48 overflow-hidden rounded-xl bg-black [&_video]:w-full"
      />
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const value = manualRef.current?.value.trim() ?? "";
          if (!value || busy) return;
          onCode(value);
        }}
      >
        <label htmlFor={manualId} className="text-[12.5px] font-semibold text-muted">
          {t("manualLabel")}
        </label>
        <div className="flex gap-2">
          <input
            ref={manualRef}
            id={manualId}
            data-autofocus
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            placeholder={t("manualPlaceholder")}
            className={FIELD_CLASS}
          />
          <button
            type="submit"
            disabled={busy}
            className={`shrink-0 rounded-xl bg-blue px-4 text-sm font-bold text-black disabled:opacity-60 ${FOCUS_RING}`}
          >
            {busy ? t("lookingUp") : t("lookup")}
          </button>
        </div>
      </form>

      <button
        type="button"
        onClick={() => {
          onRetry();
          setAttempt((n) => n + 1);
        }}
        className={`rounded-xl bg-surface-2 py-3 text-sm font-bold text-ink ${FOCUS_RING}`}
      >
        {t("scanAgain")}
      </button>
      <button
        type="button"
        onClick={onClose}
        className={`rounded-xl py-3 text-sm font-bold text-muted ${FOCUS_RING}`}
      >
        {t("closeScanner")}
      </button>
    </div>
  );
}
