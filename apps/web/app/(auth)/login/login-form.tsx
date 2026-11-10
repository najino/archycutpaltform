"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginForm({ portal }: { portal: "admin" | "editor" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    <form
      onSubmit={onSubmit}
      className="form-grid"
      style={{ textAlign: "right" }}
    >
      <label>
        آیدی تلگرام
        <input
          name="telegramId"
          inputMode="numeric"
          required
          placeholder="مثلاً 8053537399"
          autoComplete="username"
        />
      </label>
      <label>
        رمز عبور
        <input
          name="password"
          type="password"
          required
          placeholder="رمز عبور"
          autoComplete="current-password"
        />
      </label>
      {error && <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p>}
      <button className="btn primary" type="submit" disabled={loading}>
        {loading ? "..." : portal === "admin" ? "ورود ادمین" : "ورود ادیتور"}
      </button>
    </form>
  );
}
