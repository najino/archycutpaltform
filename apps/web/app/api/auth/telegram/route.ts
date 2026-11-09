import { NextResponse } from "next/server";
import { getUserByTelegramId } from "@eth/core";
import { db } from "@/lib/db";
import { createSession } from "@/lib/session";
import {
  verifyTelegramLogin,
  type TelegramAuthPayload,
} from "@/lib/telegram-auth";

export async function POST(req: Request) {
  const body = (await req.json()) as TelegramAuthPayload;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json(
      { error: "Bot token missing" },
      { status: 500 },
    );
  }

  if (!verifyTelegramLogin(body, botToken)) {
    return NextResponse.json({ error: "Invalid Telegram auth" }, { status: 401 });
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
}
