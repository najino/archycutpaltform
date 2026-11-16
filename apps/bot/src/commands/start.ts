import { redeemInviteWithPasswordHint } from "@eth/core";
import { parseSubmitStartPayload } from "@eth/telegram";
import type { BotContext } from "../context.js";
import { env } from "../env.js";

const ROLE_FA: Record<string, string> = {
  owner: "مالک",
  admin: "ادمین",
  editor: "ادیتور",
  client: "کارفرما",
};

function roleFa(role: string) {
  return ROLE_FA[role] ?? role;
}

function panelLoginUrl(portal: "admin" | "editor" | "client") {
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
      await replyAlreadyMember(ctx, ctx.user);
      return;
    }
    await ctx.reply("برای عضویت لینک دعوت لازم است: /start <code>");
    return;
  }

  if (!ctx.from) return;

  // عضو قبلی دوباره لینک دعوت را زده
  if (ctx.user) {
    await replyAlreadyMember(ctx, ctx.user);
    return;
  }

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

    const portal =
      user.role === "client"
        ? "client"
        : user.role === "editor"
          ? "editor"
          : "admin";
    const loginUrl = panelLoginUrl(portal);

    // اگر از قبل در دیتابیس بود (رمز اولیه برنمی‌گردد)
    if (!initialPassword) {
      await replyAlreadyMember(ctx, user);
      return;
    }

    const msg =
      `✅ خوش آمدید <b>${user.displayName}</b>!\n` +
      `نقش شما: <b>${roleFa(user.role)}</b>\n\n` +
      `🖥 ورود به پنل وب:\n` +
      `🔗 <a href="${loginUrl}">${loginUrl}</a>\n` +
      `آیدی: <code>${user.telegramId?.toString() ?? user.username ?? "—"}</code>\n` +
      `رمز اولیه: <code>${initialPassword}</code>\n` +
      `<i>(بعداً از تنظیمات پنل عوض کنید)</i>`;

    await ctx.reply(msg, { parse_mode: "HTML" });
  } catch (err) {
    await ctx.reply(`عضویت ناموفق: ${translateInviteError(err)}`);
  }
}

async function replyAlreadyMember(
  ctx: BotContext,
  user: NonNullable<BotContext["user"]>,
) {
  const portal =
    user.role === "client"
      ? "client"
      : user.role === "editor"
        ? "editor"
        : "admin";
  const loginUrl = panelLoginUrl(portal);
  const extra =
    user.role === "client"
      ? `از پنل وب پروژه‌ها و فاکتورها را ببینید.\n`
      : `دستورات: /my /add /submit /week\n\n`;
  await ctx.reply(
    `ℹ️ شما <b>قبلاً عضو</b> تیم شده‌اید.\n` +
      `نام: <b>${user.displayName}</b>\n` +
      `نقش: <b>${roleFa(user.role)}</b>\n\n` +
      extra +
      `🖥 پنل وب:\n🔗 <a href="${loginUrl}">${loginUrl}</a>\n` +
      `آیدی: <code>${user.telegramId?.toString() ?? user.username ?? "—"}</code>`,
    { parse_mode: "HTML" },
  );
}
