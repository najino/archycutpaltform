import { changeStatus, can } from "@eth/core";
import type { BotContext } from "../context.js";

export async function approveCommand(ctx: BotContext) {
  if (!ctx.user) return;
  if (!can(ctx.user, "task.status.approve")) {
    await ctx.reply("فقط ادمین.");
    return;
  }
  const code = ctx.message?.text?.split(/\s+/)[1];
  if (!code) {
    await ctx.reply("استفاده: /approve T-0142");
    return;
  }
  try {
    const task = await changeStatus(ctx.db, ctx.user, code, "approved", "bot");
    await ctx.reply(`✅ ${task.shortCode} approved`);
  } catch (err) {
    await ctx.reply(err instanceof Error ? err.message : "خطا");
  }
}

export async function rejectCommand(ctx: BotContext) {
  if (!ctx.user) return;
  if (!can(ctx.user, "task.status.reject")) {
    await ctx.reply("فقط ادمین.");
    return;
  }
  const parts = ctx.message?.text?.trim().split(/\s+/) ?? [];
  const code = parts[1];
  const reason = parts.slice(2).join(" ") || undefined;
  if (!code) {
    await ctx.reply("استفاده: /reject T-0142 <reason>");
    return;
  }
  try {
    const task = await changeStatus(
      ctx.db,
      ctx.user,
      code,
      "rejected",
      "bot",
      reason,
    );
    await ctx.reply(`❌ ${task.shortCode} rejected`);
  } catch (err) {
    await ctx.reply(err instanceof Error ? err.message : "خطا");
  }
}
