import { InlineKeyboard } from "grammy";
import { can, listMembers, setUserRole } from "@eth/core";
import type { BotContext } from "../context.js";

export async function promoteCommand(ctx: BotContext) {
  if (!ctx.user) return;
  if (!can(ctx.user, "member.promote")) {
    await ctx.reply("فقط owner.");
    return;
  }
  const members = (await listMembers(ctx.db)).filter(
    (m) => m.role === "editor" && m.isActive,
  );
  if (members.length === 0) {
    await ctx.reply("ادیتوری برای ارتقا نیست.");
    return;
  }
  const kb = new InlineKeyboard();
  for (const m of members.slice(0, 20)) {
    kb.text(m.displayName, `promote:${m.id}`).row();
  }
  await ctx.reply("کاربر را برای admin انتخاب کنید:", { reply_markup: kb });
}

export async function demoteCommand(ctx: BotContext) {
  if (!ctx.user) return;
  if (!can(ctx.user, "member.promote")) {
    await ctx.reply("فقط owner.");
    return;
  }
  const members = (await listMembers(ctx.db)).filter(
    (m) => m.role === "admin" && m.isActive,
  );
  if (members.length === 0) {
    await ctx.reply("ادمینی برای تنزل نیست.");
    return;
  }
  const kb = new InlineKeyboard();
  for (const m of members.slice(0, 20)) {
    kb.text(m.displayName, `demote:${m.id}`).row();
  }
  await ctx.reply("ادمینی که به editor برگردد را انتخاب کنید:", {
    reply_markup: kb,
  });
}

export async function handlePromoteCallback(ctx: BotContext) {
  if (!ctx.user || !can(ctx.user, "member.promote")) {
    await ctx.answerCallbackQuery({ text: "Forbidden", show_alert: true });
    return;
  }
  const data = ctx.callbackQuery?.data ?? "";
  const [action, id] = data.split(":");
  if (!id || (action !== "promote" && action !== "demote")) return;
  const role = action === "promote" ? "admin" : "editor";
  const updated = await setUserRole(ctx.db, ctx.user, id, role, "bot");
  await ctx.answerCallbackQuery({ text: "OK" });
  await ctx.editMessageText(
    `${updated.displayName} → ${updated.role}`,
  );
}
