import Link from "next/link";
import type { User } from "@eth/db";
import { can } from "@eth/core";

export function Nav({ user }: { user: User }) {
  const isAdmin = can(user, "task.view_all");
  return (
    <header className="topnav">
      <Link href="/week" className="brand">
        Edit Team Hub
      </Link>
      <nav className="nav-links">
        <Link href="/week">هفته من</Link>
        {isAdmin && <Link href="/board">برد تیم</Link>}
        {isAdmin && <Link href="/projects">پروژه‌ها</Link>}
        <Link href="/earnings">درآمد</Link>
        <Link href="/invoices">فاکتورها</Link>
        <Link href="/portfolio">پورتفولیو</Link>
        {isAdmin && <Link href="/settings">تنظیمات</Link>}
        <form action="/api/auth/logout" method="post">
          <button className="btn" type="submit">
            خروج
          </button>
        </form>
      </nav>
    </header>
  );
}
