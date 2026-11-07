"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { isLocale, localeCookie, type Locale } from "@/shared/i18n/locale";

export async function setLocale(locale: Locale): Promise<void> {
  if (!isLocale(locale)) return;
  const store = await cookies();
  const cookie = localeCookie(locale);
  store.set(cookie.name, cookie.value, {
    path: cookie.path,
    maxAge: cookie.maxAge,
    sameSite: cookie.sameSite,
  });
  revalidatePath("/", "layout");
}
