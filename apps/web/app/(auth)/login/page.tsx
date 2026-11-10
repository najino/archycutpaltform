import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { homeForUser } from "@/lib/authz";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; portal?: string }>;
}) {
  const user = await getSessionUser();
  if (user) redirect(homeForUser(user));

  const sp = await searchParams;
  const portal = sp.portal === "admin" ? "admin" : "editor";
  const botUsername = process.env.TELEGRAM_BOT_USERNAME || "ArshycutP_bot";

  return (
    <div className="login-wrap">
      <div style={{ width: "min(440px, 100%)" }}>
        <div
          className="sys-pill"
          style={{ margin: "0 auto 16px", display: "flex", width: "fit-content" }}
        >
          <span className="sys-dot" />
          <span className="font-mono" style={{ color: "var(--primary)", fontWeight: 700 }}>
            ETH-NODE // v4.2
          </span>
          <span style={{ color: "var(--outline)" }}>·</span>
          <span>سامانه یکپارچه احراز هویت استودیو</span>
        </div>

        <div className="login-card">
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div
              className="brand-mark"
              style={{
                width: 56,
                height: 56,
                margin: "0 auto 12px",
                borderRadius: "var(--radius-lg)",
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: 28,
                  fontVariationSettings: "'FILL' 1",
                }}
              >
                movie_filter
              </span>
            </div>
            <h1 className="hero-title" style={{ marginBottom: 4 }}>
              Edit Team Hub
            </h1>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              پلتفرم مدیریت جریان کار و تسک‌های تدوین استودیو
            </p>
          </div>

          <div className="portal-switch">
            <Link
              href="/login?portal=editor"
              className={portal === "editor" ? "active" : ""}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                video_settings
              </span>
              میز کار ادیتور
            </Link>
            <Link
              href="/login?portal=admin"
              className={portal === "admin" ? "active" : ""}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                shield_person
              </span>
              مدیران و سرپرست
            </Link>
          </div>

          <div
            className="info-banner"
            style={
              portal === "admin"
                ? { borderRight: "2px solid var(--primary)" }
                : undefined
            }
          >
            <span
              className="material-symbols-outlined"
              style={{ color: "var(--status-delivered)", fontSize: 20 }}
            >
              info
            </span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 12 }}>
                {portal === "admin"
                  ? "ورود مدیران و سرپرست استودیو:"
                  : "ورود همکاران بخش تدوین:"}
              </div>
              <p className="muted" style={{ margin: "4px 0 0", fontSize: 12 }}>
                {portal === "admin"
                  ? "فقط نقش‌های owner و admin به این پنل دسترسی دارند."
                  : "عضو جدید هستید؟ رمز اولیه همان کد دعوتی است که از ربات تلگرام گرفته‌اید."}
              </p>
            </div>
          </div>

          {sp.error && (
            <p style={{ color: "var(--danger)", marginBottom: 12 }}>{sp.error}</p>
          )}

          <LoginForm portal={portal} botUsername={botUsername} />
        </div>

        <div
          className="muted"
          style={{
            marginTop: 14,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 12,
            fontSize: 11,
            color: "var(--outline)",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 15, color: "var(--status-approved)" }}
            >
              verified_user
            </span>
            رمزنگاری scrypt + session امن
          </span>
          <span>·</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
              sensors
            </span>
            همگام‌سازی رویدادها (SSE)
          </span>
        </div>
      </div>
    </div>
  );
}
