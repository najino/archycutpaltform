const MAX_BYTES = 49 * 1024 * 1024;

export type PublishedTelegramMedia = {
  channelChatId: bigint;
  channelMsgId: number;
  tgFileId: string;
  tgFileUniqueId: string;
};

function botToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN تنظیم نشده است");
  return token;
}

function portfolioChannelId() {
  const raw = process.env.TELEGRAM_PORTFOLIO_CHANNEL_ID?.trim();
  if (!raw) {
    throw new Error(
      "TELEGRAM_PORTFOLIO_CHANNEL_ID در .env تنظیم نشده — شناسه کانال پورتفولیو لازم است",
    );
  }
  return BigInt(raw);
}

function apiUrl(method: string) {
  return `https://api.telegram.org/bot${botToken()}/${method}`;
}

type TgResponse<T> = { ok: boolean; description?: string; result?: T };

async function callTelegram<T>(
  method: string,
  body: FormData | URLSearchParams,
): Promise<T> {
  const res = await fetch(apiUrl(method), { method: "POST", body });
  const data = (await res.json()) as TgResponse<T>;
  if (!data.ok || !data.result) {
    throw new Error(data.description ?? `Telegram API ${method} failed`);
  }
  return data.result;
}

function isVideoLike(file: File) {
  if (file.type.startsWith("video/")) return true;
  return /\.(mp4|mov|m4v|webm|mkv|avi)$/i.test(file.name);
}

type SentMessage = {
  message_id: number;
  video?: { file_id: string; file_unique_id: string };
  document?: { file_id: string; file_unique_id: string };
};

export async function publishFileToPortfolioChannel(input: {
  file: File;
  caption: string;
}): Promise<PublishedTelegramMedia> {
  if (input.file.size <= 0) throw new Error("فایل خالی است");
  if (input.file.size > MAX_BYTES) {
    throw new Error("حداکثر حجم فایل ۴۹ مگابایت است (محدودیت Bot API)");
  }

  const channelChatId = portfolioChannelId();
  const chatId = channelChatId.toString();
  const asVideo = isVideoLike(input.file);
  const bytes = Buffer.from(await input.file.arrayBuffer());
  const blob = new Blob([bytes], {
    type: input.file.type || "application/octet-stream",
  });

  const buildForm = (field: "video" | "document") => {
    const form = new FormData();
    form.append("chat_id", chatId);
    form.append("caption", input.caption);
    form.append("parse_mode", "HTML");
    if (field === "video") form.append("supports_streaming", "true");
    form.append(field, blob, input.file.name || `upload.${field === "video" ? "mp4" : "bin"}`);
    return form;
  };

  let sent: SentMessage;
  try {
    sent = await callTelegram<SentMessage>(
      asVideo ? "sendVideo" : "sendDocument",
      buildForm(asVideo ? "video" : "document"),
    );
  } catch (err) {
    if (!asVideo) throw err;
    // برخی کانتینرها با sendVideo رد می‌شوند → document
    sent = await callTelegram<SentMessage>(
      "sendDocument",
      buildForm("document"),
    );
  }

  const media = sent.video ?? sent.document;
  if (!media) {
    throw new Error("پاسخ تلگرام فایل media برنگرداند");
  }

  return {
    channelChatId,
    channelMsgId: sent.message_id,
    tgFileId: media.file_id,
    tgFileUniqueId: media.file_unique_id,
  };
}

export async function notifyAdminsDelivered(input: {
  editorName: string;
  shortCode: string;
  title: string;
}) {
  const groupId = process.env.TELEGRAM_ADMIN_GROUP_ID?.trim();
  if (!groupId) return;

  const text =
    `📦 <b>${escapeHtml(input.editorName)}</b> delivered ` +
    `<code>${escapeHtml(input.shortCode)}</code>\n` +
    `${escapeHtml(input.title)}\n` +
    `<i>از پنل وب</i>`;

  const body = new URLSearchParams({
    chat_id: groupId,
    text,
    parse_mode: "HTML",
  });

  try {
    await callTelegram("sendMessage", body);
  } catch (err) {
    console.error("notifyAdminsDelivered failed:", err);
  }
}

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export { MAX_BYTES as TELEGRAM_UPLOAD_MAX_BYTES };
