import {
  NotFoundError,
  PermissionError,
  ValidationError,
} from "../identity/permissions.js";
import { LOGIN_FAILED_MESSAGE } from "../identity/auth-messages.js";

export const PUBLIC_ERROR_CODES = [
  "UNAUTHORIZED",
  "FORBIDDEN",
  "CSRF",
  "NOT_FOUND",
  "VALIDATION",
  "CONFLICT",
  "RATE_LIMIT",
  "BAD_REQUEST",
  "UNAVAILABLE",
  "INTERNAL",
  "LOGIN_FAILED",
  "WRONG_PORTAL",
] as const;

export type PublicErrorCode = (typeof PUBLIC_ERROR_CODES)[number];

export type PublicError = {
  code: PublicErrorCode;
  status: number;
  title: string;
  message: string;
};

type CatalogEntry = Omit<PublicError, "code">;

export const ERROR_CATALOG: Record<PublicErrorCode, CatalogEntry> = {
  UNAUTHORIZED: {
    status: 401,
    title: "ورود لازم است",
    message: "نشست شما منقضی شده. دوباره وارد شوید.",
  },
  FORBIDDEN: {
    status: 403,
    title: "دسترسی ندارید",
    message: "این کار برای نقش شما مجاز نیست.",
  },
  CSRF: {
    status: 403,
    title: "درخواست نامعتبر است",
    message: "درخواست از مبدأ غیرمجاز رد شد. صفحه را تازه کنید و دوباره بفرستید.",
  },
  NOT_FOUND: {
    status: 404,
    title: "پیدا نشد",
    message: "این مورد وجود ندارد یا حذف شده است.",
  },
  VALIDATION: {
    status: 400,
    title: "اطلاعات نامعتبر است",
    message: "فیلدها را بررسی کنید و دوباره تلاش کنید.",
  },
  CONFLICT: {
    status: 409,
    title: "این مورد تکراری است",
    message: "این مورد قبلاً ثبت شده است.",
  },
  RATE_LIMIT: {
    status: 429,
    title: "کمی صبر کنید",
    message: "تلاش‌های پشت‌سرهم زیاد بود. چند لحظه بعد دوباره تلاش کنید.",
  },
  BAD_REQUEST: {
    status: 400,
    title: "درخواست نامعتبر است",
    message: "ساختار درخواست درست نیست.",
  },
  UNAVAILABLE: {
    status: 503,
    title: "سرویس موقتاً در دسترس نیست",
    message: "اتصال به سرور برقرار نشد. کمی بعد دوباره تلاش کنید.",
  },
  INTERNAL: {
    status: 500,
    title: "خطای داخلی",
    message: "خطایی رخ داد. دوباره تلاش کنید.",
  },
  LOGIN_FAILED: {
    status: 401,
    title: "ورود ناموفق",
    message: LOGIN_FAILED_MESSAGE,
  },
  WRONG_PORTAL: {
    status: 403,
    title: "تب ورود اشتباه است",
    message: "با همین حساب از تب درست وارد شوید.",
  },
};

const CODE_ALIASES: Record<string, PublicErrorCode> = {
  rate: "RATE_LIMIT",
  unauthorized: "UNAUTHORIZED",
  forbidden: "FORBIDDEN",
  csrf: "CSRF",
  not_found: "NOT_FOUND",
  notfound: "NOT_FOUND",
  validation: "VALIDATION",
  conflict: "CONFLICT",
  unavailable: "UNAVAILABLE",
  internal: "INTERNAL",
  login_failed: "LOGIN_FAILED",
  wrong_portal: "WRONG_PORTAL",
  bad_request: "BAD_REQUEST",
};

export function isPublicErrorCode(value: string): value is PublicErrorCode {
  return Object.prototype.hasOwnProperty.call(
    ERROR_CATALOG,
    value.toUpperCase(),
  );
}

