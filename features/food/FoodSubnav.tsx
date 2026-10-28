"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/food/diary", key: "diary" },
  { href: "/food/products", key: "products" },
  { href: "/food/overview", key: "overview" },
  { href: "/food/dietist", key: "dietist" },
  { href: "/food/settings/limits", key: "limits" },
] as const;

const FOCUS_RING =
  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-blue";

export function FoodSubnav() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <nav aria-label={t("foodLabel")} className="flex gap-2 overflow-x-auto pt-4 pb-1">
      {LINKS.map((link) => {
        const current = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={current ? "page" : undefined}
            className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-3.5 text-[13px] font-bold ${FOCUS_RING} ${
              current ? "bg-blue text-black" : "bg-surface-2 text-ink"
            }`}
          >
            {t(link.key)}
          </Link>
        );
      })}
    </nav>
  );
}
