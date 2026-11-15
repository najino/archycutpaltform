import { NextResponse } from "next/server";
import { getUserByTelegramId } from "@eth/core";
import { db } from "@/lib/db";
import { createSession } from "@/lib/session";
import {
  verifyTelegramLogin,
  type TelegramAuthPayload,
} from "@/lib/telegram-auth";
import { toUserError } from "@/lib/user-error";

export async function POST(req: Request) {
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

    const user = await getUserByTelegramId(db(), BigInt(body.id));
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
