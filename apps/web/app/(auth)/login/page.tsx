import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getSessionUser();
  if (user) redirect("/week");

  const sp = await searchParams;

  return (
    <div className="login-wrap">
      <div className="login-card panel">
        <h1 className="hero-title">Edit Team Hub</h1>
        <p className="hero-sub" style={{ marginInline: "auto" }}>
          ورود با آیدی عددی تلگرام و رمز عبور.
        </p>
        {sp.error && (
          <p style={{ color: "var(--danger)", marginBottom: 12 }}>{sp.error}</p>
        )}
        <LoginForm />
      </div>
    </div>
  );
}
