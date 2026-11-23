import { NextResponse } from "next/server";
import { getUserByTelegramId } from "@eth/core";
import { db } from "@/lib/db";
import { createSession } from "@/lib/session";
import {
  verifyTelegramLogin,
  type TelegramAuthPayload,
} from "@/lib/telegram-auth";
import { limitRequest } from "@/lib/rate-limit";
import { toUserError } from "@/lib/user-error";

export async function POST(req: Request) {
  const limited = limitRequest(req, "telegram-login", 20, 15 * 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "تلاش ورود زیاد بود. کمی بعد دوباره تلاش کنید." },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  try {
    const body = (await req.json()) as TelegramAuthPayload;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json(
        { error: "پیکربندی بات ناقص است. با پشتیبانی تماس بگیرید." },
        { status: 500 },
      );
    }

    if (!verifyTelegramLogin(body, botToken)) {
      return NextResponse.json(
        { error: "احراز هویت تلگرام نامعتبر است." },
        { status: 401 },
      );
    }

    const telegramId = String(body.id ?? "");
    if (!/^\d+$/.test(telegramId)) {
      return NextResponse.json(
        { error: "احراز هویت تلگرام نامعتبر است." },
        { status: 401 },
      );
    }

    const user = await getUserByTelegramId(db(), BigInt(telegramId));
    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "کاربر عضو تیم نیست. ابتدا از لینک دعوت استفاده کنید." },
        { status: 403 },
      );
    }

    await createSession(user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: toUserError(err, "ورود با تلگرام ناموفق بود.") },
      { status: 500 },
    );
  }
}
