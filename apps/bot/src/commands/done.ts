import { changeStatus, can } from "@eth/core";
import type { BotContext } from "../context.js";

export async function doneCommand(ctx: BotContext) {
  if (!ctx.user) return;
  const code = ctx.message?.text?.split(/\s+/)[1];
  if (!code) {
    await ctx.reply("استفاده: /done T-0142");
    return;
  }

  try {
    // Admin convenience: mark delivered then approved if they have permission
    let task = await changeStatus(ctx.db, ctx.user, code, "delivered", "bot");
    if (can(ctx.user, "task.status.approve") && task.status === "delivered") {
      task = await changeStatus(ctx.db, ctx.user, code, "approved", "bot");
    }
    await ctx.reply(`✅ ${task.shortCode} → ${task.status}`);
  } catch (err) {
    // If already delivered, try approve
    try {
      if (can(ctx.user, "task.status.approve")) {
        const task = await changeStatus(
          ctx.db,
          ctx.user,
          code,
          "approved",
          "bot",
        );
        await ctx.reply(`✅ ${task.shortCode} → ${task.status}`);
        return;
      }
    } catch {
      // fallthrough
    }
    await ctx.reply(err instanceof Error ? err.message : "خطا");
  }
}