export function parseErrorCode(value: string): PublicErrorCode | null {
  const raw = value.trim();
  if (!raw) return null;
  const alias = CODE_ALIASES[raw.toLowerCase()];
  if (alias) return alias;
  const upper = raw.toUpperCase();
  return isPublicErrorCode(upper) ? upper : null;
}

export function publicError(
  code: PublicErrorCode,
  messageOverride?: string,
): PublicError {
  const entry = ERROR_CATALOG[code];
  const message = messageOverride?.trim() || entry.message;
  return { code, status: entry.status, title: entry.title, message };
}

export function publicErrorJson(
  error: PublicError,
  extra?: { retryAfter?: number },
) {
  return {
    ok: false as const,
    code: error.code,
    status: error.status,
    title: error.title,
    error: error.message,
    ...(extra?.retryAfter != null ? { retryAfter: extra.retryAfter } : {}),
  };
}

export function publicErrorFromHttpStatus(status: number): PublicError {
  if (status === 401) return publicError("UNAUTHORIZED");
  if (status === 403) return publicError("FORBIDDEN");
  if (status === 404) return publicError("NOT_FOUND");
  if (status === 409) return publicError("CONFLICT");
  if (status === 422) return publicError("VALIDATION");
  if (status === 429) return publicError("RATE_LIMIT");
  if (status === 503) return publicError("UNAVAILABLE");
  if (status >= 500) return publicError("INTERNAL");
  if (status >= 400) return publicError("BAD_REQUEST");
  return publicError("INTERNAL");
}

export function parsePublicErrorPayload(
  data: unknown,
  httpStatus?: number,
): PublicError {
  if (data && typeof data === "object") {
    const rec = data as Record<string, unknown>;
    const msg = typeof rec.error === "string" ? rec.error.trim() : "";
    const code =
      typeof rec.code === "string" ? parseErrorCode(rec.code) : null;
    if (code) {
      const override =
        msg && (isPersian(msg) || msg === ERROR_CATALOG[code].message)
          ? msg
          : undefined;
      return publicError(code, override);
    }
    if (msg) {
      const fromCode = parseErrorCode(msg);
      if (fromCode) return publicError(fromCode);
      const mapped = fromMappedMessage(msg);
      if (mapped) return mapped;
      if (isPersian(msg)) return publicError("VALIDATION", msg);
    }
  }
  if (typeof httpStatus === "number" && httpStatus >= 400) {
    return publicErrorFromHttpStatus(httpStatus);
  }
  return publicError("INTERNAL");
}

