import { changeStatus, can, getTaskByShortCode } from "@eth/core";
import type { BotContext } from "../context.js";
import { handlePromoteCallback } from "./commands/promote.js";
import { handleInvoiceCallbacks } from "./commands/invoices.js";

export async function handleCallbacks(ctx: BotContext) {
  const data = ctx.callbackQuery?.data;
  if (!data || !ctx.user) return;

  if (data.startsWith("promote:") || data.startsWith("demote:")) {
    await handlePromoteCallback(ctx);
    return;
  }

  if (data.startsWith("inv_")) {
    await handleInvoiceCallbacks(ctx);
    return;
  }

  if (data.startsWith("start_task:")) {
    const code = data.slice("start_task:".length);
    const task = await getTaskByShortCode(ctx.db, code);
    if (!task || task.assigneeId !== ctx.user.id) {
      await ctx.answerCallbackQuery({ text: "Forbidden", show_alert: true });
      return;
    }
    try {
      const updated = await changeStatus(
        ctx.db,
        ctx.user,
        code,
        "in_progress",
        "bot",
      );
      await ctx.answerCallbackQuery({ text: "Started" });
      await ctx.editMessageText(
        `<b>${updated.shortCode}</b> · ${updated.status}\n${updated.title}`,
        { parse_mode: "HTML" },
      );
    } catch (err) {
      await ctx.answerCallbackQuery({
        text: err instanceof Error ? err.message : "Error",
        show_alert: true,
      });
    }
    return;
  }

  if (data.startsWith("approve:") || data.startsWith("reject:")) {
    if (!can(ctx.user, "task.status.approve")) {
      await ctx.answerCallbackQuery({ text: "Forbidden", show_alert: true });
      return;
    }
    const isApprove = data.startsWith("approve:");
    const code = data.split(":")[1]!;
    try {
      const updated = await changeStatus(
        ctx.db,
        ctx.user,
        code,
        isApprove ? "approved" : "rejected",
        "bot",
      );
      await ctx.answerCallbackQuery({ text: "OK" });
      await ctx.editMessageText(
        `${isApprove ? "✅" : "❌"} ${updated.shortCode} → ${updated.status}`,
      );
    } catch (err) {
      await ctx.answerCallbackQuery({
        text: err instanceof Error ? err.message : "Error",
        show_alert: true,
      });
    }
    return;
  }

  // submit_pick handled by conversation entry in index
}
