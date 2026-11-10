import { redeemInviteWithPasswordHint } from "@eth/core";
import { parseSubmitStartPayload } from "@eth/telegram";
import type { BotContext } from "../context.js";

export async function startCommand(ctx: BotContext) {
  const text = ctx.message?.text ?? "";
  const parts = text.trim().split(/\s+/);
  const payload = parts[1];

  const submitCode = parseSubmitStartPayload(payload);
  if (submitCode) {
    if (!ctx.user) {
      await ctx.reply(
        "برای ارسال فایل ابتدا باید عضو تیم باشید. با لینک دعوت `/start <code>` وارد شوید.",
      );
      return;
    }
    await ctx.reply(
      `📤 شروع ارسال برای تسک <code>${submitCode}</code>…`,
      { parse_mode: "HTML" },
    );
    await ctx.conversation.enter("submit", submitCode);
    return;
  }

  if (!payload) {
    if (ctx.user) {
      await ctx.reply(
        `سلام ${ctx.user.displayName}!\nنقش: ${ctx.user.role}\nدستورات: /my /add /submit /week`,
      );
      return;
    }
    await ctx.reply("برای عضویت لینک دعوت لازم است: /start <code>");
    return;
  }

  if (!ctx.from) return;

  try {
    const { user, initialPassword } = await redeemInviteWithPasswordHint(
      ctx.db,
      payload,
      {
        telegramId: BigInt(ctx.from.id),
        username: ctx.from.username ?? null,
        displayName:
          [ctx.from.first_name, ctx.from.last_name].filter(Boolean).join(" ") ||
          ctx.from.username ||
          "User",
      },
      "bot",
    );
    ctx.user = user;
    let msg = `✅ خوش آمدید ${user.displayName}!\nنقش شما: <b>${user.role}</b>`;
    if (initialPassword) {
      msg += `\n\nورود پنل وب:\nآیدی: <code>${user.telegramId.toString()}</code>\nرمز اولیه: <code>${initialPassword}</code>\n(بعداً از تنظیمات عوض کنید)`;
    }
    await ctx.reply(msg, { parse_mode: "HTML" });
  } catch (err) {
    await ctx.reply(
      `عضویت ناموفق: ${err instanceof Error ? err.message : "خطا"}`,
    );
  }
}
