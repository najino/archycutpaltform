import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@eth/db";
import { can, consumeRateLimit, type Action, type RateLimitStore } from "@eth/core";
import { getSessionUser } from "./session";
import { homeForUser } from "./authz";
import { logSecurity } from "./security-log";

const actionStore: RateLimitStore = new Map();

function actionKey(userId: string, ip: string) {
  return `action:${userId}:${ip}`;
}

async function limitAction(userId: string) {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    h.get("x-real-ip")?.trim() ||
    "unknown";
  const limited = consumeRateLimit(
    actionStore,
    actionKey(userId, ip),
    120,
    15 * 60_000,
  );
  if (!limited.ok) {
    logSecurity("rate_limit", { scope: "server-action", userId });
    redirect("/login?error=rate");
  }
}

export async function requireActionUser(loginPath = "/login"): Promise<User> {
  const user = await getSessionUser();
  if (!user || !user.isActive) {
    logSecurity("action_unauthenticated");
    redirect(loginPath);
  }
  await limitAction(user.id);
  return user;
}

export async function requireActionCan(
  action: Action,
  loginPath = "/login?portal=admin",
): Promise<User> {
  const user = await requireActionUser(loginPath);
  if (!can(user, action)) {
    logSecurity("permission_denied", { action, userId: user.id });
    redirect(homeForUser(user));
  }
  return user;
}
