import { NextResponse } from "next/server";
import { loginWithTelegramId } from "@eth/core";
import { db } from "@/lib/db";
import { createSession } from "@/lib/session";
import { homeForUser, isAdminUser } from "@/lib/authz";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    telegramId?: string;
    password?: string;
    portal?: "admin" | "editor";
  };

  const portal = body.portal === "admin" ? "admin" : "editor";

  try {
    const user = await loginWithTelegramId(
      db(),
      String(body.telegramId ?? ""),
      String(body.password ?? ""),
    );

    const admin = isAdminUser(user);
    if (portal === "admin" && !admin) {
      return NextResponse.json(
        { error: "این حساب دسترسی ادمین ندارد. از ورود ادیتور استفاده کنید." },
        { status: 403 },
      );
    }
    if (portal === "editor" && admin) {
      return NextResponse.json(
        { error: "حساب ادمین است. از تب «ادمین» وارد شوید." },
        { status: 403 },
      );
    }

    await createSession(user.id);
    return NextResponse.json({
      ok: true,
      role: user.role,
      redirectTo: homeForUser(user),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "ورود ناموفق";
    const status =
      message.includes("اشتباه") || message.includes("پیدا نشد") ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
