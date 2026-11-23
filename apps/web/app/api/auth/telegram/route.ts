import { NextResponse } from "next/server";
import { getUserByTelegramId } from "@eth/core";
import { db } from "@/lib/db";
import { createSession } from "@/lib/session";
import { verifyTelegramLogin } from "@/lib/telegram-auth";
import { limitRequest, rateLimitedJson } from "@/lib/rate-limit";
import { toUserError } from "@/lib/user-error";
import { logSecurity } from "@/lib/security-log";
import { parseJsonBody, telegramAuthSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const limited = limitRequest(req, "telegram-login", 20, 15 * 60_000);
  if (!limited.ok) {
    return rateLimitedJson(
      "telegram-login",
      limited.retryAfterSec,
      "تلاش ورود زیاد بود. کمی بعد دوباره تلاش کنید.",
    );
  }

  try {
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ error: "درخواست نامعتبر است" }, { status: 400 });
    }

    const parsed = parseJsonBody(telegramAuthSchema, raw);
    if (!parsed.ok) {
      logSecurity("telegram_login_invalid");
      return NextResponse.json(
        { error: "احراز هویت تلگرام نامعتبر است." },
        { status: 401 },
      );
    }
    const body = parsed.data;

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      logSecurity("telegram_bot_unconfigured");
      return NextResponse.json(
        { error: "پیکربندی بات ناقص است. با پشتیبانی تماس بگیرید." },
        { status: 500 },
      );
    }

    if (!verifyTelegramLogin(body, botToken)) {
      logSecurity("telegram_login_failed");
      return NextResponse.json(
        { error: "احراز هویت تلگرام نامعتبر است." },
        { status: 401 },
      );
    }

    const user = await getUserByTelegramId(db(), BigInt(body.id));
    if (!user || !user.isActive) {
      logSecurity("telegram_login_unknown");
      return NextResponse.json(
        { error: "کاربر عضو تیم نیست. ابتدا از لینک دعوت استفاده کنید." },
        { status: 403 },
      );
    }

    await createSession(user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    logSecurity("telegram_login_error");
    return NextResponse.json(
      { error: toUserError(err, "ورود با تلگرام ناموفق بود.") },
      { status: 500 },
    );
  }
}
