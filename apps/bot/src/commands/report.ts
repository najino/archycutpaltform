import { can, currentWeekKey, getTeamWeekStats } from "@eth/core";
import type { BotContext } from "../context.js";

export async function reportCommand(ctx: BotContext) {
  if (!ctx.user) return;
  if (!can(ctx.user, "stats.view_all")) {
    await ctx.reply("فقط ادمین.");
    return;
  }
  const weekKey = currentWeekKey();
  const stats = await getTeamWeekStats(ctx.db, ctx.user, weekKey);
  if (stats.length === 0) {
    await ctx.reply(`گزارشی برای ${weekKey} نیست.`);
    return;
  }
  const lines = stats.map(
    (s) =>
      `• ${s.displayName}: ${s.total} total · ${s.delivered} delivered · ${s.approved} approved`,
  );
  await ctx.reply(`📈 گزارش ${weekKey}\n${lines.join("\n")}`);
}
