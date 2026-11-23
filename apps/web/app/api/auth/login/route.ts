import { NextResponse } from "next/server";
import { loginWithTelegramId, loginWithUsername } from "@eth/core";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http-error";
import { limitRequest, rateLimitedJson } from "@/lib/rate-limit";
import { createSession } from "@/lib/session";
import { homeForUser, isAdminUser } from "@/lib/authz";
import { logSecurity } from "@/lib/security-log";
import { loginBodySchema, parseJsonBody } from "@/lib/validation";

export async function POST(req: Request) {
  const limited = limitRequest(req, "login", 8, 15 * 60_000);
  if (!limited.ok) {
    return rateLimitedJson("login", limited.retryAfterSec);
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonError("BAD_REQUEST");
  }

  const parsed = parseJsonBody(loginBodySchema, raw);
  if (!parsed.ok) {
    return jsonError("BAD_REQUEST");
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
      return jsonError("WRONG_PORTAL", {
        message: "این حساب دسترسی ادمین ندارد. از ورود ادیتور استفاده کنید.",
      });
    }
    if (portal === "editor" && (admin || user.role === "client")) {
      logSecurity("login_wrong_portal", { portal: "editor" });
      return jsonError("WRONG_PORTAL", {
        message: admin
          ? "حساب ادمین است. از تب «مدیر» وارد شوید."
          : "حساب کارفرما است. از تب «کارفرما» وارد شوید.",
      });
    }
    if (portal === "client" && user.role !== "client") {
      logSecurity("login_wrong_portal", { portal: "client" });
      return jsonError("WRONG_PORTAL", {
        message: "این حساب کارفرما نیست. تب ورود را عوض کنید.",
      });
    }

    await createSession(user.id);
    return NextResponse.json({
      ok: true,
      role: user.role,
      redirectTo: homeForUser(user),
    });
  } catch (err) {
    logSecurity("login_failed", { portal });
    return jsonError(err);
  }
}
