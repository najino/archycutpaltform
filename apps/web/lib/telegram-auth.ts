import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export type TelegramAuthPayload = {
  id: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: string;
  hash: string;
};

export function verifyTelegramLogin(
  data: TelegramAuthPayload,
  botToken: string,
  maxAgeSeconds = 86400,
): boolean {
  const { hash, ...rest } = data;
  if (!hash) return false;

  const authDate = Number(rest.auth_date);
  if (!Number.isFinite(authDate)) return false;
  if (Date.now() / 1000 - authDate > maxAgeSeconds) return false;

  const checkString = Object.keys(rest)
    .sort()
    .map((k) => `${k}=${rest[k as keyof typeof rest] ?? ""}`)
    .join("\n");

  const secretKey = createHash("sha256").update(botToken).digest();
  const computed = createHmac("sha256", secretKey)
    .update(checkString)
    .digest("hex");

  try {
    return timingSafeEqual(
      Buffer.from(computed, "hex"),
      Buffer.from(hash, "hex"),
    );
  } catch {
    return false;
  }
}
