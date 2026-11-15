import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

export type Sql = ReturnType<typeof postgres>;
export type Db = ReturnType<typeof createDb>;

type GlobalDb = {
  __ethSql?: Sql;
  __ethDb?: Db;
  __ethDbUrl?: string;
};

const globalForDb = globalThis as unknown as GlobalDb;

function poolMax() {
  const raw = Number(process.env.DB_POOL_MAX ?? "");
  if (Number.isFinite(raw) && raw > 0) return Math.min(raw, 20);
  // Next.js HMR + bot + SSE — keep local pools small
  return process.env.NODE_ENV === "production" ? 8 : 3;
}

export function createDb(connectionString: string) {
  const client = postgres(connectionString, {
    max: poolMax(),
    idle_timeout: 20,
    connect_timeout: 10,
    max_lifetime: 60 * 30,
  });
  return drizzle(client, { schema });
}

/**
 * Singleton across Next.js HMR / multiple imports.
 * Without globalThis, each hot-reload opens a new pool and leaks clients.
 */
export function getDb(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  if (globalForDb.__ethDb && globalForDb.__ethDbUrl === connectionString) {
    return globalForDb.__ethDb;
  }

  // URL changed (rare) — close previous pool
  if (globalForDb.__ethSql) {
    void globalForDb.__ethSql.end({ timeout: 1 });
  }

  const sql = postgres(connectionString, {
    max: poolMax(),
    idle_timeout: 20,
    connect_timeout: 10,
    max_lifetime: 60 * 30,
  });
  const db = drizzle(sql, { schema });

  globalForDb.__ethSql = sql;
  globalForDb.__ethDb = db;
  globalForDb.__ethDbUrl = connectionString;

  return db;
}

/** Optional: close pool (scripts / tests) */
export async function closeDb() {
  if (globalForDb.__ethSql) {
    await globalForDb.__ethSql.end({ timeout: 5 });
  }
  globalForDb.__ethSql = undefined;
  globalForDb.__ethDb = undefined;
  globalForDb.__ethDbUrl = undefined;
}
