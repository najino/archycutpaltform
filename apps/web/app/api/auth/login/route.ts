import { NextResponse } from "next/server";
import { loginWithTelegramId } from "@eth/core";
import { db } from "@/lib/db";
import { createSession } from "@/lib/session";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    telegramId?: string;
    password?: string;
  };

  try {
    const user = await loginWithTelegramId(
      db(),
      String(body.telegramId ?? ""),
      String(body.password ?? ""),
    );
    await createSession(user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "ورود ناموفق";
    const status =
      message.includes("اشتباه") || message.includes("پیدا نشد") ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
