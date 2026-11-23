import { redirect } from "next/navigation";
import {
  can,
  createProject,
  formatToman,
  isUuid,
  listAllProjectMembers,
  listClients,
  listMembers,
  listProjects,
  parseTomanInput,
  updateProject,
} from "@eth/core";
import { FlashAlert } from "@/components/flash-alert";
import { resolveFlash } from "@/lib/flash";
import { requireActionCan } from "@/lib/action-guard";
import { requireAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { runAction } from "@/lib/http-error";

async function createAction(formData: FormData) {
  "use server";
  await runAction("/admin/projects", async () => {
  const user = await requireActionCan("project.manage");

  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const unitLabel = String(formData.get("unitLabel") ?? "episode").trim().slice(0, 40);
  const unitPrice = parseTomanInput(String(formData.get("unitPrice") ?? "0"));
  const clientRaw = String(formData.get("clientId") ?? "");
  const clientId = clientRaw && isUuid(clientRaw) ? clientRaw : null;
  const memberIds = formData.getAll("memberIds").map(String).filter(isUuid);

  await createProject(
    db(),
    user,
    { name, unitLabel, unitPrice, clientId, memberIds },
    "web",
  );
  redirect("/admin/projects?ok=project");
  });
}

async function toggleStatus(formData: FormData) {
  "use server";
  await runAction("/admin/projects", async () => {
    const user = await requireActionCan("project.manage");
    const id = String(formData.get("id") ?? "");
    const statusRaw = String(formData.get("status") ?? "");
    const status = statusRaw === "closed" ? "closed" : "open";
    if (!isUuid(id)) return;
    await updateProject(db(), user, id, { status }, "web");
    redirect("/admin/projects?ok=project_status");
  });
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const user = await requireAdmin();
  if (!can(user, "project.manage")) redirect("/admin");

  const sp = await searchParams;
  const flash = resolveFlash(sp);
  const [projects, members, clients, allProjectMembers] = await Promise.all([
    listProjects(db(), user),
    listMembers(db()),
    listClients(db()),
    listAllProjectMembers(db()),
  ]);

  const membersByProject = new Map<string, string[]>();
  for (const pm of allProjectMembers) {
    const list = membersByProject.get(pm.projectId) ?? [];
    list.push(pm.displayName);
    membersByProject.set(pm.projectId, list);
  }

  const editors = members.filter(
    (m) => m.isActive && (m.role === "editor" || m.role === "admin"),
  );

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
            {projects.map((p) => {
              const projectMemberNames = membersByProject.get(p.id) ?? [];
              return (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.unitLabel}</td>
                  <td>{formatToman(p.unitPrice)}</td>
                  <td>{p.status}</td>
                  <td>
                    {projectMemberNames.join("، ") || "—"}
                  </td>
                  <td>
                    <form action={toggleStatus}>
                      <input type="hidden" name="id" value={p.id} />
                      <input
                        type="hidden"
                        name="status"
                        value={p.status === "open" ? "closed" : "open"}
                      />
                      <button className="btn-mini" type="submit">
                        {p.status === "open" ? "بستن" : "باز کردن"}
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
