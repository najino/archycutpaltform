import { NextResponse } from "next/server";
import { getUserByTelegramId } from "@eth/core";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http-error";
import { createSession } from "@/lib/session";
import { verifyTelegramLogin } from "@/lib/telegram-auth";
import { limitRequest, rateLimitedJson } from "@/lib/rate-limit";
import { logSecurity } from "@/lib/security-log";
import { parseJsonBody, telegramAuthSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const limited = limitRequest(req, "telegram-login", 20, 15 * 60_000);
  if (!limited.ok) {
    return rateLimitedJson("telegram-login", limited.retryAfterSec);
  }

  try {
    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return jsonError("BAD_REQUEST");
    }

    const parsed = parseJsonBody(telegramAuthSchema, raw);
    if (!parsed.ok) {
      logSecurity("telegram_login_invalid");
      return jsonError("UNAUTHORIZED", {
        message: "احراز هویت تلگرام نامعتبر است.",
      });
    }
    const body = parsed.data;

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      logSecurity("telegram_bot_unconfigured");
      return jsonError("UNAVAILABLE", {
        message: "پیکربندی بات ناقص است. با پشتیبانی تماس بگیرید.",
      });
    }

    if (!verifyTelegramLogin(body, botToken)) {
      logSecurity("telegram_login_failed");
      return jsonError("UNAUTHORIZED", {
        message: "احراز هویت تلگرام نامعتبر است.",
      });
    }

    const user = await getUserByTelegramId(db(), BigInt(body.id));
    if (!user || !user.isActive) {
      logSecurity("telegram_login_unknown");
      return jsonError("FORBIDDEN", {
        message: "کاربر عضو تیم نیست. ابتدا از لینک دعوت استفاده کنید.",
      });
    }

    await createSession(user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    logSecurity("telegram_login_error");
    return jsonError(err);
  }
}
