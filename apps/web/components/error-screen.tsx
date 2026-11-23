"use client";

import Link from "next/link";

function statusIcon(status: number) {
  if (status === 401) return "lock";
  if (status === 403) return "gpp_maybe";
  if (status === 404) return "search_off";
  if (status === 429) return "hourglass_empty";
  if (status === 503) return "cloud_off";
  return "error";
}

export function ErrorScreen({
  status,
  code,
  title,
  message,
  primaryHref = "/",
  primaryLabel = "بازگشت به خانه",
  onRetry,
  retryLabel = "تلاش دوباره",
  variant = "page",
}: {
  status: number;
  code?: string;
  title: string;
  message: string;
  primaryHref?: string;
  primaryLabel?: string;
  onRetry?: () => void;
  retryLabel?: string;
  variant?: "page" | "panel";
}) {
  return (
    <div
      className={`error-screen${variant === "panel" ? " is-panel" : ""}`}
      dir="rtl"
    >
      <div className="error-screen-shell">
        <div className="sys-pill login-sys">
          <span className="sys-dot" />
          <span className="font-mono login-sys-code" dir="ltr">
            ERR::{status}
          </span>
          <span className="login-sys-sep">·</span>
          <span>{code ?? "SYSTEM"}</span>
        </div>

        <div className="login-card error-screen-card">
          <div className="login-brand">
            <div className="brand-mark" aria-hidden>
              <span className="material-symbols-outlined">
                {statusIcon(status)}
              </span>
            </div>
            <p className="error-screen-status font-mono" dir="ltr">
              {status}
            </p>
            <h1 className="hero-title brand-hero-name">{title}</h1>
            <p className="muted brand-hero-sub">{message}</p>
          </div>

          <div className="error-screen-actions">
            <Link className="btn primary" href={primaryHref}>
              {primaryLabel}
            </Link>
            {onRetry ? (
              <button className="btn" type="button" onClick={onRetry}>
                {retryLabel}
              </button>
            ) : (
              <Link className="btn" href="/login">
                صفحه ورود
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
