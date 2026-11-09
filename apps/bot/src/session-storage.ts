import { eq } from "drizzle-orm";
import type { StorageAdapter } from "grammy";
import type { VersionedState, VersionedStateStorage } from "@grammyjs/conversations";
import type { Db } from "@eth/db";
import { botSessions } from "@eth/db";

export function createPgSessionStorage<T>(db: Db): StorageAdapter<T> {
  return {
    async read(key) {
      const rows = await db
        .select()
        .from(botSessions)
        .where(eq(botSessions.key, `sess:${key}`))
        .limit(1);
      return (rows[0]?.value as T) ?? undefined;
    },
    async write(key, value) {
      await db
        .insert(botSessions)
        .values({
          key: `sess:${key}`,
          value: value as Record<string, unknown>,
        })
        .onConflictDoUpdate({
          target: botSessions.key,
          set: { value: value as Record<string, unknown> },
        });
    },
    async delete(key) {
      await db.delete(botSessions).where(eq(botSessions.key, `sess:${key}`));
    },
  };
}

/** Persistence adapter for @grammyjs/conversations v2 */
export function createPgConversationStorage(
  db: Db,
): VersionedStateStorage<string, unknown> {
  return {
    async read(key) {
      const rows = await db
        .select()
        .from(botSessions)
        .where(eq(botSessions.key, `conv:${key}`))
        .limit(1);
      return rows[0]?.value as VersionedState<unknown> | undefined;
    },
    async write(key, state) {
      await db
        .insert(botSessions)
        .values({
          key: `conv:${key}`,
          value: state as unknown as Record<string, unknown>,
        })
        .onConflictDoUpdate({
          target: botSessions.key,
          set: { value: state as unknown as Record<string, unknown> },
        });
    },
    async delete(key) {
      await db.delete(botSessions).where(eq(botSessions.key, `conv:${key}`));
    },
  };
}
