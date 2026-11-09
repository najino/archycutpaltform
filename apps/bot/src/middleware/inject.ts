import { getUserByTelegramId } from "@eth/core";
import type { Db } from "@eth/db";
import type { Context, NextFunction } from "grammy";

type WithDbUser = Context & {
  db: Db;
  user: import("@eth/db").User | null;
};

export function createInjectMiddleware(db: Db) {
  return async (ctx: Context, next: NextFunction) => {
    const c = ctx as WithDbUser;
    c.db = db;
    c.user = null;
    if (ctx.from?.id != null) {
      c.user = await getUserByTelegramId(db, BigInt(ctx.from.id));
    }
    await next();
  };
}
