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
  const portal =
    sp.portal === "admin"
      ? "admin"
      : sp.portal === "client"
        ? "client"
        : "editor";
  const botUsername = process.env.TELEGRAM_BOT_USERNAME || "ArshycutP_bot";

  return (
    <div className="login-wrap" suppressHydrationWarning>
      <div className="login-shell">
        <div className="sys-pill login-sys">
          <span className="sys-dot" />
          <span className="font-mono login-sys-code">ETH-NODE // v4.2</span>
          <span className="login-sys-sep">·</span>
          <span>سامانه یکپارچه احراز هویت استودیو</span>
        </div>

        <div className="login-card">
          <div className="login-brand">
            <div className="brand-mark">
              <span className="material-symbols-outlined">movie_filter</span>
            </div>
            <h1 className="hero-title brand-hero-name" dir="ltr">
              ARSHYCUTPLATFORM
            </h1>
            <p className="muted brand-hero-sub">
              پلتفرم مدیریت جریان کار و تسک‌های تدوین استودیو
            </p>
          </div>

          <div className="portal-switch">
            <Link
              href="/login?portal=editor"
              className={portal === "editor" ? "active" : ""}
            >
              <span className="material-symbols-outlined">video_settings</span>
              ادیتور
            </Link>
            <Link
              href="/login?portal=admin"
              className={portal === "admin" ? "active" : ""}
            >
              <span className="material-symbols-outlined">shield_person</span>
              مدیر
            </Link>
            <Link
              href="/login?portal=client"
              className={portal === "client" ? "active" : ""}
            >
              <span className="material-symbols-outlined">apartment</span>
              کارفرما
            </Link>
          </div>

          <div
            className={`info-banner${portal === "admin" ? " is-admin" : ""}${portal === "client" ? " is-client" : ""}`}
          >
            <span className="material-symbols-outlined">info</span>
            <div>
              <div className="info-banner-title">
                {portal === "admin"
                  ? "ورود مدیران و سرپرست استودیو:"
                  : portal === "client"
                    ? "ورود کارفرما:"
                    : "ورود همکاران بخش تدوین:"}
              </div>
              <p className="muted">
                {portal === "admin"
                  ? "فقط نقش‌های owner و admin به این پنل دسترسی دارند."
                  : portal === "client"
                    ? "نام کاربری و رمزی که استودیو برایتان ساخته را وارد کنید. پروژه‌ها و فاکتورهای همان کارفرما را می‌بینید."
                    : "عضو جدید هستید؟ رمز اولیه همان کد دعوتی است که از ربات تلگرام گرفته‌اید."}
              </p>
            </div>
          </div>

          {sp.error && <p className="login-error">{sp.error}</p>}

          <LoginForm portal={portal} botUsername={botUsername} />
        </div>

        <div className="login-foot muted">
          <span className="login-foot-item">
            <span className="material-symbols-outlined icon-ok">
              verified_user
            </span>
            رمزنگاری scrypt + session امن
          </span>
          <span>·</span>
          <span className="login-foot-item">
            <span className="material-symbols-outlined">sensors</span>
            همگام‌سازی رویدادها (SSE)
          </span>
        </div>
      </div>
    </div>
  );
}
