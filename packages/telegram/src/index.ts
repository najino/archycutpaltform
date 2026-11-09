export function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function slugifyHashtag(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\p{L}\p{N}_]/gu, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

const VIDEO_TYPE_LABELS: Record<string, string> = {
  reels: "Reels",
  shorts: "Shorts",
  youtube_long: "YouTube long",
  other: "Other",
};

export type PortfolioCaptionInput = {
  title: string;
  categoryName: string;
  categorySlug: string;
  clientName?: string | null;
  clientSlug?: string | null;
  videoType: string;
  editorName: string;
};

export function formatPortfolioCaption(input: PortfolioCaptionInput): string {
  const typeLabel = VIDEO_TYPE_LABELS[input.videoType] ?? input.videoType;
  const clientLine = input.clientName
    ? `👤 ${escapeHtml(input.clientName)}`
    : "👤 —";
  const tags = [
    `#${slugifyHashtag(input.videoType) || "video"}`,
    `#${slugifyHashtag(input.categorySlug) || "category"}`,
  ];
  if (input.clientSlug) {
    tags.push(`#${slugifyHashtag(input.clientSlug)}`);
  }

  return [
    `🎬 <b>${escapeHtml(input.title)}</b>`,
    "",
    `🏷 ${escapeHtml(input.categoryName)}`,
    clientLine,
    `📐 ${escapeHtml(typeLabel)}`,
    `✂️ ${escapeHtml(input.editorName)}`,
    "",
    tags.join(" "),
  ].join("\n");
}

export function channelPostUrl(
  channelChatId: bigint | number | string,
  messageId: number,
  publicUsername?: string | null,
): string {
  if (publicUsername) {
    return `https://t.me/${publicUsername.replace(/^@/, "")}/${messageId}`;
  }
  const raw = String(channelChatId).replace("-100", "");
  return `https://t.me/c/${raw}/${messageId}`;
}

export function inviteDeepLink(botUsername: string, code: string): string {
  return `https://t.me/${botUsername.replace(/^@/, "")}?start=${code}`;
}

export function videoTypeLabel(type: string): string {
  return VIDEO_TYPE_LABELS[type] ?? type;
}
