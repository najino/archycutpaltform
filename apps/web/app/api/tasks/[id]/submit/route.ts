import { NextResponse } from "next/server";
import {
  getTaskById,
  listCategories,
  listClients,
  submitDeliverable,
} from "@eth/core";
import type { VideoType } from "@eth/db";
import { formatPortfolioCaption, slugifyHashtag } from "@eth/telegram";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import {
  notifyAdminsDelivered,
  publishFileToPortfolioChannel,
  TELEGRAM_UPLOAD_MAX_BYTES,
} from "@/lib/telegram-bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: taskId } = await params;
  const task = await getTaskById(db(), taskId);
  if (!task) {
    return NextResponse.json({ error: "تسک پیدا نشد" }, { status: 404 });
  }
  if (task.assigneeId !== user.id && user.role === "editor") {
    return NextResponse.json(
      { error: "فقط ادیتور همین تسک می‌تواند آپلود کند" },
      { status: 403 },
    );
  }
  if (task.status === "approved") {
    return NextResponse.json(
      { error: "تسک تأییدشده قابل آپلود مجدد نیست" },
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

  const file = form.get("file");
  if (!(file instanceof File) || file.size <= 0) {
    return NextResponse.json({ error: "فایل ویدیو الزامی است" }, { status: 400 });
  }
  if (file.size > TELEGRAM_UPLOAD_MAX_BYTES) {
    return NextResponse.json(
      { error: "حداکثر حجم فایل ۴۹ مگابایت است" },
      { status: 400 },
    );
  }

  const title =
    String(form.get("title") ?? "").trim() || task.title;
  const categoryId = String(form.get("categoryId") ?? "").trim();
  const clientRaw = String(form.get("clientId") ?? "").trim();
  const clientId = clientRaw || null;
  const videoType = String(form.get("videoType") ?? "").trim() as VideoType;

  if (!categoryId) {
    return NextResponse.json({ error: "دسته الزامی است" }, { status: 400 });
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
  });

  try {
    const published = await publishFileToPortfolioChannel({ file, caption });

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
    });
  } catch (err) {
    console.error("web submit failed:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "خطا در انتشار به تلگرام",
      },
      { status: 500 },
    );
  }
}
