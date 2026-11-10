"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { User } from "@eth/db";

const LINKS = [
  { href: "/admin/board", label: "برد تسک‌ها", icon: "view_kanban" },
  { href: "/admin/projects", label: "پروژه‌ها و نرخ‌ها", icon: "folder_special" },
  { href: "/admin/earnings", label: "درآمد ادیتورها", icon: "payments" },
  { href: "/admin/invoices", label: "فاکتورها", icon: "receipt_long" },
  { href: "/admin/portfolio", label: "تحویل‌ها و پورتفولیو", icon: "video_library" },
  { href: "/admin/settings", label: "تنظیمات سیستم", icon: "tune" },
] as const;

function roleLabel(role: User["role"]) {
  if (role === "owner") return "مالک سیستم (Owner)";
  if (role === "admin") return "ادمین";
  return role;
}

export function AdminNav({ user }: { user: User }) {
  const pathname = usePathname();

  return (
    <aside className="admin-sidebar">
      <div>
        <div style={{ padding: "20px 20px 8px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <Link href="/admin" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="brand-mark">
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                  movie_edit
                </span>
              </div>
              <div>
                <div className="brand-title">Edit Team Hub</div>
                <div className="brand-sub">استودیو تدوین ویدیو</div>
              </div>
            </Link>
            <span
              className="chip"
              style={{
                background: "var(--secondary-container)",
                color: "var(--on-surface)",
                borderColor: "transparent",
                textTransform: "none",
                letterSpacing: 0,
              }}
            >
              ادمین
            </span>
          </div>

          <div
            style={{
              marginTop: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "6px 10px",
              borderRadius: "var(--radius)",
              background: "var(--surface-subtle)",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span className="sys-dot" />
              <span className="font-mono muted" style={{ fontSize: 11 }}>
                SYS.ONLINE
              </span>
            </span>
            <span className="muted" style={{ fontSize: 11 }}>
              نسخه ۲.۴.۰
            </span>
          </div>
        </div>

        <div style={{ padding: "8px 8px 0" }}>
          <span
            className="muted"
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.04em",
              display: "block",
              padding: "0 14px 6px",
            }}
          >
            ناوبری مدیریت
          </span>
          <nav className="side-nav">
            {LINKS.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={active ? "active" : ""}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                    {item.icon}
                  </span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {active && (
                    <span
                      style={{
                        fontSize: 10,
                        padding: "1px 6px",
                        borderRadius: 4,
                        background: "var(--surface-subtle)",
                        color: "var(--primary)",
                      }}
                    >
                      فعال
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        <div
          style={{
            padding: 10,
            borderRadius: "var(--radius-lg)",
            background: "var(--surface-card)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 999,
                background: "var(--primary)",
                color: "var(--on-primary)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                person
              </span>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{user.displayName}</div>
              <div className="muted" style={{ fontSize: 11 }}>
                {roleLabel(user.role)}
              </div>
            </div>
          </div>
          <form action="/api/auth/logout" method="post">
            <button
              className="btn"
              type="submit"
              title="خروج"
              style={{ padding: 8, border: 0, background: "transparent" }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                logout
              </span>
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
