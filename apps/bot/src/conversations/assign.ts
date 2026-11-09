import { InlineKeyboard } from "grammy";
import type { Conversation } from "@grammyjs/conversations";
import {
  can,
  createTask,
  listCategories,
  listClients,
  listMembers,
} from "@eth/core";
import type { VideoType } from "@eth/db";
import type { BotContext, InsideContext } from "../context.js";
import { notifyTaskAssigned } from "../notify.js";

async function waitCallback(
  conversation: Conversation<BotContext, InsideContext>,
  prefix: string,
) {
  const ctx = await conversation.waitFor("callback_query:data");
  const data = ctx.callbackQuery.data;
  await ctx.answerCallbackQuery();
  if (!data.startsWith(prefix)) return null;
  return data.slice(prefix.length);
}

export async function assignConversation(
  conversation: Conversation<BotContext, InsideContext>,
  ctx: InsideContext,
) {
  if (!ctx.user || !can(ctx.user, "task.assign")) {
    await ctx.reply("فقط ادمین.");
    return;
  }

  const members = (
    await conversation.external((c) => listMembers(c.db))
  ).filter((m) => m.isActive && (m.role === "editor" || m.role === "admin"));
  if (members.length === 0) {
    await ctx.reply("عضوی نیست.");
    return;
  }

  const kb = new InlineKeyboard();
  for (const m of members.slice(0, 20)) {
    kb.text(m.displayName, `asg_user:${m.id}`).row();
  }
  await ctx.reply("ادیتور را انتخاب کنید:", { reply_markup: kb });
  const assigneeId = await waitCallback(conversation, "asg_user:");
  if (!assigneeId) {
    await ctx.reply("لغو شد.");
    return;
  }

  await ctx.reply("عنوان تسک:");
  const titleCtx = await conversation.waitFor("message:text");
  const title = titleCtx.message.text.trim();

  const cats = await conversation.external((c) => listCategories(c.db));
  const catKb = new InlineKeyboard();
  for (const c of cats.slice(0, 12)) {
    catKb.text(c.name, `asg_cat:${c.id}`).row();
  }
  catKb.text("Skip", "asg_cat:skip");
  await ctx.reply("دسته:", { reply_markup: catKb });
  const catRaw = await waitCallback(conversation, "asg_cat:");
  const categoryId = catRaw && catRaw !== "skip" ? catRaw : null;

  const clients = await conversation.external((c) => listClients(c.db));
  const clientKb = new InlineKeyboard();
  for (const c of clients.slice(0, 12)) {
    clientKb.text(c.name, `asg_cli:${c.id}`).row();
  }
  clientKb.text("Skip", "asg_cli:skip");
  await ctx.reply("کارفرما:", { reply_markup: clientKb });
  const clientRaw = await waitCallback(conversation, "asg_cli:");
  const clientId = clientRaw && clientRaw !== "skip" ? clientRaw : null;

  const typeKb = new InlineKeyboard()
    .text("Reels", "asg_type:reels")
    .text("Shorts", "asg_type:shorts")
    .row()
    .text("YouTube long", "asg_type:youtube_long")
    .text("Other", "asg_type:other")
    .row()
    .text("Skip", "asg_type:skip");
  await ctx.reply("نوع ویدیو:", { reply_markup: typeKb });
  const typeRaw = await waitCallback(conversation, "asg_type:");
  const videoType =
    typeRaw && typeRaw !== "skip" ? (typeRaw as VideoType) : null;

  await ctx.reply("موعد YYYY-MM-DD یا /skip:");
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
        assigneeId,
        categoryId,
        clientId,
        videoType,
        dueDate,
      },
      "bot",
    ),
  );

  const assignee = members.find((m) => m.id === assigneeId);
  if (assignee) {
    await notifyTaskAssigned(ctx.api, task, assignee);
  }

  await ctx.reply(
    `✅ ${task.shortCode} به ${assignee?.displayName ?? assigneeId} اختصاص یافت`,
  );
}
