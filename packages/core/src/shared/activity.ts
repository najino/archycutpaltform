import { desc, eq } from "drizzle-orm";
import type { Db } from "@eth/db";
import { activityLog } from "@eth/db";

export async function listActivityForEntity(
  db: Db,
  entityType: string,
  entityId: string,
  limit = 50,
) {
  return db
    .select()
    .from(activityLog)
    .where(eq(activityLog.entityId, entityId))
    .orderBy(desc(activityLog.createdAt))
    .limit(limit)
    .then((rows) => rows.filter((r) => r.entityType === entityType));
}
