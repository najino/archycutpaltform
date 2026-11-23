import { NextResponse } from "next/server";
import {
  loginWithTelegramId,
  loginWithUsername,
  PermissionError,
  ValidationError,
} from "@eth/core";
import { db } from "@/lib/db";
import { limitRequest, rateLimitedJson } from "@/lib/rate-limit";
import { createSession } from "@/lib/session";
import { homeForUser, isAdminUser } from "@/lib/authz";
import { toUserError } from "@/lib/user-error";
import { logSecurity } from "@/lib/security-log";
import { loginBodySchema, parseJsonBody } from "@/lib/validation";

export async function POST(req: Request) {
  const limited = limitRequest(req, "login", 8, 15 * 60_000);
  if (!limited.ok) {
    return rateLimitedJson(
      "login",
      limited.retryAfterSec,
      "تلاش ورود زیاد بود. کمی بعد دوباره تلاش کنید.",
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "درخواست نامعتبر است" }, { status: 400 });
  }

  const parsed = parseJsonBody(loginBodySchema, raw);
  if (!parsed.ok) {
    return NextResponse.json({ error: "درخواست نامعتبر است" }, { status: 400 });
  }
  const body = parsed.data;

  const portal =
    body.portal === "admin"
      ? "admin"
      : body.portal === "client"
        ? "client"
        : "editor";

  try {
    const user =
      portal === "client"
        ? await loginWithUsername(db(), body.username, body.password)
        : await loginWithTelegramId(db(), body.telegramId, body.password);

    const admin = isAdminUser(user);
    if (portal === "admin" && !admin) {
      logSecurity("login_wrong_portal", { portal: "admin" });
      return NextResponse.json(
        { error: "این حساب دسترسی ادمین ندارد. از ورود ادیتور استفاده کنید." },
        { status: 403 },
      );
    }
    if (portal === "editor" && (admin || user.role === "client")) {
      logSecurity("login_wrong_portal", { portal: "editor" });
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
      logSecurity("login_wrong_portal", { portal: "client" });
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
    if (err instanceof PermissionError) {
      logSecurity("login_failed", { portal });
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    logSecurity("login_error", { portal });
    const message = toUserError(err, "ورود ناموفق");
    const status =
      message.includes("دیتابیس") || message.includes("شلوغ") ? 503 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
