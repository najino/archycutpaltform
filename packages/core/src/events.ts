import { sql } from "drizzle-orm";
import type { ActivitySource, Db } from "@eth/db";
import { activityLog } from "@eth/db";

export type EventPayload = {
  type: string;
  entityType: string;
  entityId?: string;
  data?: Record<string, unknown>;
};

export async function logActivity(
  db: Db,
  input: {
    actorId?: string | null;
    source: ActivitySource;
    action: string;
    entityType: string;
    entityId?: string | null;
    payload?: Record<string, unknown>;
  },
) {
  await db.insert(activityLog).values({
    actorId: input.actorId ?? null,
    source: input.source,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    payload: input.payload ?? {},
  });
}

export async function emitEvent(db: Db, event: EventPayload) {
  await db.execute(
    sql`SELECT pg_notify('events', ${JSON.stringify(event)})`,
  );
}

export async function logAndEmit(
  db: Db,
  input: {
    actorId?: string | null;
    source: ActivitySource;
    action: string;
    entityType: string;
    entityId?: string | null;
    payload?: Record<string, unknown>;
    eventType?: string;
  },
) {
  await logActivity(db, input);
  await emitEvent(db, {
    type: input.eventType ?? input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? undefined,
    data: input.payload,
  });
}
