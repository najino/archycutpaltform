"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm({
  portal,
  botUsername,
}: {
  portal: "admin" | "editor";
  botUsername: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

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
          telegramId: String(fd.get("telegramId") ?? ""),
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
      router.push(data.redirectTo ?? (portal === "admin" ? "/admin" : "/week"));
      router.refresh();
    } catch {
      setError("خطای شبکه");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="form-grid login-form">
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
          />
        </div>
        <span className="login-hint">شناسه یکتا — از دستور /id در بات</span>
      </label>

      <label>
        <span className="login-label-row">
          <span>
            رمز عبور یا کد دعوت <span className="login-req">*</span>
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
          />
          <button
            type="button"
            className="field-toggle"
            onClick={() => setShowPass((v) => !v)}
            aria-label="نمایش رمز"
          >
            <span className="material-symbols-outlined">
              {showPass ? "visibility_off" : "visibility"}
            </span>
          </button>
        </div>
      </label>

      {error && <p className="login-form-error">{error}</p>}

      <button
        className="btn primary login-submit"
        type="submit"
        disabled={loading}
      >
        {loading
          ? "در حال ورود…"
          : portal === "admin"
            ? "ورود به پنل مدیریت"
            : "ورود به میز کار ادیتور"}
        {!loading && (
          <span className="material-symbols-outlined">arrow_left</span>
        )}
      </button>

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
    </form>
  );
}
