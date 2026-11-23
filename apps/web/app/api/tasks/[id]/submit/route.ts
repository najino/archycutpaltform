import { NextResponse } from "next/server";
import {
  can,
  getTaskById,
  isUuid,
  listCategories,
  listClients,
  submitDeliverable,
} from "@eth/core";
import type { VideoType } from "@eth/db";
import { formatPortfolioCaption, slugifyHashtag } from "@eth/telegram";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import {
  normalizeMediaUrl,
  notifyAdminsDelivered,
  publishLinkToPortfolioChannel,
} from "@/lib/telegram-bot";
import { toUserError } from "@/lib/user-error";
import { limitUserRequest, rateLimitedJson } from "@/lib/rate-limit";
import { logSecurity } from "@/lib/security-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const VIDEO_TYPES = new Set<VideoType>([
  "reels",
  "shorts",
  "youtube_long",
  "other",
]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user || !user.isActive) {
    return NextResponse.json(
      { error: "نشست شما منقضی شده. دوباره وارد شوید." },
      { status: 401 },
    );
  }

  if (!can(user, "deliverable.submit")) {
    logSecurity("submit_forbidden", { userId: user.id });
    return NextResponse.json({ error: "دسترسی ندارید" }, { status: 403 });
  }

  const limited = limitUserRequest(request, user.id, "submit", 10, 15 * 60_000);
  if (!limited.ok) {
    return rateLimitedJson("submit", limited.retryAfterSec);
  }

  const { id: taskId } = await params;
  if (!isUuid(taskId)) {
    return NextResponse.json({ error: "تسک پیدا نشد" }, { status: 404 });
  }

  const task = await getTaskById(db(), taskId);
  if (!task) {
    return NextResponse.json({ error: "تسک پیدا نشد" }, { status: 404 });
  }
  if (task.assigneeId !== user.id && !can(user, "task.edit_any")) {
    logSecurity("submit_forbidden", { userId: user.id });
    return NextResponse.json(
      { error: "فقط ادیتور همین تسک می‌تواند تحویل بدهد" },
      { status: 403 },
    );
  }
  if (task.status === "approved") {
    return NextResponse.json(
      { error: "تسک تأییدشده قابل تحویل مجدد نیست" },
      { status: 400 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "بدنه درخواست نامعتبر است" },
      { status: 400 },
    );
  }

  let mediaUrl: string;
  try {
    mediaUrl = normalizeMediaUrl(String(form.get("mediaUrl") ?? ""));
  } catch {
    return NextResponse.json({ error: "لینک نامعتبر است" }, { status: 400 });
  }

  const title = String(form.get("title") ?? "").trim().slice(0, 200) || task.title;
  const categoryId = String(form.get("categoryId") ?? "").trim();
  const clientRaw = String(form.get("clientId") ?? "").trim();
  const clientId = clientRaw || null;
  const videoType = String(form.get("videoType") ?? "").trim() as VideoType;

  if (!isUuid(categoryId)) {
    return NextResponse.json({ error: "دسته الزامی است" }, { status: 400 });
  }
  if (clientId && !isUuid(clientId)) {
    return NextResponse.json({ error: "کارفرما پیدا نشد" }, { status: 400 });
  }
  if (!VIDEO_TYPES.has(videoType)) {
    return NextResponse.json({ error: "نوع ویدیو نامعتبر است" }, { status: 400 });
  }

  const [categories, clients] = await Promise.all([
    listCategories(db()),
    listClients(db()),
  ]);
  const category = categories.find((c) => c.id === categoryId);
  if (!category) {
    return NextResponse.json({ error: "دسته پیدا نشد" }, { status: 400 });
  }
  const client = clientId ? clients.find((c) => c.id === clientId) : null;
  if (clientId && !client) {
    return NextResponse.json({ error: "کارفرما پیدا نشد" }, { status: 400 });
  }

  const caption = formatPortfolioCaption({
    title,
    categoryName: category.name,
    categorySlug: category.slug,
    clientName: client?.name,
    clientSlug: client ? slugifyHashtag(client.name) : null,
    videoType,
    editorName: user.displayName,
    mediaUrl,
  });

  try {
    const published = await publishLinkToPortfolioChannel({
      mediaUrl,
      caption,
    });

    const deliverable = await submitDeliverable(
      db(),
      user,
      {
        taskId: task.id,
        title,
        categoryId,
        clientId,
        videoType,
        tgFileId: published.tgFileId,
        tgFileUniqueId: published.tgFileUniqueId,
        channelChatId: published.channelChatId,
        channelMsgId: published.channelMsgId,
        caption,
      },
      "web",
    );

    await notifyAdminsDelivered({
      editorName: user.displayName,
      shortCode: task.shortCode,
      title: task.title,
    });

    return NextResponse.json({
      ok: true,
      deliverableId: deliverable.id,
      channelMsgId: deliverable.channelMsgId,
      channelChatId: String(deliverable.channelChatId),
      mediaUrl,
    });
  } catch (err) {
    logSecurity("submit_failed", { userId: user.id });
    return NextResponse.json(
      { error: toUserError(err, "خطا در انتشار به تلگرام") },
      { status: 500 },
    );
  }
}
