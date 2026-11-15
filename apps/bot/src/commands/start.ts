import { redeemInviteWithPasswordHint } from "@eth/core";
import { parseSubmitStartPayload } from "@eth/telegram";
import type { BotContext } from "../context.js";
import { env } from "../env.js";

const ROLE_FA: Record<string, string> = {
  owner: "مالک",
  admin: "ادمین",
  editor: "ادیتور",
};

function roleFa(role: string) {
  return ROLE_FA[role] ?? role;
}

function panelLoginUrl(portal: "admin" | "editor") {
  const base = env.webBaseUrl.replace(/\/$/, "");
  return `${base}/login?portal=${portal}`;
}

function translateInviteError(err: unknown): string {
  const raw = err instanceof Error ? err.message : "خطا";
  if (/not found|already used/i.test(raw)) {
    return "کد دعوت پیدا نشد یا قبلاً استفاده شده است.";
  }
  if (/expired/i.test(raw)) {
    return "کد دعوت منقضی شده است.";
  }
  return raw;
}

export async function startCommand(ctx: BotContext) {
  const text = ctx.message?.text ?? "";
  const parts = text.trim().split(/\s+/);
  const payload = parts[1];

  const submitCode = parseSubmitStartPayload(payload);
  if (submitCode) {
    if (!ctx.user) {
      await ctx.reply(
        "برای ارسال ابتدا باید عضو تیم باشید. با لینک دعوت `/start <code>` وارد شوید.",
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
      const portal =
        ctx.user.role === "editor" ? "editor" : "admin";
      await ctx.reply(
        `سلام ${ctx.user.displayName}!\nنقش: <b>${roleFa(ctx.user.role)}</b>\nدستورات: /my /add /submit /week\n\n🖥 پنل وب:\n${panelLoginUrl(portal)}`,
        { parse_mode: "HTML" },
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
          "کاربر",
      },
      "bot",
    );
    ctx.user = user;

    const portal = user.role === "editor" ? "editor" : "admin";
    const loginUrl = panelLoginUrl(portal);

    let msg =
      `✅ خوش آمدید <b>${user.displayName}</b>!\n` +
      `نقش شما: <b>${roleFa(user.role)}</b>`;

    if (initialPassword) {
      msg +=
        `\n\n🖥 ورود به پنل وب:\n` +
        `🔗 <a href="${loginUrl}">${loginUrl}</a>\n` +
        `آیدی: <code>${user.telegramId.toString()}</code>\n` +
        `رمز اولیه: <code>${initialPassword}</code>\n` +
        `<i>(بعداً از تنظیمات پنل عوض کنید)</i>`;
    } else {
      msg += `\n\n🖥 پنل وب:\n🔗 <a href="${loginUrl}">${loginUrl}</a>`;
    }

    await ctx.reply(msg, { parse_mode: "HTML" });
  } catch (err) {
    await ctx.reply(`عضویت ناموفق: ${translateInviteError(err)}`);
  }
}
