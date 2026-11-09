import { InlineKeyboard } from "grammy";
import type { Conversation } from "@grammyjs/conversations";
import {
  can,
  createProject,
  listClients,
  listMembers,
  parseTomanInput,
} from "@eth/core";
import type { BotContext, InsideContext } from "../context.js";

export async function projectConversation(
  conversation: Conversation<BotContext, InsideContext>,
  ctx: InsideContext,
) {
  if (!ctx.user || !can(ctx.user, "project.manage")) {
    await ctx.reply("فقط ادمین.");
    return;
  }

  await ctx.reply("نام پروژه:");
  const nameCtx = await conversation.waitFor("message:text");
  const name = nameCtx.message.text.trim();

  const clients = await conversation.external((c) => listClients(c.db));
  const clientKb = new InlineKeyboard();
  for (const c of clients.slice(0, 12)) {
    clientKb.text(c.name, `prj_cli:${c.id}`).row();
  }
  clientKb.text("Skip", "prj_cli:skip");
  await ctx.reply("کارفرما:", { reply_markup: clientKb });
  const cliCtx = await conversation.waitFor("callback_query:data");
  await cliCtx.answerCallbackQuery();
  const clientRaw = cliCtx.callbackQuery.data.slice("prj_cli:".length);
  const clientId = clientRaw !== "skip" ? clientRaw : null;

  await ctx.reply("برچسب واحد (مثلاً episode) یا /skip:");
  const labelCtx = await conversation.waitFor("message:text");
  const unitLabel =
    labelCtx.message.text.trim() === "/skip"
      ? "episode"
      : labelCtx.message.text.trim() || "episode";

  await ctx.reply("قیمت هر واحد به تومان (مثلاً 1500000):");
  const priceCtx = await conversation.waitFor("message:text");
  let unitPrice: bigint;
  try {
    unitPrice = parseTomanInput(priceCtx.message.text);
  } catch {
    await ctx.reply("قیمت نامعتبر. لغو شد.");
    return;
  }

  const members = (await conversation.external((c) => listMembers(c.db))).filter(
    (m) => m.isActive && m.role !== "owner",
  );
  const selected = new Set<string>();
  const renderKb = () => {
    const kb = new InlineKeyboard();
    for (const m of members.slice(0, 20)) {
      const mark = selected.has(m.id) ? "✓ " : "";
      kb.text(`${mark}${m.displayName}`, `prj_mem:${m.id}`).row();
    }
    kb.text("Done", "prj_mem:done");
    return kb;
  };

  await ctx.reply("ادیتورها را انتخاب کنید (چندتایی)، بعد Done:", {
    reply_markup: renderKb(),
  });

  while (true) {
    const pick = await conversation.waitFor("callback_query:data");
    await pick.answerCallbackQuery();
    const raw = pick.callbackQuery.data.slice("prj_mem:".length);
    if (raw === "done") break;
    if (selected.has(raw)) selected.delete(raw);
    else selected.add(raw);
    await pick.editMessageReplyMarkup({ reply_markup: renderKb() });
  }

  const project = await conversation.external((c) =>
    createProject(
      c.db,
      c.user!,
      {
        name,
        clientId,
        unitLabel,
        unitPrice,
        memberIds: [...selected],
      },
      "bot",
    ),
  );

  await ctx.reply(
    `✅ پروژه «${project.name}» ساخته شد.\nفی: ${unitPrice.toString()} تومان / ${unitLabel}\nاعضا: ${selected.size}`,
  );
}
