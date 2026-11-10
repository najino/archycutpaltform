import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { homeForUser } from "@/lib/authz";
import { LoginForm } from "./login-form";
import Link from "next/link";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; portal?: string }>;
}) {
  const user = await getSessionUser();
  if (user) redirect(homeForUser(user));

  const sp = await searchParams;
  const portal = sp.portal === "admin" ? "admin" : "editor";

  return (
    <div className="login-wrap">
      <div className="login-card panel">
        <h1 className="hero-title">Edit Team Hub</h1>
        <p className="hero-sub" style={{ marginInline: "auto" }}>
          {portal === "admin"
            ? "ورود پنل ادمین — فقط owner و admin"
            : "ورود فضای ادیتور — فقط اعضای editor"}
        </p>

        <div
          className="actions"
          style={{ justifyContent: "center", marginBottom: 16 }}
        >
          <Link
            className={`btn ${portal === "editor" ? "primary" : ""}`}
            href="/login?portal=editor"
          >
            ادیتور
          </Link>
          <Link
            className={`btn ${portal === "admin" ? "primary" : ""}`}
            href="/login?portal=admin"
          >
            ادمین
          </Link>
        </div>

        {sp.error && (
          <p style={{ color: "var(--danger)", marginBottom: 12 }}>{sp.error}</p>
        )}
        <LoginForm portal={portal} />
      </div>
    </div>
  );
}
