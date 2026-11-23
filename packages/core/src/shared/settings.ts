import { eq } from "drizzle-orm";
import type { ActivitySource, Db, User } from "@eth/db";
import { appSettings, categories, clients } from "@eth/db";
import { assertCan } from "../identity/permissions.js";
import { logAndEmit } from "./events.js";
import { slugifyHashtag } from "@eth/telegram";

export type AgencySettings = {
  name: string;
  logoUrl?: string | null;
};

const AGENCY_KEY = "agency";

/** Default invoice / agency letterhead title */
export const DEFAULT_AGENCY_NAME = "فاکتور تسویه حساب ماهانه آرشی کات";

export async function getAgencySettings(db: Db): Promise<AgencySettings> {
  const row = (
    await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, AGENCY_KEY))
      .limit(1)
  )[0];
  const value = (row?.value ?? {}) as Partial<AgencySettings>;
  const rawName = value.name?.trim() || "";
  return {
    name:
      !rawName || rawName === "Edit Team Hub"
        ? DEFAULT_AGENCY_NAME
        : rawName,
    logoUrl: value.logoUrl ?? null,
  };
}

export async function setAgencySettings(
  db: Db,
  actor: User,
  settings: AgencySettings,
  source: ActivitySource,
) {
  assertCan(actor, "settings.manage");
  await db
    .insert(appSettings)
    .values({ key: AGENCY_KEY, value: settings })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: settings },
    });
  await logAndEmit(db, {
    actorId: actor.id,
    source,
    action: "settings.agency_updated",
    entityType: "settings",
    entityId: null,
    payload: settings as unknown as Record<string, unknown>,
  });
}

export async function listCategories(db: Db) {
  return db.select().from(categories).orderBy(categories.name);
}

export async function listClients(db: Db) {
  return db.select().from(clients).orderBy(clients.name);
}

export async function createCategory(
  db: Db,
  actor: User,
  name: string,
  source: ActivitySource,
  slug?: string,
) {
  assertCan(actor, "settings.manage");
  const [row] = await db
    .insert(categories)
    .values({
      name: name.trim(),
      slug: slug ?? (slugifyHashtag(name) || "category"),
    })
    .returning();
  if (!row) throw new Error("Failed to create category");
  await logAndEmit(db, {
    actorId: actor.id,
    source,
    action: "category.created",
    entityType: "category",
    entityId: row.id,
    payload: { name: row.name },
  });
  return row;
}

export async function createClient(
  db: Db,
  actor: User,
  name: string,
  source: ActivitySource,
) {
  assertCan(actor, "settings.manage");
  const [row] = await db
    .insert(clients)
    .values({ name: name.trim() })
    .returning();
  if (!row) throw new Error("Failed to create client");
  await logAndEmit(db, {
    actorId: actor.id,
    source,
    action: "client.created",
    entityType: "client",
    entityId: row.id,
    payload: { name: row.name },
  });
  return row;
}

export async function getCategoryById(db: Db, id: string) {
  const rows = await db
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getClientById(db: Db, id: string) {
  const rows = await db
    .select()
    .from(clients)
    .where(eq(clients.id, id))
    .limit(1);
  return rows[0] ?? null;
}
