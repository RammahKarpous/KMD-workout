export const LOCALES = ["en", "nl"] as const;

export type Locale = (typeof LOCALES)[number];

/** Cookie name. Paths stay unprefixed so auth redirects in proxy.ts keep working. */
export const LOCALE_COOKIE = "kmd-locale";

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "en" || value === "nl";
}

/** Cookie written when the language switcher changes the locale. */
export function localeCookie(locale: Locale): {
  name: typeof LOCALE_COOKIE;
  value: Locale;
  path: "/";
  maxAge: number;
  sameSite: "lax";
} {
  return {
    name: LOCALE_COOKIE,
    value: locale,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  };
}

/**
 * A saved choice wins. Otherwise Dutch browsers get Dutch, everyone else
 * English (the language the workout screens shipped in).
 */
export function resolveLocale(
  cookieValue: string | undefined | null,
  acceptLanguage: string | null,
): Locale {
  if (isLocale(cookieValue)) return cookieValue;
  if (acceptLanguage && /(^|,|\s)nl(-[A-Za-z]+)?(;|,|$)/i.test(acceptLanguage)) {
    return "nl";
  }
  return "en";
}
