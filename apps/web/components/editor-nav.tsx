import Link from "next/link";
import type { User } from "@eth/db";

export function EditorNav({ user }: { user: User }) {
  return (
    <header className="topnav">
      <Link href="/week" className="brand">
        Edit Team Hub
      </Link>
      <nav className="nav-links">
        <Link href="/week">هفته من</Link>
        <Link href="/earnings">درآمد من</Link>
        <Link href="/invoices">فاکتورهای من</Link>
        <Link href="/portfolio">پورتفولیو</Link>
        <span className="muted" style={{ fontSize: "0.85rem" }}>
          {user.displayName}
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
