import type { NextFunction } from "grammy";
import { getUserByTelegramId } from "@eth/core";
import type { BotContext } from "../context.js";

const PUBLIC_COMMANDS = new Set(["start"]);

export async function authMiddleware(ctx: BotContext, next: NextFunction) {
  ctx.user = null;
  const tgId = ctx.from?.id;
  if (tgId != null) {
    ctx.user = await getUserByTelegramId(ctx.db, BigInt(tgId));
  }

  const text = ctx.message?.text?.trim() ?? "";
  const command = text.startsWith("/")
    ? text.slice(1).split(/\s+/)[0]?.split("@")[0]?.toLowerCase()
    : null;

  if (!ctx.user) {
    if (command && PUBLIC_COMMANDS.has(command)) {
      return next();
    }
    if (ctx.callbackQuery) {
      await ctx.answerCallbackQuery({
        text: "ابتدا با لینک دعوت عضو شوید",
        show_alert: true,
      });
      return;
    }
    await ctx.reply(
      "شما عضو تیم نیستید. با لینک دعوت `/start <code>` وارد شوید.",
    );
    return;
  }

  if (!ctx.user.isActive) {
    await ctx.reply("حساب شما غیرفعال است.");
    return;
  }

  return next();
}
