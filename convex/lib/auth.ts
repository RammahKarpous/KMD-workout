import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server";

/**
 * Throws if the caller isn't signed in. Queries that should render an
 * empty screen while logged out use `getAuthUserId` directly instead.
 * Actions pass the same `ctx` — `getAuthUserId` only needs `ctx.auth`.
 */
export async function requireUserId(
  ctx: QueryCtx | MutationCtx | ActionCtx,
): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  return userId;
}
