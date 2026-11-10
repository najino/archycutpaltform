import { redirect } from "next/navigation";
import {
  can,
  createCategory,
  createClient,
  createInvite,
  getAgencySettings,
  listCategories,
  listClients,
  listMembers,
  setAgencySettings,
  setUserPassword,
} from "@eth/core";
import { inviteDeepLink } from "@eth/telegram";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

async function addCategory(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user) redirect("/login?portal=admin");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await createCategory(db(), user, name, "web");
  redirect("/admin/settings");
}

async function addClient(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user) redirect("/login?portal=admin");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await createClient(db(), user, name, "web");
  redirect("/admin/settings");
}

async function makeInvite(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user) redirect("/login?portal=admin");
  const role = String(formData.get("role") ?? "editor") as "editor" | "admin";
  const invite = await createInvite(db(), user, role, "web");
  redirect(`/admin/settings?invite=${invite.code}`);
}

async function saveAgency(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user) redirect("/login?portal=admin");
  await setAgencySettings(
    db(),
    user,
    {
      name: String(formData.get("name") ?? "").trim() || "Edit Team Hub",
      logoUrl: String(formData.get("logoUrl") ?? "").trim() || null,
    },
    "web",
  );
  redirect("/admin/settings");
}

async function savePassword(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user) redirect("/login?portal=admin");
  const targetUserId = String(formData.get("userId") ?? user.id);
  const password = String(formData.get("password") ?? "");
  await setUserPassword(db(), user, targetUserId, password);
  redirect("/admin/settings");
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?portal=admin");
  if (!can(user, "settings.manage")) redirect("/admin");

  const sp = await searchParams;
  const [cats, clients, members, agency] = await Promise.all([
    listCategories(db()),
    listClients(db()),
    listMembers(db()),
    getAgencySettings(db()),
  ]);

  const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? "";
  const inviteLink =
    sp.invite && botUsername
      ? inviteDeepLink(botUsername, sp.invite)
      : sp.invite
        ? sp.invite
        : null;

  return (
    <>
      <h1 className="hero-title">تنظیمات</h1>
      <p className="hero-sub">دسته‌ها، کارفرماها، دعوت‌ها و اعضا.</p>

      {inviteLink && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <p>
            لینک دعوت جدید:{" "}
            <a href={inviteLink} target="_blank" rel="noreferrer">
              {inviteLink}
            </a>
          </p>
        </div>
      )}

      <div className="panel" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>سربرگ فاکتور</h2>
        <form action={saveAgency} className="form-grid">
          <label>
            نام آژانس
            <input name="name" defaultValue={agency.name} required />
          </label>
          <label>
            آدرس لوگو (URL)
            <input name="logoUrl" defaultValue={agency.logoUrl ?? ""} />
          </label>
          <button className="btn" type="submit">
            ذخیره
          </button>
        </form>
      </div>

      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
        }}
      >
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>دسته‌ها</h2>
          <ul>
            {cats.map((c) => (
              <li key={c.id}>
                {c.name} <span className="muted">#{c.slug}</span>
              </li>
            ))}
          </ul>
          <form action={addCategory} className="form-grid">
            <label>
              نام جدید
              <input name="name" required />
            </label>
            <button className="btn" type="submit">
              افزودن
            </button>
          </form>
        </div>

        <div className="panel">
          <h2 style={{ marginTop: 0 }}>کارفرماها</h2>
          <ul>
            {clients.map((c) => (
              <li key={c.id}>{c.name}</li>
            ))}
          </ul>
          <form action={addClient} className="form-grid">
            <label>
              نام جدید
              <input name="name" required />
            </label>
            <button className="btn" type="submit">
              افزودن
            </button>
          </form>
        </div>

        <div className="panel">
          <h2 style={{ marginTop: 0 }}>دعوت</h2>
          <form action={makeInvite} className="form-grid">
            <label>
              نقش
              <select name="role" defaultValue="editor">
                <option value="editor">editor</option>
                <option value="admin">admin</option>
              </select>
            </label>
            <button className="btn primary" type="submit">
              ساخت لینک دعوت
            </button>
          </form>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>تغییر رمز خودم</h2>
        <form action={savePassword} className="form-grid">
          <input type="hidden" name="userId" value={user.id} />
          <label>
            رمز جدید
            <input name="password" type="password" required minLength={6} />
          </label>
          <button className="btn" type="submit">
            ذخیره رمز
          </button>
        </form>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>اعضا</h2>
        <table className="table">
          <thead>
            <tr>
              <th>نام</th>
              <th>آیدی تلگرام</th>
              <th>نقش</th>
              <th>وضعیت</th>
              <th>تنظیم رمز</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td>{m.displayName}</td>
                <td>
                  <code>{m.telegramId.toString()}</code>
                </td>
                <td>{m.role}</td>
                <td>{m.isActive ? "active" : "inactive"}</td>
                <td>
                  <form action={savePassword} className="form-grid">
                    <input type="hidden" name="userId" value={m.id} />
                    <input
                      name="password"
                      type="password"
                      required
                      minLength={6}
                      placeholder="رمز جدید"
                    />
                    <button className="btn" type="submit">
                      Set
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
