import { eq } from "drizzle-orm";
import type { NextFunction } from "grammy";
import { tgProcessedUpdates } from "@eth/db";
import type { BotContext } from "../context.js";

export async function idempotencyMiddleware(
  ctx: BotContext,
  next: NextFunction,
) {
  const updateId = ctx.update.update_id;
  const existing = await ctx.db
    .select()
    .from(tgProcessedUpdates)
    .where(eq(tgProcessedUpdates.updateId, BigInt(updateId)))
    .limit(1);

  if (existing[0]) return;

  await next();

  await ctx.db
    .insert(tgProcessedUpdates)
    .values({ updateId: BigInt(updateId) })
    .onConflictDoNothing();
}
