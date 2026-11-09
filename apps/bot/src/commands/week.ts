import { currentWeekKey, getMyWeekStats } from "@eth/core";
import type { BotContext } from "../context.js";

export async function weekCommand(ctx: BotContext) {
  if (!ctx.user) return;
  const weekKey = currentWeekKey();
  const stats = await getMyWeekStats(ctx.db, ctx.user, weekKey);
  await ctx.reply(
    `📊 هفته ${weekKey}\n` +
      `${stats.total} tasks · ${stats.delivered} delivered · ${stats.approved} approved` +
      (stats.rejected ? ` · ${stats.rejected} rejected` : ""),
  );
}
