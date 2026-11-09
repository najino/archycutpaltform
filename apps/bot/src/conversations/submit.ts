import { InlineKeyboard } from "grammy";
import type { Conversation } from "@grammyjs/conversations";
import {
  getTaskByShortCode,
  listCategories,
  listClients,
  listTasksForSubmit,
  submitDeliverable,
} from "@eth/core";
import type { VideoType } from "@eth/db";
import { formatPortfolioCaption, slugifyHashtag } from "@eth/telegram";
import type { BotContext, InsideContext } from "../context.js";
import { publishToChannel } from "../publish.js";
import { notifyDelivered } from "../notify.js";

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

export async function submitConversation(
  conversation: Conversation<BotContext, InsideContext>,
  ctx: InsideContext,
  presetShortCode?: string,
) {
  if (!ctx.user) {
    await ctx.reply("ابتدا عضو شوید.");
    return;
  }

  let shortCode = presetShortCode;
  if (!shortCode) {
    const tasks = await conversation.external((c) =>
      listTasksForSubmit(c.db, c.user!),
    );
    if (tasks.length === 0) {
      await ctx.reply("تسک قابل ارسال ندارید.");
      return;
    }
    const kb = new InlineKeyboard();
    for (const t of tasks.slice(0, 20)) {
      kb
        .text(`${t.shortCode} ${t.title}`.slice(0, 60), `sub_task:${t.shortCode}`)
        .row();
    }
    await ctx.reply("کدام تسک؟", { reply_markup: kb });
    shortCode = (await waitCallback(conversation, "sub_task:")) ?? undefined;
    if (!shortCode) {
      await ctx.reply("لغو شد.");
      return;
    }
  }

  const task = await conversation.external((c) =>
    getTaskByShortCode(c.db, shortCode!),
  );
  if (!task || task.assigneeId !== ctx.user.id) {
    await ctx.reply("تسک پیدا نشد یا مال شما نیست.");
    return;
  }

  const titleKb = new InlineKeyboard().text(
    "Use task title",
    "sub_title:default",
  );
  await ctx.reply("عنوان پورتفولیو؟ (متن بفرستید یا دکمه)", {
    reply_markup: titleKb,
  });
  let title = task.title;
  const titleWait = await conversation.wait();
  if (titleWait.callbackQuery?.data === "sub_title:default") {
    await titleWait.answerCallbackQuery();
  } else if (titleWait.message?.text) {
    title = titleWait.message.text.trim() || task.title;
  }

  const cats = await conversation.external((c) => listCategories(c.db));
  const catKb = new InlineKeyboard();
  for (const c of cats.slice(0, 12)) {
    const mark = c.id === task.categoryId ? "✓ " : "";
    catKb.text(`${mark}${c.name}`, `sub_cat:${c.id}`).row();
  }
  await ctx.reply("دسته:", { reply_markup: catKb });
  const categoryId = await waitCallback(conversation, "sub_cat:");
  if (!categoryId) {
    await ctx.reply("لغو شد.");
    return;
  }

  const clients = await conversation.external((c) => listClients(c.db));
  const clientKb = new InlineKeyboard();
  for (const c of clients.slice(0, 12)) {
    const mark = c.id === task.clientId ? "✓ " : "";
    clientKb.text(`${mark}${c.name}`, `sub_cli:${c.id}`).row();
  }
  clientKb.text("Skip", "sub_cli:skip");
  await ctx.reply("کارفرما:", { reply_markup: clientKb });
  const clientRaw = await waitCallback(conversation, "sub_cli:");
  const clientId = clientRaw && clientRaw !== "skip" ? clientRaw : null;

  const typeKb = new InlineKeyboard()
    .text("Reels", "sub_type:reels")
    .text("Shorts", "sub_type:shorts")
    .row()
    .text("YouTube long", "sub_type:youtube_long")
    .text("Other", "sub_type:other");
  await ctx.reply("نوع:", { reply_markup: typeKb });
  const typeRaw = await waitCallback(conversation, "sub_type:");
  if (!typeRaw) {
    await ctx.reply("لغو شد.");
    return;
  }
  const videoType = typeRaw as VideoType;

  await ctx.reply("حالا ویدیو را به صورت video یا document بفرستید:");
  const fileCtx = await conversation.wait();
  const video = fileCtx.message?.video;
  const doc = fileCtx.message?.document;
  const file = video ?? doc;
  if (!file || !fileCtx.message) {
    await ctx.reply("فایل ویدیو دریافت نشد. لغو شد.");
    return;
  }

  const category = cats.find((c) => c.id === categoryId)!;
  const client = clients.find((c) => c.id === clientId);
  const caption = formatPortfolioCaption({
    title,
    categoryName: category.name,
    categorySlug: category.slug,
    clientName: client?.name,
    clientSlug: client ? slugifyHashtag(client.name) : null,
    videoType,
    editorName: ctx.user.displayName,
  });

  const previewKb = new InlineKeyboard()
    .text("Publish", "sub_pub:yes")
    .text("Cancel", "sub_pub:no");
  await ctx.reply(`Preview:\n\n${caption}`, {
    parse_mode: "HTML",
    reply_markup: previewKb,
  });
  const pub = await waitCallback(conversation, "sub_pub:");
  if (pub !== "yes") {
    await ctx.reply("لغو شد.");
    return;
  }

  try {
    const published = await conversation.external(async () =>
      publishToChannel(
        ctx.api,
        fileCtx.message!.chat.id,
        fileCtx.message!.message_id,
        caption,
      ),
    );

    const deliverable = await conversation.external((c) =>
      submitDeliverable(
        c.db,
        c.user!,
        {
          taskId: task.id,
          title,
          categoryId,
          clientId,
          videoType,
          tgFileId: file.file_id,
          tgFileUniqueId: file.file_unique_id,
          channelChatId: published.channelChatId,
          channelMsgId: published.channelMsgId,
          caption,
        },
        "bot",
      ),
    );

    await notifyDelivered(ctx.api, ctx.user, task);
    await ctx.reply(
      `✅ منتشر شد (msg ${deliverable.channelMsgId}). وضعیت تسک: delivered`,
    );
  } catch (err) {
    await ctx.reply(
      `خطا در انتشار: ${err instanceof Error ? err.message : "unknown"}`,
    );
  }
}
