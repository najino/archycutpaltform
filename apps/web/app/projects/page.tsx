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
import { Nav } from "@/components/nav";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

async function createAction(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user || !can(user, "project.manage")) redirect("/login");

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
  redirect("/projects");
}

async function toggleStatus(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user || !can(user, "project.manage")) redirect("/login");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as "open" | "closed";
  await updateProject(db(), user, id, { status }, "web");
  redirect("/projects");
}

export default async function ProjectsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!can(user, "project.manage")) redirect("/week");

  const [projects, members, clients] = await Promise.all([
    listProjects(db(), user),
    listMembers(db()),
    listClients(db()),
  ]);

  const editors = members.filter((m) => m.isActive && m.role !== "owner");

  return (
    <div className="app-shell">
      <Nav user={user} />
      <h1 className="hero-title">پروژه‌ها</h1>
      <p className="hero-sub">قیمت هر واحد و دسترسی ادیتورها.</p>

      <div className="panel" style={{ marginBottom: 24 }}>
        <h2 style={{ marginTop: 0 }}>پروژه جدید</h2>
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
          <fieldset>
            <legend className="muted">ادیتورهای مجاز</legend>
            <div style={{ display: "grid", gap: 6 }}>
              {editors.map((m) => (
                <label
                  key={m.id}
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    color: "var(--ink)",
                  }}
                >
                  <input type="checkbox" name="memberIds" value={m.id} />
                  {m.displayName}
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
    </div>
  );
}
