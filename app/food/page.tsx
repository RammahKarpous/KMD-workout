import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("food");
  return { title: t("hubTitle") };
}

export default async function FoodPage() {
  const t = await getTranslations("food");

  return (
    <div className="pt-4">
      <h1 className="text-[26px] font-extrabold tracking-tight">{t("hubTitle")}</h1>
      <p className="mt-2 text-sm text-muted">{t("hubIntro")}</p>
    </div>
  );
}
