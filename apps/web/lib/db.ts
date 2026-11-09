import { getDb } from "@eth/db";

export function db() {
  return getDb(process.env.DATABASE_URL);
}
