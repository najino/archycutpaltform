import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, "../../../.env") });
dotenv.config({ path: path.resolve(here, "../.env") });

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is required`);
  return v;
}

export const env = {
  databaseUrl: required("DATABASE_URL"),
  botToken: required("TELEGRAM_BOT_TOKEN"),
  botUsername: process.env.TELEGRAM_BOT_USERNAME ?? "",
  webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET ?? "",
  portfolioChannelId: process.env.TELEGRAM_PORTFOLIO_CHANNEL_ID
    ? BigInt(process.env.TELEGRAM_PORTFOLIO_CHANNEL_ID)
    : null,
  adminGroupId: process.env.TELEGRAM_ADMIN_GROUP_ID
    ? BigInt(process.env.TELEGRAM_ADMIN_GROUP_ID)
    : null,
  webBaseUrl: process.env.WEB_BASE_URL ?? "http://localhost:3000",
  botMode: process.env.BOT_MODE ?? "polling",
  port: Number(process.env.PORT ?? 3001),
  ownerTelegramId: process.env.OWNER_TELEGRAM_ID
    ? BigInt(process.env.OWNER_TELEGRAM_ID)
    : null,
};
