import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import {
  can,
  changeStatus,
  formatJalaliDate,
  formatJalaliDateTime,
  formatToman,
  getTaskById,
  isTaskStatus,
  isUuid,
  jalaliWeekLabelFromKey,
  listActivityForEntity,
  toPersianDigits,
} from "@eth/core";
import { deliverables } from "@eth/db";
import { channelPostUrl } from "@eth/telegram";
import { FlashAlert } from "@/components/flash-alert";
import { requireActionUser } from "@/lib/action-guard";
import { requireAdmin } from "@/lib/authz";
import { db } from "@/lib/db";
import { resolveFlash } from "@/lib/flash";
import { runAction } from "@/lib/http-error";

async function statusAction(formData: FormData) {
  "use server";
  const taskId = String(formData.get("taskId") ?? "");
  await runAction(`/admin/tasks/${taskId}`, async () => {
    const user = await requireActionUser("/login?portal=admin");
    const status = String(formData.get("status") ?? "");
    if (!isUuid(taskId) || !isTaskStatus(status)) redirect("/admin/board");
    await changeStatus(db(), user, taskId, status, "web");
    redirect(`/admin/tasks/${taskId}`);
  });
}

export default async function TaskDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireAdmin();
  const flash = resolveFlash(await searchParams);
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const task = await getTaskById(db(), id);
  if (!task) notFound();

  if (!can(user, "task.view_all") && task.assigneeId !== user.id) {
    redirect("/admin");
  }

  const [history, dels] = await Promise.all([
    listActivityForEntity(db(), "task", task.id),
    db()
      .select()
      .from(deliverables)
      .where(eq(deliverables.taskId, task.id)),
  ]);

  return (
    <>
      <p>
        <Link href="/admin/board" className="muted">
          ← بازگشت
        </Link>
      </p>
      {flash && (
        <FlashAlert
          tone={flash.tone}
          title={flash.title}
          detail={flash.detail}
          clearKeys={flash.clearKeys}
        />
      )}
      <h1 className="hero-title">{task.title}</h1>
      <p className="hero-sub">
        <span className={`chip ${task.status}`}>{task.status}</span>{" "}
        <code>{task.shortCode}</code>
      </p>
      {task.description && <p>{task.description}</p>}
      <p className="muted">
        هفته {jalaliWeekLabelFromKey(task.weekKey)}
        {task.dueDate ? ` · موعد ${formatJalaliDate(task.dueDate)}` : ""}
        {task.projectId
          ? ` · ${toPersianDigits(task.units)} واحد · ${formatToman(task.amount)}`
          : ""}
      </p>

      <div className="board-item-actions">
        {task.status === "todo" && task.assigneeId === user.id && (
          <form action={statusAction}>
            <input type="hidden" name="taskId" value={task.id} />
            <input type="hidden" name="status" value="in_progress" />
            <button className="btn-mini btn-mini-ok" type="submit">
              <span className="material-symbols-outlined">play_arrow</span>
              شروع
            </button>
          </form>
        )}
        {task.status === "delivered" && can(user, "task.status.approve") && (
          <>
            <form action={statusAction}>
              <input type="hidden" name="taskId" value={task.id} />
              <input type="hidden" name="status" value="approved" />
              <button className="btn-mini btn-mini-ok" type="submit">
                <span className="material-symbols-outlined">check</span>
                تأیید
              </button>
            </form>
            <form action={statusAction}>
              <input type="hidden" name="taskId" value={task.id} />
              <input type="hidden" name="status" value="rejected" />
              <button className="btn-mini btn-mini-no" type="submit">
                <span className="material-symbols-outlined">close</span>
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
            هنوز تحویلی ثبت نشده.
          </p>
        )}
        {dels.map((d) => {
          const isLink = d.tgFileUniqueId.startsWith("link:");
          return (
            <p key={d.id} className="actions" style={{ flexWrap: "wrap" }}>
              <strong>{d.title}</strong>
              {isLink && /^https?:\/\//i.test(d.tgFileId) && (
                <a href={d.tgFileId} target="_blank" rel="noreferrer">
                  لینک فایل
                </a>
              )}
              <a
                href={channelPostUrl(d.channelChatId, d.channelMsgId)}
                target="_blank"
                rel="noreferrer"
              >
                پست کانال
              </a>
            </p>
          );
        })}
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>تاریخچه</h2>
        <ul>
          {history.map((h) => (
            <li key={h.id} className="muted">
              {formatJalaliDateTime(h.createdAt)} · {h.source} · {h.action}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
