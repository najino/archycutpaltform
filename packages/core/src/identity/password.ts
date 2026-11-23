import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEYLEN = 64;
export const MAX_PASSWORD_LENGTH = 256;

export function hashPassword(password: string): string {
  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new Error("password too long");
  }
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEYLEN).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(
  password: string,
  stored: string | null | undefined,
): boolean {
  if (password.length > MAX_PASSWORD_LENGTH) return false;
  if (!stored || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const computed = scryptSync(password, salt, KEYLEN);
  const expected = Buffer.from(hash, "hex");
  if (computed.length !== expected.length) return false;
  return timingSafeEqual(computed, expected);
}
