import { NextResponse } from "next/server";
import { consumeRateLimit, type RateLimitStore } from "@eth/core";
import { logSecurity } from "./security-log";

const store: RateLimitStore = new Map();

export function requestKey(req: Request, scope: string): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    "unknown";
  return `${scope}:${ip}`;
}

export function limitRequest(
  req: Request,
  scope: string,
  limit: number,
  windowMs: number,
) {
  return consumeRateLimit(store, requestKey(req, scope), limit, windowMs);
}

export function limitUserRequest(
  req: Request,
  userId: string,
  scope: string,
  limit: number,
  windowMs: number,
) {
  return consumeRateLimit(
    store,
    `${scope}:${userId}:${requestKey(req, "ip")}`,
    limit,
    windowMs,
  );
}

export function rateLimitedJson(
  scope: string,
  retryAfterSec: number,
  message = "تلاش زیاد بود. کمی بعد دوباره تلاش کنید.",
) {
  logSecurity("rate_limit", { scope });
  return NextResponse.json(
    { error: message },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    },
  );
}
