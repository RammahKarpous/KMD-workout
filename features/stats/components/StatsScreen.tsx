"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { startOfWeek } from "@/shared/lib/date";
import { Chip } from "@/shared/ui/Chip";
import { BodyTab } from "./BodyTab";
import { MeasurementsTab } from "./MeasurementsTab";
import { SetsTab } from "./SetsTab";
import { TrendsTab } from "./TrendsTab";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type Tab = "sets" | "body" | "trends" | "measurements";
const TABS: { id: Tab; label: "sets" | "body" | "trends" | "measure" }[] = [
  { id: "sets", label: "sets" },
  { id: "body", label: "body" },
  { id: "trends", label: "trends" },
  { id: "measurements", label: "measure" },
];

export function StatsScreen() {
  const t = useTranslations("stats");
  const [tab, setTab] = useState<Tab>("sets");
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStartTs = startOfWeek().getTime() + weekOffset * WEEK_MS;

  return (
    <div className="pt-2">
      <div className="pt-6.5 pb-4.5 text-[26px] font-extrabold tracking-tight">
        {t("heading")}
      </div>

      <div className="mb-5 flex gap-2">
        {TABS.map((item) => (
          <Chip key={item.id} active={tab === item.id} onClick={() => setTab(item.id)}>
            {t(item.label)}
          </Chip>
        ))}
      </div>

      {tab === "sets" && (
        <SetsTab weekStartTs={weekStartTs} offset={weekOffset} onOffsetChange={setWeekOffset} />
      )}
      {tab === "body" && (
        <BodyTab weekStartTs={weekStartTs} offset={weekOffset} onOffsetChange={setWeekOffset} />
      )}
      {tab === "trends" && <TrendsTab />}
      {tab === "measurements" && <MeasurementsTab />}
    </div>
  );
}
