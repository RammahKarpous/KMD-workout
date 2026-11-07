"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LOCALES, type Locale } from "@/shared/i18n/locale";
import { setLocale } from "./actions";

const FOCUS_RING =
  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-blue";

export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations("common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(next: Locale) {
    if (next === locale || pending) return;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <div role="group" aria-label={t("language")} className="flex justify-end gap-1">
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          aria-pressed={locale === code}
          disabled={pending}
          onClick={() => choose(code)}
          className={`min-h-11 rounded-lg px-3 text-[13px] font-bold ${FOCUS_RING} ${
            locale === code ? "bg-blue text-black" : "bg-surface-2 text-ink"
          }`}
        >
          {t(code)}
        </button>
      ))}
    </div>
  );
}
