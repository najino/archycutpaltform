"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { User } from "@eth/db";

const LINKS = [
  { href: "/client/projects", label: "پروژه‌ها", icon: "folder_special" },
  { href: "/client/invoices", label: "فاکتورها", icon: "receipt_long" },
] as const;

export function ClientNav({ user }: { user: User }) {
  const pathname = usePathname();

  return (
    <header className="editor-topbar">
      <div className="editor-topbar-left">
        <Link href="/client" className="editor-brand-link">
          <div className="brand-mark">
            <span className="material-symbols-outlined icon-18">movie_edit</span>
          </div>
          <div>
            <div className="brand-title" dir="ltr">
              ARSHYCUT
              <span className="brand-title-soft">PLATFORM</span>
            </div>
            <div className="brand-sub">پورتال کارفرما</div>
          </div>
        </Link>

        <nav className="editor-nav-links">
          {LINKS.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`editor-nav-link${active ? " is-active" : ""}`}
              >
                <span className="material-symbols-outlined icon-16">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="editor-topbar-right">
        <span className="chip chip-role">کارفرما</span>
        <span className="editor-user-name">{user.displayName}</span>
        <form action="/api/auth/logout" method="post">
          <button
            className="btn-ghost-icon"
            type="submit"
            title="خروج"
            aria-label="خروج"
          >
            <span className="material-symbols-outlined">logout</span>
          </button>
        </form>
      </div>
    </header>
  );
}
