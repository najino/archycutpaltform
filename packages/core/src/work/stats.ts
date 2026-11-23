import { and, eq, sql } from "drizzle-orm";
import type { Db, User } from "@eth/db";
import { tasks, users } from "@eth/db";
import { assertCan, can } from "./permissions.js";

export type WeekStats = {
  userId: string;
  displayName: string;
  total: number;
  delivered: number;
  approved: number;
  rejected: number;
  inProgress: number;
  todo: number;
};

export async function getWeekStatsForUser(
  db: Db,
  userId: string,
  weekKey: string,
): Promise<Omit<WeekStats, "userId" | "displayName">> {
  const rows = await db
    .select({
      status: tasks.status,
      count: sql<number>`count(*)::int`,
    })
    .from(tasks)
    .where(and(eq(tasks.assigneeId, userId), eq(tasks.weekKey, weekKey)))
    .groupBy(tasks.status);

  const counts = {
    total: 0,
    delivered: 0,
    approved: 0,
    rejected: 0,
    inProgress: 0,
    todo: 0,
  };

  for (const row of rows) {
    counts.total += row.count;
    if (row.status === "delivered") counts.delivered += row.count;
    if (row.status === "approved") {
      counts.approved += row.count;
      counts.delivered += row.count; // approved implies delivered
    }
    if (row.status === "rejected") counts.rejected += row.count;
    if (row.status === "in_progress") counts.inProgress += row.count;
    if (row.status === "todo") counts.todo += row.count;
  }

  return counts;
}

export async function getTeamWeekStats(
  db: Db,
  actor: User,
  weekKey: string,
): Promise<WeekStats[]> {
  assertCan(actor, "stats.view_all");

  const editors = await db
    .select()
    .from(users)
    .where(eq(users.isActive, true));

  const result: WeekStats[] = [];
  for (const editor of editors) {
    if (editor.role === "owner" && editors.length > 1) {
      // include everyone who may have tasks
    }
    const stats = await getWeekStatsForUser(db, editor.id, weekKey);
    if (stats.total > 0 || editor.role === "editor") {
      result.push({
        userId: editor.id,
        displayName: editor.displayName,
        ...stats,
      });
    }
  }
  return result;
}

export async function getMyWeekStats(
  db: Db,
  actor: User,
  weekKey: string,
): Promise<WeekStats> {
  if (!can(actor, "stats.view_all") && actor.role !== "editor") {
    // still allow self
  }
  const stats = await getWeekStatsForUser(db, actor.id, weekKey);
  return {
    userId: actor.id,
    displayName: actor.displayName,
    ...stats,
  };
}
