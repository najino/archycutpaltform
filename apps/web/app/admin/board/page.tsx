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
import { JalaliDateInput } from "@/components/jalali-date-input";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { requireAdmin } from "@/lib/authz";

const COLUMNS: { status: TaskStatus; label: string; icon: string }[] = [
  { status: "todo", label: "در صف", icon: "inbox" },
  { status: "in_progress", label: "در حال انجام", icon: "timelapse" },
  { status: "delivered", label: "تحویل‌شده", icon: "rate_review" },
  { status: "approved", label: "تأییدشده", icon: "verified" },
  { status: "rejected", label: "رد / بازنگری", icon: "assignment_late" },
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

  const counts = {
    total: tasks.length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    delivered: tasks.filter((t) => t.status === "delivered").length,
    approved: tasks.filter((t) => t.status === "approved").length,
    rejected: tasks.filter((t) => t.status === "rejected").length,
  };

  return (
    <div suppressHydrationWarning>
      <div className="page-header-row">
        <div>
          <div className="breadcrumb-row">
            داشبورد مدیریت
            <span className="material-symbols-outlined icon-14">chevron_left</span>
            <span className="font-mono text-primary">ADMIN::TASK_GRID</span>
          </div>
          <h1 className="hero-title hero-title-tight">برد تسک‌های تیم</h1>
          <p className="hero-sub hero-sub-tight">
            مدیریت، تخصیص و تأیید خروجی‌های تدوین در چرخه هفتگی
          </p>
        </div>
        <span className="sys-pill">
          <span className="sys-dot sys-dot-static" />
          <span className="font-mono text-primary">{weekKey}</span>
        </span>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">کل تسک‌های هفته</div>
          <div className="metric-value font-mono">{counts.total}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label tone-progress">در حال انجام</div>
          <div className="metric-value font-mono tone-progress">
            {counts.in_progress}
          </div>
        </div>
        <div
          className={`metric-card${counts.delivered > 0 ? " metric-card-alert" : ""}`}
        >
          <div className="metric-label tone-delivered">در انتظار بررسی</div>
          <div className="metric-value font-mono tone-delivered">
            {counts.delivered}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label tone-approved">تأییدشده</div>
          <div className="metric-value font-mono text-primary">
            {counts.approved}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label tone-rejected">رد / بازنگری</div>
          <div className="metric-value font-mono tone-rejected">
            {counts.rejected}
          </div>
        </div>
      </div>

      <div className="board-grid">
        {COLUMNS.map((col) => {
          const items = tasks.filter((t) => t.status === col.status);
          return (
            <div key={col.status} className="board-col">
              <h3 className="board-col-head">
                <span className="board-col-title">
                  <span className="material-symbols-outlined icon-16">
                    {col.icon}
                  </span>
                  {col.label}
                </span>
                <span className={`chip ${col.status}`}>{items.length}</span>
              </h3>
              {items.map((t) => (
                <div key={t.id} className="board-item">
                  <Link href={`/admin/tasks/${t.id}`}>
                    <strong className="board-item-title">{t.title}</strong>
                  </Link>
                  <div className="muted font-mono board-item-code">
                    {t.shortCode}
                  </div>
                  {(col.status === "delivered" || col.status === "rejected") && (
                    <div className="actions">
                      {col.status === "delivered" && (
                        <>
                          <form action={statusAction}>
                            <input type="hidden" name="taskId" value={t.id} />
                            <input type="hidden" name="status" value="approved" />
                            <button className="btn primary" type="submit">
                              تأیید
                            </button>
                          </form>
                          <form action={statusAction}>
                            <input type="hidden" name="taskId" value={t.id} />
                            <input type="hidden" name="status" value="rejected" />
                            <button className="btn danger" type="submit">
                              رد
                            </button>
                          </form>
                        </>
                      )}
                      {col.status === "rejected" && (
                        <form action={statusAction}>
                          <input type="hidden" name="taskId" value={t.id} />
                          <input
                            type="hidden"
                            name="status"
                            value="in_progress"
                          />
                          <button className="btn" type="submit">
                            بازنگری
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {items.length === 0 && (
                <p className="muted board-empty">خالی</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="panel panel-assign" id="assign">
        <h2 className="section-title">
          <span className="material-symbols-outlined text-primary">
            add_circle
          </span>
          ثبت و تخصیص تسک جدید
        </h2>
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
            موعد (شمسی)
            <JalaliDateInput name="dueDate" />
          </label>
          <button className="btn primary" type="submit">
            <span className="material-symbols-outlined icon-18">
              assignment_ind
            </span>
            تخصیص
          </button>
        </form>
      </div>
    </div>
  );
}
