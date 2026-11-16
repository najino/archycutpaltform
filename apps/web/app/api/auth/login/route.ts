import { NextResponse } from "next/server";
import { loginWithTelegramId, loginWithUsername } from "@eth/core";
import { db } from "@/lib/db";
import { createSession } from "@/lib/session";
import { homeForUser, isAdminUser } from "@/lib/authz";
import { toUserError } from "@/lib/user-error";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    telegramId?: string;
    username?: string;
    password?: string;
    portal?: "admin" | "editor" | "client";
  };

  const portal =
    body.portal === "admin"
      ? "admin"
      : body.portal === "client"
        ? "client"
        : "editor";

  try {
    const user =
      portal === "client"
        ? await loginWithUsername(
            db(),
            String(body.username ?? ""),
            String(body.password ?? ""),
          )
        : await loginWithTelegramId(
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
    if (portal === "editor" && (admin || user.role === "client")) {
      return NextResponse.json(
        {
          error: admin
            ? "حساب ادمین است. از تب «مدیر» وارد شوید."
            : "حساب کارفرما است. از تب «کارفرما» وارد شوید.",
        },
        { status: 403 },
      );
    }
    if (portal === "client" && user.role !== "client") {
      return NextResponse.json(
        { error: "این حساب کارفرما نیست. تب ورود را عوض کنید." },
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
    const message = toUserError(err, "ورود ناموفق");
    const status =
      message.includes("اشتباه") || message.includes("پیدا نشد")
        ? 401
        : message.includes("دیتابیس") || message.includes("شلوغ")
          ? 503
          : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
