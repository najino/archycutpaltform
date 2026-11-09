import type { Conversation } from "@grammyjs/conversations";
import { createTask } from "@eth/core";
import type { BotContext, InsideContext } from "../context.js";

export async function addConversation(
  conversation: Conversation<BotContext, InsideContext>,
  ctx: InsideContext,
) {
  if (!ctx.user) {
    await ctx.reply("ابتدا عضو شوید.");
    return;
  }

  await ctx.reply("عنوان تسک را بفرستید:");
  const titleCtx = await conversation.waitFor("message:text");
  const title = titleCtx.message.text.trim();
  if (!title) {
    await ctx.reply("عنوان خالی بود. لغو شد.");
    return;
  }

  await ctx.reply("تاریخ موعد (YYYY-MM-DD) یا /skip برای رد کردن:");
  const dueCtx = await conversation.waitFor("message:text");
  let dueDate: string | null = null;
  const dueText = dueCtx.message.text.trim();
  if (dueText !== "/skip" && /^\d{4}-\d{2}-\d{2}$/.test(dueText)) {
    dueDate = dueText;
  }

  const task = await conversation.external((c) =>
    createTask(
      c.db,
      c.user!,
      {
        title,
        assigneeId: c.user!.id,
        dueDate,
      },
      "bot",
    ),
  );

  await ctx.reply(`✅ ساخته شد: ${task.shortCode} — ${task.title}`);
}
