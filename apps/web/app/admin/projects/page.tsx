import { redirect } from "next/navigation";
import {
  can,
  createProject,
  formatToman,
  listClients,
  listMembers,
  listProjectMembers,
  listProjects,
  parseTomanInput,
  updateProject,
} from "@eth/core";
import { FlashAlert, resolveFlash } from "@/components/flash-alert";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

async function createAction(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user || !can(user, "project.manage")) redirect("/login?portal=admin");

  const name = String(formData.get("name") ?? "").trim();
  const unitLabel = String(formData.get("unitLabel") ?? "episode").trim();
  const unitPrice = parseTomanInput(String(formData.get("unitPrice") ?? "0"));
  const clientId = String(formData.get("clientId") ?? "") || null;
  const memberIds = formData.getAll("memberIds").map(String);

  await createProject(
    db(),
    user,
    { name, unitLabel, unitPrice, clientId, memberIds },
    "web",
  );
  redirect("/admin/projects?ok=project");
}

async function toggleStatus(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user || !can(user, "project.manage")) redirect("/login?portal=admin");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as "open" | "closed";
  await updateProject(db(), user, id, { status }, "web");
  redirect("/admin/projects?ok=project_status");
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?portal=admin");
  if (!can(user, "project.manage")) redirect("/admin");

  const sp = await searchParams;
  const flash = resolveFlash(sp);
  const [projects, members, clients] = await Promise.all([
    listProjects(db(), user),
    listMembers(db()),
    listClients(db()),
  ]);

  const editors = members.filter((m) => m.isActive && m.role !== "owner");

  return (
    <>
      <h1 className="hero-title">پروژه‌ها</h1>
      <p className="hero-sub">قیمت هر واحد و دسترسی ادیتورها.</p>

      {flash && (
        <FlashAlert
          tone={flash.tone}
          title={flash.title}
          detail={flash.detail}
          clearKeys={flash.clearKeys}
        />
      )}

      <div className="panel panel-spaced">
        <h2 className="panel-title">پروژه جدید</h2>
        <form action={createAction} className="form-grid">
          <label>
            نام
            <input name="name" required />
          </label>
          <label>
            برچسب واحد
            <input name="unitLabel" defaultValue="episode" />
          </label>
          <label>
            قیمت هر واحد (تومان)
            <input name="unitPrice" required placeholder="1500000" />
          </label>
          <label>
            کارفرما
            <select name="clientId" defaultValue="">
              <option value="">—</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="member-fieldset" suppressHydrationWarning>
            <legend className="muted">ادیتورهای مجاز</legend>
            <div className="check-list">
              {editors.map((m) => (
                <label key={m.id} className="check-row" suppressHydrationWarning>
                  <input type="checkbox" name="memberIds" value={m.id} />
                  <span className="check-row-text">{m.displayName}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <button className="btn primary" type="submit">
            ایجاد
          </button>
        </form>
      </div>

      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>نام</th>
              <th>واحد</th>
              <th>فی</th>
              <th>وضعیت</th>
              <th>اعضا</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {await Promise.all(
              projects.map(async (p) => {
                const pm = await listProjectMembers(db(), p.id);
                return (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.unitLabel}</td>
                    <td>{formatToman(p.unitPrice)}</td>
                    <td>{p.status}</td>
                    <td>
                      {pm.map((x) => x.user.displayName).join("، ") || "—"}
                    </td>
                    <td>
                      <form action={toggleStatus}>
                        <input type="hidden" name="id" value={p.id} />
                        <input
                          type="hidden"
                          name="status"
                          value={p.status === "open" ? "closed" : "open"}
                        />
                        <button className="btn" type="submit">
                          {p.status === "open" ? "بستن" : "باز کردن"}
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              }),
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
