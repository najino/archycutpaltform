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
    <form onSubmit={onSubmit} className="form-grid" style={{ textAlign: "right" }}>
      <label>
        <span
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>
            شناسه عددی تلگرام <span style={{ color: "var(--error)" }}>*</span>
          </span>
          <span className="font-mono" style={{ color: "var(--outline)", fontSize: 11 }}>
            Telegram ID
          </span>
        </span>
        <div className="field-wrap">
          <span className="material-symbols-outlined field-icon" style={{ fontSize: 20 }}>
            send
          </span>
          <input
            className="field-input"
            name="telegramId"
            inputMode="numeric"
            required
            placeholder="مثال: 987654321"
            autoComplete="username"
            dir="ltr"
            style={{ textAlign: "left" }}
          />
        </div>
        <span style={{ color: "var(--outline)", fontSize: 11, fontWeight: 400 }}>
          شناسه یکتا — از دستور /id در بات
        </span>
      </label>

      <label>
        <span
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>
            رمز عبور یا کد دعوت <span style={{ color: "var(--error)" }}>*</span>
          </span>
        </span>
        <div className="field-wrap">
          <span className="material-symbols-outlined field-icon" style={{ fontSize: 20 }}>
            lock
          </span>
          <input
            className="field-input"
            name="password"
            type={showPass ? "text" : "password"}
            required
            placeholder="••••••••••••"
            autoComplete="current-password"
            dir="ltr"
            style={{ textAlign: "left", paddingLeft: 40 }}
          />
          <button
            type="button"
            onClick={() => setShowPass((v) => !v)}
            aria-label="نمایش رمز"
            style={{
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: 0,
              color: "var(--outline)",
              cursor: "pointer",
              padding: 4,
              display: "grid",
              placeItems: "center",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              {showPass ? "visibility_off" : "visibility"}
            </span>
          </button>
        </div>
      </label>

      {error && <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p>}

      <button
        className="btn primary"
        type="submit"
        disabled={loading}
        style={{ height: 48, width: "100%", marginTop: 4 }}
      >
        {loading
          ? "در حال ورود…"
          : portal === "admin"
            ? "ورود به پنل مدیریت"
            : "ورود به میز کار ادیتور"}
        {!loading && (
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
            arrow_left
          </span>
        )}
      </button>

      <div
        style={{
          marginTop: 8,
          paddingTop: 14,
          borderTop: "1px solid rgba(16,185,129,0.1)",
          textAlign: "center",
        }}
      >
        <a
          href={`https://t.me/${botUsername}`}
          target="_blank"
          rel="noopener noreferrer"
          className="muted"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: 16, color: "var(--tertiary)" }}
          >
            smart_toy
          </span>
          پشتیبانی و کد دعوت از بات:
          <span
            className="font-mono"
            style={{ color: "var(--primary)", fontWeight: 700 }}
            dir="ltr"
          >
            @{botUsername}
          </span>
        </a>
      </div>
    </form>
  );
}
