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
    <aside className="admin-sidebar" suppressHydrationWarning>
      <div>
        <div className="admin-sidebar-head">
          <div className="admin-sidebar-brand-row">
            <Link href="/admin" className="admin-sidebar-brand">
              <div className="brand-mark">
                <span className="material-symbols-outlined icon-20">
                  movie_edit
                </span>
              </div>
              <div>
                <div className="brand-title" dir="ltr">
                  ARSHYCUTPLATFORM
                </div>
                <div className="brand-sub">استودیو تدوین ویدیو</div>
              </div>
            </Link>
            <span className="chip chip-role" suppressHydrationWarning>
              ادمین
            </span>
          </div>

          <div className="admin-status-bar" suppressHydrationWarning>
            <span className="admin-status-online">
              <span className="sys-dot" />
              <span className="font-mono muted text-11">SYS.ONLINE</span>
            </span>
            <span className="muted text-11">نسخه ۲.۴.۰</span>
          </div>
        </div>

        <div className="admin-sidebar-nav-wrap">
          <span className="admin-nav-label">ناوبری مدیریت</span>
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
                  <span className="material-symbols-outlined icon-20">
                    {item.icon}
                  </span>
                  <span className="side-nav-label">{item.label}</span>
                  {active && <span className="nav-active-pill">فعال</span>}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="admin-sidebar-foot">
        <div className="admin-user-card" suppressHydrationWarning>
          <div className="admin-user-meta">
            <div className="admin-user-avatar">
              <span className="material-symbols-outlined icon-18">person</span>
            </div>
            <div>
              <div className="admin-user-name">{user.displayName}</div>
              <div className="muted text-11">{roleLabel(user.role)}</div>
            </div>
          </div>
          <form action="/api/auth/logout" method="post">
            <button
              className="btn btn-ghost-icon"
              type="submit"
              title="خروج"
            >
              <span className="material-symbols-outlined icon-20">logout</span>
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
