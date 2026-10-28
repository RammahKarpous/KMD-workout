"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { usePreloadedQuery, useQuery, type Preloaded } from "convex/react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { FOOD_COPY } from "@/features/food/copy";
import { ActiveStrengthScreen } from "@/features/logging/components/ActiveStrengthScreen";
import { useActiveWorkout } from "@/features/logging/context/ActiveWorkoutContext";
import { startOfWeek } from "@/shared/lib/date";
import { useSheet } from "@/shared/ui/SheetHost";
import { FolderEditorSheet } from "../editors/FolderEditorSheet";
import { RoutineEditorSheet } from "../editors/RoutineEditorSheet";
import { FolderRow } from "./FolderRow";
import { GreetingHeader } from "./GreetingHeader";
import { QuickStartButton } from "./QuickStartButton";
import { RoutineCard } from "./RoutineCard";

export function WorkoutHome({
  preloaded,
}: {
  preloaded: Preloaded<typeof api.workout.listFoldersAndRoutines>;
}) {
  const data = usePreloadedQuery(preloaded);
  const weekSummary = useQuery(api.logging.getThisWeekSummary, {
    weekStartTs: startOfWeek().getTime(),
  });
  const { push } = useSheet();
  const { start } = useActiveWorkout();
  const { signOut } = useAuthActions();

  const folderIds = new Set(data.folders.map((f) => f._id));
  const ungrouped = data.routines.filter(
    (r) => !r.folderId || !folderIds.has(r.folderId)
  );

  return (
    <div className="pt-2">
      <div className="flex items-center justify-between pt-6.5 pb-4.5">
        <div>
          <div className="text-[26px] font-extrabold tracking-tight">
            <span className="text-blue">KMD&apos;s Workout</span>
          </div>
          {/* Temporary until food has its own tab. */}
          <Link
            href="/food"
            className="text-[13px] font-semibold text-blue underline outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-blue"
          >
            {FOOD_COPY.navLink}
          </Link>
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="rounded-lg bg-surface-2 px-3 py-2 text-[13px] font-semibold text-muted hover:text-ink"
        >
          Sign out
        </button>
      </div>

      <div className="lg:grid lg:grid-cols-[360px_1fr] lg:items-start lg:gap-6 xl:grid-cols-[380px_1fr]">
        <div>
          <GreetingHeader sessionsThisWeek={weekSummary?.count} />
          <div className="mt-2">
            <QuickStartButton
              onClick={() => {
                const startTs = Date.now();
                start(
                  { title: "Workout", startTs },
                  <ActiveStrengthScreen initialExercises={[]} startTs={startTs} />
                );
              }}
            />
          </div>
        </div>

        <div>
          <div className="mt-6 mb-3 flex items-center justify-between lg:mt-0">
            <span className="text-[12.5px] font-bold uppercase tracking-wide text-muted">
              Routines
            </span>
            <button
              type="button"
              onClick={() => push("folder-editor", <FolderEditorSheet />)}
              className="px-1 py-0.5 text-[12.5px] font-bold text-blue"
            >
              + New folder
            </button>
          </div>

          <button
            type="button"
            onClick={() => push("routine-editor", <RoutineEditorSheet />)}
            className="mb-3 w-full rounded-card border-[1.6px] border-dashed border-line py-4 text-center text-[14.5px] font-bold text-blue"
          >
            + New routine
          </button>

          {data.folders.map((f) => (
            <FolderRow
              key={f._id}
              folder={f}
              routines={data.routines.filter((r) => r.folderId === f._id)}
            />
          ))}

          {data.routines.length === 0 && data.folders.length === 0 ? (
            <div className="pt-1.5 text-center text-[14px] text-muted-2">
              <span className="mb-1.5 block text-lg font-bold text-muted">
                No routines yet.
              </span>
              Build a fixed workout — give it a name and start it each week
              with one tap. Group them into folders if you like.
            </div>
          ) : (
            ungrouped.length > 0 && (
              <>
                {data.folders.length > 0 && (
                  <div className="mb-3 border-t border-line pt-4 text-[12.5px] font-bold uppercase tracking-wide text-muted">
                    My routines
                  </div>
                )}
                <div className="lg:grid lg:grid-cols-2 lg:gap-3">
                  {ungrouped.map((r) => (
                    <RoutineCard key={r._id} routine={r} />
                  ))}
                </div>
              </>
            )
          )}
        </div>
      </div>
    </div>
  );
}
