import { redirect } from "next/navigation";
import {
  can,
  createCategory,
  createClient,
  createClientUser,
  createInvite,
  getAgencySettings,
  listCategories,
  listClients,
  listMembers,
  setAgencySettings,
  setUserPassword,
} from "@eth/core";
import { inviteDeepLink } from "@eth/telegram";
import { AgencyLogoField } from "@/components/agency-logo-field";
import { FlashAlert } from "@/components/flash-alert";
import { resolveFlash } from "@/lib/flash";
import { InviteLinkCard } from "@/components/invite-link-card";
import { InviteRoleSelect } from "@/components/invite-role-select";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

const LOGO_MAX_BYTES = 2 * 1024 * 1024;

async function fileToDataUrl(file: File): Promise<string> {
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = file.type || "image/png";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

const ROLE_FA: Record<string, string> = {
  owner: "مالک",
  admin: "ادمین",
  editor: "ادیتور",
  client: "کارفرما",
};

async function addCategory(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user) redirect("/login?portal=admin");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await createCategory(db(), user, name, "web");
  redirect("/admin/settings?ok=category");
}

async function addClient(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user) redirect("/login?portal=admin");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await createClient(db(), user, name, "web");
  redirect("/admin/settings?ok=client");
}

async function addClientUser(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user) redirect("/login?portal=admin");
  const clientId = String(formData.get("clientId") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim();
  try {
    await createClientUser(
      db(),
      user,
      { clientId, username, password, displayName },
      "web",
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "ساخت حساب کارفرما ناموفق بود";
    redirect(`/admin/settings?error=${encodeURIComponent(message)}`);
  }
  redirect("/admin/settings?ok=client_user");
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

  const current = await getAgencySettings(db());
  const removeLogo = String(formData.get("removeLogo") ?? "") === "1";
  const keepLogoUrl = String(formData.get("keepLogoUrl") ?? "").trim();
  const logoFile = formData.get("logoFile");

  let logoUrl: string | null = current.logoUrl ?? null;

  if (removeLogo) {
    logoUrl = null;
  } else if (logoFile instanceof File && logoFile.size > 0) {
    if (!logoFile.type.startsWith("image/")) {
      redirect("/admin/settings?logoError=type");
    }
    if (logoFile.size > LOGO_MAX_BYTES) {
      redirect("/admin/settings?logoError=size");
    }
    logoUrl = await fileToDataUrl(logoFile);
  } else if (keepLogoUrl) {
    logoUrl = keepLogoUrl;
  }

  await setAgencySettings(
    db(),
    user,
    {
      name:
        String(formData.get("name") ?? "").trim() ||
        "فاکتور تسویه حساب ماهانه آرشی کات",
      logoUrl,
    },
    "web",
  );
  redirect("/admin/settings?ok=agency");
}

async function savePassword(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user) redirect("/login?portal=admin");
  const targetUserId = String(formData.get("userId") ?? user.id);
  const password = String(formData.get("password") ?? "");
  await setUserPassword(db(), user, targetUserId, password);
  redirect("/admin/settings?ok=password");
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string; logoError?: string; ok?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?portal=admin");
  if (!can(user, "settings.manage")) redirect("/admin");

  const sp = await searchParams;
  const flash = resolveFlash(sp);
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

      {flash && (
        <FlashAlert
          tone={flash.tone}
          title={flash.title}
          detail={flash.detail}
          clearKeys={flash.clearKeys}
        />
      )}

      {sp.invite && inviteLink && (
        <InviteLinkCard code={sp.invite} link={inviteLink} />
      )}

      <div className="panel" style={{ marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>سربرگ فاکتور</h2>
        <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
          نام و لوگوی بالای فاکتور — فاکتور جدید از اینجا ساخته نمی‌شود.
        </p>
        <form action={saveAgency} className="form-grid">
          <label>
            نام آژانس
            <input name="name" defaultValue={agency.name} required />
          </label>
          <label>
            لوگوی آژانس
            <AgencyLogoField currentUrl={agency.logoUrl} />
          </label>
          <button className="btn primary" type="submit">
            ذخیره سربرگ
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
          <h2 style={{ marginTop: 0 }}>حساب ورود کارفرما</h2>
          <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
            کارفرما با نام کاربری و رمز، پروژه‌ها و فاکتورهای همان کارفرما را می‌بیند.
          </p>
          <form action={addClientUser} className="form-grid">
            <label>
              کارفرما
              <select name="clientId" required defaultValue="">
                <option value="" disabled>
                  انتخاب…
                </option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              نام نمایشی
              <input name="displayName" placeholder="اختیاری — پیش‌فرض نام کارفرما" />
            </label>
            <label>
              نام کاربری
              <input
                name="username"
                required
                dir="ltr"
                autoComplete="off"
                placeholder="brand.studio"
              />
            </label>
            <label>
              رمز عبور
              <input name="password" type="password" required minLength={6} dir="ltr" />
            </label>
            <button className="btn primary" type="submit">
              ساخت حساب
            </button>
          </form>
        </div>

        <div className="panel">
          <h2 style={{ marginTop: 0 }}>دعوت</h2>
          <form action={makeInvite} className="form-grid">
            <label>
              نقش
              <InviteRoleSelect defaultValue="editor" />
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
              <th>ورود</th>
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
                  <code>
                    {m.role === "client"
                      ? m.username ?? "—"
                      : m.telegramId != null
                        ? m.telegramId.toString()
                        : m.username ?? "—"}
                  </code>
                </td>
                <td>{ROLE_FA[m.role] ?? m.role}</td>
                <td>{m.isActive ? "فعال" : "غیرفعال"}</td>
                <td>
                  <form action={savePassword} className="member-pass-form">
                    <input type="hidden" name="userId" value={m.id} />
                    <input
                      name="password"
                      type="password"
                      required
                      minLength={6}
                      placeholder="رمز جدید"
                    />
                    <button className="btn-mini" type="submit">
                      ذخیره
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
