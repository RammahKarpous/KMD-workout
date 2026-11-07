"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { CloseIcon } from "@/shared/ui/icons";

const DISMISSED_KEY = "install-prompt-dismissed";

function isIos() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const t = useTranslations("install");
  const common = useTranslations("common");

  useEffect(() => {
    if (isStandalone()) return;
    if (!isIos()) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;
    setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-40 flex justify-center px-4.5 pt-3"
      style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}
    >
      <div className="flex w-full max-w-130 items-start gap-3 rounded-2xl border border-line bg-surface p-4 shadow-[0_10px_34px_rgba(0,0,0,0.55)]">
        <p className="flex-1 text-[13.5px] leading-snug text-ink">{t("body")}</p>
        <button
          type="button"
          aria-label={common("dismiss")}
          onClick={() => {
            localStorage.setItem(DISMISSED_KEY, "1");
            setVisible(false);
          }}
          className="text-muted-2 hover:text-ink"
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  );
}
