import Link from "next/link";
import { redirect } from "next/navigation";
import {
  createTask,
  currentWeekKey,
  getMyWeekStats,
  listProjects,
  listWeekTasks,
} from "@eth/core";
import { EditorNav } from "@/components/editor-nav";
import { RealtimeRefetch } from "@/components/realtime-refetch";
import { requireEditorPortal } from "@/lib/authz";
import { getSessionUser } from "@/lib/session";
import { db } from "@/lib/db";

async function addTaskAction(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user) redirect("/login?portal=editor");
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const dueDateRaw = String(formData.get("dueDate") ?? "").trim();
  const projectId = String(formData.get("projectId") ?? "") || null;
  const units = Number(formData.get("units") ?? 1) || 1;
  await createTask(
    db(),
    user,
    {
      title,
      assigneeId: user.id,
      dueDate: dueDateRaw || null,
      projectId,
      units,
    },
    "web",
  );
  redirect("/week");
}

export default async function WeekPage() {
  const user = await requireEditorPortal();

  const weekKey = currentWeekKey();
  const [tasks, stats, projects] = await Promise.all([
    listWeekTasks(db(), user, weekKey),
    getMyWeekStats(db(), user, weekKey),
    listProjects(db(), user),
  ]);
  const openProjects = projects.filter((p) => p.status === "open");

  return (
    <div className="app-shell">
      <RealtimeRefetch />
      <EditorNav user={user} />
      <h1 className="hero-title">هفته من</h1>
      <p className="hero-sub">لیست تسک‌های هفته جاری و وضعیت تحویل.</p>
      <p className="stats-line">
        {stats.total} tasks · {stats.delivered} delivered · {stats.approved}{" "}
        approved
        <span className="muted"> · {weekKey}</span>
      </p>

      <div className="task-list">
        {tasks.map((task) => (
          <Link key={task.id} href={`/tasks/${task.id}`} className="task-row">
            <span className={`chip ${task.status}`}>{task.status}</span>
            <div>
              <strong>{task.title}</strong>
              <div className="muted">{task.shortCode}</div>
            </div>
            <span className="muted">{task.dueDate ?? "—"}</span>
          </Link>
        ))}
        {tasks.length === 0 && <p className="muted">این هفته تسکی ندارید.</p>}
      </div>

      <div className="panel" style={{ marginTop: 24 }}>
        <h2 style={{ marginTop: 0 }}>افزودن تسک</h2>
        <form action={addTaskAction} className="form-grid">
          <label>
            عنوان
            <input name="title" required placeholder="مثلاً ریلز املاک" />
          </label>
          <label>
            پروژه (اختیاری — فقط پروژه‌های باز برای شما)
            <select name="projectId" defaultValue="">
              <option value="">بدون پروژه</option>
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
            موعد (اختیاری)
            <input name="dueDate" type="date" />
          </label>
          <button className="btn primary" type="submit">
            ذخیره
          </button>
        </form>
      </div>
    </div>
  );
}
