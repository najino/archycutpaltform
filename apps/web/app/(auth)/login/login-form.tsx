"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type LoginPortal = "admin" | "editor" | "client";

export function LoginForm({
  portal,
  botUsername,
}: {
  portal: LoginPortal;
  botUsername: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const isClient = portal === "client";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramId: isClient ? "" : String(fd.get("telegramId") ?? ""),
          username: isClient ? String(fd.get("username") ?? "") : "",
          password: String(fd.get("password") ?? ""),
          portal,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "ورود ناموفق");
        setLoading(false);
        return;
      }
      router.push(
        data.redirectTo ??
        (portal === "admin"
          ? "/admin"
          : portal === "client"
            ? "/client"
            : "/week"),
      );
      router.refresh();
    } catch {
      setError("خطای شبکه");
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="form-grid login-form"
      aria-busy={loading}
    >
      {isClient ? (
        <label>
          <span className="login-label-row">
            <span>
              نام کاربری <span className="login-req">*</span>
            </span>
            <span className="font-mono login-hint-en">Username</span>
          </span>
          <div className="field-wrap">
            <span className="material-symbols-outlined field-icon">person</span>
            <input
              className="field-input"
              name="username"
              required
              placeholder="brand.studio"
              autoComplete="username"
              dir="ltr"
              aria-invalid={error ? true : undefined}
            />
          </div>
          <span className="login-hint">نام کاربری‌ای که استودیو برایتان ساخته</span>
        </label>
      ) : (
        <label>
          <span className="login-label-row">
            <span>
              شناسه عددی تلگرام <span className="login-req">*</span>
            </span>
            <span className="font-mono login-hint-en">Telegram ID</span>
          </span>
          <div className="field-wrap">
            <span className="material-symbols-outlined field-icon">send</span>
            <input
              className="field-input"
              name="telegramId"
              inputMode="numeric"
              required
              placeholder="مثال: 987654321"
              autoComplete="username"
              dir="ltr"
              aria-invalid={error ? true : undefined}
            />
          </div>
          <span className="login-hint">شناسه یکتا — از دستور /id در بات</span>
        </label>
      )}

      <label>
        <span className="login-label-row">
          <span>
            {isClient ? "رمز عبور" : "رمز عبور یا کد دعوت"}{" "}
            <span className="login-req">*</span>
          </span>
        </span>
        <div className="field-wrap">
          <span className="material-symbols-outlined field-icon">lock</span>
          <input
            className="field-input has-toggle"
            name="password"
            type={showPass ? "text" : "password"}
            required
            placeholder="••••••••••••"
            autoComplete="current-password"
            dir="ltr"
            aria-invalid={error ? true : undefined}
          />
          <button
            type="button"
            className="field-toggle"
            onClick={() => setShowPass((v) => !v)}
            aria-label={showPass ? "مخفی کردن رمز عبور" : "نمایش رمز عبور"}
            aria-pressed={showPass}
          >
            <span className="material-symbols-outlined">
              {showPass ? "visibility_off" : "visibility"}
            </span>
          </button>
        </div>
      </label>

      {error ? (
        <p className="login-form-error" role="alert">
          {error}
        </p>
      ) : null}

      <button
        className="btn primary login-submit"
        type="submit"
        disabled={loading}
        aria-busy={loading}
      >
        {loading
          ? "در حال ورود…"
          : portal === "admin"
            ? "ورود به پنل مدیریت"
            : portal === "client"
              ? "ورود به پورتال کارفرما"
              : "ورود به میز کار ادیتور"}
        {!loading && (
          <span className="material-symbols-outlined">arrow_left</span>
        )}
      </button>

      {isClient ? null : (
        <div className="login-bot-link-wrap">
          <a
            href={`https://t.me/${botUsername}`}
            target="_blank"
            rel="noopener noreferrer"
            className="muted login-bot-link"
          >
            <span className="material-symbols-outlined">smart_toy</span>
            پشتیبانی و کد دعوت از بات:
            <span className="font-mono login-bot-handle" dir="ltr">
              @{botUsername}
            </span>
          </a>
        </div>
      )}
    </form>
  );
}
