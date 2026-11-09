import { InlineKeyboard } from "grammy";
import { currentWeekKey, listWeekTasks } from "@eth/core";
import type { BotContext } from "../context.js";

export async function myCommand(ctx: BotContext) {
  if (!ctx.user) return;
  const weekKey = currentWeekKey();
  const items = await listWeekTasks(ctx.db, ctx.user, weekKey);

  if (items.length === 0) {
    await ctx.reply(`این هفته (${weekKey}) تسکی ندارید.`);
    return;
  }

  for (const task of items.slice(0, 20)) {
    const kb = new InlineKeyboard();
    if (task.status === "todo") {
      kb.text("▶ Start", `start_task:${task.shortCode}`);
    }
    if (["todo", "in_progress", "rejected"].includes(task.status)) {
      kb.text("📤 Submit", `submit_pick:${task.shortCode}`);
    }
    await ctx.reply(
      `<b>${task.shortCode}</b> · ${task.status}\n${task.title}`,
      { parse_mode: "HTML", reply_markup: kb },
    );
  }
}
