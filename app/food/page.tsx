import type { Metadata } from "next";
import Link from "next/link";
import { FOOD_COPY } from "@/features/food/copy";

export const metadata: Metadata = {
  title: FOOD_COPY.pageTitle,
};

export default function FoodPage() {
  return (
    <div className="pt-8">
      <h1 className="text-[26px] font-extrabold tracking-tight">{FOOD_COPY.heading}</h1>
      <p className="mt-2 text-sm text-muted">{FOOD_COPY.intro}</p>
      <Link
        href="/food/products"
        className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-blue px-4 text-sm font-bold text-black underline-offset-2 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-blue"
      >
        {FOOD_COPY.productsLink}
      </Link>
    </div>
  );
}
