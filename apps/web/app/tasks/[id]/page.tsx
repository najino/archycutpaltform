import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import {
  can,
  changeStatus,
  formatToman,
  getTaskById,
  listActivityForEntity,
  toPersianDigits,
} from "@eth/core";
import { deliverables } from "@eth/db";
import { channelPostUrl } from "@eth/telegram";
import type { TaskStatus } from "@eth/db";
import { EditorShell } from "@/components/editor-shell";
import { requireEditorPortal } from "@/lib/authz";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";

async function statusAction(formData: FormData) {
  "use server";
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const taskId = String(formData.get("taskId") ?? "");
  const status = String(formData.get("status") ?? "") as TaskStatus;
  await changeStatus(db(), user, taskId, status, "web");
  redirect(`/tasks/${taskId}`);
}

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireEditorPortal();
  const { id } = await params;
  const task = await getTaskById(db(), id);
  if (!task) notFound();

  if (task.assigneeId !== user.id) {
    redirect("/week");
  }

  const [history, dels] = await Promise.all([
    listActivityForEntity(db(), "task", task.id),
    db()
      .select()
      .from(deliverables)
      .where(eq(deliverables.taskId, task.id)),
  ]);

  return (
    <EditorShell user={user}>
      <p>
        <Link href="/week" className="muted">
          ← بازگشت
        </Link>
      </p>
      <h1 className="hero-title">{task.title}</h1>
      <p className="hero-sub">
        <span className={`chip ${task.status}`}>{task.status}</span>{" "}
        <code>{task.shortCode}</code>
      </p>
      {task.description && <p>{task.description}</p>}
      <p className="muted">
        هفته {task.weekKey}
        {task.dueDate ? ` · موعد ${task.dueDate}` : ""}
        {task.projectId
          ? ` · ${toPersianDigits(task.units)} واحد · ${formatToman(task.amount)}`
          : ""}
      </p>

      <div className="actions">
        {task.status === "todo" && task.assigneeId === user.id && (
          <form action={statusAction}>
            <input type="hidden" name="taskId" value={task.id} />
            <input type="hidden" name="status" value="in_progress" />
            <button className="btn primary" type="submit">
              شروع
            </button>
          </form>
        )}
        {task.status === "delivered" && can(user, "task.status.approve") && (
          <>
            <form action={statusAction}>
              <input type="hidden" name="taskId" value={task.id} />
              <input type="hidden" name="status" value="approved" />
              <button className="btn primary" type="submit">
                تأیید
              </button>
            </form>
            <form action={statusAction}>
              <input type="hidden" name="taskId" value={task.id} />
              <input type="hidden" name="status" value="rejected" />
              <button className="btn danger" type="submit">
                رد
              </button>
            </form>
          </>
        )}
      </div>

      <div className="panel" style={{ marginTop: 24 }}>
        <h2 style={{ marginTop: 0 }}>تحویل‌ها</h2>
        {dels.length === 0 && (
          <p className="muted">
            هنوز فایلی ارسال نشده. ارسال فقط از طریق ربات تلگرام (/submit).
          </p>
        )}
        {dels.map((d) => (
          <p key={d.id}>
            <a
              href={channelPostUrl(d.channelChatId, d.channelMsgId)}
              target="_blank"
              rel="noreferrer"
            >
              {d.title} → پست کانال
            </a>
          </p>
        ))}
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>تاریخچه</h2>
        <ul>
          {history.map((h) => (
            <li key={h.id} className="muted">
              {h.createdAt.toISOString()} · {h.source} · {h.action}
            </li>
          ))}
        </ul>
      </div>
    </EditorShell>
  );
}
