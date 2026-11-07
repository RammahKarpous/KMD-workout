"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import type { Doc } from "@/convex/_generated/dataModel";

export function RoutineCard({ routine }: { routine: Doc<"routines"> }) {
  const t = useTranslations("workout");
  const names = routine.exercises.map((e) => e.name);
  const summary = names.slice(0, 4).join(", ") + (names.length > 4 ? "…" : "");

  return (
    <Link
      href={`/routines/${routine._id}`}
      className="mb-3 block rounded-card bg-surface p-4 transition-[outline] hover:outline hover:outline-1 hover:outline-line"
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-[16.5px] font-bold tracking-tight">{routine.name}</div>
          <div className="mt-1 text-[12.5px] leading-snug text-muted-2">
            {summary || t("noExercises")}
          </div>
        </div>
        <div className="pl-2 text-xl leading-none text-muted-2">›</div>
      </div>
    </Link>
  );
}
