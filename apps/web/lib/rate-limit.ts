import { consumeRateLimit, type RateLimitStore } from "@eth/core";

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
