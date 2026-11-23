/**
 * تبدیل خطاهای فنی (Postgres / شبکه / انگلیسی) به پیام قابل‌نمایش برای کاربر.
 */
export function toUserError(
  err: unknown,
  fallback = "خطایی رخ داد. دوباره تلاش کنید.",
): string {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : "";

  const text = raw.trim();
  if (!text) return fallback;

  // اگر از قبل فارسی است، همان را برگردان
  if (/[\u0600-\u06FF]/.test(text) && !/sorry|error|failed|timeout|ECONN/i.test(text)) {
    return text;
  }

  const lower = text.toLowerCase();

  if (
    lower.includes("too many clients") ||
    lower.includes("53300") ||
    lower.includes("remaining connection slots")
  ) {
    return "سرور دیتابیس شلوغ است. چند لحظه صبر کنید و دوباره تلاش کنید.";
  }

  if (
    lower.includes("econnrefused") ||
    lower.includes("connection refused") ||
    lower.includes("connect_timeout") ||
    lower.includes("timeout exceeded when trying to connect")
  ) {
    return "اتصال به دیتابیس برقرار نشد. کمی بعد دوباره تلاش کنید.";
  }

  if (
    lower.includes("connection terminated") ||
    lower.includes("connection reset") ||
    lower.includes("server closed the connection") ||
    lower.includes("57p01") ||
    lower.includes("57p03")
  ) {
    return "ارتباط با دیتابیس قطع شد. صفحه را تازه کنید و دوباره تلاش کنید.";
  }

  if (
    lower.includes("password authentication failed") ||
    lower.includes("28p01")
  ) {
    return "پیکربندی دیتابیس نامعتبر است. با پشتیبانی تماس بگیرید.";
  }

  if (
    lower.includes("does not exist") &&
    (lower.includes("relation") || lower.includes("database"))
  ) {
    return "ساختار دیتابیس ناقص است. مهاجرت‌ها را اجرا کنید.";
  }

  if (lower.includes("unique") || lower.includes("duplicate key") || lower.includes("23505")) {
    return "این مورد قبلاً ثبت شده است.";
  }

  if (lower.includes("foreign key") || lower.includes("23503")) {
    return "به خاطر وابستگی داده‌ها، این عملیات ممکن نیست.";
  }

  if (lower.includes("not null") || lower.includes("23502")) {
    return "برخی فیلدهای الزامی خالی است.";
  }

  if (
    lower.includes("fetch failed") ||
    lower.includes("network") ||
    lower.includes("failed to fetch")
  ) {
    return "خطای شبکه. اتصال اینترنت را بررسی کنید.";
  }

  if (lower.includes("unauthorized") || text === "UNAUTHORIZED") {
    return "نشست شما منقضی شده. دوباره وارد شوید.";
  }

  if (
    /playwright|executable doesn't exist|browserType|chromium|html-to-pdf|pdf process/i.test(
      lower,
    )
  ) {
    return "موتور ساخت PDF آماده نیست. کمی بعد دوباره تلاش کنید.";
  }

  // پیام انگلیسی ناشناخته را لو نده
  return fallback;
}
