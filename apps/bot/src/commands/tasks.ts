import { currentWeekKey, listMembers, listWeekTasks } from "@eth/core";
import { can } from "@eth/core";
import type { BotContext } from "../context.js";

export async function tasksCommand(ctx: BotContext) {
  if (!ctx.user) return;
  if (!can(ctx.user, "task.view_all")) {
    await ctx.reply("فقط ادمین.");
    return;
  }

  const arg = ctx.message?.text?.split(/\s+/)[1];
  const weekKey = currentWeekKey();
  let assigneeId: string | undefined;

  if (arg && arg !== "all" && !arg.startsWith("@")) {
    await ctx.reply("استفاده: /tasks all یا /tasks (بدون آرگومان برای همه)");
  }

  // Prefer listing all; @username lookup is unreliable for bots
  if (arg?.startsWith("@")) {
    const members = await listMembers(ctx.db);
    const found = members.find(
      (m) => m.username?.toLowerCase() === arg.slice(1).toLowerCase(),
    );
    if (!found) {
      await ctx.reply("کاربر در سیستم پیدا نشد. از /tasks all استفاده کنید.");
      return;
    }
    assigneeId = found.id;
  }

  const items = await listWeekTasks(ctx.db, ctx.user, weekKey, { assigneeId });
  if (items.length === 0) {
    await ctx.reply(`تسکی برای ${weekKey} نیست.`);
    return;
  }

  const lines = items.map(
    (t) => `• <code>${t.shortCode}</code> [${t.status}] ${t.title}`,
  );
  await ctx.reply(`📋 ${weekKey}\n${lines.join("\n")}`, {
    parse_mode: "HTML",
  });
}
