import { getTranslations } from "next-intl/server";
import { FoodSubnav } from "@/features/food/FoodSubnav";

export default async function FoodLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("food");

  return (
    <div className="mx-auto w-full max-w-3xl">
      <p className="pt-1 text-center text-[22px] font-bold tracking-tight">{t("brand")}</p>
      <FoodSubnav />
      {children}
    </div>
  );
}
