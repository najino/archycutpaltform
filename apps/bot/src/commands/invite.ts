import { createInvite, can } from "@eth/core";
import { inviteDeepLink } from "@eth/telegram";
import type { BotContext } from "../context.js";
import { env } from "../env.js";

export async function inviteCommand(ctx: BotContext) {
  if (!ctx.user) return;
  if (!can(ctx.user, "invite.create")) {
    await ctx.reply("فقط ادمین.");
    return;
  }

  const roleArg = ctx.message?.text?.split(/\s+/)[1]?.toLowerCase();
  if (roleArg !== "editor" && roleArg !== "admin") {
    await ctx.reply("استفاده: /invite editor|admin");
    return;
  }
  if (roleArg === "admin" && ctx.user.role !== "owner" && ctx.user.role !== "admin") {
    await ctx.reply("مجوز ندارید.");
    return;
  }

  const invite = await createInvite(ctx.db, ctx.user, roleArg, "bot");
  const username = env.botUsername || ctx.me.username;
  const link = inviteDeepLink(username, invite.code);
  await ctx.reply(
    `🔗 دعوت ${roleArg}\n<code>${invite.code}</code>\n${link}\nانقضا: ۴۸ ساعت`,
    { parse_mode: "HTML" },
  );
}
