import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { exInfo, type CustomExerciseInfo } from "../features/exercises/library/exInfo";
import { aggregateLoad } from "../features/exercises/library/aggregateLoad";
import { BROAD, GROUP_ORDER, RADAR_AXES } from "../features/exercises/library/library";
import type { Doc } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { requireUserId } from "./lib/auth";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

async function customExercisesByName(
  ctx: QueryCtx,
  userId: NonNullable<Awaited<ReturnType<typeof getAuthUserId>>>
): Promise<Record<string, CustomExerciseInfo>> {
  const rows = await ctx.db
    .query("customExercises")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const byName: Record<string, CustomExerciseInfo> = {};
  for (const r of rows) byName[r.name] = { primaryMuscle: r.primaryMuscle };
  return byName;
}

type WeekLoad = {
  groups: Record<string, number>;
  reps: Record<string, number>;
  fine: Record<string, number>;
  totalSets: number;
  totalReps: number;
  totalVolume: number;
  totalDurationSec: number;
  workouts: number;
};

/**
 * Per-exercise broad-group attribution mirrors the prototype's `weekSetsData`
 * exactly: a set counts once toward every *distinct broad group* among an
 * exercise's primary muscles, and half toward any broad group that's only a
 * secondary (skipped if that group is already a primary) — e.g. Overhead
 * Press's primary shoulders_front + shoulders_side both map to "Shoulders"
 * but must only add the set once, not twice. This is why `groups`/`reps`
 * can't just be derived by summing `aggregateLoad`'s fine-grained output
 * (which has no broad-group dedup) — `fine` below reuses that helper as-is
 * since the Body tab's muscle map has no such collision to guard against.
 */
function computeWeekLoad(
  sessions: Doc<"sessions">[],
  customByName: Record<string, CustomExerciseInfo>
): WeekLoad {
  const groups: Record<string, number> = {};
  const reps: Record<string, number> = {};
  let totalSets = 0;
  let totalReps = 0;
  let totalVolume = 0;
  let totalDurationSec = 0;
  let workouts = 0;
  const allExercises: {
    name: string;
    cardio: boolean;
    sets: { weight?: string; reps?: string; min?: string; warmup?: boolean }[];
  }[] = [];

  for (const s of sessions) {
    if (s.type !== "strength" || !s.exercises) continue;
    workouts++;
    totalDurationSec += s.durationSec ?? 0;

    for (const ex of s.exercises) {
      allExercises.push(ex);
      const workingSets = ex.sets.filter((x) => !x.warmup);
      const setCount = workingSets.filter((x) => x.reps || x.weight || x.min).length;
      let repCount = 0;
      for (const x of workingSets) {
        const r = Number(x.reps) || 0;
        repCount += r;
        totalVolume += (Number(x.weight) || 0) * r;
      }
      totalSets += setCount;
      totalReps += repCount;

      const info = exInfo(ex.name, customByName);
      if (!info) continue;
      const pg = new Set<string>();
      const sg = new Set<string>();
      for (const id of info.p) if (BROAD[id]) pg.add(BROAD[id]);
      for (const id of info.s) if (BROAD[id] && !pg.has(BROAD[id])) sg.add(BROAD[id]);
      for (const grp of pg) {
        groups[grp] = (groups[grp] ?? 0) + setCount;
        reps[grp] = (reps[grp] ?? 0) + repCount;
      }
      for (const grp of sg) {
        groups[grp] = (groups[grp] ?? 0) + setCount * 0.5;
      }
    }
  }

  const fine = aggregateLoad(allExercises, customByName);

  return { groups, reps, fine, totalSets, totalReps, totalVolume, totalDurationSec, workouts };
}

/** Sets tab: total sets/reps + per-broad-group sets/reps for one week. */
export const getWeekSets = query({
  args: { weekStartTs: v.number() },
  returns: v.object({
    totalSets: v.number(),
    totalReps: v.number(),
    groups: v.record(v.string(), v.number()),
    reps: v.record(v.string(), v.number()),
  }),
  handler: async (ctx, { weekStartTs }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { totalSets: 0, totalReps: 0, groups: {}, reps: {} };
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user_ts", (q) =>
        q.eq("userId", userId).gte("ts", weekStartTs).lt("ts", weekStartTs + WEEK_MS)
      )
      .collect();
    const load = computeWeekLoad(sessions, await customExercisesByName(ctx, userId));
    return {
      totalSets: load.totalSets,
      totalReps: load.totalReps,
      groups: load.groups,
      reps: load.reps,
    };
  },
});

