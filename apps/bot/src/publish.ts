import type { Api } from "grammy";
import { env } from "./env.js";

export async function publishToChannel(
  api: Api,
  fromChatId: number,
  messageId: number,
  caption: string,
): Promise<{ channelChatId: bigint; channelMsgId: number }> {
  if (!env.portfolioChannelId) {
    throw new Error("TELEGRAM_PORTFOLIO_CHANNEL_ID is not configured");
  }

  const channelId = env.portfolioChannelId.toString();

  // Prefer copyMessage to keep quality without "forwarded from"
  const copied = await api.copyMessage(channelId, fromChatId, messageId, {
    caption,
    parse_mode: "HTML",
  });

  return {
    channelChatId: env.portfolioChannelId,
    channelMsgId: copied.message_id,
  };
}
