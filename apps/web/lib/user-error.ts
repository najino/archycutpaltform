import { classifyPublicError } from "@eth/core/errors";

/**
 * تبدیل خطاهای فنی به پیام قابل‌نمایش برای کاربر.
 */
export function toUserError(
  err: unknown,
  fallback = "خطایی رخ داد. دوباره تلاش کنید.",
): string {
  const body = classifyPublicError(err);
  if (body.code === "INTERNAL") return fallback;
  return body.message || fallback;
}
