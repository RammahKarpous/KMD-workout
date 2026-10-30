"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Dumbbell, LineChart, Utensils } from "lucide-react";

const TABS = [
  { href: "/", key: "workout", icon: Dumbbell },
  { href: "/progress", key: "progress", icon: LineChart },
  { href: "/stats", key: "statistics", icon: BarChart3 },
  { href: "/food", key: "food", icon: Utensils },
] as const;

const FOCUS_RING =
  "outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-blue";

export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  if (pathname === "/login") return null;

  return (
    <nav
      aria-label={t("label")}
      className="fixed inset-x-0 bottom-0 z-30 flex justify-center gap-1 border-t border-line bg-black/90 py-2.25 backdrop-blur-md md:inset-x-auto md:bottom-5.5 md:left-1/2 md:w-auto md:-translate-x-1/2 md:rounded-full md:border md:bg-[rgba(24,24,26,0.94)] md:p-1.5 md:shadow-[0_10px_34px_rgba(0,0,0,0.55)]"
      style={{ paddingBottom: "max(9px, env(safe-area-inset-bottom))" }}
    >
      {TABS.map((tab) => {
        const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 min-w-6 flex-col items-center gap-1 rounded-xl px-3.5 py-1.5 text-[11px] font-semibold md:flex-row md:gap-2 md:rounded-full md:px-4 md:py-2 ${FOCUS_RING} ${
              active ? "text-blue md:bg-surface-2" : "text-muted-2 hover:text-ink"
            }`}
          >
            <span className="h-5.5 w-5.5 md:h-4.75 md:w-4.75 [&>svg]:h-full [&>svg]:w-full">
              <Icon strokeWidth={1.8} aria-hidden />
            </span>
            {t(tab.key)}
          </Link>
        );
      })}
    </nav>
  );
}
