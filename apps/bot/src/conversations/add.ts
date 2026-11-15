import type { Conversation } from "@grammyjs/conversations";
import { createTask, parseFlexibleDate } from "@eth/core";
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

  await ctx.reply("موعد شمسی YYYY/MM/DD یا میلادی YYYY-MM-DD یا /skip:");
  const dueCtx = await conversation.waitFor("message:text");
  let dueDate: string | null = null;
  const dueText = dueCtx.message.text.trim();
  if (dueText !== "/skip") {
    dueDate = parseFlexibleDate(dueText);
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
