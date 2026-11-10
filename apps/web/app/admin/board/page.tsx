import Link from "next/link";
import { redirect } from "next/navigation";
import {
  can,
  changeStatus,
  createTask,
  currentWeekKey,
  listMembers,
  listProjects,
  listWeekTasks,
} from "@eth/core";
import type { TaskStatus } from "@eth/db";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { requireAdmin } from "@/lib/authz";

const COLUMNS: TaskStatus[] = [
  "todo",
  "in_progress",
  "delivered",
  "approved",
  "rejected",
];

async function assignAction(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user || !can(user, "task.assign")) redirect("/login?portal=admin");
  const title = String(formData.get("title") ?? "").trim();
  const assigneeId = String(formData.get("assigneeId") ?? "");
  const dueDate = String(formData.get("dueDate") ?? "").trim() || null;
  const projectId = String(formData.get("projectId") ?? "") || null;
  const units = Number(formData.get("units") ?? 1) || 1;
  if (!title || !assigneeId) return;
  await createTask(
    db(),
    user,
    { title, assigneeId, dueDate, projectId, units },
    "web",
  );
  redirect("/admin/board");
}

async function statusAction(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user) redirect("/login?portal=admin");
  const taskId = String(formData.get("taskId") ?? "");
  const status = String(formData.get("status") ?? "") as TaskStatus;
  await changeStatus(db(), user, taskId, status, "web");
  redirect("/admin/board");
}

export default async function AdminBoardPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const user = await requireAdmin();
  const sp = await searchParams;
  const weekKey = sp.week || currentWeekKey();
  const [tasks, members, projects] = await Promise.all([
    listWeekTasks(db(), user, weekKey),
    listMembers(db()),
    listProjects(db(), user),
  ]);

  const editors = members.filter((m) => m.isActive);
  const openProjects = projects.filter((p) => p.status === "open");

  return (
    <>
      <h1 className="hero-title">برد تیم</h1>
      <p className="hero-sub">وضعیت همه تسک‌ها در هفته انتخابی.</p>
      <p className="muted">{weekKey}</p>

      <div className="board-grid" style={{ marginTop: 20 }}>
        {COLUMNS.map((status) => (
          <div key={status}>
            <h3>{status}</h3>
            {tasks
              .filter((t) => t.status === status)
              .map((t) => (
                <div key={t.id} className="board-item">
                  <Link href={`/admin/tasks/${t.id}`}>
                    <strong>{t.title}</strong>
                  </Link>
                  <div className="muted">{t.shortCode}</div>
                  {(status === "delivered" || status === "rejected") && (
                    <div className="actions">
                      {status === "delivered" && (
                        <>
                          <form action={statusAction}>
                            <input type="hidden" name="taskId" value={t.id} />
                            <input type="hidden" name="status" value="approved" />
                            <button className="btn primary" type="submit">
                              Approve
                            </button>
                          </form>
                          <form action={statusAction}>
                            <input type="hidden" name="taskId" value={t.id} />
                            <input type="hidden" name="status" value="rejected" />
                            <button className="btn danger" type="submit">
                              Reject
                            </button>
                          </form>
                        </>
                      )}
                      {status === "rejected" && (
                        <form action={statusAction}>
                          <input type="hidden" name="taskId" value={t.id} />
                          <input
                            type="hidden"
                            name="status"
                            value="in_progress"
                          />
                          <button className="btn" type="submit">
                            Rework
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              ))}
          </div>
        ))}
      </div>

      <div className="panel" style={{ marginTop: 28 }}>
        <h2 style={{ marginTop: 0 }}>اختصاص تسک</h2>
        <form action={assignAction} className="form-grid">
          <label>
            عنوان
            <input name="title" required />
          </label>
          <label>
            ادیتور
            <select name="assigneeId" required>
              <option value="">انتخاب…</option>
              {editors.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName} ({m.role})
                </option>
              ))}
            </select>
          </label>
          <label>
            پروژه (اختیاری)
            <select name="projectId" defaultValue="">
              <option value="">بدون پروژه / داخلی</option>
              {openProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            تعداد واحد
            <input
              name="units"
              type="number"
              step="0.01"
              min="0.01"
              defaultValue="1"
            />
          </label>
          <label>
            موعد
            <input name="dueDate" type="date" />
          </label>
          <button className="btn primary" type="submit">
            Assign
          </button>
        </form>
      </div>
    </>
  );
}