function isPersian(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

function rawMessage(err: unknown): string {
  if (err instanceof Error) return err.message.trim();
  if (typeof err === "string") return err.trim();
  return "";
}

const MESSAGE_MAP: { test: RegExp; code: PublicErrorCode; message?: string }[] =
  [
    {
      test: /task not found/i,
      code: "NOT_FOUND",
      message: "تسک پیدا نشد.",
    },
    {
      test: /assignee not found/i,
      code: "NOT_FOUND",
      message: "ادیتور پیدا نشد.",
    },
    {
      test: /category not found/i,
      code: "NOT_FOUND",
      message: "دسته پیدا نشد.",
    },
    {
      test: /client not found/i,
      code: "NOT_FOUND",
      message: "کارفرما پیدا نشد.",
    },
    {
      test: /invoice not found/i,
      code: "NOT_FOUND",
      message: "فاکتور پیدا نشد.",
    },
    {
      test: /project not found/i,
      code: "NOT_FOUND",
      message: "پروژه پیدا نشد.",
    },
    {
      test: /user not found/i,
      code: "NOT_FOUND",
      message: "کاربر پیدا نشد.",
    },
    {
      test: /member not found/i,
      code: "NOT_FOUND",
      message: "عضو پیدا نشد.",
    },
    {
      test: /invite not found|already used/i,
      code: "NOT_FOUND",
      message: "کد دعوت نامعتبر یا استفاده‌شده است.",
    },
    {
      test: /invite expired/i,
      code: "VALIDATION",
      message: "مهلت این دعوت تمام شده است.",
    },
    {
      test: /units must be/i,
      code: "VALIDATION",
      message: "تعداد واحد باید بزرگ‌تر از صفر باشد.",
    },
    {
      test: /cannot transition/i,
      code: "VALIDATION",
      message: "این تغییر وضعیت مجاز نیست.",
    },
    {
      test: /task already approved/i,
      code: "VALIDATION",
      message: "تسک تأییدشده قابل تحویل مجدد نیست.",
    },
    {
      test: /task already invoiced|invoiced tasks cannot/i,
      code: "VALIDATION",
      message: "تسک فاکتورشده قابل ویرایش نیست.",
    },
    {
      test: /paid invoice cannot be re-issued/i,
      code: "VALIDATION",
      message: "فاکتور پرداخت‌شده را نمی‌توان دوباره صادر کرد.",
    },
    {
      test: /void invoice cannot be issued/i,
      code: "VALIDATION",
      message: "فاکتور باطل را نمی‌توان صادر کرد.",
    },
    {
      test: /void invoice cannot be paid/i,
      code: "VALIDATION",
      message: "فاکتور باطل را نمی‌توان پرداخت‌شده زد.",
    },
    {
      test: /issue invoice before marking paid/i,
      code: "VALIDATION",
      message: "ابتدا فاکتور را صادر کنید، بعد پرداخت را ثبت کنید.",
    },
    {
      test: /paid invoices cannot be voided/i,
      code: "VALIDATION",
      message: "فاکتور پرداخت‌شده را نمی‌توان باطل کرد.",
    },
    {
      test: /invalid unit price/i,
      code: "VALIDATION",
      message: "قیمت واحد نامعتبر است.",
    },
    {
      test: /project is closed/i,
      code: "VALIDATION",
      message: "این پروژه بسته است.",
    },
    {
      test: /cannot invite admins/i,
      code: "FORBIDDEN",
      message: "اجازهٔ دعوت ادمین را ندارید.",
    },
    {
      test: /only owner can promote/i,
      code: "FORBIDDEN",
      message: "فقط مالک می‌تواند نقش را تغییر دهد.",
    },
    {
      test: /cannot assign this role/i,
      code: "VALIDATION",
      message: "این نقش از این مسیر قابل تنظیم نیست.",
    },
    {
      test: /project is not open/i,
      code: "FORBIDDEN",
      message: "این پروژه برای شما باز نیست.",
    },
    {
      test: /not a member of this project/i,
      code: "FORBIDDEN",
      message: "این ادیتور عضو پروژه نیست.",
    },
    {
      test: /cannot assign others on this project/i,
      code: "FORBIDDEN",
      message: "اجازهٔ تخصیص به دیگران را ندارید.",
    },
    {
      test: /can only submit for own|deliver own tasks only|cannot modify this task/i,
      code: "FORBIDDEN",
      message: "فقط تسک خودتان را می‌توانید تغییر دهید.",
    },
    {
      test: /view own earnings only/i,
      code: "FORBIDDEN",
      message: "فقط درآمد خودتان را می‌بینید.",
    },
    {
      test: /failed query|drizzlequeryerror/i,
      code: "UNAVAILABLE",
      message: "اتصال به دیتابیس برقرار نشد. کمی بعد دوباره تلاش کنید.",
    },
    {
      test: /too many clients|53300|remaining connection slots/i,
      code: "UNAVAILABLE",
      message: "سرور دیتابیس شلوغ است. چند لحظه صبر کنید و دوباره تلاش کنید.",
    },
    {
      test: /econnrefused|connection refused|connect_timeout|timeout exceeded when trying to connect/i,
      code: "UNAVAILABLE",
      message: "اتصال به دیتابیس برقرار نشد. کمی بعد دوباره تلاش کنید.",
    },
    {
      test: /econnreset|connection terminated|connection reset|server closed the connection|57p01|57p03/i,
      code: "UNAVAILABLE",
      message: "ارتباط با دیتابیس قطع شد. صفحه را تازه کنید و دوباره تلاش کنید.",
    },
    {
      test: /password authentication failed|28p01/i,
      code: "UNAVAILABLE",
      message: "پیکربندی دیتابیس نامعتبر است. با پشتیبانی تماس بگیرید.",
    },
    {
      test: /does not exist/i,
      code: "UNAVAILABLE",
      message: "ساختار دیتابیس ناقص است. مهاجرت‌ها را اجرا کنید.",
    },
    {
      test: /unique|duplicate key|23505/i,
      code: "CONFLICT",
    },
    {
      test: /foreign key|23503/i,
      code: "VALIDATION",
      message: "به خاطر وابستگی داده‌ها، این عملیات ممکن نیست.",
    },
    {
      test: /not null|23502/i,
      code: "VALIDATION",
      message: "برخی فیلدهای الزامی خالی است.",
    },
    {
      test: /unsupported-logo/i,
      code: "VALIDATION",
      message: "فقط تصویر PNG، JPG یا WEBP تا ۲ مگابایت مجاز است.",
    },
    {
      test: /telegram_bot_token|telegram_portfolio_channel|پیکربندی بات/i,
      code: "UNAVAILABLE",
      message: "پیکربندی بات ناقص است. با پشتیبانی تماس بگیرید.",
    },
    {
      test: /telegram api|bot api|chat not found|forbidden: bot|retry after/i,
      code: "UNAVAILABLE",
      message: "ارسال به تلگرام ناموفق بود. کمی بعد دوباره تلاش کنید.",
    },
    {
      test: /fetch failed|failed to fetch|network/i,
      code: "UNAVAILABLE",
      message: "خطای شبکه. اتصال اینترنت را بررسی کنید.",
    },
    {
      test: /playwright|executable doesn't exist|browsertype|chromium|html-to-pdf|pdf process/i,
      code: "UNAVAILABLE",
      message: "موتور ساخت PDF آماده نیست. کمی بعد دوباره تلاش کنید.",
    },
    {
      test: /^unauthorized$/i,
      code: "UNAUTHORIZED",
    },
    {
      test: /^forbidden\b/i,
      code: "FORBIDDEN",
    },
  ];

function fromMappedMessage(text: string): PublicError | null {
  for (const row of MESSAGE_MAP) {
    if (row.test.test(text)) {
      return publicError(row.code, row.message);
    }
  }
  return null;
}

export function classifyPublicError(err: unknown): PublicError {
  const text = rawMessage(err);
  if (
    text === LOGIN_FAILED_MESSAGE ||
    text.includes("نام کاربری یا رمز")
  ) {
    return publicError("LOGIN_FAILED");
  }

  if (err instanceof PermissionError) {
    const mapped = fromMappedMessage(err.message);
    if (mapped) return mapped;
    if (isPersian(err.message)) return publicError("FORBIDDEN", err.message);
    return publicError("FORBIDDEN");
  }

  if (err instanceof NotFoundError) {
    const mapped = fromMappedMessage(err.message);
    if (mapped) return mapped;
    if (isPersian(err.message)) return publicError("NOT_FOUND", err.message);
    return publicError("NOT_FOUND");
  }

  if (err instanceof ValidationError) {
    const mapped = fromMappedMessage(err.message);
    if (mapped) return mapped;
    if (isPersian(err.message)) return publicError("VALIDATION", err.message);
    return publicError("VALIDATION");
  }

  if (text) {
    const code = parseErrorCode(text);
    if (code) return publicError(code);
    const mapped = fromMappedMessage(text);
    if (mapped) return mapped;
    if (isPersian(text) && !/sorry|error|failed|timeout|ECONN/i.test(text)) {
      return publicError("VALIDATION", text);
    }
  }

  return publicError("INTERNAL");
}

export function lookupErrorParam(value: string | undefined | null): PublicError | null {
  if (!value) return null;
  const code = parseErrorCode(value);
  if (code) return publicError(code);
  if (isPersian(value)) return publicError("VALIDATION", value);
  return null;
}
