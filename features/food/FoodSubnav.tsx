"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/food/products", key: "products" },
  { href: "/food/diary", key: "diary" },
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
    <nav
      aria-label={t("foodLabel")}
      className="flex w-full flex-nowrap items-center justify-center-safe gap-2 overflow-x-auto px-1 pt-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {LINKS.map((link) => {
        const current = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={current ? "page" : undefined}
            className={`inline-flex min-h-11 min-w-6 shrink-0 items-center rounded-lg px-3.5 text-[13px] font-bold ${FOCUS_RING} ${
              current ? "bg-blue text-black" : "bg-[#1b3f72] text-white"
            }`}
          >
            {t(link.key)}
          </Link>
        );
      })}
    </nav>
  );
}
