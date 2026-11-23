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
import { jsonError } from "@/lib/http-error";
import { getSessionUser } from "@/lib/session";
import {
  normalizeMediaUrl,
  notifyAdminsDelivered,
  publishLinkToPortfolioChannel,
} from "@/lib/telegram-bot";
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
    return jsonError("UNAUTHORIZED");
  }

  if (!can(user, "deliverable.submit")) {
    logSecurity("submit_forbidden", { userId: user.id });
    return jsonError("FORBIDDEN");
  }

  const limited = limitUserRequest(request, user.id, "submit", 10, 15 * 60_000);
  if (!limited.ok) {
    return rateLimitedJson("submit", limited.retryAfterSec);
  }

  const { id: taskId } = await params;
  if (!isUuid(taskId)) {
    return jsonError("NOT_FOUND", { message: "تسک پیدا نشد." });
  }

  const task = await getTaskById(db(), taskId);
  if (!task) {
    return jsonError("NOT_FOUND", { message: "تسک پیدا نشد." });
  }
  if (task.assigneeId !== user.id && !can(user, "task.edit_any")) {
    logSecurity("submit_forbidden", { userId: user.id });
    return jsonError("FORBIDDEN", {
      message: "فقط ادیتور همین تسک می‌تواند تحویل بدهد",
    });
  }
  if (task.status === "approved") {
    return jsonError("VALIDATION", {
      message: "تسک تأییدشده قابل تحویل مجدد نیست.",
    });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("BAD_REQUEST");
  }

  let mediaUrl: string;
  try {
    mediaUrl = normalizeMediaUrl(String(form.get("mediaUrl") ?? ""));
  } catch {
    return jsonError("VALIDATION", { message: "لینک نامعتبر است" });
  }

  const title = String(form.get("title") ?? "").trim().slice(0, 200) || task.title;
  const categoryId = String(form.get("categoryId") ?? "").trim();
  const clientRaw = String(form.get("clientId") ?? "").trim();
  const clientId = clientRaw || null;
  const videoType = String(form.get("videoType") ?? "").trim() as VideoType;

  if (!isUuid(categoryId)) {
    return jsonError("VALIDATION", { message: "دسته الزامی است" });
  }
  if (clientId && !isUuid(clientId)) {
    return jsonError("NOT_FOUND", { message: "کارفرما پیدا نشد." });
  }
  if (!VIDEO_TYPES.has(videoType)) {
    return jsonError("VALIDATION", { message: "نوع ویدیو نامعتبر است" });
  }

  const [categories, clients] = await Promise.all([
    listCategories(db()),
    listClients(db()),
  ]);
  const category = categories.find((c) => c.id === categoryId);
  if (!category) {
    return jsonError("NOT_FOUND", { message: "دسته پیدا نشد." });
  }
  const client = clientId ? clients.find((c) => c.id === clientId) : null;
  if (clientId && !client) {
    return jsonError("NOT_FOUND", { message: "کارفرما پیدا نشد." });
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
    return jsonError(err);
  }
}