/** Body tab: fine-grained muscle set counts (unnormalized) + total sets for one week. */
export const getWeekMuscleLoad = query({
  args: { weekStartTs: v.number() },
  returns: v.object({
    fine: v.record(v.string(), v.number()),
    totalSets: v.number(),
  }),
  handler: async (ctx, { weekStartTs }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { fine: {}, totalSets: 0 };
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user_ts", (q) =>
        q.eq("userId", userId).gte("ts", weekStartTs).lt("ts", weekStartTs + WEEK_MS)
      )
      .collect();
    const load = computeWeekLoad(sessions, await customExercisesByName(ctx, userId));
    return { fine: load.fine, totalSets: load.totalSets };
  },
});

const weekTotals = v.object({
  workouts: v.number(),
  durationSec: v.number(),
  volume: v.number(),
  sets: v.number(),
});

/** Trends tab: current vs. previous week, one bounded 14-day range query
 * split in JS (mirrors weeklyRhythm's single-range-query pattern). */
export const getWeekTrends = query({
  args: { currentWeekStartTs: v.number() },
  returns: v.object({
    current: weekTotals,
    previous: weekTotals,
    radar: v.object({
      axes: v.array(v.string()),
      current: v.record(v.string(), v.number()),
      previous: v.record(v.string(), v.number()),
    }),
  }),
  handler: async (ctx, { currentWeekStartTs }) => {
    const empty = { workouts: 0, durationSec: 0, volume: 0, sets: 0 };
    const axes = [...RADAR_AXES];
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return {
        current: empty,
        previous: empty,
        radar: { axes, current: {}, previous: {} },
      };
    }

    const prevWeekStartTs = currentWeekStartTs - WEEK_MS;
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user_ts", (q) =>
        q.eq("userId", userId).gte("ts", prevWeekStartTs).lt("ts", currentWeekStartTs + WEEK_MS)
      )
      .collect();
    const currentSessions = sessions.filter((s) => s.ts >= currentWeekStartTs);
    const previousSessions = sessions.filter(
      (s) => s.ts >= prevWeekStartTs && s.ts < currentWeekStartTs
    );

    const customByName = await customExercisesByName(ctx, userId);
    const cur = computeWeekLoad(currentSessions, customByName);
    const prev = computeWeekLoad(previousSessions, customByName);

    const radarVals = (l: WeekLoad): Record<string, number> => ({
      Back: l.groups.Back ?? 0,
      Chest: l.groups.Chest ?? 0,
      Core: l.groups.Core ?? 0,
      Shoulders: l.groups.Shoulders ?? 0,
      Arms: l.groups.Arms ?? 0,
      Legs:
        (l.groups.Glutes ?? 0) +
        (l.groups.Quadriceps ?? 0) +
        (l.groups.Hamstrings ?? 0) +
        (l.groups.Calves ?? 0),
    });

    return {
      current: {
        workouts: cur.workouts,
        durationSec: cur.totalDurationSec,
        volume: cur.totalVolume,
        sets: cur.totalSets,
      },
      previous: {
        workouts: prev.workouts,
        durationSec: prev.totalDurationSec,
        volume: prev.totalVolume,
        sets: prev.totalSets,
      },
      radar: { axes, current: radarVals(cur), previous: radarVals(prev) },
    };
  },
});

export const getTargets = query({
  args: {},
  returns: v.record(v.string(), v.object({ min: v.number(), max: v.number() })),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return {};
    const rows = await ctx.db
      .query("targets")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const byGroup: Record<string, { min: number; max: number }> = {};
    for (const r of rows) byGroup[r.group] = { min: r.min, max: r.max };
    return byGroup;
  },
});

export const setTarget = mutation({
  args: { group: v.string(), min: v.number(), max: v.number() },
  returns: v.null(),
  handler: async (ctx, { group, min, max }) => {
    const userId = await requireUserId(ctx);
    if (!GROUP_ORDER.includes(group)) throw new Error("Unknown muscle group.");
    const clampedMin = Math.max(0, Math.round(min));
    const clampedMax = Math.max(clampedMin, Math.round(max));
    const existing = await ctx.db
      .query("targets")
      .withIndex("by_user_group", (q) => q.eq("userId", userId).eq("group", group))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { min: clampedMin, max: clampedMax });
    } else {
      await ctx.db.insert("targets", { userId, group, min: clampedMin, max: clampedMax });
    }
    return null;
  },
});
