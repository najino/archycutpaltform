"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { User } from "@eth/db";

const LINKS = [
  { href: "/week", label: "هفته من", icon: "calendar_view_week" },
  { href: "/earnings", label: "درآمد من", icon: "payments" },
  { href: "/invoices", label: "فاکتورها", icon: "receipt_long" },
  { href: "/portfolio", label: "پورتفولیو", icon: "video_library" },
] as const;

export function EditorNav({ user }: { user: User }) {
  const pathname = usePathname();

  return (
    <header className="editor-topbar">
      <div style={{ display: "flex", alignItems: "center", gap: 20, minWidth: 0 }}>
        <Link href="/week" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="brand-mark">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
              movie_edit
            </span>
          </div>
          <div>
            <div className="brand-title">Edit Team Hub</div>
            <div className="brand-sub">میز کار ادیتور</div>
          </div>
        </Link>

        <nav
          className="nav-links"
          style={{ gap: 4, flexWrap: "nowrap", overflowX: "auto" }}
        >
          {LINKS.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 12px",
                  borderRadius: "var(--radius)",
                  background: active ? "var(--surface-raised)" : "transparent",
                  color: active ? "var(--primary)" : "var(--on-surface-variant)",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span className="sys-pill">
          <span className="sys-dot" />
          زنده
        </span>
        <span className="muted" style={{ fontSize: 12 }}>
          {user.displayName}
        </span>
        <form action="/api/auth/logout" method="post">
          <button className="btn" type="submit" style={{ padding: "8px 12px" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              logout
            </span>
            خروج
          </button>
        </form>
      </div>
    </header>
  );
}
