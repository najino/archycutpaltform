import Link from "next/link";
import type { User } from "@eth/db";

export function AdminNav({ user }: { user: User }) {
  return (
    <header className="topnav">
      <Link href="/admin" className="brand">
        Edit Team Hub · ادمین
      </Link>
      <nav className="nav-links">
        <Link href="/admin/board">برد تیم</Link>
        <Link href="/admin/projects">پروژه‌ها</Link>
        <Link href="/admin/earnings">درآمد تیم</Link>
        <Link href="/admin/invoices">فاکتورها</Link>
        <Link href="/admin/portfolio">پورتفولیو</Link>
        <Link href="/admin/settings">تنظیمات</Link>
        <span className="muted" style={{ fontSize: "0.85rem" }}>
          {user.displayName} · {user.role}
        </span>
        <form action="/api/auth/logout" method="post">
          <button className="btn" type="submit">
            خروج
          </button>
        </form>
      </nav>
    </header>
  );
}
